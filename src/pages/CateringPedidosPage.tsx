import { useState } from 'react'
import { Plus, Search, FileText, Download, ShoppingCart, DollarSign, Eye, X } from 'lucide-react'

interface CotizacionEvento {
  id: string
  nroCotizacion: string
  nombreEvento: string
  cliente: string
  fecha: string
  hora: string
  lugar: string
  modalidad: string
  detalleMenu: string
  personas: number
  total: number
  abono: number
  saldo: number
  estado: 'Cotización' | 'Confirmado' | 'Pagado' | 'Anulado'
}

export default function CateringPedidosPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionEvento[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('Todos los estados')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estado del formulario de nueva cotización / evento
  const [nuevaCotizacion, setNuevaCotizacion] = useState({
    nroCotizacion: '2026-001',
    fechaEmision: '15-10-2026',
    atencion: '',
    vigenciaDias: '10',
    cliente: '',
    nombreEvento: '',
    fechaEvento: '15-10-2026',
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
    estado: 'Cotización' as const,
    ordenCompra: '',
    comprobante: ''
  })

  // Cálculos dinámicos
  const numPer = Number(nuevaCotizacion.numPersonas) || 0
  const arriendoVal = Number(nuevaCotizacion.valorArriendo) || 0
  const cateringVal = (Number(nuevaCotizacion.cateringPersona) || 0) * numPer
  const extraVal = (Number(nuevaCotizacion.preparacionesAdicionales) || 0) + (Number(nuevaCotizacion.otrosCostos) || 0)
  const totalCotizacion = arriendoVal + cateringVal + extraVal
  const abonoVal = Number(nuevaCotizacion.abonoRecibido) || 0
  const saldoVal = totalCotizacion - abonoVal

  const handleSaveCotizacion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCotizacion.nombreEvento) return

    const item: CotizacionEvento = {
      id: Date.now().toString(),
      nroCotizacion: nuevaCotizacion.nroCotizacion,
      nombreEvento: nuevaCotizacion.nombreEvento,
      cliente: nuevaCotizacion.cliente || 'Cliente General',
      fecha: nuevaCotizacion.fechaEvento,
      hora: `${nuevaCotizacion.horaInicio}-${nuevaCotizacion.horaTermino}`,
      lugar: nuevaCotizacion.lugar,
      modalidad: nuevaCotizacion.modalidad,
      detalleMenu: nuevaCotizacion.menu || 'Sin especificaciones',
      personas: numPer,
      total: totalCotizacion,
      abono: abonoVal,
      saldo: saldoVal,
      estado: nuevaCotizacion.estado
    }

    setCotizaciones([item, ...cotizaciones])
    setIsModalOpen(false)
    // Limpiar formulario básico
    setNuevaCotizacion({
      nroCotizacion: `2026-${String(cotizaciones.length + 2).padStart(3, '0')}`,
      fechaEmision: '15-10-2026',
      atencion: '',
      vigenciaDias: '10',
      cliente: '',
      nombreEvento: '',
      fechaEvento: '15-10-2026',
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
      comprobante: ''
    })
  }

  const cotizacionesFiltradas = cotizaciones.filter((item) => {
    const matchSearch = item.nombreEvento.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.nroCotizacion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchEstado = selectedEstado === 'Todos los estados' || item.estado === selectedEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Eventos y cotizaciones</h1>
          <p className="text-sm text-slate-500">Arriendo, catering, equipamiento y condiciones comerciales</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-amber-400"
        >
          <Plus size={18} />
          + Nueva cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente o evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option>Todos los estados</option>
            <option>Cotización</option>
            <option>Confirmado</option>
            <option>Pagado</option>
            <option>Anulado</option>
          </select>
        </div>
      </div>

      {/* Tabla de Eventos y Cotizaciones */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-6 py-4">Evento / cliente</th>
                <th className="px-6 py-4">Fecha y lugar</th>
                <th className="px-6 py-4">Modalidad</th>
                <th className="px-6 py-4">Personas</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Pago</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cotizacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={36} className="text-slate-300" />
                      <p className="font-medium">No hay cotizaciones ni eventos registrados.</p>
                      <p className="text-xs text-slate-400">Haz clic en "+ Nueva cotización" para registrar el primero.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cotizacionesFiltradas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.nombreEvento}</p>
                      <p className="text-xs text-slate-600">{item.cliente}</p>
                      <p className="text-[11px] text-slate-400">Cotización {item.nroCotizacion}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{item.fecha} • {item.hora}</p>
                      <p className="text-xs text-slate-500">{item.lugar}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{item.modalidad}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.detalleMenu}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.personas}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">${item.total.toLocaleString('es-CL')}</p>
                      <p className="text-[11px] text-slate-400">IVA incluido</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600">${item.abono.toLocaleString('es-CL')} abono</p>
                      <p className="text-xs font-semibold text-rose-600">Saldo ${item.saldo.toLocaleString('es-CL')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        item.estado === 'Confirmado' ? 'bg-emerald-100 text-emerald-800' :
                        item.estado === 'Pagado' ? 'bg-blue-100 text-blue-800' :
                        item.estado === 'Anulado' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Eye size={13} /> Ver
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <ShoppingCart size={13} /> Compras
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <Download size={13} /> PDF
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                          <DollarSign size={13} /> + Pago
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

      {/* Modal Nueva cotización / evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h2 className="text-base font-bold">Nueva cotización / evento</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCotizacion} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente o empresa"
                    value={nuevaCotizacion.cliente}
                    onChange={(e) => setNuevaCotizacion({ ...nuevaCotizacion, cliente: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
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
                    <option>Solo catering</option>
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

              {/* Panel de totales inferior estilo factura oscuro */}
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
                  onClick={() => setIsModalOpen(false)}
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