import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Trash2, PlusCircle, RefreshCw, ArrowRightLeft, Check, AlertCircle, Loader2, X, FileText, Settings2, Edit3, Save } from 'lucide-react'

interface Egreso {
  id: string
  fecha: string
  categoria: string
  cuenta: string
  monto: number
  descripcion: string
  documento: string
  tipo_comprobante?: string
  es_traspaso?: boolean
}

const CATEGORIAS_INICIALES = [
  'Insumos y Mercadería',
  'Personal y Sueldos',
  'Servicios Básicos',
  'Software y Suscripciones',
  'Marketing y Publicidad',
  'Arriendo y Gastos Comunes',
  'Gastos Operativos y Varios',
  'Gasto General',
  'Retiro a Cuenta Bancaria',
]

const TIPOS_COMPROBANTE = ['Factura', 'Boleta', 'Comprobante / Otro', 'S/D']

const CUENTAS_SALIDA = [
  'Caja / Efectivo',
  'Santander',
  'Banco de Chile',
  'Mercado Pago',
  'Otra cuenta',
]

function getPeriods() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(date),
    }
  })
}

const periods = getPeriods()

export default function Egresos() {
  const [period, setPeriod] = useState(periods[0].value)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  
  const [listaCategorias, setListaCategorias] = useState<string[]>(CATEGORIAS_INICIALES)
  const [categoria, setCategoria] = useState(CATEGORIAS_INICIALES[0])
  
  const [cuenta, setCuenta] = useState(CUENTAS_SALIDA[0])
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('Boleta')
  const [nroDocumento, setNroDocumento] = useState('')
  const [esTraspasoForm, setEsTraspasoForm] = useState(false)
  
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [loading, setLoading] = useState(false)

  // Notificaciones Toast
  const [mensajeExito, setMensajeExito] = useState('')
  const [mensajeError, setMensajeError] = useState('')

  // Modal de Eliminación Profesional
  const [egresoAEliminar, setEgresoAEliminar] = useState<Egreso | null>(null)
  const [textoConfirmacion, setTextoConfirmacion] = useState('')

  // Modal de Gestión de Categorías
  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false)
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState('')
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<string | null>(null)
  const [nombreEditadoInput, setNombreEditadoInput] = useState('')

  // Filtros de tabla
  const [filtroFechaEspecifica, setFiltroFechaEspecifica] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [filtroCuenta, setFiltroCuenta] = useState('Todas')

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

  useEffect(() => {
    const savedCats = localStorage.getItem('sustrato_categorias_egreso_v3')
    if (savedCats) {
      try {
        const parsed = JSON.parse(savedCats)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setListaCategorias(parsed)
          setCategoria(parsed[0])
        }
      } catch (e) {
        console.error('Error al parsear categorías', e)
      }
    }
  }, [])

  const guardarCategoriasLocalStorage = (nuevasCats: string[]) => {
    setListaCategorias(nuevasCats)
    localStorage.setItem('sustrato_categorias_egreso_v3', JSON.stringify(nuevasCats))
  }

  const fetchEgresos = async () => {
    setLoading(true)
    const [añoStr, mesStr] = period.split('-')
    const año = Number(añoStr)
    const mes = Number(mesStr)
    const fechaInicio = `${año}-${String(mes).padStart(2, '0')}-01`
    
    const siguienteFecha = new Date(año, mes, 1)
    const añoSig = siguienteFecha.getFullYear()
    const mesSig = String(siguienteFecha.getMonth() + 1).padStart(2, '0')
    const fechaFinSiguiente = `${añoSig}-${mesSig}-01`

    const { data, error } = await supabase
      .from('egresos')
      .select('*')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFinSiguiente)
      .order('fecha', { ascending: false })

    if (error) {
      mostrarAlertaError('Error al conectar con la base de datos.')
    } else {
      setEgresos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEgresos()
  }, [period])

  const handleCambiarCategoriaFila = async (id: string, nuevaCat: string) => {
    setEgresos(prev => prev.map(item => item.id === id ? { ...item, categoria: nuevaCat } : item))

    const { error } = await supabase
      .from('egresos')
      .update({ categoria: nuevaCat })
      .eq('id', id)

    if (error) {
      mostrarAlertaError('Error al actualizar la categoría: ' + error.message)
      fetchEgresos()
    } else {
      mostrarAlertaExito(`Categoría actualizada a "${nuevaCat}"`)
    }
  }

  const handleGuardarEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!monto || Number(monto) <= 0) {
      mostrarAlertaError('Por favor ingresa un monto válido.')
      return
    }

    const docFinal = nroDocumento ? `${tipoComprobante}: ${nroDocumento}` : tipoComprobante

    const nuevoEgreso = {
      fecha,
      categoria,
      cuenta,
      monto: Number(monto),
      descripcion: descripcion || (esTraspasoForm ? 'Traspaso interno' : 'Sin descripción'),
      documento: docFinal,
      tipo_comprobante: tipoComprobante,
      es_traspaso: esTraspasoForm,
    }

    setLoading(true)
    const { error } = await supabase.from('egresos').insert([nuevoEgreso])
    setLoading(false)

    if (error) {
      mostrarAlertaError('Error al guardar egreso: ' + error.message)
    } else {
      mostrarAlertaExito('¡Gasto registrado con éxito!')
      setMonto('')
      setDescripcion('')
      setNroDocumento('')
      setEsTraspasoForm(false)
      fetchEgresos()
    }
  }

  const handleToggleTraspaso = async (id: string, estadoActual?: boolean) => {
    const nuevoEstado = !estadoActual
    const { error } = await supabase
      .from('egresos')
      .update({ es_traspaso: nuevoEstado })
      .eq('id', id)

    if (error) {
      mostrarAlertaError('Error al actualizar: ' + error.message)
    } else {
      mostrarAlertaExito(nuevoEstado ? 'Marcado como Traspaso Interno.' : 'Restablecido a Gasto Operativo.')
      fetchEgresos()
    }
  }

  const ejecutarEliminacion = async () => {
    if (!egresoAEliminar) return
    if (textoConfirmacion.trim().toUpperCase() !== 'ELIMINAR') {
      mostrarAlertaError('Debes escribir la palabra ELIMINAR para confirmar.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('egresos').delete().eq('id', egresoAEliminar.id)
    setLoading(false)

    if (error) {
      mostrarAlertaError('Error al eliminar: ' + error.message)
    } else {
      mostrarAlertaExito('Registro eliminado permanentemente.')
      setEgresoAEliminar(null)
      setTextoConfirmacion('')
      fetchEgresos()
    }
  }

  const handleCrearCategoria = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nuevaCategoriaInput.trim()
    if (!trimmed) return
    if (listaCategorias.includes(trimmed)) {
      mostrarAlertaError('Esta categoría ya existe.')
      return
    }
    const actualizadas = [trimmed, ...listaCategorias]
    guardarCategoriasLocalStorage(actualizadas)
    setNuevaCategoriaInput('')
    mostrarAlertaExito(`Categoría "${trimmed}" creada.`)
  }

  const handleGuardarEdicionCategoria = (catAntigua: string) => {
    const trimmed = nombreEditadoInput.trim()
    if (!trimmed) return
    if (listaCategorias.includes(trimmed) && trimmed !== catAntigua) {
      mostrarAlertaError('Ya existe otra categoría con ese nombre.')
      return
    }
    const actualizadas = listaCategorias.map(c => c === catAntigua ? trimmed : c)
    guardarCategoriasLocalStorage(actualizadas)
    if (categoria === catAntigua) setCategoria(trimmed)
    setCategoriaEnEdicion(null)
    setNombreEditadoInput('')
    mostrarAlertaExito('Categoría actualizada con éxito.')
  }

  const handleEliminarCategoria = (catAEliminar: string) => {
    if (listaCategorias.length <= 1) {
      mostrarAlertaError('Debes mantener al menos una categoría.')
      return
    }
    const actualizadas = listaCategorias.filter(c => c !== catAEliminar)
    guardarCategoriasLocalStorage(actualizadas)
    if (categoria === catAEliminar) setCategoria(actualizadas[0])
    mostrarAlertaExito('Categoría eliminada.')
  }

  const egresosFiltrados = egresos.filter((e) => {
    const coincideFecha = filtroFechaEspecifica ? e.fecha === filtroFechaEspecifica : true
    const coincideCategoria = filtroCategoria === 'Todas' ? true : e.categoria === filtroCategoria
    const coincideCuenta = filtroCuenta === 'Todas' ? true : e.cuenta === filtroCuenta
    return coincideFecha && coincideCategoria && coincideCuenta
  })

  const totalEgresosReales = egresosFiltrados
    .filter((e) => !e.es_traspaso)
    .reduce((acc, curr) => acc + Number(curr.monto || 0), 0)

  return (
    <div className="space-y-8 p-6 bg-slate-50 min-h-screen relative font-sans">
      
      {/* NOTIFICACIONES TOAST */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {mensajeExito && (
          <div className="pointer-events-auto bg-emerald-900 text-emerald-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-emerald-700 animate-bounce">
            <Check size={20} className="text-emerald-400 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}
        {mensajeError && (
          <div className="pointer-events-auto bg-rose-950 text-rose-50 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-rose-800 animate-pulse">
            <AlertCircle size={20} className="text-rose-400 shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}
      </div>

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      {modalCategoriasAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Administrar Categorías</h3>
                <p className="text-xs text-slate-500">Crea, edita o elimina las categorías disponibles.</p>
              </div>
              <button onClick={() => setModalCategoriasAbierto(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearCategoria} className="flex gap-2">
              <input 
                type="text"
                placeholder="Nueva categoría..."
                value={nuevaCategoriaInput}
                onChange={(e) => setNuevaCategoriaInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button type="submit" className="px-5 py-2.5 bg-[#181818] hover:bg-slate-900 text-[#C5A059] font-black rounded-2xl text-xs shadow transition flex items-center gap-1.5">
                <PlusCircle size={16} /> Agregar
              </button>
            </form>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {listaCategorias.map((cat) => (
                <div key={cat} className="pt-2.5 pb-2 flex items-center justify-between gap-3 text-xs">
                  {categoriaEnEdicion === cat ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="text"
                        value={nombreEditadoInput}
                        onChange={(e) => setNombreEditadoInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-amber-500 rounded-xl font-bold text-xs outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleGuardarEdicionCategoria(cat)} className="p-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Save size={14} /></button>
                      <button onClick={() => setCategoriaEnEdicion(null)} className="p-1.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-800">{cat}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setCategoriaEnEdicion(cat); setNombreEditadoInput(cat); }} className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition" title="Editar"><Edit3 size={14} /></button>
                        <button onClick={() => handleEliminarCategoria(cat)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition" title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setModalCategoriasAbierto(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl text-xs shadow hover:bg-slate-800 transition">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {egresoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><AlertCircle size={24} /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">¿Eliminar registro?</h3>
                  <p className="text-xs text-slate-500">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <button onClick={() => { setEgresoAEliminar(null); setTextoConfirmacion(''); }} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p><strong className="text-slate-700">Fecha:</strong> {egresoAEliminar.fecha}</p>
              <p><strong className="text-slate-700">Categoría:</strong> {egresoAEliminar.categoria}</p>
              <p><strong className="text-slate-700">Monto:</strong> ${Number(egresoAEliminar.monto).toLocaleString('es-CL')}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Escribe <span className="text-rose-600 uppercase font-black">ELIMINAR</span> para confirmar:</label>
              <input 
                type="text"
                placeholder="ELIMINAR"
                value={textoConfirmacion}
                onChange={(e) => setTextoConfirmacion(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold uppercase"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setEgresoAEliminar(null); setTextoConfirmacion(''); }} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition">Cancelar</button>
              <button type="button" onClick={ejecutarEliminacion} disabled={textoConfirmacion.trim().toUpperCase() !== 'ELIMINAR' || loading} className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow transition disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />} Confirmar baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-[#C5A059]">Sustrato WorkCoffee • Arica</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Control de Egresos y Comprobantes</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setModalCategoriasAbierto(true)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-800 shadow-sm transition">
            <Settings2 size={16} className="text-[#C5A059]" /> Gestionar Categorías
          </button>
          
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-4 text-xs font-bold capitalize text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-[#C5A059]">
            {periods.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
          </select>
          <button type="button" onClick={fetchEgresos} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#181818] hover:bg-slate-900 px-5 text-xs font-black text-[#C5A059] shadow-sm transition">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* FORMULARIO DE NUEVO EGRESO */}
      <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-900">Registrar Salida / Gasto Operativo</h2>
          <p className="text-xs text-slate-500 font-medium">Asigna la categoría exacta, adjunta tipo de comprobante (factura/boleta) y número de documento.</p>
        </div>

        <form onSubmit={handleGuardarEgreso} className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#C5A059] outline-none" required />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Categoría</label>
              <button type="button" onClick={() => setModalCategoriasAbierto(true)} className="text-[10px] text-[#C5A059] font-black hover:underline">+ Nueva</button>
            </div>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#C5A059] outline-none">
              {listaCategorias.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Cuenta de origen</label>
            <select value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#C5A059] outline-none">
              {CUENTAS_SALIDA.map((cta) => (<option key={cta} value={cta}>{cta}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Monto ($ CLP)</label>
            <input type="number" placeholder="Ej. 15000" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#C5A059] outline-none" required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Descripción / Detalle</label>
            <input type="text" placeholder="Ej. Pago sueldo operador o Compra de insumos" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#C5A059] outline-none" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Tipo Comprobante</label>
            <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-[#C5A059] outline-none">
              {TIPOS_COMPROBANTE.map((tip) => (<option key={tip} value={tip}>{tip}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Nº Factura / Boleta / Folio</label>
            <input type="text" placeholder="Ej. 14253 o S/N" value={nroDocumento} onChange={(e) => setNroDocumento(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#C5A059] outline-none" />
          </div>

          <div className="md:col-span-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={esTraspasoForm} onChange={(e) => setEsTraspasoForm(e.target.checked)} className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500" />
              <span className="text-xs font-black text-amber-900">Marcar como Traspaso / Retiro Interno (No cuenta como pérdida ni gasto operacional)</span>
            </label>

            <button type="submit" disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 bg-[#181818] hover:bg-slate-900 text-[#C5A059] font-black rounded-2xl text-xs shadow-lg transition disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />} Guardar registro
            </button>
          </div>
        </form>
      </div>

      {/* TABLA CON SELECTOR DE CATEGORÍA DIRECTO EN CADA FILA */}
      <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-slate-900">Historial Financiero</h3>
            <span className="text-xs bg-amber-500/10 text-amber-800 px-3 py-1 rounded-full font-black border border-amber-500/20">
              {egresosFiltrados.length} registros • Gasto Real: ${Number(totalEgresosReales).toLocaleString('es-CL')}
            </span>
          </div>
        </div>

        {/* FILTROS SECUNDARIOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Filtrar por fecha</label>
            <input type="date" value={filtroFechaEspecifica} onChange={(e) => setFiltroFechaEspecifica(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white font-bold outline-none focus:ring-2 focus:ring-[#C5A059]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Filtrar por categoría</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white font-bold outline-none focus:ring-2 focus:ring-[#C5A059]">
              <option value="Todas">Todas las categorías</option>
              {listaCategorias.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Filtrar por cuenta</label>
            <select value={filtroCuenta} onChange={(e) => setFiltroCuenta(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-2xl text-xs bg-white font-bold outline-none focus:ring-2 focus:ring-[#C5A059]">
              <option value="Todas">Todas las cuentas</option>
              {CUENTAS_SALIDA.map((cta) => (<option key={cta} value={cta}>{cta}</option>))}
            </select>
          </div>
        </div>

        {(filtroFechaEspecifica || filtroCategoria !== 'Todas' || filtroCuenta !== 'Todas') && (
          <div className="flex justify-end">
            <button onClick={() => { setFiltroFechaEspecifica(''); setFiltroCategoria('Todas'); setFiltroCuenta('Todas'); }} className="text-xs text-amber-800 font-black hover:underline">
              Limpiar filtros ✕
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Categoría (Modificable) / Comprobante</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Cuenta</th>
                <th className="py-3.5 px-4">Monto</th>
                <th className="py-3.5 px-4 text-center">Traspaso</th>
                <th className="py-3.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 font-medium">Sincronizando registros...</td></tr>
              ) : egresosFiltrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 font-medium">No hay registros financieros para este periodo.</td></tr>
              ) : (
                egresosFiltrados.map((e) => (
                  <tr key={e.id} className={e.es_traspaso ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80 transition'}>
                    <td className="py-4 px-4 font-bold text-slate-600">{e.fecha}</td>
                    
                    {/* SELECTOR DESPLEGABLE DIRECTO EN LA FILA */}
                    <td className="py-4 px-4 space-y-1.5">
                      <select 
                        value={e.categoria} 
                        onChange={(event) => handleCambiarCategoriaFila(e.id, event.target.value)}
                        className="w-full max-w-[220px] px-3 py-1.5 border border-amber-500/40 rounded-xl text-xs font-black bg-amber-50/50 text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                      >
                        {listaCategorias.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          <FileText size={10} /> {e.documento || 'S/D'}
                        </span>
                        {e.es_traspaso && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                            Traspaso
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-600">{e.descripcion}</td>
                    <td className="py-4 px-4 font-bold text-slate-600">{e.cuenta}</td>
                    <td className={`py-4 px-4 font-black font-mono text-sm ${e.es_traspaso ? 'text-sky-700 line-through' : 'text-rose-600'}`}>
                      ${Number(e.monto).toLocaleString('es-CL')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => handleToggleTraspaso(e.id, e.es_traspaso)} 
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black transition ${
                          e.es_traspaso 
                            ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Cambiar entre Gasto Operativo y Traspaso Interno"
                      >
                        <ArrowRightLeft size={13} />
                        {e.es_traspaso ? 'Es Traspaso' : 'Hacer Traspaso'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => setEgresoAEliminar(e)} 
                        className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-xl transition" 
                        title="Eliminar registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && egresosFiltrados.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-200 text-xs font-black text-slate-900">
                  <td colSpan={4} className="py-4 px-4 text-right tracking-wider">TOTAL GASTOS OPERATIVOS REALES:</td>
                  <td className="py-4 px-4 text-rose-600 text-sm font-mono">${totalEgresosReales.toLocaleString('es-CL')}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}