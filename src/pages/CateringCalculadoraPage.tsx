import { useState } from 'react'
import { RotateCcw, BookmarkPlus, CheckCircle2 } from 'lucide-react'

interface EscenarioGuardado {
  id: string
  evento: string
  personas: number
  costos: number
  margen: string
  factoring: string
  precioRecomendado: number
}

export default function CateringCalculadoraPage() {
  const [form, setForm] = useState({
    tipoEvento: 'Dentro (dentro de Sutrato)',
    nombreEvento: '',
    cantidadPersonas: '60',
    insumosAlimentos: '0',
    personalContratado: '3',
    costoPersonal: '60000',
    arriendoSalon: '50000',
    equipamientoMontaje: '20000',
    otrosCostosDirectos: '0',
    gananciaDeseada: '30',
    gastosOperacionales: '8',
    imprevistos: '5',
    administracion: '3',
    usaraFactoring: 'No',
    tasaFactoring: '3',
    impuestoRenta: '25',
    presupuestoCliente: '0'
  })

  const [escenarios, setEscenarios] = useState<EscenarioGuardado[]>([])

  const handleTipoEventoChange = (nuevoTipo: string) => {
    let ganancia = '30'
    let operacional = '8'
    let imprevisto = '5'
    let admin = '3'

    if (nuevoTipo === 'Fuera (fuera de Sutrato)') {
      operacional = '12'
      imprevisto = '7'
    } else if (nuevoTipo === 'Licitación') {
      operacional = '15'
      imprevisto = '10'
    }

    setForm({
      ...form,
      tipoEvento: nuevoTipo,
      gananciaDeseada: ganancia,
      gastosOperacionales: operacional,
      imprevistos: imprevisto,
      administracion: admin
    })
  }

  const personas = Number(form.cantidadPersonas) || 0
  const insumos = Number(form.insumosAlimentos) || 0
  const personal = Number(form.costoPersonal) || 0
  const arriendo = Number(form.arriendoSalon) || 0
  const equipamiento = Number(form.equipamientoMontaje) || 0
  const otros = Number(form.otrosCostosDirectos) || 0

  const costosDirectos = insumos + personal + arriendo + equipamiento + otros

  const pGanancia = (Number(form.gananciaDeseada) || 0) / 100
  const pOperacional = (Number(form.gastosOperacionales) || 0) / 100
  const pImprevistos = (Number(form.imprevistos) || 0) / 100
  const pAdmin = (Number(form.administracion) || 0) / 100
  const pImpuesto = (Number(form.impuestoRenta) || 0) / 100
  const pFactoring = form.usaraFactoring === 'Sí' ? (Number(form.tasaFactoring) || 0) / 100 : 0

  const sumaPorcentajes = pGanancia + pOperacional + pImprevistos + pAdmin + pFactoring
  const divisor = 1 - sumaPorcentajes
  const ventaNeta = divisor > 0 ? costosDirectos / divisor : costosDirectos * 1.5

  const gastosOpVal = ventaNeta * pOperacional
  const imprevistosVal = ventaNeta * pImprevistos
  const adminVal = ventaNeta * pAdmin
  const factoringVal = ventaNeta * pFactoring
  const utilidadAntesImpuesto = ventaNeta * pGanancia
  const impuestoRentaVal = utilidadAntesImpuesto * pImpuesto
  const utilidadDespuesImpuesto = utilidadAntesImpuesto - impuestoRentaVal
  const ivaVal = ventaNeta * 0.19
  const precioFinalConIva = ventaNeta + ivaVal
  const precioPorPersona = personas > 0 ? precioFinalConIva / personas : 0

  const handleLimpiar = () => {
    setForm({
      tipoEvento: 'Dentro (dentro de Sutrato)',
      nombreEvento: '',
      cantidadPersonas: '60',
      insumosAlimentos: '0',
      personalContratado: '3',
      costoPersonal: '60000',
      arriendoSalon: '50000',
      equipamientoMontaje: '20000',
      otrosCostosDirectos: '0',
      gananciaDeseada: '30',
      gastosOperacionales: '8',
      imprevistos: '5',
      administracion: '3',
      usaraFactoring: 'No',
      tasaFactoring: '3',
      impuestoRenta: '25',
      presupuestoCliente: '0'
    })
  }

  const handleGuardarEscenario = () => {
    const nuevoEscenario: EscenarioGuardado = {
      id: Date.now().toString(),
      evento: form.nombreEvento || 'Evento sin nombre',
      personas: personas,
      costos: costosDirectos,
      margen: `${form.gananciaDeseada}%`,
      factoring: form.usaraFactoring === 'Sí' ? `${form.tasaFactoring}%` : 'No',
      precioRecomendado: Math.round(precioFinalConIva)
    }
    setEscenarios([nuevoEscenario, ...escenarios])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Calculadora de rentabilidad</h1>
          <p className="text-sm text-slate-500">Determina cuánto cobrar y si una propuesta conviene antes de cotizar</p>
        </div>
        <button
          type="button"
          onClick={handleLimpiar}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <RotateCcw size={16} />
          Limpiar cálculo
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Referencias recomendadas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Úsalas como punto de partida y ajústalas según la dificultad, ubicación y condiciones comerciales del evento.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-4 py-3">Tipo de evento</th>
                <th className="px-4 py-3">Ganancia</th>
                <th className="px-4 py-3">Operacionales</th>
                <th className="px-4 py-3">Imprevistos</th>
                <th className="px-4 py-3">Administración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              <tr>
                <td className="px-4 py-2.5 font-medium text-slate-900">Dentro (dentro de Sutrato)</td>
                <td className="px-4 py-2.5">30%</td>
                <td className="px-4 py-2.5">8%</td>
                <td className="px-4 py-2.5">5%</td>
                <td className="px-4 py-2.5">3%</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-slate-900">Fuera (fuera de Sutrato)</td>
                <td className="px-4 py-2.5">30%</td>
                <td className="px-4 py-2.5">12%</td>
                <td className="px-4 py-2.5">7%</td>
                <td className="px-4 py-2.5">3%</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-slate-900">Licitación</td>
                <td className="px-4 py-2.5">30%</td>
                <td className="px-4 py-2.5">15%</td>
                <td className="px-4 py-2.5">10%</td>
                <td className="px-4 py-2.5">3%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Costos reales del evento</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cotización vinculada</label>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option>Cálculo sin vincular</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo de evento</label>
                <select
                  value={form.tipoEvento}
                  onChange={(e) => handleTipoEventoChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option>Dentro (dentro de Sutrato)</option>
                  <option>Fuera (fuera de Sutrato)</option>
                  <option>Licitación</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nombre del evento</label>
                <input
                  type="text"
                  placeholder="Ej.: Coffee break para 60 personas"
                  value={form.nombreEvento}
                  onChange={(e) => setForm({ ...form, nombreEvento: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cantidad de personas</label>
                <input
                  type="number"
                  value={form.cantidadPersonas}
                  onChange={(e) => setForm({ ...form, cantidadPersonas: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Insumos y alimentos</label>
                <input
                  type="number"
                  value={form.insumosAlimentos}
                  onChange={(e) => setForm({ ...form, insumosAlimentos: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Subtotal: ${insumos.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cantidad de personal contratado</label>
                <input
                  type="number"
                  value={form.personalContratado}
                  onChange={(e) => setForm({ ...form, personalContratado: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Costo de personal</label>
                <input
                  type="number"
                  value={form.costoPersonal}
                  onChange={(e) => setForm({ ...form, costoPersonal: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Subtotal: ${personal.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Arriendo / uso de salón</label>
                <input
                  type="number"
                  value={form.arriendoSalon}
                  onChange={(e) => setForm({ ...form, arriendoSalon: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Subtotal: ${arriendo.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Equipamiento y montaje</label>
                <input
                  type="number"
                  value={form.equipamientoMontaje}
                  onChange={(e) => setForm({ ...form, equipamientoMontaje: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Subtotal: ${equipamiento.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Otros costos directos</label>
                <input
                  type="number"
                  value={form.otrosCostosDirectos}
                  onChange={(e) => setForm({ ...form, otrosCostosDirectos: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Subtotal: ${otros.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="text-sm font-bold">Total de costos directos</span>
              <span className="text-xl font-extrabold text-amber-400">${costosDirectos.toLocaleString('es-CL')}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Porcentajes automáticos según tipo de evento</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Ganancia deseada (%)</label>
                <input
                  type="number"
                  value={form.gananciaDeseada}
                  onChange={(e) => setForm({ ...form, gananciaDeseada: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Gastos operacionales (%)</label>
                <input
                  type="number"
                  value={form.gastosOperacionales}
                  onChange={(e) => setForm({ ...form, gastosOperacionales: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Emergencias / imprevistos (%)</label>
                <input
                  type="number"
                  value={form.imprevistos}
                  onChange={(e) => setForm({ ...form, imprevistos: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Administración / comercial (%)</label>
                <input
                  type="number"
                  value={form.administracion}
                  onChange={(e) => setForm({ ...form, administracion: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">¿Usará factoring?</label>
                <select
                  value={form.usaraFactoring}
                  onChange={(e) => setForm({ ...form, usaraFactoring: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option>No</option>
                  <option>Sí</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tasa factoring (%)</label>
                <input
                  type="number"
                  value={form.tasaFactoring}
                  onChange={(e) => setForm({ ...form, tasaFactoring: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Provisión impuesto renta (%)</label>
                <input
                  type="number"
                  value={form.impuestoRenta}
                  onChange={(e) => setForm({ ...form, impuestoRenta: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Presupuesto cliente (IVA incl.)</label>
                <input
                  type="number"
                  value={form.presupuestoCliente}
                  onChange={(e) => setForm({ ...form, presupuestoCliente: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 sticky top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900">Resultado recomendado</h2>
            
            <div className="rounded-2xl bg-slate-900 text-white p-6 space-y-1 shadow-lg">
              <p className="text-xs font-medium text-slate-400">Precio final a cobrar, IVA incluido</p>
              <p className="text-3xl font-extrabold text-amber-400">${Math.round(precioFinalConIva).toLocaleString('es-CL')}</p>
              <p className="text-xs text-slate-300 pt-1">${Math.round(precioPorPersona).toLocaleString('es-CL')} por persona</p>
            </div>

            <div className="space-y-3 text-sm text-slate-600 divide-y divide-slate-100">
              <div className="flex justify-between pt-2">
                <span>Costos directos</span>
                <span className="font-semibold text-slate-900">${costosDirectos.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Gastos operacionales</span>
                <span className="font-semibold text-slate-900">${Math.round(gastosOpVal).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Imprevistos</span>
                <span className="font-semibold text-slate-900">${Math.round(imprevistosVal).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Administración</span>
                <span className="font-semibold text-slate-900">${Math.round(adminVal).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Costo de factoring</span>
                <span className="font-semibold text-slate-900">${Math.round(factoringVal).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Utilidad antes de impuesto</span>
                <span className="font-semibold text-slate-900">${Math.round(utilidadAntesImpuesto).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Provisión impuesto renta</span>
                <span className="font-semibold text-slate-900">${Math.round(impuestoRentaVal).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3 font-medium text-slate-800">
                <span>Utilidad estimada después de provisión</span>
                <span className="font-semibold text-slate-900">${Math.round(utilidadDespuesImpuesto).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3">
                <span>Venta neta</span>
                <span className="font-semibold text-slate-900">${Math.round(ventaNeta).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between pt-3 pb-1">
                <span>IVA 19%</span>
                <span className="font-semibold text-slate-900">${Math.round(ivaVal).toLocaleString('es-CL')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-amber-400 transition"
              >
                <CheckCircle2 size={16} /> Usar precio
              </button>
              <button
                type="button"
                onClick={handleGuardarEscenario}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 transition"
              >
                <BookmarkPlus size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Escenarios guardados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Personas</th>
                <th className="px-4 py-3">Costos</th>
                <th className="px-4 py-3">Margen</th>
                <th className="px-4 py-3">Factoring</th>
                <th className="px-4 py-3">Precio recomendado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escenarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                    Aún no hay escenarios guardados.
                  </td>
                </tr>
              ) : (
                escenarios.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{esc.evento}</td>
                    <td className="px-4 py-3">{esc.personas}</td>
                    <td className="px-4 py-3">${esc.costos.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3">{esc.margen}</td>
                    <td className="px-4 py-3">{esc.factoring}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">${esc.precioRecomendado.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEscenarios(escenarios.filter(e => e.id !== esc.id))}
                        className="text-xs text-rose-600 hover:underline font-semibold"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}