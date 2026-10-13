import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Store, Building2, Users, DollarSign, Plus, Trash2, CheckCircle, X, Clock } from 'lucide-react'

interface OficinaFisica {
  id: string
  nombre_cliente: string
  rut_empresa?: string
  representante_legal?: string
  rut_representante?: string
  telefono?: string
  correo?: string
  observaciones?: string
  tipo_espacio: string
  fecha_inicio: string
  monto_mensual: number
  estado: string
}

const ESPACIOS_DISPONIBLES = [
  'Oficina 1',
  'Oficina 2',
  'Oficina 3',
  'Oficina 4',
  'Oficina 5',
  'Oficina 6',
  'Oficina 7',
  'Sala de Reuniones A',
  'Sala de Reuniones B',
  'Puesto Cowork Fijo',
]

export default function OficinasFisicas() {
  const [arriendos, setArriendos] = useState<OficinaFisica[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Recaudación de clientes particulares (por hora, día, semana) del mes actual
  const [recaudacionParticularesMes, setRecaudacionParticularesMes] = useState(0)

  // Estados del formulario Modal
  const [nombreCliente, setNombreCliente] = useState('')
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [representanteLegal, setRepresentanteLegal] = useState('')
  const [rutRepresentante, setRutRepresentante] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [tipoEspacio, setTipoEspacio] = useState(ESPACIOS_DISPONIBLES[0])
  const [fechaInicio, _setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [montoMensual, setMontoMensual] = useState('')

  // Cargar arriendos desde Supabase
  const fetchArriendos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('oficinas_fisicas')
      .select('*')
      .order('fecha_inicio', { ascending: false })

    if (error) {
      console.error('Error cargando arriendos físicos:', error.message)
    } else {
      setArriendos(data || [])
    }
    setLoading(false)
  }

  // Cargar recaudación del mes de clientes particulares (por hora, día, semana)
  const fetchRecaudacionParticulares = async () => {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const finMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('uso_oficinas_particulares')
      .select('monto_total')
      .gte('fecha_inicio', inicioMes)
      .lte('fecha_inicio', finMes)
      .eq('estado_pago', 'Pagado')

    if (!error && data) {
      const totalParticulares = data.reduce((acc, curr) => acc + (Number(curr.monto_total) || 0), 0)
      setRecaudacionParticularesMes(totalParticulares)
    }
  }

  useEffect(() => {
    fetchArriendos()
    fetchRecaudacionParticulares()
  }, [])

  // Guardar nuevo arriendo / empresa
  const handleGuardarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCliente || !rutEmpresa) {
      alert('Por favor completa el nombre de la empresa y el RUT.')
      return
    }
    const nuevoRegistro = {
      nombre_cliente: nombreCliente,
      rut_empresa: rutEmpresa,
      representante_legal: representanteLegal,
      rut_representante: rutRepresentante,
      telefono,
      correo,
      observaciones,
      tipo_espacio: tipoEspacio,
      fecha_inicio: fechaInicio,
      monto_mensual: Number(montoMensual) || 0,
      estado: 'Activo',
    }
    const { error } = await supabase.from('oficinas_fisicas').insert([nuevoRegistro])
    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      setNombreCliente('')
      setRutEmpresa('')
      setRepresentanteLegal('')
      setRutRepresentante('')
      setTelefono('')
      setCorreo('')
      setObservaciones('')
      setMontoMensual('')
      setIsModalOpen(false)
      fetchArriendos()
    }
  }

  // Eliminar arriendo
  const handleEliminarArriendo = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de oficina física?')) return
    const { error } = await supabase.from('oficinas_fisicas').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      fetchArriendos()
    }
  }

  // Cálculos dinámicos
  const totalRecaudado = arriendos.reduce((acc, curr) => acc + (curr.estado === 'Activo' ? Number(curr.monto_mensual) : 0), 0)
  const totalActivos = arriendos.filter(a => a.estado === 'Activo').length
  const oficinasTotales = [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans">
      
      {/* 🚀 Encabezado */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#C5A059]">
            Sutrato WorkCoffee • Arica
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Resumen Comercial
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Estado general de las oficinas presenciales y control de arriendos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs shadow transition"
        >
          <Plus size={16} /> Nueva empresa
        </button>
      </section>

      {/* 📊 Tarjetas de Indicadores */}
      <section aria-label="Indicadores de oficinas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-[#C5A059]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Recaudación mensual</p>
              <p className="mt-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                ${totalRecaudado.toLocaleString('es-CL')}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign size={20} />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Ingreso contratado activo</p>
        </article>

        {/* Tarjeta de Recaudación de Particulares */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Recaudación Particulares</p>
              <p className="mt-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                ${recaudacionParticularesMes.toLocaleString('es-CL')}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Clock size={20} />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Pagos por hora, día o semana</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Espacios ocupados</p>
              <p className="mt-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {totalActivos} / 7
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Building2 size={20} />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Oficinas ocupadas hoy</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Empresas registradas</p>
              <p className="mt-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {arriendos.length}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Store size={20} />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Arriendos del mes</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Clientes activos</p>
              <p className="mt-3 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {totalActivos}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Users size={20} />
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Con contrato vigente</p>
        </article>

      </section>

      {/* Ocupación por Oficina (1 a 7) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">OCUPACIÓN POR OFICINA MENSUAL</h3>
          <div className="space-y-3">
            {oficinasTotales.map((num) => {
              const ocupada = arriendos.find(
                a => a.tipo_espacio?.toLowerCase().includes(`oficina ${num}`) && a.estado === 'Activo'
              )
              return (
                <div key={num} className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-extrabold w-20 text-slate-800">Oficina {num}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${ocupada ? 'bg-[#C5A059]' : 'bg-transparent'}`}
                      style={{ width: ocupada ? '100%' : '0%' }}
                    />
                  </div>
                  <span className={`w-24 text-right font-semibold ${ocupada ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {ocupada ? 'Ocupada' : 'Disponible'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Alertas comerciales</h3>
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium">
              Sin alertas pendientes
            </div>
          </div>
        </div>
      </section>

      {/* Tabla de Arriendos Registrados */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Listado de espacios y arriendos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Espacio físico</th>
                <th className="py-3 px-4">Fecha inicio</th>
                <th className="py-3 px-4">Monto mensual</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Cargando espacios físicos...</td></tr>
              ) : arriendos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay arriendos físicos registrados.</td></tr>
              ) : (
                arriendos.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {a.nombre_cliente}
                      {a.rut_empresa && <span className="block text-xs font-normal text-slate-500">{a.rut_empresa}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{a.tipo_espacio}</td>
                    <td className="py-3.5 px-4 text-slate-500">{a.fecha_inicio}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">${Number(a.monto_mensual).toLocaleString('es-CL')}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${a.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <CheckCircle size={12} /> {a.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button onClick={() => handleEliminarArriendo(a.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 🖤 MODAL NUEVA EMPRESA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center border-b border-neutral-800">
              <h3 className="font-bold text-base">Nueva empresa</h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="text-neutral-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGuardarEmpresa} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Empresa *</label>
                  <input 
                    type="text" 
                    value={nombreCliente} 
                    onChange={(e) => setNombreCliente(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="Ej. Constructora Arica SpA"
                    required 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT empresa *</label>
                  <input 
                    type="text" 
                    value={rutEmpresa} 
                    onChange={(e) => setRutEmpresa(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="77.123.456-7"
                    required 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Representante legal</label>
                  <input 
                    type="text" 
                    value={representanteLegal} 
                    onChange={(e) => setRepresentanteLegal(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="María González"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT representante</label>
                  <input 
                    type="text" 
                    value={rutRepresentante} 
                    onChange={(e) => setRutRepresentante(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="15.234.567-8"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={telefono} 
                    onChange={(e) => setTelefono(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="+56 9 5555 5555"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo</label>
                  <input 
                    type="email" 
                    value={correo} 
                    onChange={(e) => setCorreo(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="contacto@empresa.cl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Espacio físico</label>
                  <select 
                    value={tipoEspacio} 
                    onChange={(e) => setTipoEspacio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  >
                    {ESPACIOS_DISPONIBLES.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto mensual ($)</label>
                  <input 
                    type="number" 
                    value={montoMensual} 
                    onChange={(e) => setMontoMensual(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                    placeholder="350000"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea 
                  rows={3} 
                  value={observaciones} 
                  onChange={(e) => setObservaciones(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]" 
                  placeholder="Detalles sobre el contrato o requerimientos del cliente..."
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  className="bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-5 py-2.5 rounded-lg shadow transition"
                >
                  Guardar empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}