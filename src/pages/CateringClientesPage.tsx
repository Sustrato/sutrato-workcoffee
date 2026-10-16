import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search, Building2, Edit, CalendarPlus, X } from 'lucide-react'

interface Cliente {
  id: string
  nombre: string
  rut: string
  tipo: string
  contacto: string
  telefono: string
  correo: string
  eventosCount: number
  totalFacturado: string
  requiereOC: string
  direccion: string
  observaciones: string
}

export default function CateringClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipo, setSelectedTipo] = useState('Todos los tipos')
  const [loading, setLoading] = useState(false)
  
  // Modales y Estados de Edición
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null)
  const [selectedClienteParaEvento, setSelectedClienteParaEvento] = useState('')

  // Estado formulario Cliente (Nuevo / Editar)
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo: 'Empresa privada',
    nombre: '',
    rut: '',
    personaContacto: '',
    telefono: '',
    correo: '',
    direccionFacturacion: '',
    requiereOC: 'No',
    observaciones: ''
  })

  // Estado formulario Nueva Cotización / Evento
  const [nuevaCotizacion, setNuevaCotizacion] = useState({
    nroCotizacion: '2026-001',
    fechaEmision: new Date().toISOString().split('T')[0],
    atencion: '',
    vigenciaDias: '10',
    nombreEvento: '',
    fechaEvento: new Date().toISOString().split('T')[0],
    lugar: 'Frontis',
    horaInicio: '09:00',
    horaTermino: '13:00',
    modalidad: 'Solo arriendo',
    numPersonas: '10',
    valorArriendo: '0',
    cateringPersona: '0',
    menu: '',
    preparacionesAdicionales: '0',
    otrosCostos: '0',
    condicionPago: '50% anticipado',
    abonoRecibido: '0',
    fechaVencimiento: '',
    estado: 'Cotización',
    ordenCompra: '',
    comprobante: '',
    equipamiento: {
      telon: { seleccionado: false, tipo: 'Incluido', valor: '0' },
      proyector: { seleccionado: false, tipo: 'Incluido', valor: '0' },
      control: { seleccionado: false, tipo: 'Incluido', valor: '0' },
      teleMovil: { seleccionado: false, tipo: 'Incluido', valor: '0' }
    }
  })

  // Cargar clientes desde Supabase al iniciar
  const fetchClientesSupabase = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('catering_clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      const clientesMapeados: Cliente[] = data.map((c: any) => ({
        id: c.id,
        nombre: c.nombre_razon_social,
        rut: c.rut || 'Sin RUT',
        tipo: c.tipo_cliente,
        contacto: c.persona_contacto || 'N/A',
        telefono: c.telefono || 'N/A',
        correo: c.correo || 'N/A',
        eventosCount: 0,
        totalFacturado: '$0',
        requiereOC: c.requiere_oc || 'No',
        direccion: c.direccion_facturacion || '',
        observaciones: c.observaciones || ''
      }))
      setClientes(clientesMapeados)
    }
    if (error) {
      console.error('Error al cargar clientes:', error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClientesSupabase()
  }, [])

  const resetFormularioCliente = () => {
    setEditingClienteId(null)
    setNuevoCliente({
      tipo: 'Empresa privada',
      nombre: '',
      rut: '',
      personaContacto: '',
      telefono: '',
      correo: '',
      direccionFacturacion: '',
      requiereOC: 'No',
      observaciones: ''
    })
  }

 
 // Abrir modal para Editar cargando los datos del cliente
  const handleAbrirEditarCliente = (clienteOriginal: Cliente) => {
    setEditingClienteId(clienteOriginal.id)
    setNuevoCliente({
      tipo: clienteOriginal.tipo,
      nombre: clienteOriginal.nombre,
      rut: clienteOriginal.rut === 'Sin RUT' ? '' : clienteOriginal.rut,
      personaContacto: clienteOriginal.contacto === 'N/A' ? '' : clienteOriginal.contacto,
      telefono: clienteOriginal.telefono === 'N/A' ? '' : clienteOriginal.telefono,
      correo: clienteOriginal.correo === 'N/A' ? '' : clienteOriginal.correo,
      direccionFacturacion: clienteOriginal.direccion,
      requiereOC: clienteOriginal.requiereOC,
      observaciones: clienteOriginal.observaciones
    })
    setIsClientModalOpen(true)
  }

  // Guardar (Crear o Actualizar) en Supabase
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoCliente.nombre) return

    const payload = {
      tipo_cliente: nuevoCliente.tipo,
      nombre_razon_social: nuevoCliente.nombre,
      rut: nuevoCliente.rut,
      persona_contacto: nuevoCliente.personaContacto,
      telefono: nuevoCliente.telefono,
      correo: nuevoCliente.correo,
      direccion_facturacion: nuevoCliente.direccionFacturacion,
      requiere_oc: nuevoCliente.requiereOC,
      observaciones: nuevoCliente.observaciones
    }

    let error
    if (editingClienteId) {
      // Actualizar registro existente
      const res = await supabase
        .from('catering_clientes')
        .update(payload)
        .eq('id', editingClienteId)
      error = res.error
    } else {
      // Crear nuevo registro
      const res = await supabase
        .from('catering_clientes')
        .insert([payload])
      error = res.error
    }

    if (error) {
      alert('Error al guardar cliente en la base de datos: ' + error.message)
    } else {
      alert(editingClienteId ? '¡Cliente actualizado con éxito!' : '¡Cliente guardado con éxito en Supabase!')
      setIsClientModalOpen(false)
      resetFormularioCliente()
      fetchClientesSupabase()
    }
  }

  const handleOpenEventModal = (nombreCliente: string) => {
    setSelectedClienteParaEvento(nombreCliente)
    setIsEventModalOpen(true)
  }

  const clientesFiltrados = clientes.filter((c) => {
    const matchSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        c.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.contacto.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTipo = selectedTipo === 'Todos los tipos' || c.tipo === selectedTipo
    return matchSearch && matchTipo
  })

  // Cálculos dinámicos para el resumen de la cotización
  const numPer = Number(nuevaCotizacion.numPersonas) || 0
  const arriendoVal = Number(nuevaCotizacion.valorArriendo) || 0
  const cateringVal = (Number(nuevaCotizacion.cateringPersona) || 0) * numPer
  const extraVal = (Number(nuevaCotizacion.preparacionesAdicionales) || 0) + (Number(nuevaCotizacion.otrosCostos) || 0)
  const totalCotizacion = arriendoVal + cateringVal + extraVal
  const abonoVal = Number(nuevaCotizacion.abonoRecibido) || 0
  const saldoVal = totalCotizacion - abonoVal

  return (
    <div className="space-y-6">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Empresas, personas, instituciones y licitaciones</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetFormularioCliente()
            setIsClientModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-amber-400"
        >
          <Plus size={18} />
          + Nuevo cliente
        </button>
      </div>

      {/* Filtros de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option>Todos los tipos</option>
            <option>Empresa privada</option>
            <option>Persona natural</option>
            <option>Institución pública</option>
            <option>Licitación</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-6 py-4">Cliente / RUT</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Eventos</th>
                <th className="px-6 py-4">Facturación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Cargando clientes desde Supabase...
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{cliente.nombre}</p>
                      <p className="text-xs text-slate-500">{cliente.rut}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <Building2 size={13} className="text-amber-600" />
                        {cliente.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{cliente.contacto}</p>
                      <p className="text-xs text-slate-500">{cliente.telefono} • {cliente.correo}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {cliente.eventosCount}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{cliente.totalFacturado}</p>
                      <p className="text-xs text-slate-500">OC: {cliente.requiereOC} • {cliente.direccion}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                       <button
  type="button"
  onClick={() => handleAbrirEditarCliente(cliente)}
  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1"
>
                          <Edit size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEventModal(cliente.nombre)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                        >
                          <CalendarPlus size={14} /> + Evento
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo / Editar Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h2 className="text-base font-bold">
                {editingClienteId ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button
                type="button"
                onClick={() => { setIsClientModalOpen(false); resetFormularioCliente(); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo de cliente *</label>
                  <select
                    value={nuevoCliente.tipo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Empresa privada</option>
                    <option>Persona natural</option>
                    <option>Institución pública</option>
                    <option>Licitación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nombre o razón social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej.: Empresa SpA"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">RUT</label>
                  <input
                    type="text"
                    placeholder="77.xxx.xxx-x"
                    value={nuevoCliente.rut}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, rut: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Persona de contacto</label>
                  <input
                    type="text"
                    placeholder="Nombre del encargado"
                    value={nuevoCliente.personaContacto}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, personaContacto: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+56 9 ..."
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Correo</label>
                  <input
                    type="email"
                    placeholder="correo@dominio.cl"
                    value={nuevoCliente.correo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Dirección de facturación</label>
                  <input
                    type="text"
                    placeholder="Dirección o ciudad"
                    value={nuevoCliente.direccionFacturacion}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccionFacturacion: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Requiere OC</label>
                  <select
                    value={nuevoCliente.requiereOC}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, requiereOC: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>No</option>
                    <option>Sí</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Observaciones</label>
                <textarea
                  rows={3}
                  placeholder="Notas internas sobre el cliente..."
                  value={nuevoCliente.observaciones}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsClientModalOpen(false); resetFormularioCliente(); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-400"
                >
                  {editingClienteId ? 'Guardar cambios' : 'Guardar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva cotización / evento con todo su diseño original */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h2 className="text-base font-bold">Nueva cotización / evento</h2>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsEventModalOpen(false); }} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nro. de cotización</label>
                  <input
                    type="text"
                    value={nuevaCotizacion.nroCotizacion}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, nroCotizacion: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Fecha de emisión</label>
                  <input
                    type="date"
                    value={nuevaCotizacion.fechaEmision}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, fechaEmision: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Atención / destinatario</label>
                  <input
                    type="text"
                    placeholder="Nombre de la persona que recibe"
                    value={nuevaCotizacion.atencion}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, atencion: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Vigencia (días)</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.vigenciaDias}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, vigenciaDias: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cliente *</label>
                  <select
                    value={selectedClienteParaEvento || clientes[0]?.nombre}
                    onChange={(e) => setSelectedClienteParaEvento(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {clientes.length === 0 ? (
                      <option value="">No hay clientes registrados</option>
                    ) : (
                      clientes.map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nombre del evento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Capacitación, aniversario, reunión..."
                    value={nuevaCotizacion.nombreEvento}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, nombreEvento: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={nuevaCotizacion.fechaEvento}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, fechaEvento: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Lugar *</label>
                  <select
                    value={nuevaCotizacion.lugar}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, lugar: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Frontis</option>
                    <option>Salón principal</option>
                    <option>Sala de reuniones</option>
                    <option>Externo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    value={nuevaCotizacion.horaInicio}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, horaInicio: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Hora término</label>
                  <input
                    type="time"
                    value={nuevaCotizacion.horaTermino}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, horaTermino: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Modalidad *</label>
                  <select
                    value={nuevaCotizacion.modalidad}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, modalidad: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Solo arriendo</option>
                    <option>Con catering</option>
                    <option>Arriendo + Catering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Número de personas *</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.numPersonas}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, numPersonas: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Valor arriendo del espacio</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.valorArriendo}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, valorArriendo: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Catering por persona</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.cateringPersona}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, cateringPersona: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Preparaciones / menú</label>
                <textarea
                  rows={3}
                  placeholder="Ej.: café de grano, jugos, tapaditos, postres, brunch..."
                  value={nuevaCotizacion.menu}
                  onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, menu: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Preparaciones especiales adicionales</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.preparacionesAdicionales}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, preparacionesAdicionales: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Otros costos o servicios</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.otrosCostos}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, otrosCostos: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Equipamiento</h3>
                {[
                  { key: 'telon', label: 'Telón' },
                  { key: 'proyector', label: 'Proyector' },
                  { key: 'control', label: 'Control para diapositivas' },
                  { key: 'teleMovil', label: 'Tele movible' },
                ].map((eq) => (
                  <div key={eq.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={nuevaCotizacion.equipamiento[eq.key as keyof typeof nuevaCotizacion.equipamiento].seleccionado}
                        onChange={(e) => {
                          const val = e.target.checked
                          setNuevaCotizacion({
                            ...nuevaCotizacion,
                            equipamiento: {
                              ...nuevaCotizacion.equipamiento,
                              [eq.key]: { ...nuevaCotizacion.equipamiento[eq.key as keyof typeof nuevaCotizacion.equipamiento], seleccionado: val }
                            }
                          })
                        }}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 size-4"
                      />
                      {eq.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-white" defaultValue="Incluido">
                        <option>Incluido</option>
                        <option>Adicional</option>
                      </select>
                      <input type="number" defaultValue="0" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-white" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Condición de pago</label>
                  <select
                    value={nuevaCotizacion.condicionPago}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, condicionPago: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>50% anticipado</option>
                    <option>100% anticipado</option>
                    <option>Crédito 30 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Abono recibido</label>
                  <input
                    type="number"
                    value={nuevaCotizacion.abonoRecibido}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, abonoRecibido: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Fecha vencimiento</label>
                  <input
                    type="date"
                    value={nuevaCotizacion.fechaVencimiento}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, fechaVencimiento: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Estado</label>
                  <select
                    value={nuevaCotizacion.estado}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, estado: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Cotización</option>
                    <option>Confirmado</option>
                    <option>Pagado</option>
                    <option>Anulado</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Orden de compra / referencia</label>
                  <input
                    type="text"
                    value={nuevaCotizacion.ordenCompra}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, ordenCompra: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Comprobante / enlace</label>
                  <input
                    type="text"
                    value={nuevaCotizacion.comprobante}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, comprobante: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Arriendo</span>
                  <span className="font-semibold">${arriendoVal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Catering</span>
                  <span className="font-semibold">${cateringVal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Preparaciones, equipos y otros</span>
                  <span className="font-semibold">${extraVal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold text-amber-400 border-b border-slate-800">
                  <span>Total cotización</span>
                  <span>${totalCotizacion.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Abono sugerido / recibido</span>
                  <span className="font-semibold">${abonoVal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between py-2 text-base font-bold text-amber-400">
                  <span>Saldo</span>
                  <span>${saldoVal.toLocaleString('es-CL')}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-400"
                >
                  Guardar cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 