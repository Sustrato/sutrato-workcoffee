import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { Upload, Trash2, Layers, Check, AlertCircle, Loader2, ArrowUpDown, ChevronDown, PlusCircle, BarChart3, ListOrdered, PieChart, Activity, Target, Users, DollarSign } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Venta {
  id: string
  fecha: string
  linea_negocio: string
  medio_pago: string
  monto_bruto: number
  comision: number
  propina: number
  documento: string
  observacion: string
}

interface ItemIngresoRapido {
  id: string
  montoBruto: string
  propina: string
  observacion: string
}

const LINEAS_NEGOCIO_DEFAULT = [
  'Ventas cafetería',
  'Coffee break y catering',
  'Impresiones y servicios',
  'Oficinas virtuales',
  'Oficinas físicas',
  'Cowork y membresías',
  'Arriendo de salón',
  'Otros ingresos',
]

const MEDIOS_PAGO_DEFAULT = [
  'Efectivo',
  'Transferencia',
  'Débito',
  'Crédito',
  'Edenred',
  'Pluxee',
  'Amipass',
  'Mercado Pago',
  'Otro',
]

export default function VentasDiarias() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  
  const [lineaNegocioSelect, setLineaNegocioSelect] = useState(LINEAS_NEGOCIO_DEFAULT[0])
  const [lineaNegocioCustom, setLineaNegocioCustom] = useState('')
  
  const [medioPago, setMedioPago] = useState('Efectivo')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(false)
  
  // Notificaciones flotantes tipo Toast
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')
  
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('mes_actual')
  const [filtroMedioPago, setFiltroMedioPago] = useState('Todos')
  const [filtroLinea, setFiltroLinea] = useState('Todas')
  
  // Estados de Ordenamiento
  const [ordenColumna, setOrdenColumna] = useState<'fecha' | 'monto_bruto'>('fecha')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc')
  
  // Estado para el Desplegable Pro y Pestaña Visual de Analítica
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [activeTab, setActiveTab] = useState<'tabla' | 'estadisticas'>('tabla')
  const [listaMultiple, setListaMultiple] = useState<ItemIngresoRapido[]>([
    { id: '1', montoBruto: '', propina: '', observacion: '' }
  ])

  const mostrarAlertaExito = (msg: string) => {
    setMensajeExito(msg)
    setMensajeError('')
    setTimeout(() => setMensajeExito(''), 4000)
  }

  const mostrarAlertaError = (msg: string) => {
    setMensajeError(msg)
    setMensajeExito('')
    setTimeout(() => setMensajeError(''), 5000)
  }

  // 🚀 CARGA INTELIGENTE BAJO DEMANDA
  const fetchVentas = async (modoCompleto: boolean = false) => {
    setLoading(true)
    let allData: Venta[] = []
    try {
      if (!modoCompleto) {
        const hoy = new Date()
        const primerDiaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
        
        const { data, error } = await supabase
          .from('ventas_diarias')
          .select('*')
          .gte('fecha', primerDiaMes)
          .order('fecha', { ascending: false })
        if (error) throw error
        allData = data || []
      } else {
        let page = 0
        const pageSize = 1000
        let fetching = true
        while (fetching) {
          const { data, error } = await supabase
            .from('ventas_diarias')
            .select('*')
            .order('fecha', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)
          if (error) {
            console.error('Error cargando ventas:', error.message)
            break
          }
          if (data && data.length > 0) {
            allData = [...allData, ...data]
            if (data.length < pageSize) {
              fetching = false
            } else {
              page++
            }
          } else {
            fetching = false
          }
        }
      }
      setVentas(allData)
    } catch (err: any) {
      console.error('Error de conexión al cargar ventas:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVentas(false)
  }, [])

  const handleCambioPeriodo = (nuevoPeriodo: string) => {
    setFiltroPeriodo(nuevoPeriodo)
    setFiltroFecha('')
    if (nuevoPeriodo === 'todos' || nuevoPeriodo === 'anio_actual') {
      fetchVentas(true)
    } else {
      fetchVentas(false)
    }
  }

  // 🚀 IMPORTADOR UNIVERSAL CON CONSULTA EXPLÍCITA DE USUARIO AUTENTICADO
  const handleImportarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // 🔒 Validamos explícitamente si el usuario actual está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Acceso denegado: Debes iniciar sesión con una cuenta autorizada para importar registros.")
      }

      let rows: any[][] = []

      if (file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.type.includes('text')) {
        const text = await file.text()
        const lines = text.split(/\r?\n/)
        rows = lines.map(line => line.split(/[,;\t|]/).map(c => c.trim().replace(/^["']|["']$/g, '')))
      } else {
        const dataBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(dataBuffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      }

      let registrosNuevos: any[] = []
      let idxOp = -1
      let idxFecha = -1
      let idxCobro = -1
      let idxPropina = -1

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row) continue
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || '').toLowerCase().trim()
          if (val.includes('número de operación') || val.includes('numero de operacion')) idxOp = j
          if (val.includes('fecha de la compra')) idxFecha = j
          if (val === 'cobro') idxCobro = j
          if (val.includes('propina')) idxPropina = j
        }

        if (idxOp !== -1 && idxCobro !== -1) {
          for (let k = i + 1; k < rows.length; k++) {
            const dataRow = rows[k]
            if (!dataRow || dataRow.length === 0) continue

            const numOp = String(dataRow[idxOp] || '').trim()
            if (!numOp || isNaN(Number(numOp))) continue

            const montoBruto = Number(dataRow[idxCobro] || 0)
            if (isNaN(montoBruto) || montoBruto <= 0) continue

            const propinaVal = idxPropina !== -1 ? Number(dataRow[idxPropina] || 0) : 0
            const propina = isNaN(propinaVal) ? 0 : propinaVal

            let fechaVenta = new Date().toISOString().split('T')[0]
            const rawFecha = String(dataRow[idxFecha] || '').trim()
            if (rawFecha) {
              const mesesMap: { [key: string]: string } = {
                'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
                'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
              }
              const partes = rawFecha.toLowerCase().split(' ')
              if (partes.length >= 2 && mesesMap[partes[1]]) {
                const dia = partes[0].padStart(2, '0')
                const mes = mesesMap[partes[1]]
                const anio = new Date().getFullYear()
                fechaVenta = `${anio}-${mes}-${dia}`
              }
            }

            registrosNuevos.push({
              fecha: fechaVenta,
              linea_negocio: 'Ventas cafetería',
              medio_pago: 'Efectivo',
              monto_bruto: montoBruto,
              comision: 0,
              propina: propina,
              documento: `MP-${numOp}`,
              observacion: 'Importado desde reporte MP'
            })
          }
          break
        }
      }

      if (registrosNuevos.length === 0) {
        mostrarAlertaError("No se pudieron detectar transacciones válidas. Asegúrate de subir el archivo oficial de Mercado Pago.")
        setLoading(false)
        return
      }

      // Al estar el usuario autenticado verificado, Supabase permite el upsert sin romper el RLS
      const { error } = await supabase.from('ventas_diarias').upsert(registrosNuevos, { onConflict: 'documento' })
      
      if (error) {
        mostrarAlertaError("Error al guardar en base de datos: " + error.message)
      } else {
        mostrarAlertaExito(`¡Se importaron ${registrosNuevos.length} registros correctamente sin duplicar!`)
        fetchVentas(filtroPeriodo === 'todos' || filtroPeriodo === 'anio_actual')
      }
    } catch (err: any) {
      mostrarAlertaError("Error al procesar el archivo: " + err.message)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  // 🚀 GUARDADO MÚLTIPLE CON CONSULTA EXPLÍCITA DE USUARIO AUTENTICADO
  const handleGuardarMultiple = async () => {
    const itemsValidos = listaMultiple.filter(item => item.montoBruto && Number(item.montoBruto) > 0)
    if (itemsValidos.length === 0) {
      mostrarAlertaError('Ingresa al menos un monto válido.')
      return
    }
    const lineaFinal = lineaNegocioSelect === 'Otro' ? lineaNegocioCustom.trim() : lineaNegocioSelect
    if (!lineaFinal) {
      mostrarAlertaError('Por favor especifica la línea de negocio.')
      return
    }

    setLoading(true)
    try {
      // 🔒 Validamos explícitamente si el usuario actual está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Acceso denegado: Debes iniciar sesión con una cuenta autorizada para registrar ventas.")
      }

      const timestampBase = Date.now()
      const nuevasVentas = itemsValidos.map((item, index) => ({
        fecha,
        linea_negocio: lineaFinal,
        medio_pago: medioPago,
        monto_bruto: Number(item.montoBruto),
        comision: 0,
        propina: item.propina ? Number(item.propina) : 0,
        documento: `Reg-${timestampBase}-${index + 1}`,
        observacion: item.observacion ? item.observacion.trim() : 'Registro rápido'
      }))
      
      const { error } = await supabase.from('ventas_diarias').insert(nuevasVentas)
      if (error) throw error

      mostrarAlertaExito(`¡Se registraron correctamente ${nuevasVentas.length} ventas!`)
      setListaMultiple([{ id: '1', montoBruto: '', propina: '', observacion: '' }])
      setFormularioAbierto(false)
      fetchVentas(filtroPeriodo === 'todos' || filtroPeriodo === 'anio_actual')
    } catch (err: any) {
      mostrarAlertaError('Error al guardar los registros: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const agregarFilaMultiple = () => {
    setListaMultiple([...listaMultiple, { id: Date.now().toString(), montoBruto: '', propina: '', observacion: '' }])
  }

  const eliminarFilaMultiple = (id: string) => {
    if (listaMultiple.length === 1) return
    setListaMultiple(listaMultiple.filter(item => item.id !== id))
  }

  // 🚀 ELIMINAR REGISTRO MANUAL CON CONSULTA EXPLÍCITA DE USUARIO AUTENTICADO
  const handleEliminarVenta = async (id: string, doc: string) => {
    if (doc && doc.startsWith('MP-')) {
      mostrarAlertaError('⚠️ Los registros importados de Mercado Pago no se pueden eliminar por seguridad.')
      return
    }
    if (!confirm('¿Estás seguro de eliminar este registro manual?')) return

    try {
      // 🔒 Validamos explícitamente si el usuario actual está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error("Acceso denegado: Debes iniciar sesión con una cuenta autorizada para eliminar registros.")
      }

      const { error } = await supabase.from('ventas_diarias').delete().eq('id', id)
      if (error) throw error

      mostrarAlertaExito('Registro eliminado correctamente.')
      fetchVentas(filtroPeriodo === 'todos' || filtroPeriodo === 'anio_actual')
    } catch (err: any) {
      mostrarAlertaError('Error al eliminar: ' + err.message)
    }
  }

  const mediosPagoDisponibles = Array.from(
    new Map(
      [...MEDIOS_PAGO_DEFAULT, ...ventas.map(v => v.medio_pago)].map(mp => [mp.toLowerCase(), mp])
    ).values()
  )

  const ventasFiltradas = ventas.filter((v) => {
    let coincideFecha = true
    if (filtroFecha) {
      coincideFecha = v.fecha === filtroFecha
    } else if (filtroPeriodo !== 'todos') {
      const hoy = new Date()
      const fechaVenta = new Date(v.fecha + 'T00:00:00')
      
      if (filtroPeriodo === 'mes_actual') {
        coincideFecha = fechaVenta.getMonth() === hoy.getMonth() && fechaVenta.getFullYear() === hoy.getFullYear()
      } else if (filtroPeriodo === 'anio_actual') {
        coincideFecha = fechaVenta.getFullYear() === hoy.getFullYear()
      } else if (filtroPeriodo === 'ultimos_7_dias') {
        const hace7Dias = new Date()
        hace7Dias.setDate(hoy.getDate() - 7)
        coincideFecha = fechaVenta >= hace7Dias && fechaVenta <= hoy
      }
    }
    
    let coincideMedio = true
    if (filtroMedioPago !== 'Todos') {
      const medioVenta = (v.medio_pago || '').toLowerCase().trim()
      const filtroSel = filtroMedioPago.toLowerCase().trim()
      if (filtroSel === 'efectivo') {
        coincideMedio = medioVenta.includes('efectivo') || medioVenta.includes('cash') || medioVenta.includes('presencial')
      } else if (filtroSel === 'débito' || filtroSel === 'debito') {
        coincideMedio = medioVenta.includes('deb') || medioVenta.includes('debit')
      } else if (filtroSel === 'crédito' || filtroSel === 'credito') {
        const esDebitoExplicito = medioVenta.includes('deb') || medioVenta.includes('debit')
        coincideMedio = (medioVenta.includes('cred') || medioVenta.includes('credit') || medioVenta === 'master' || medioVenta === 'visa' || medioVenta.includes('mastercard')) && !esDebitoExplicito
      } else {
        coincideMedio = medioVenta === filtroSel
      }
    }
    const coincideLinea = filtroLinea === 'Todas' ? true : v.linea_negocio === filtroLinea
    return coincideFecha && coincideMedio && coincideLinea
  }).sort((a, b) => {
    let valorA: any = a[ordenColumna]
    let valorB: any = b[ordenColumna]
    if (ordenColumna === 'monto_bruto') {
      valorA = Number(valorA)
      valorB = Number(valorB)
    }
    if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1
    if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1
    return 0
  })

  const cambiarOrden = (columna: 'fecha' | 'monto_bruto') => {
    if (ordenColumna === columna) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenColumna(columna)
      setOrdenDireccion('desc')
    }
  }

  const totalBrutoFiltrado = ventasFiltradas.reduce((acc, curr) => acc + Number(curr.monto_bruto || 0), 0)
  const totalComisionFiltrado = ventasFiltradas.reduce((acc, curr) => acc + Number(curr.comision || 0), 0)
  const totalPropinaFiltrado = ventasFiltradas.reduce((acc, curr) => acc + Number(curr.propina || 0), 0)
  const totalMultiple = listaMultiple.reduce((acc, curr) => acc + (Number(curr.montoBruto) || 0), 0)
  const totalPropinaMultiple = listaMultiple.reduce((acc, curr) => acc + (Number(curr.propina) || 0), 0)

  const cantidadTransacciones = ventasFiltradas.length
  const ticketPromedio = cantidadTransacciones > 0 ? Math.round(totalBrutoFiltrado / cantidadTransacciones) : 0
  
  const proyeccionCierreMensual = useMemo(() => {
    const hoy = new Date()
    const anioActualCalc = hoy.getFullYear()
    const mesActualCalc = hoy.getMonth()
    const diaActual = hoy.getDate()
    const totalDiasMes = new Date(anioActualCalc, mesActualCalc + 1, 0).getDate()
    
    const ventasMesActual = ventas.filter(v => {
      if (!v.fecha) return false
      const [vAnio, vMes] = v.fecha.split('-').map(Number)
      return vAnio === anioActualCalc && vMes === (mesActualCalc + 1)
    })
    const totalMesActual = ventasMesActual.reduce((acc, curr) => acc + Number(curr.monto_bruto || 0), 0)
    if (diaActual === 0 || totalMesActual === 0) return 0
    const promedioDiario = totalMesActual / diaActual
    return Math.round(promedioDiario * totalDiasMes)
  }, [ventas])

  const ventasPorMedioPago = useMemo(() => {
    const mapa: { [key: string]: number } = {}
    ventasFiltradas.forEach(v => {
      const medio = v.medio_pago || 'Otro'
      mapa[medio] = (mapa[medio] || 0) + Number(v.monto_bruto || 0)
    })
    return Object.entries(mapa).sort((a, b) => b[1] - a[1])
  }, [ventasFiltradas])

  const coloresPaleta = ['#C5A059', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6']
  let acumuladoAngulo = 0
  const totalDonut = totalBrutoFiltrado || 1
  const porcionesDonut = ventasPorMedioPago.map(([medio, monto], idx) => {
    const porcentaje = monto / totalDonut
    const dashArray = `${porcentaje * 100} 100`
    const dashOffset = -acumuladoAngulo * 100
    acumuladoAngulo += porcentaje
    return {
      medio,
      monto,
      porcentaje: Math.round(porcentaje * 100),
      color: coloresPaleta[idx % coloresPaleta.length],
      dashArray,
      dashOffset
    }
  })

  return (
    <div className="space-y-8 p-6 bg-slate-50 min-h-screen relative font-sans">
      
      {/* NOTIFICACIONES FLOTANTES */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {mensajeExito && (
          <div className="pointer-events-auto bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border border-emerald-500 animate-bounce">
            <Check size={20} className="shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}
        {mensajeError && (
          <div className="pointer-events-auto bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border border-rose-500 animate-pulse">
            <AlertCircle size={20} className="shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200/90 p-7 rounded-3xl shadow-sm">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#C5A059]">Sustrato WorkCoffee • Arica</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Ventas Diarias</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control avanzado de transacciones, filtros temporales y analítica pro</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="cursor-pointer flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all">
            <Upload size={16} />
            <span>Importar Reporte (Excel / TXT / CSV)</span>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv,.txt" 
              className="hidden" 
              onChange={handleImportarArchivo} 
            />
          </label>
        </div>
      </div>

      {/* PANEL DE NUEVO REGISTRO */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300">
        <button
          type="button"
          onClick={() => setFormularioAbierto(!formularioAbierto)}
          className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 text-white text-left cursor-pointer hover:brightness-110 transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-[#C5A059] rounded-xl border border-amber-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">Panel de Nuevo Registro Financiero</h2>
              <p className="text-[11px] text-[#C5A059] font-bold mt-0.5">Despliega para registrar ingresos múltiples al instante en Sustrato</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl text-xs font-black text-[#C5A059] border border-amber-500/20">
            <span>{formularioAbierto ? 'Ocultar panel' : 'Nuevo registro'}</span>
            <ChevronDown size={16} className={`transition-transform duration-300 ${formularioAbierto ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {formularioAbierto && (
          <div className="p-7 space-y-6 bg-slate-50/50 border-t border-slate-100 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Fecha general</label>
                <input 
                  type="date" 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Línea de negocio</label>
                <select 
                  value={lineaNegocioSelect} 
                  onChange={(e) => setLineaNegocioSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900"
                >
                  {LINEAS_NEGOCIO_DEFAULT.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  <option value="Otro">✏️ Otro (Escribir manual)...</option>
                </select>
              </div>
              {lineaNegocioSelect === 'Otro' && (
                <div>
                  <label className="block text-xs font-black text-amber-800 mb-1">Especificar línea manual</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Asesoría especial" 
                    value={lineaNegocioCustom} 
                    onChange={(e) => setLineaNegocioCustom(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-amber-400 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 bg-amber-50/30 font-bold text-slate-900"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Medio de pago</label>
                <select 
                  value={medioPago} 
                  onChange={(e) => setMedioPago(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-black text-amber-800"
                >
                  {MEDIOS_PAGO_DEFAULT.map((mp) => (
                    <option key={mp} value={mp}>{mp}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">Montos, propinas y observaciones:</label>
              
              {listaMultiple.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 w-6 font-mono">#{index + 1}</span>
                  <div className="w-36">
                    <input 
                      type="number"
                      placeholder="Monto Bruto ($)"
                      value={item.montoBruto}
                      onChange={(e) => {
                        const nuevaLista = [...listaMultiple]
                        nuevaLista[index].montoBruto = e.target.value
                        setListaMultiple(nuevaLista)
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-black text-slate-900 font-mono"
                    />
                  </div>
                  <div className="w-32">
                    <input 
                      type="number"
                      placeholder="Propina ($)"
                      value={item.propina}
                      onChange={(e) => {
                        const nuevaLista = [...listaMultiple]
                        nuevaLista[index].propina = e.target.value
                        setListaMultiple(nuevaLista)
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 text-emerald-700 font-black font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text"
                      placeholder="Observación opcional..."
                      value={item.observacion}
                      onChange={(e) => {
                        const nuevaLista = [...listaMultiple]
                        nuevaLista[index].observacion = e.target.value
                        setListaMultiple(nuevaLista)
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 text-slate-700 font-medium"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => eliminarFilaMultiple(item.id)}
                    className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    title="Quitar línea"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <button 
                type="button"
                onClick={agregarFilaMultiple}
                className="text-xs font-black text-amber-700 hover:underline flex items-center gap-1"
              >
                + Agregar otra línea de precio
              </button>
              
              <div className="text-right flex gap-6">
                <div>
                  <span className="text-xs text-slate-500 mr-1 font-bold">Total propinas:</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">${totalPropinaMultiple.toLocaleString('es-CL')}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 mr-1 font-bold">Total bruto:</span>
                  <span className="text-base font-black text-slate-900 font-mono">${totalMultiple.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setFormularioAbierto(false)}
                className="py-3 px-5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-2xl text-xs transition"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleGuardarMultiple}
                disabled={loading}
                className="flex items-center gap-2 py-3 px-7 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl text-xs shadow-md transition disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />} 
                {loading ? 'Guardando...' : 'Guardar registros'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN DE TABS */}
      <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-black text-slate-900">Listado y Analítica de Ventas</h3>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-0.5 rounded-full font-black font-mono">
              {ventasFiltradas.length} resultados
            </span>
            {loading && <span className="text-xs text-amber-600 font-bold animate-pulse">Cargando datos...</span>}
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('tabla')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'tabla' ? 'bg-[#181818] text-[#C5A059] shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered size={15} /> Tabla de Transacciones
            </button>
            <button
              onClick={() => setActiveTab('estadisticas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'estadisticas' ? 'bg-[#181818] text-[#C5A059] shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={15} /> Panel de Gráficos y Estadísticas
            </button>
          </div>
        </div>

        {/* FILTROS GENERALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">Filtrar por periodo</label>
            <select
              value={filtroPeriodo}
              onChange={(e) => handleCambioPeriodo(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900 cursor-pointer"
            >
              <option value="mes_actual">📆 Este Mes (Carga rápida)</option>
              <option value="anio_actual">📈 Este Año (Carga 12 Meses)</option>
              <option value="todos">📅 Todo el historial completo</option>
              <option value="ultimos_7_dias">⚡ Últimos 7 Días</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">O fecha exacta</label>
            <input 
              type="date"
              value={filtroFecha}
              onChange={(e) => { setFiltroFecha(e.target.value); }}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">Medio de pago</label>
            <select
              value={filtroMedioPago}
              onChange={(e) => setFiltroMedioPago(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900"
            >
              <option value="Todos">Todos los medios</option>
              {mediosPagoDisponibles.map((mp) => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">Línea de negocio</label>
            <select
              value={filtroLinea}
              onChange={(e) => setFiltroLinea(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 font-bold text-slate-900"
            >
              <option value="Todas">Todas las líneas</option>
              {LINEAS_NEGOCIO_DEFAULT.map((ln) => (
                <option key={ln} value={ln}>{ln}</option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'tabla' && (
          <div className="overflow-x-auto animate-fadeIn">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#181818] text-[#C5A059]">
                  <th onClick={() => cambiarOrden('fecha')} className="py-3.5 px-4 cursor-pointer hover:text-white transition select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Fecha</span>
                      <ArrowUpDown size={14} className={ordenColumna === 'fecha' ? 'text-[#C5A059]' : 'text-slate-500'} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Línea de negocio</th>
                  <th className="py-3.5 px-4">Medio de pago</th>
                  <th className="py-3.5 px-4">Documento</th>
                  <th onClick={() => cambiarOrden('monto_bruto')} className="py-3.5 px-4 cursor-pointer hover:text-white transition select-none">
                    <div className="flex items-center gap-1.5">
                      <span>Venta bruta</span>
                      <ArrowUpDown size={14} className={ordenColumna === 'monto_bruto' ? 'text-[#C5A059]' : 'text-slate-500'} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Comisión</th>
                  <th className="py-3.5 px-4">Propina</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 font-medium">Cargando registros...</td></tr>
                ) : ventasFiltradas.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400 font-medium">No hay ventas registradas con estos filtros.</td></tr>
                ) : (
                  ventasFiltradas.map((v) => {
                    const esMpAutomatico = v.documento && v.documento.startsWith('MP-')
                    return (
                      <tr key={v.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-4 px-4 text-slate-600 font-mono font-bold">{v.fecha}</td>
                        <td className="py-4 px-4 font-bold text-slate-800">{v.linea_negocio}</td>
                        <td className="py-4 px-4 text-slate-600">{v.medio_pago}</td>
                        <td className="py-4 px-4 text-slate-500 font-mono">{v.documento}</td>
                        <td className="py-4 px-4 font-black text-slate-900 font-mono">${Number(v.monto_bruto).toLocaleString('es-CL')}</td>
                        <td className="py-4 px-4 text-rose-600 font-bold font-mono">${Number(v.comision || 0).toLocaleString('es-CL')}</td>
                        <td className="py-4 px-4 text-emerald-700 font-black font-mono">${Number(v.propina || 0).toLocaleString('es-CL')}</td>
                        <td className="py-4 px-4 text-center">
                          {!esMpAutomatico ? (
                            <button onClick={() => handleEliminarVenta(v.id, v.documento)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-xl transition hover:bg-rose-50" title="Eliminar registro manual">
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-full">🔒 Auto</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {!loading && ventasFiltradas.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 border-t-2 border-slate-200 text-xs font-black text-slate-900">
                    <td colSpan={4} className="py-4 px-4 text-right">TOTALES FILTRADOS:</td>
                    <td className="py-4 px-4 text-slate-900 font-mono">${totalBrutoFiltrado.toLocaleString('es-CL')}</td>
                    <td className="py-4 px-4 text-rose-600 font-mono">${totalComisionFiltrado.toLocaleString('es-CL')}</td>
                    <td className="py-4 px-4 text-emerald-700 font-mono">${totalPropinaFiltrado.toLocaleString('es-CL')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div className="space-y-6 animate-fadeIn pt-2">
            <div className="grid gap-5 sm:grid-cols-3">
              <article className="p-6 rounded-3xl border border-slate-200 bg-slate-50/60 shadow-sm border-l-6 border-l-[#C5A059]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Venta Bruta Filtrada</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1 font-mono">${totalBrutoFiltrado.toLocaleString('es-CL')}</h4>
              </article>
              <article className="p-6 rounded-3xl border border-slate-200 bg-slate-50/60 shadow-sm border-l-6 border-l-rose-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comisiones Totales</p>
                <h4 className="text-2xl font-black text-rose-600 mt-1 font-mono">${totalComisionFiltrado.toLocaleString('es-CL')}</h4>
              </article>
              <article className="p-6 rounded-3xl border border-slate-200 bg-slate-50/60 shadow-sm border-l-6 border-l-emerald-600">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Propinas Acumuladas</p>
                <h4 className="text-2xl font-black text-emerald-700 mt-1 font-mono">${totalPropinaFiltrado.toLocaleString('es-CL')}</h4>
              </article>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <article className="p-7 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <PieChart size={18} className="text-[#C5A059]" /> Distribución por Medio de Pago
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                  <div className="relative size-44 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="size-full rotate-[-90deg]">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F1F5F9" strokeWidth="3.5"></circle>
                      {porcionesDonut.map((p, idx) => (
                        <circle
                          key={idx}
                          cx="18" cy="18" r="15.5"
                          fill="none"
                          stroke={p.color}
                          strokeWidth="3.5"
                          strokeDasharray={p.dashArray}
                          strokeDashoffset={p.dashOffset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto</span>
                      <span className="text-sm font-black text-slate-900 font-mono">${(totalBrutoFiltrado / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                  <div className="space-y-3 w-full sm:w-auto max-h-44 overflow-y-auto pr-2">
                    {porcionesDonut.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-6 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-slate-700">{p.medio}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900 block font-mono">${p.monto.toLocaleString('es-CL')}</span>
                          <span className="text-[10px] text-slate-400 font-extrabold">{p.porcentaje}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="p-7 rounded-3xl border border-slate-200 bg-white shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Activity size={18} className="text-[#C5A059]" /> Salud y Proyección del Negocio
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users size={13} className="text-amber-600" /> Transacciones
                    </span>
                    <p className="text-xl font-black text-slate-900 font-mono">{cantidadTransacciones}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign size={13} className="text-emerald-600" /> Ticket Promedio
                    </span>
                    <p className="text-xl font-black text-slate-900 font-mono">${ticketPromedio.toLocaleString('es-CL')}</p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950 text-white space-y-2 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#C5A059] flex items-center gap-1.5">
                      <Target size={15} /> Proyección de Cierre Mensual
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-black font-mono text-white">${proyeccionCierreMensual.toLocaleString('es-CL')}</h3>
                    <span className="text-[11px] text-slate-300 font-medium">Calculado al día actual</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}