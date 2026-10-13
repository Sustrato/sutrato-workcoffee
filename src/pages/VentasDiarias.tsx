import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Download, Upload, Trash2, PlusCircle, RefreshCw, Lock, FileSpreadsheet } from 'lucide-react'

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
  'Junaeb - Edenred',
  'Junaeb - Pluxee',
  'Junaeb - Amipass',
  'Mercado Pago',
  'Otro',
]

export default function VentasDiarias() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  
  const [lineaNegocioSelect, setLineaNegocioSelect] = useState(LINEAS_NEGOCIO_DEFAULT[0])
  const [lineaNegocioCustom, setLineaNegocioCustom] = useState('')
  
  const [medioPago, setMedioPago] = useState(MEDIOS_PAGO_DEFAULT[0])
  const [montoBruto, setMontoBruto] = useState('')
  const [comision, setComision] = useState('')
  const [propina, setPropina] = useState('')
  const [documento, setDocumento] = useState('')
  const [observacion, setObservacion] = useState('')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(false)
  const [syncingMp, setSyncingMp] = useState(false)

  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroMedioPago, setFiltroMedioPago] = useState('Todos')
  const [filtroLinea, setFiltroLinea] = useState('Todas')

  const fetchVentas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ventas_diarias')
      .select('*')
      .order('fecha', { ascending: false })
    if (error) {
      console.error('Error cargando ventas:', error.message)
    } else {
      setVentas(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVentas()
  }, [])

  const handleGuardarVenta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!montoBruto || Number(montoBruto) <= 0) {
      alert('Por favor ingresa un monto bruto válido.')
      return
    }
    const lineaFinal = lineaNegocioSelect === 'Otro' ? lineaNegocioCustom.trim() : lineaNegocioSelect
    if (!lineaFinal) {
      alert('Por favor especifica la línea de negocio personalizada.')
      return
    }
    const nuevaVenta = {
      fecha,
      linea_negocio: lineaFinal,
      medio_pago: medioPago,
      monto_bruto: Number(montoBruto),
      comision: comision ? Number(comision) : 0,
      propina: propina ? Number(propina) : 0,
      documento: documento || 'Sin documento',
      observacion,
    }
    const { error } = await supabase.from('ventas_diarias').insert([nuevaVenta])
    if (error) {
      alert('Hubo un error al guardar la venta: ' + error.message)
    } else {
      setMontoBruto('')
      setComision('')
      setPropina('')
      setDocumento('')
      setObservacion('')
      setLineaNegocioCustom('')
      setLineaNegocioSelect(LINEAS_NEGOCIO_DEFAULT[0])
      fetchVentas()
    }
  }

  const handleSincronizarMP = async () => {
    setSyncingMp(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sincronizar-mercado-pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      })
      const result = await res.json()
      if (result.success) {
        alert(`✅ Sincronización exitosa: ${result.mensaje}`)
        fetchVentas()
      } else {
        alert('⚠️ Error al sincronizar: ' + result.error)
      }
    } catch (err: any) {
      alert('Error de conexión al sincronizar: ' + err.message)
    } finally {
      setSyncingMp(false)
    }
  }

  const handleEliminarVenta = async (id: string, doc: string) => {
    if (doc && doc.startsWith('MP-')) {
      alert('⚠️ No se pueden eliminar registros automáticos sincronizados de Mercado Pago.')
      return
    }
    if (!confirm('¿Estás seguro de eliminar este registro manual?')) return
    const { error } = await supabase.from('ventas_diarias').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      fetchVentas()
    }
  }

  const ventasFiltradas = ventas.filter((v) => {
    const coincideFecha = filtroFecha ? v.fecha === filtroFecha : true
    const coincideMedio = filtroMedioPago === 'Todos' ? true : v.medio_pago === filtroMedioPago
    const coincideLinea = filtroLinea === 'Todas' ? true : v.linea_negocio === filtroLinea
    return coincideFecha && coincideMedio && coincideLinea
  })

  return (
    <div className="space-y-8 p-6 bg-slate-100/70 min-h-screen font-sans">
      
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black p-1 border-2 border-amber-500/80 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            
           <img 
  src="/Sustrato%20Logo.png" 
  alt="Sustrato WorkCoffee Logo" 
  className="w-full h-full object-cover rounded-full"
  onError={(e) => {
                
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
            <span className="text-2xl hidden fallback-icon">☕</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Sustrato WorkCoffee • Arica
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
              Ventas Diarias & Finanzas
            </h1>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleSincronizarMP}
            disabled={syncingMp}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/30 disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncingMp ? 'animate-spin' : ''} />
            {syncingMp ? 'Sincronizando MP...' : 'Sincronizar MP'}
          </button>
          <button className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition">
            Respaldar
          </button>
          <button className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition">
            Restaurar
          </button>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO MANUAL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="text-amber-600" size={20} />
              Registro manual de venta
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Ingresa ventas manuales en efectivo, transferencias o facturas.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
              <Download size={14} /> Plantilla CSV
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
              <Upload size={14} /> Importar CSV
            </button>
          </div>
        </div>

        <form onSubmit={handleGuardarVenta} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
            <input 
              type="date" 
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition bg-slate-50/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Línea de negocio</label>
            <select 
              value={lineaNegocioSelect} 
              onChange={(e) => setLineaNegocioSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:ring-2 focus:ring-amber-500 outline-none transition"
            >
              {LINEAS_NEGOCIO_DEFAULT.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
              <option value="Otro">✏️ Otro (Escribir manual)...</option>
            </select>
          </div>

          {lineaNegocioSelect === 'Otro' && (
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">Especificar línea manual</label>
              <input 
                type="text" 
                placeholder="Ej. Asesoría especial" 
                value={lineaNegocioCustom} 
                onChange={(e) => setLineaNegocioCustom(e.target.value)}
                className="w-full px-3 py-2 border border-amber-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-amber-50/40"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Medio de pago</label>
            <select 
              value={medioPago} 
              onChange={(e) => setMedioPago(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:ring-2 focus:ring-amber-500 outline-none transition"
            >
              {MEDIOS_PAGO_DEFAULT.map((mp) => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Monto bruto ($)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={montoBruto} 
              onChange={(e) => setMontoBruto(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Comisión pasarela ($)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={comision} 
              onChange={(e) => setComision(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-rose-600 font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Propina ($)</label>
            <input 
              type="number" 
              placeholder="0" 
              value={propina} 
              onChange={(e) => setPropina(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-emerald-600 font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Documento / Cierre</label>
            <input 
              type="text" 
              placeholder="Ej. cierre POS 1054 / Boleta #120" 
              value={documento} 
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-slate-50/50"
            />
          </div>

          <div className="md:col-span-4 flex items-end pt-2">
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-600/20 transition-all"
            >
              <PlusCircle size={18} /> Guardar venta diaria
            </button>
          </div>
        </form>
      </div>

      {/* LISTADO DE VENTAS CON COLOR Y MEJORAS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Ventas registradas</h3>
            <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {ventasFiltradas.length} resultados
            </span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
            <FileSpreadsheet size={15} /> Exportar CSV
          </button>
        </div>

        {/* BLOQUE DE FILTROS CUIDADOSAMENTE DISEÑADO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Filtrar por fecha específica</label>
            <input 
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Filtrar por medio de pago</label>
            <select
              value={filtroMedioPago}
              onChange={(e) => setFiltroMedioPago(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="Todos">Todos los medios</option>
              {MEDIOS_PAGO_DEFAULT.map((mp) => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Filtrar por línea de negocio</label>
            <select
              value={filtroLinea}
              onChange={(e) => setFiltroLinea(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="Todas">Todas las líneas</option>
              {LINEAS_NEGOCIO_DEFAULT.map((ln) => (
                <option key={ln} value={ln}>{ln}</option>
              ))}
            </select>
          </div>
        </div>

        {(filtroFecha || filtroMedioPago !== 'Todos' || filtroLinea !== 'Todas') && (
          <div className="flex justify-end">
            <button 
              onClick={() => { setFiltroFecha(''); setFiltroMedioPago('Todos'); setFiltroLinea('Todas'); }}
              className="text-xs text-amber-700 font-bold hover:underline"
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}

        {/* TABLA DE REGISTROS CON ENCABEZADOS DE COLOR */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 text-blue-600">Fecha</th>
                <th className="py-3.5 px-4 text-amber-700">Línea de negocio</th>
                <th className="py-3.5 px-4 text-emerald-700">Medio de pago</th>
                <th className="py-3.5 px-4 text-purple-700">Documento</th>
                <th className="py-3.5 px-4 text-slate-900">Venta bruta</th>
                <th className="py-3.5 px-4 text-rose-600">Comisión</th>
                <th className="py-3.5 px-4 text-teal-600">Propina</th>
                <th className="py-3.5 px-4 text-slate-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-amber-600" />
                      <span>Cargando registros...</span>
                    </div>
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200/60 mb-1">
                        <span className="text-3xl">☕</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700">No hay ventas registradas con estos filtros</p>
                      <p className="text-xs text-slate-400 max-w-xs">Intenta cambiar las fechas o sincroniza tus datos de Mercado Pago.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((v) => {
                  const esMpAutomatico = v.documento && v.documento.startsWith('MP-')
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{v.fecha}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{v.linea_negocio}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          v.medio_pago === 'Mercado Pago' 
                            ? 'bg-sky-50 text-sky-700 border border-sky-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {v.medio_pago}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{v.documento}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        ${Number(v.monto_bruto).toLocaleString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 font-bold">
                        ${Number(v.comision || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">
                        ${Number(v.propina || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {!esMpAutomatico ? (
                          <button 
                            onClick={() => handleEliminarVenta(v.id, v.documento)} 
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="Eliminar registro manual"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold border border-slate-200" title="Sincronizado de Mercado Pago (Protegido)">
                            <Lock size={10} /> Auto
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}