import { useState } from 'react'
import { CreditCard, DollarSign, X } from 'lucide-react'

interface CobranzaItem {
  id: string
  clienteEvento: string
  condicion: string
  total: number
  abonado: number
  saldo: number
  vencimiento: string
  estado: 'Abono parcial' | 'Pendiente' | 'Pagado'
}

export default function CateringPagosPage() {
  const [cobranzas, setCobranzas] = useState<CobranzaItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState<CobranzaItem | null>(null)

  // Estado del modal Registrar Pago
  const [pagoForm, setPagoForm] = useState({
    montoRecibido: '',
    fecha: '15-10-2026',
    medioPago: 'Transferencia',
    comprobante: ''
  })

  const handleOpenPagoModal = (item: CobranzaItem) => {
    setItemSeleccionado(item)
    setPagoForm({
      montoRecibido: item.saldo.toString(),
      fecha: '15-10-2026',
      medioPago: 'Transferencia',
      comprobante: ''
    })
    setIsModalOpen(true)
  }

  const handleGuardarPago = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemSeleccionado) return

    const monto = Number(pagoForm.montoRecibido) || 0
    const nuevoAbonado = itemSeleccionado.abonado + monto
    const nuevoSaldo = itemSeleccionado.total - nuevoAbonado
    const nuevoEstado = nuevoSaldo <= 0 ? 'Pagado' : 'Abono parcial'

    setCobranzas(cobranzas.map(c => {
      if (c.id === itemSeleccionado.id) {
        return {
          ...c,
          abonado: nuevoAbonado,
          saldo: nuevoSaldo > 0 ? nuevoSaldo : 0,
          estado: nuevoEstado
        }
      }
      return c
    }))

    setIsModalOpen(false)
    setItemSeleccionado(null)
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Pagos y cobranzas</h1>
        <p className="text-sm text-slate-500">Abonos, saldos pendientes y crédito a 30 días</p>
      </div>

      {/* Tabla de Pagos y Cobranzas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-6 py-4">Cliente / evento</th>
                <th className="px-6 py-4">Condición</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Abonado</th>
                <th className="px-6 py-4">Saldo</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cobranzas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard size={36} className="text-slate-300" />
                      <p className="font-medium">No hay pagos ni cobranzas pendientes registrados.</p>
                      <p className="text-xs text-slate-400">Las cotizaciones confirmadas aparecerán automáticamente aquí.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cobranzas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.clienteEvento}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{item.condicion}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">${item.total.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-slate-700">${item.abonado.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 font-bold text-rose-600">${item.saldo.toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 text-slate-700">{item.vencimiento}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        item.estado === 'Pagado' ? 'bg-blue-100 text-blue-800' :
                        item.estado === 'Abono parcial' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenPagoModal(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
                      >
                        <DollarSign size={14} /> Registrar pago
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h2 className="text-base font-bold">Registrar pago</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleGuardarPago} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Monto recibido</label>
                  <input
                    type="number"
                    required
                    value={pagoForm.montoRecibido}
                    onChange={(e) => setPagoForm({ ...pagoForm, montoRecibido: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={pagoForm.fecha}
                    onChange={(e) => setPagoForm({ ...pagoForm, fecha: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Medio de pago</label>
                  <select
                    value={pagoForm.medioPago}
                    onChange={(e) => setPagoForm({ ...pagoForm, medioPago: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option>Transferencia</option>
                    <option>Efectivo</option>
                    <option>Tarjeta</option>
                    <option>Webpay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Comprobante / referencia</label>
                  <input
                    type="text"
                    placeholder="Nro. de transferencia o voucher"
                    value={pagoForm.comprobante}
                    onChange={(e) => setPagoForm({ ...pagoForm, comprobante: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                  Guardar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}