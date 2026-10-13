import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Plus, X, Search, Calendar, Trash2, Edit2, Clock } from 'lucide-react'

interface ClienteParticular {
  id: string
  nombre_completo: string
  rut: string
  telefono: string
  correo?: string
  direccion?: string
  observaciones?: string
  created_at?: string
}

interface UsoOficina {
  id: string
  oficina_asignada: string
  fecha_inicio: string
  hora_inicio: string
  hora_fin: string
  modalidad: string
  horas_calculadas: number
  monto_total: number
  estado_pago: string
}

export default function ClientesParticularesPage() {
  const [clientes, setClientes] = useState<ClienteParticular[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Control de modales
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false)
  const [isArriendoModalOpen, setIsArriendoModalOpen] = useState(false)
  
  // Estado para Edición de Cliente
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null)
  
  // Modal de confirmación de eliminación segura
  const [clienteAEliminar, setClienteAEliminar] = useState<ClienteParticular | null>(null)
  const [confirmacionTexto, setConfirmacionTexto] = useState('')
  
  // Campos de Cliente Particular (Crear / Editar)
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [rut, setRut] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [obsCliente, setObsCliente] = useState('')
  
  // Campos del Modal "Registrar arriendo"
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [oficina, setOficina] = useState('Oficina 1')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])
  const [fechaTermino, setFechaTermino] = useState(new Date().toISOString().split('T')[0])
  const [modalidad, setModalidad] = useState('Por hora')
  
  // Historial de visitas del cliente seleccionado
  const [historialVisitasCliente, setHistorialVisitasCliente] = useState<UsoOficina[]>([])
  
  // Horarios
  const [horaIngreso, setHoraIngreso] = useState('09:00')
  const [horaSalida, setHoraSalida] = useState('10:00')
  
  const [horasCalculadas, setHorasCalculadas] = useState(1)
  const [valorCalculado, setValorCalculado] = useState(3000)
  const [estadoPago, setEstadoPago] = useState('Pagado')
  const [voucherUrl, setVoucherUrl] = useState('')
  const [contratoUrl, setContratoUrl] = useState('')
  const [basesAceptadas, setBasesAceptadas] = useState(false)
  const [fechaAceptacion, setFechaAceptacion] = useState(new Date().toISOString().split('T')[0])
  
  // Oficinas deshabilitadas y detalle del motivo/horario
  const [oficinasBloqueadas, setOficinasBloqueadas] = useState<string[]>([])
  const [detallesBloqueo, setDetallesBloqueo] = useState<Record<string, string>>({})
  
  const listaTodasOficinas = [
    'Oficina 1', 'Oficina 2', 'Oficina 3', 'Oficina 4', 
    'Oficina 5', 'Oficina 6', 'Oficina 7', 
    'Sala de Reuniones A', 'Sala de Reuniones B'
  ]

  const cargarHoraActualChile = () => {
    const ahora = new Date()
    const horaActual = ahora.toLocaleTimeString('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    const [h, m] = horaActual.split(':').map(Number)
    const hSalidaNum = (h + 1) % 24
    const horaSalidaCalc = `${String(hSalidaNum).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    setHoraIngreso(horaActual)
    setHoraSalida(horaSalidaCalc)
  }

  const fetchClientes = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes_particulares').select('*').order('created_at', { ascending: false })
    if (data) {
      setClientes(data)
      if (data.length > 0 && !clienteSeleccionadoId) {
        setClienteSeleccionadoId(data[0].id)
      }
    }
    setLoading(false)
  }

  // Cargar historial de visitas del cliente seleccionado cuando cambia en el modal de arriendo
  const fetchHistorialVisitas = async (clienteId: string) => {
    if (!clienteId) return
    const { data } = await supabase
      .from('uso_oficinas_particulares')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_inicio', { ascending: false })
    
    if (data) {
      setHistorialVisitasCliente(data)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  useEffect(() => {
    if (isArriendoModalOpen) {
      cargarHoraActualChile()
    }
  }, [isArriendoModalOpen])

  useEffect(() => {
    if (clienteSeleccionadoId) {
      fetchHistorialVisitas(clienteSeleccionadoId)
    }
  }, [clienteSeleccionadoId])

  const resetFormularioCliente = () => {
    setEditingClienteId(null)
    setNombreCompleto('')
    setRut('')
    setTelefono('')
    setCorreo('')
    setDireccion('')
    setObsCliente('')
  }

  const handleAbrirEditarCliente = (c: ClienteParticular) => {
    setEditingClienteId(c.id)
    setNombreCompleto(c.nombre_completo || '')
    setRut(c.rut || '')
    setTelefono(c.telefono || '')
    setCorreo(c.correo || '')
    setDireccion(c.direccion || '')
    setObsCliente(c.observaciones || '')
    setIsClienteModalOpen(true)
  }

  const verificarDisponibilidad = async () => {
    const { data: empresasActivas } = await supabase
      .from('oficinas_fisicas')
      .select('tipo_espacio')
      .eq('estado', 'Activo')
    
    const { data: reservasCruzadas } = await supabase
      .from('uso_oficinas_particulares')
      .select('oficina_asignada, hora_inicio, hora_fin')
      .eq('fecha_inicio', fechaIngreso)

    const bloqueos: Record<string, string> = {}
    if (empresasActivas) {
      empresasActivas.forEach(e => {
        bloqueos[e.tipo_espacio] = 'Ocupada por contrato mensual'
      })
    }
    if (reservasCruzadas) {
      reservasCruzadas.forEach(r => {
        if (r.hora_inicio && r.hora_fin) {
          const hayTraslape = horaIngreso < r.hora_fin && horaSalida > r.hora_inicio
          if (hayTraslape) {
            bloqueos[r.oficina_asignada] = `Ocupada hasta las ${r.hora_fin.substring(0, 5)} hrs`
          }
        }
      })
    }
    const listaBloqueadas = Object.keys(bloqueos)
    setDetallesBloqueo(bloqueos)
    setOficinasBloqueadas(listaBloqueadas)
    if (listaBloqueadas.includes(oficina)) {
      const disponible = listaTodasOficinas.find(of => !listaBloqueadas.includes(of))
      if (disponible) setOficina(disponible)
    }
  }

  useEffect(() => {
    if (isArriendoModalOpen && horaIngreso && horaSalida) {
      verificarDisponibilidad()
    }
  }, [isArriendoModalOpen, fechaIngreso, horaIngreso, horaSalida])

  useEffect(() => {
    if (horaIngreso && horaSalida) {
      const [hIn, mIn] = horaIngreso.split(':').map(Number)
      const [hOut, mOut] = horaSalida.split(':').map(Number)
      const minInicio = hIn * 60 + mIn
      const minFin = hOut * 60 + mOut
      let diffMinutos = minFin - minInicio
      if (diffMinutos < 0) diffMinutos += 24 * 60
      const horasDecimales = diffMinutos / 60
      setHorasCalculadas(Number(horasDecimales.toFixed(2)))
      
      if (modalidad === 'Por hora') {
        const tarifaPorMinuto = 3000 / 60
        setValorCalculado(Math.round(diffMinutos * tarifaPorMinuto))
      } else if (modalidad === 'Por día') {
        setValorCalculado(20000)
      } else if (modalidad === 'Por semana') {
        setValorCalculado(102000)
      } else if (modalidad === 'Mensual') {
        setValorCalculado(350000)
      }
    }
  }, [horaIngreso, horaSalida, modalidad])

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreCompleto || !rut || !telefono) return alert('Completa los campos obligatorios (*)')
    const payload = {
      nombre_completo: nombreCompleto,
      rut,
      telefono,
      correo,
      direccion,
      observaciones: obsCliente
    }
    let error;
    if (editingClienteId) {
      const res = await supabase.from('clientes_particulares').update(payload).eq('id', editingClienteId)
      error = res.error
    } else {
      const res = await supabase.from('clientes_particulares').insert([payload])
      error = res.error
    }
    if (error) {
      alert('Error guardando cliente: ' + error.message)
    } else {
      alert(editingClienteId ? '¡Cliente actualizado con éxito!' : '¡Cliente creado con éxito!')
      setIsClienteModalOpen(false)
      resetFormularioCliente()
      fetchClientes()
    }
  }

  const handleConfirmarEliminarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteAEliminar) return
    if (confirmacionTexto.trim() !== 'ELIMINAR') {
      return alert('Debes escribir la palabra exacta ELIMINAR para proceder.')
    }
    const { error } = await supabase.from('clientes_particulares').delete().eq('id', clienteAEliminar.id)
    if (error) {
      alert('Error al eliminar cliente: ' + error.message)
    } else {
      alert('Cliente eliminado definitivamente.')
      setClienteAEliminar(null)
      setConfirmacionTexto('')
      fetchClientes()
    }
  }

  const handleGuardarArriendo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!basesAceptadas) {
      return alert('Debes aceptar las Bases y Condiciones de uso físico para guardar el arriendo.')
    }
    if (oficinasBloqueadas.includes(oficina)) {
      return alert(`La ${oficina} no está disponible en este horario (${detallesBloqueo[oficina]}).`)
    }
    const nuevoArriendoParticular = {
      cliente_id: clienteSeleccionadoId,
      oficina_asignada: oficina,
      fecha_inicio: fechaIngreso,
      fecha_fin: fechaTermino,
      hora_inicio: horaIngreso,
      hora_fin: horaSalida,
      modalidad,
      horas_calculadas: horasCalculadas,
      monto_total: Number(valorCalculado),
      estado_pago: estadoPago,
      voucher_url: voucherUrl,
      contrato_url: contratoUrl,
      bases_aceptadas: basesAceptadas,
      fecha_aceptacion_bases: fechaAceptacion
    }
    const { error } = await supabase.from('uso_oficinas_particulares').insert([nuevoArriendoParticular])
    if (error) {
      alert('Error guardando el arriendo: ' + error.message)
    } else {
      alert('¡Nueva visita/arriendo registrado y acumulado al historial del cliente con éxito!')
      setIsArriendoModalOpen(false)
      fetchHistorialVisitas(clienteSeleccionadoId)
    }
  }

  const clientesFiltered = clientes.filter(c =>
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rut.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Total de horas acumuladas por el cliente seleccionado
  const totalHorasAcumuladas = historialVisitasCliente.reduce((acc, curr) => acc + (Number(curr.horas_calculadas) || 0), 0)

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans">
      
      {/* Encabezado */}
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Clientes particulares</h1>
          <p className="mt-1 text-sm text-slate-500">Registro de personas, uso de oficinas e historial de pagos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsArriendoModalOpen(true)}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition"
          >
            <Calendar size={16} /> + Uso de oficina
          </button>
          <button 
            onClick={() => {
              resetFormularioCliente()
              setIsClienteModalOpen(true)
            }}
            className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition"
          >
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>
      </section>

      {/* Tarjetas de Tarifas */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-[#C5A059]">
          <p className="text-xs font-semibold text-slate-400">Valor por hora</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$3.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor por día</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$20.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor por semana</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$102.000</h3>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Valor mensual</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$350.000</h3>
        </article>
      </section>

      {/* Búsqueda */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Registro y cálculo de uso</h3>
        <p className="text-xs text-slate-500">
          Primero registre al cliente[cite: 13]. Luego presione <strong>+ Uso de oficina</strong>[cite: 13], seleccione la modalidad y escriba la cantidad[cite: 13]. El sistema multiplicará automáticamente la tarifa[cite: 13].
        </p>
        <div className="pt-2 relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, RUT, teléfono o correo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>
      </section>

      {/* Listado de Clientes */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#181818] text-[#C5A059] font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Nombre / RUT</th>
              <th className="py-3 px-4">Contacto</th>
              <th className="py-3 px-4">Dirección</th>
              <th className="py-3 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Cargando clientes...</td></tr>
            ) : clientesFiltered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">No hay clientes particulares registrados.</td></tr>
            ) : (
              clientesFiltered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {c.nombre_completo}
                    <span className="block text-[11px] font-normal text-slate-500">{c.rut}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {c.telefono}
                    <span className="block text-[11px] text-slate-400">{c.correo || 'Sin correo'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.direccion || 'Sin dirección'}</td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <button 
                      onClick={() => {
                        setClienteSeleccionadoId(c.id)
                        setIsArriendoModalOpen(true)
                      }}
                      className="px-2.5 py-1.5 border border-[#C5A059] text-slate-900 bg-amber-50 rounded text-[11px] font-bold hover:bg-amber-100 transition"
                    >
                      + Uso de oficina
                    </button>
                    <button 
                      onClick={() => handleAbrirEditarCliente(c)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 align-middle transition"
                      title="Editar cliente"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => {
                        setClienteAEliminar(c)
                        setConfirmacionTexto('')
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-lg align-middle transition"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* 🖤 MODAL 1: NUEVO / EDITAR CLIENTE PARTICULAR */}
      {isClienteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base">
                {editingClienteId ? 'Editar cliente particular' : 'Nuevo cliente particular'}
              </h3>
              <button onClick={() => { setIsClienteModalOpen(false); resetFormularioCliente(); }} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGuardarCliente} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre completo *</label>
                  <input type="text" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RUT *</label>
                  <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono *</label>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo</label>
                  <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea rows={3} value={obsCliente} onChange={(e) => setObsCliente(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsClienteModalOpen(false); resetFormularioCliente(); }} 
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-5 py-2 rounded-lg shadow transition">
                  {editingClienteId ? 'Guardar cambios' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL 3: ELIMINACIÓN */}
      {clienteAEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-rose-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base">Eliminar cliente particular</h3>
              <button onClick={() => setClienteAEliminar(null)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleConfirmarEliminarCliente} className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 font-medium">
                ¿Estás seguro de que deseas eliminar a <strong>{clienteAEliminar.nombre_completo}</strong>?
              </p>
              
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 text-[11px] leading-relaxed">
                Escribe <strong className="underline">ELIMINAR</strong> a continuación para confirmar que deseas borrar este registro definitivamente del sistema.
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirmación *</label>
                <input 
                  type="text" 
                  placeholder="Escribe ELIMINAR"
                  value={confirmacionTexto}
                  onChange={(e) => setConfirmacionTexto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-bold text-rose-600 uppercase"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setClienteAEliminar(null)} 
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={confirmacionTexto.trim() !== 'ELIMINAR'}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-lg shadow transition"
                >
                  Presiona ELIMINAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖤 MODAL 2: REGISTRAR ARRIENDO CON HISTORIAL DE VISITAS ACUMULADAS */}
      {isArriendoModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-[#181818] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-base">Registrar arriendo y acumular horas de visita</h3>
              <button onClick={() => setIsArriendoModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGuardarArriendo} className="p-6 space-y-5 text-xs">
              
              {/* Selector de Cliente y Resumen de Visitas Acumuladas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente particular *</label>
                  <select 
                    value={clienteSeleccionadoId} 
                    onChange={(e) => setClienteSeleccionadoId(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-bold"
                    required
                  >
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre_completo} (RUT: {c.rut})</option>
                    ))}
                  </select>
                </div>

                {/* Resumen de visitas previas del cliente seleccionado */}
                <div className="flex flex-wrap justify-between items-center bg-white border border-slate-200 rounded-lg p-3 text-[11px]">
                  <div>
                    <span className="text-slate-500">Visitas registradas: </span>
                    <strong className="text-slate-900">{historialVisitasCliente.length} veces</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total horas acumuladas: </span>
                    <strong className="text-[#C5A059]">{totalHorasAcumuladas.toFixed(1)} hrs</strong>
                  </div>
                </div>

                {/* Desplegable colapsable o listado rápido de últimas visitas */}
                {historialVisitasCliente.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider">Historial de últimas visitas de este cliente:</p>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {historialVisitasCliente.map((visita) => (
                        <div key={visita.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded border border-slate-100 text-[11px]">
                          <span>📅 {visita.fecha_inicio} ({visita.hora_inicio} - {visita.hora_fin})</span>
                          <span className="font-semibold text-slate-700">{visita.oficina_asignada} [{visita.horas_calculadas}h]</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${visita.estado_pago === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {visita.estado_pago}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de la nueva visita */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Oficina *</label>
                  <select 
                    value={oficina} 
                    onChange={(e) => setOficina(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white font-medium"
                  >
                    {listaTodasOficinas.map((of) => {
                      const estaBloqueada = oficinasBloqueadas.includes(of)
                      const motivo = detallesBloqueo[of]
                      return (
                        <option key={of} value={of} disabled={estaBloqueada} className={estaBloqueada ? 'text-slate-400 bg-slate-100' : ''}>
                          {of} {estaBloqueada ? `— (${motivo})` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modalidad</label>
                  <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white">
                    <option value="Por hora">Por hora</option>
                    <option value="Por día">Por día</option>
                    <option value="Por semana">Por semana</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha ingreso *</label>
                  <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha término *</label>
                  <input type="date" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de ingreso *</label>
                  <input type="time" value={horaIngreso} onChange={(e) => setHoraIngreso(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora de salida *</label>
                  <input type="time" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horas calculadas</label>
                  <input type="number" step="0.01" value={horasCalculadas} readOnly className="w-full px-3 py-2 border border-slate-200 bg-stone-100 rounded-lg focus:outline-none font-semibold text-slate-800" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor ($)</label>
                  <input type="number" value={valorCalculado} readOnly className="w-full px-3 py-2 border border-slate-200 bg-stone-100 rounded-lg font-extrabold text-slate-900" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado del pago</label>
                  <select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white">
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
              
              <div className="text-[11px] text-slate-500 font-medium italic">
                {horaIngreso} a {horaSalida} · {Math.round(horasCalculadas * 60)} minutos ({horasCalculadas} h) × ${modalidad === 'Por hora' ? '3.000 /h ($50/min)' : 'Tarifa fija'} = ${valorCalculado.toLocaleString('es-CL')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher / enlace</label>
                  <input type="text" placeholder="URL o referencia del archivo" value={voucherUrl} onChange={(e) => setVoucherUrl(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contrato de arriendo</label>
                  <input type="text" placeholder="URL o referencia del archivo" value={contratoUrl} onChange={(e) => setContratoUrl(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none" />
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900">Bases y Condiciones de uso físico</h4>
                <p className="text-slate-600 text-[11px]">
                  <strong>Documento general cargado por Sutrato:</strong> La empresa o cliente debe leerlo y aceptar sus condiciones antes de guardar el arriendo.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="bases" checked={basesAceptadas} onChange={(e) => setBasesAceptadas(e.target.checked)} className="rounded text-[#C5A059] focus:ring-[#C5A059]" />
                  <label htmlFor="bases" className="font-bold text-slate-800">Aceptado por la empresa</label>
                </div>
                {basesAceptadas && (
                  <div className="pt-1">
                    <label className="block font-bold text-slate-700 mb-1">Fecha de aceptación</label>
                    <input type="date" value={fechaAceptacion} onChange={(e) => setFechaAceptacion(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsArriendoModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-6 py-2 rounded-lg shadow transition">
                  Registrar nueva visita y acumular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}