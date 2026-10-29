import { Building2, Coffee, Wallet, RefreshCw, Landmark, History } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const currency = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

function formatAmount(amount: number) {
  return currency.format(amount)
}

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

interface UltimoMovimiento {
  id: string
  fecha: string
  cuenta: string
  detalle: string
  monto: number
  tipo: 'Ingreso' | 'Egreso' | 'Justificado'
}

interface DetalleMedioPago {
  name: string
  amount: number
  color: string
}

interface CanalFinanciero {
  bruto: number
  propina: number
  iva: number
  comision: number
  neto: number
}

export default function PanelGeneralFinanzas() {
  const [period, setPeriod] = useState(periods[0].value)
  const [loading, setLoading] = useState(false)
  
  // Desglose por canal
  const [mpData, setMpData] = useState<CanalFinanciero>({ bruto: 0, propina: 0, iva: 0, comision: 0, neto: 0 })
  const [chileData, setChileData] = useState<CanalFinanciero>({ bruto: 0, propina: 0, iva: 0, comision: 0, neto: 0 })
  const [santanderData, setSantanderData] = useState<CanalFinanciero>({ bruto: 0, propina: 0, iva: 0, comision: 0, neto: 0 })
  const [efectivoData, setEfectivoData] = useState<CanalFinanciero>({ bruto: 0, propina: 0, iva: 0, comision: 0, neto: 0 })

  // Métricas del DÍA DE HOY
  const [ingresosHoy, setIngresosHoy] = useState(0)
  const [gastosHoy, setGastosHoy] = useState(0)
  const [gastosSinJustificarHoy, setGastosSinJustificarHoy] = useState(0)

  const [lineasNegocioData, setLineasNegocioData] = useState<{ name: string; amount: number; icon: any; color: string }[]>([])
  const [abonosCuentaData, setAbonosCuentaData] = useState<DetalleMedioPago[]>([])
  const [ultimosMovimientos, setUltimosMovimientos] = useState<UltimoMovimiento[]>([])

  const fetchDataFinanciera = async () => {
    setLoading(true)
    const [anio, mes] = period.split('-')
    const primerDia = `${period}-01`
    const ultimoDia = new Date(Number(anio), Number(mes), 0).toISOString().split('T')[0]
    const hoyStr = new Date().toISOString().split('T')[0]

    try {
      // 1. VENTAS CAFETERÍA Y DESGLOSE POR CANAL
      const { data: ventas, error: errVentas } = await supabase
        .from('ventas_diarias')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)

      if (errVentas) throw errVentas

      let sumNetoCafeteria = 0
      let ventasHoyTotal = 0

      let mpB = 0, mpP = 0, mpI = 0, mpC = 0, mpN = 0
      let chB = 0, chP = 0, chI = 0, chC = 0, chN = 0
      let efB = 0, efP = 0, efI = 0, efN = 0

      const mapaMediosDetalle: { [key: string]: number } = {}

      ventas?.forEach(curr => {
        const bruto = Number(curr.monto_bruto || 0)
        const propina = Number(curr.propina || 0)
        const comision = Number(curr.comision || 0)
        const mpRaw = curr.medio_pago || 'Efectivo'
        const mpLower = mpRaw.toLowerCase().trim()
        const fechaVenta = String(curr.fecha || '').split('T')[0]

        if (fechaVenta === hoyStr) {
          ventasHoyTotal += bruto
        }

        const brutoSinPropina = bruto - propina
        const netoSinIva = brutoSinPropina > 0 ? brutoSinPropina / 1.19 : 0
        const ivaFila = brutoSinPropina - netoSinIva

        mapaMediosDetalle[mpRaw] = (mapaMediosDetalle[mpRaw] || 0) + bruto

        if (mpLower.includes('chile') || mpLower.includes('fan')) {
          const netoRealFinal = netoSinIva - comision
          sumNetoCafeteria += netoRealFinal
          chB += bruto; chP += propina; chI += ivaFila; chC += comision; chN += netoRealFinal
        } else if (mpLower.includes('efectivo') || mpLower.includes('cash') || mpLower.includes('presencial')) {
          const netoRealFinal = netoSinIva
          sumNetoCafeteria += netoRealFinal
          efB += bruto; efP += propina; efI += ivaFila; efN += netoRealFinal
        } else {
          const netoRealFinal = netoSinIva - comision
          sumNetoCafeteria += netoRealFinal
          mpB += bruto; mpP += propina; mpI += ivaFila; mpC += comision; mpN += netoRealFinal
        }
      })
      
      setMpData({ bruto: mpB, propina: mpP, iva: Math.round(mpI), comision: mpC, neto: Math.round(mpN) })
      setChileData({ bruto: chB, propina: chP, iva: Math.round(chI), comision: cpVal(chC), neto: Math.round(chN) }) // corregido comision ch
      setEfectivoData({ bruto: efB, propina: efP, iva: Math.round(efI), comision: 0, neto: Math.round(efN) })

      // 2. OFICINAS FÍSICAS
      const { data: pof } = await supabase
        .from('pagos_oficinas_fisicas')
        .select('*')
        .gte('fecha_pago', primerDia)
        .lte('fecha_pago', ultimoDia)
      
      let sumPofBruto = 0
      let oficinasHoyTotal = 0
      pof?.forEach(curr => {
        const monto = Number(curr.monto || curr.total || 0)
        sumPofBruto += monto
        if (String(curr.fecha_pago || '').split('T')[0] === hoyStr) {
          oficinasHoyTotal += monto
        }
      })

      const { data: uop } = await supabase
        .from('uso_oficinas_particulares')
        .select('*')
        .gte('fecha_inicio', primerDia)
        .lte('fecha_inicio', ultimoDia)
      
      uop?.forEach(curr => {
        if (curr.estado_pago !== 'Cancelado') {
          const monto = Number(curr.monto_total || curr.monto || 0)
          if (String(curr.fecha_inicio || '').split('T')[0] === hoyStr) {
            oficinasHoyTotal += monto
          }
        }
      })
      
      const totalOficinasFisicasBruto = sumPofBruto + (uop?.filter(i => i.estado_pago !== 'Cancelado').reduce((acc, curr) => acc + Number(curr.monto_total || curr.monto || 0), 0) || 0)
      const ivaOficinasFisicas = totalOficinasFisicasBruto - (totalOficinasFisicasBruto / 1.19)
      const netoOficinasFisicas = totalOficinasFisicasBruto / 1.19

      // 3. OFICINAS VIRTUALES
      const { data: pag } = await supabase
        .from('pagos')
        .select('*')
        .gte('fecha_pago', primerDia)
        .lte('fecha_pago', ultimoDia)
      
      const totalOficinasVirtuales = pag?.reduce((acc, curr) => {
        const valorNeto = Number(curr.neto || curr.bruto || curr.monto_liquido || curr.monto || 0)
        if (String(curr.fecha_pago || '').split('T')[0] === hoyStr) {
          oficinasHoyTotal += valorNeto
        }
        return acc + valorNeto
      }, 0) || 0

      const totalSantanderBruto = totalOficinasFisicasBruto + totalOficinasVirtuales
      const totalSantanderNeto = netoOficinasFisicas + totalOficinasVirtuales
      const totalSantanderIva = ivaOficinasFisicas

      setSantanderData({
        bruto: totalSantanderBruto,
        propina: 0,
        iva: Math.round(totalSantanderIva),
        comision: 0,
        neto: Math.round(totalSantanderNeto)
      })

      setIngresosHoy(ventasHoyTotal + oficinasHoyTotal)

      // 4. EGRESOS OPERATIVOS
      const { data: egr } = await supabase
        .from('egresos')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
      
      const egresosValidos = (egr || []).filter(e => !e.es_traspaso)

      let gastosHoySum = 0
      let gastosSinJustificarCount = 0
      egresosValidos.forEach(e => {
        if (String(e.fecha || '').split('T')[0] === hoyStr) {
          const montoEgr = Number(e.monto || 0)
          gastosHoySum += montoEgr
          if (!e.justificado) {
            gastosSinJustificarCount += 1
          }
        }
      })
      setGastosHoy(gastosHoySum)
      setGastosSinJustificarHoy(gastosSinJustificarCount)

      // Líneas de negocio
      const lineasArray = [
        { name: 'Ventas cafetería', amount: Math.round(sumNetoCafeteria), icon: Coffee, color: 'bg-gradient-to-r from-amber-500 to-amber-600' },
        { name: 'Oficinas físicas', amount: Math.round(netoOficinasFisicas), icon: Building2, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
        { name: 'Oficinas virtuales', amount: totalOficinasVirtuales, icon: Landmark, color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
      ].filter(l => l.amount > 0)
      setLineasNegocioData(lineasArray)

      const coloresBarra = [
        'bg-[#D4AF37]', 'bg-sky-500', 'bg-emerald-500', 'bg-blue-600', 
        'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 'bg-red-600'
      ]
      const abonosDetalleArray = Object.entries(mapaMediosDetalle).map(([name, amount], idx) => ({
        name,
        amount,
        color: coloresBarra[idx % coloresBarra.length]
      })).sort((a, b) => b.amount - a.amount)

      setAbonosCuentaData(abonosDetalleArray)

      const listaVentasMovs: UltimoMovimiento[] = (ventas || []).map(v => ({
        id: v.id,
        fecha: v.fecha,
        cuenta: v.medio_pago || 'Mercado Pago',
        detalle: v.observacion || `Venta en ${v.linea_negocio || 'cafetería'}`,
        monto: Number(v.monto_bruto || 0),
        tipo: 'Ingreso' as const
      }))

      const listaEgresosMovs: UltimoMovimiento[] = egresosValidos.map(e => ({
        id: e.id,
        fecha: e.fecha,
        cuenta: e.cuenta || 'Caja Efectivo',
        detalle: e.descripcion || 'Egreso operativo',
        monto: Number(e.monto || 0),
        tipo: e.justificado ? ('Justificado' as const) : ('Egreso' as const)
      }))

      const todosMovs = [...listaVentasMovs, ...listaEgresosMovs].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      setUltimosMovimientos(todosMovs.slice(0, 10))
    } catch (err: any) {
      console.error('Error al cargar datos financieros:', err.message)
    } finally {
      setLoading(false)
    }
  }

  function cpVal(val: number) {
    return val
  }

  useEffect(() => {
    void fetchDataFinanciera()
  }, [period])

  const totalIncome = lineasNegocioData.reduce((total, line) => total + line.amount, 0)
  const totalDeposits = abonosCuentaData.reduce((total, account) => total + account.amount, 0)
  
  const brutoMpEf = mpData.bruto + efectivoData.bruto
  const netofMpEf = mpData.neto + efectivoData.neto

  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans pb-16 p-6 bg-transparent">
      
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-amber-200/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-red-700">Panel financiero</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">Ingresos, gastos y justificaciones por cuenta.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-11 rounded-2xl border border-amber-300 bg-white px-4 text-xs font-bold capitalize text-slate-800 shadow-sm outline-none transition focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 cursor-pointer"
          >
            {periods.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void fetchDataFinanciera()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] hover:bg-[#C5A059] px-5 text-xs font-black text-slate-950 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar datos</span>
          </button>
        </div>
      </section>

      <section aria-label="Indicadores diarios" className="grid gap-5 sm:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-emerald-500 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Ingresos de hoy</p>
          <p className="mt-2 text-2xl font-black text-emerald-600 font-mono">{formatAmount(ingresosHoy)}</p>
        </article>
        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-rose-500 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Gastos de hoy</p>
          <p className="mt-2 text-2xl font-black text-rose-600 font-mono">{formatAmount(gastosHoy)}</p>
        </article>
        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-amber-500 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Gastos sin justificar hoy</p>
          <p className="mt-2 text-2xl font-black text-slate-900 font-mono">{gastosSinJustificarHoy}</p>
        </article>
      </section>

      <section aria-label="Cuentas principales" className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start">
        
        <div className="space-y-3">
          <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-[#D4AF37] bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-xl bg-[#181818] text-[#D4AF37] font-black text-xs">MP</span>
              </div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">MERCADO PAGO</p>
              <p className="text-[10px] text-slate-400 font-medium">Ingresos de pasarela y cafetería</p>
              <p className="mt-2 text-2xl font-black text-slate-900 font-mono">{formatAmount(mpData.bruto)}</p>
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-medium text-slate-600">
              <div className="flex justify-between"><span>Propina:</span> <span className="font-mono text-emerald-600 font-bold">- {formatAmount(mpData.propina)}</span></div>
              <div className="flex justify-between"><span>IVA (19%):</span> <span className="font-mono text-amber-700 font-bold">- {formatAmount(mpData.iva)}</span></div>
              <div className="flex justify-between"><span>Comisiones MP:</span> <span className="font-mono text-rose-600 font-bold">- {formatAmount(mpData.comision)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
                <span>Neto Real:</span> <span className="font-mono text-[#D4AF37]">{formatAmount(mpData.neto)}</span>
              </div>
            </div>
          </article>

          <div className="rounded-2xl bg-[#181818] text-white p-4 shadow-md space-y-2">
            <p className="text-[9px] font-black tracking-widest text-[#D4AF37] uppercase">TOTAL MP + EFECTIVO:</p>
            <div className="flex justify-between font-mono text-xs font-black">
              <div>
                <span className="text-slate-400 text-[9px] block uppercase font-sans">BRUTO:</span>
                <span className="text-white text-sm">{formatAmount(brutoMpEf)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block uppercase font-sans">NETO:</span>
                <span className="text-[#D4AF37] text-sm">{formatAmount(netofMpEf)}</span>
              </div>
            </div>
          </div>
        </div>

        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-[#D4AF37] bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-xl bg-[#181818] text-[#D4AF37] font-black text-xs">ST</span>
            </div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">BANCO SANTANDER</p>
            <p className="text-[10px] text-slate-400 font-medium">Arriendos de oficinas y servicios</p>
            <p className="mt-2 text-2xl font-black text-slate-900 font-mono">{formatAmount(santanderData.bruto)}</p>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-medium text-slate-600">
            <div className="flex justify-between"><span>Propina:</span> <span className="font-mono text-slate-400">$0</span></div>
            <div className="flex justify-between"><span>IVA (19%):</span> <span className="font-mono text-amber-700 font-bold">- {formatAmount(santanderData.iva)}</span></div>
            <div className="flex justify-between"><span>Comisiones:</span> <span className="font-mono text-slate-400">$0</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
              <span>Neto Real:</span> <span className="font-mono text-[#D4AF37]">{formatAmount(santanderData.neto)}</span>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-[#D4AF37] bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-xl bg-[#181818] text-[#D4AF37] font-black text-xs">CH</span>
            </div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">BANCO DE CHILE · FAN</p>
            <p className="text-[10px] text-slate-400 font-medium">Delivery y fondo de emergencia</p>
            <p className="mt-2 text-2xl font-black text-slate-900 font-mono">{formatAmount(chileData.bruto)}</p>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-medium text-slate-600">
            <div className="flex justify-between"><span>Propina:</span> <span className="font-mono text-emerald-600 font-bold">- {formatAmount(chileData.propina)}</span></div>
            <div className="flex justify-between"><span>IVA (19%):</span> <span className="font-mono text-amber-700 font-bold">- {formatAmount(chileData.iva)}</span></div>
            <div className="flex justify-between"><span>Comisiones:</span> <span className="font-mono text-rose-600 font-bold">- {formatAmount(chileData.comision)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
              <span>Neto Real:</span> <span className="font-mono text-[#D4AF37]">{formatAmount(chileData.neto)}</span>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/90 border-l-4 border-l-[#D4AF37] bg-white p-6 shadow-sm hover:shadow-md transition-all space-y-4 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-xl bg-[#181818] text-[#D4AF37] font-black text-xs">$</span>
            </div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">EFECTIVO</p>
            <p className="text-[10px] text-slate-400 font-medium">Dinero en efectivo de ventas</p>
            <p className="mt-2 text-2xl font-black text-slate-900 font-mono">{formatAmount(efectivoData.bruto)}</p>
          </div>
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] font-medium text-slate-600">
            <div className="flex justify-between"><span>Propina:</span> <span className="font-mono text-emerald-600 font-bold">- {formatAmount(efectivoData.propina)}</span></div>
            <div className="flex justify-between"><span>IVA (19%):</span> <span className="font-mono text-amber-700 font-bold">- {formatAmount(efectivoData.iva)}</span></div>
            <div className="flex justify-between"><span>Comisiones:</span> <span className="font-mono text-slate-400">$0</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
              <span>Neto Real:</span> <span className="font-mono text-[#D4AF37]">{formatAmount(efectivoData.neto)}</span>
            </div>
          </div>
        </article>

      </section>

      <section aria-label="Composición financiera" className="grid gap-6 xl:grid-cols-2">
        
        <article className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Ingresos por línea de negocio</h2>
              <p className="mt-0.5 text-xs text-slate-400 font-medium">Distribución porcentual de ventas de todas las categorías del mes</p>
            </div>
            <span className="rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-xs font-black text-amber-800 font-mono">
              {formatAmount(totalIncome)}
            </span>
          </header>
          
          <div className="space-y-6">
            {lineasNegocioData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12 italic font-medium">No hay registros de líneas de negocio para este periodo.</p>
            ) : (
              lineasNegocioData.map(({ name, amount, icon: Icon, color }) => {
                const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0
                return (
                  <div key={name} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-sm">
                          <Icon size={17} />
                        </span>
                        <span className="truncate text-xs font-black text-slate-800">{name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs font-black text-slate-900 font-mono">{formatAmount(amount)}</span>
                        <span className="w-10 text-right text-xs font-black text-amber-700 font-mono">{percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm flex flex-col justify-between">
          <div>
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Abonos por medio de pago</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Dinero recibido según canal de cobro</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#181818] text-[#D4AF37] shadow-md">
                <Wallet size={20} />
              </span>
            </header>
            
            <div className="mb-6 rounded-2xl bg-amber-50/50 border border-amber-200/40 p-5 shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Total recibido en canales</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 font-mono">{formatAmount(totalDeposits)}</p>
            </div>
          </div>
          
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {abonosCuentaData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 italic">Sin datos de abonos registrados.</p>
            ) : (
              abonosCuentaData.map(({ name, amount, color }) => {
                const percentage = totalDeposits > 0 ? Math.round((amount / totalDeposits) * 100) : 0
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-700 capitalize">{name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 font-mono">{formatAmount(amount)}</span>
                        <span className="font-bold text-slate-400 w-8 text-right font-mono">{percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </article>

      </section>

      <section aria-label="Últimos movimientos" className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-[#D4AF37] shadow-md">
              <History size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">Últimos movimientos</h2>
              <p className="text-xs text-slate-400 font-medium">Registro cronológico reciente de transacciones y gastos</p>
            </div>
          </div>
          <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
            {ultimosMovimientos.length} registros
          </span>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cuenta / Canal</th>
                <th className="py-3 px-4">Detalle</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-medium">
              {ultimosMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 italic">No hay movimientos recientes registrados.</td>
                </tr>
              ) : (
                ultimosMovimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono font-bold">{m.fecha}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{m.cuenta}</td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">{m.detalle}</td>
                    <td className={`py-3.5 px-4 text-right font-black font-mono ${m.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {m.tipo === 'Ingreso' ? '+ ' : '- '}{formatAmount(m.monto)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        m.tipo === 'Ingreso' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : m.tipo === 'Justificado' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}