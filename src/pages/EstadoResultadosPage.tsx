import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Calendar, Printer, CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function EstadoResultadoPage() {
  const [loading, setLoading] = useState(false)
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7)) // Formato YYYY-MM actual
  
  // Montos limpios y reales
  const [ventasCafeteriaNetas, setVentasCafeteriaNetas] = useState(0)
  const [oficinasFisicas, setOficinasFisicas] = useState(0)
  const [oficinasVirtuales, setOficinasVirtuales] = useState(0)
  const [cateringEventos] = useState(0)
  const [coworkMembresias] = useState(0)
  
  // Egresos reales agrupados
  const [egresosLista, setEgresosLista] = useState<any[]>([])
  const [totalEgresosReales, setTotalEgresosReales] = useState(0)
  
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(null), 4000)
  }
  
  const mostrarError = (msg: string) => {
    setMensajeError(msg)
    setTimeout(() => setMensajeError(null), 5000)
  }

  const cargarTotalesRealesBD = async () => {
    setLoading(true)
    try {
      const [anio, mes] = periodo.split('-')
      const primerDia = `${periodo}-01`
      const ultimoDia = new Date(Number(anio), Number(mes), 0).toISOString().split('T')[0]

      // 1. VENTAS CAFETERÍA
      const { data: dv } = await supabase
        .from('ventas_diarias')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
      
      let sumNetoCafeteria = 0
      dv?.forEach(curr => {
        const bruto = Number(curr.monto_bruto || 0)
        const propina = Number(curr.propina || 0)
        const comision = Number(curr.comision || 0)
        const brutoSinPropina = bruto - propina
        const netoSinIva = brutoSinPropina > 0 ? brutoSinPropina / 1.19 : 0
        const netoRealFinal = netoSinIva - comision
        sumNetoCafeteria += netoRealFinal
      })
      setVentasCafeteriaNetas(Math.round(sumNetoCafeteria))

      // 2. OFICINAS FÍSICAS (Descontando IVA 19% para reflejar utilidad neta real)
      const { data: pof } = await supabase
        .from('pagos_oficinas_fisicas')
        .select('*')
        .gte('fecha_pago', primerDia)
        .lte('fecha_pago', ultimoDia)
      const sumPof = pof?.reduce((acc, curr) => acc + (Number(curr.monto || curr.total || 0)), 0) || 0

      const { data: uop } = await supabase
        .from('uso_oficinas_particulares')
        .select('*')
        .gte('fecha_inicio', primerDia)
        .lte('fecha_inicio', ultimoDia)
      const sumUop = uop?.filter(item => item.estado_pago !== 'Cancelado').reduce((acc, curr) => acc + (Number(curr.monto_total || curr.monto || 0)), 0) || 0
      
      const totalOficinasFisicasBruto = sumPof + sumUop
      const netoOficinasFisicas = totalOficinasFisicasBruto > 0 ? totalOficinasFisicasBruto / 1.19 : 0
      setOficinasFisicas(Math.round(netoOficinasFisicas))

      // 3. OFICINAS VIRTUALES (Tabla 'pagos', usando fecha_pago y neto o bruto)
      const { data: pag, error: errPag } = await supabase
        .from('pagos')
        .select('*')
        .gte('fecha_pago', primerDia)
        .lte('fecha_pago', ultimoDia)
      
      if (errPag) console.error('Error cargando pagos virtuales:', errPag.message)
      const sumVirtuales = pag?.reduce((acc, curr) => {
        const valorNeto = Number(curr.neto || curr.bruto || curr.monto_liquido || curr.monto || 0)
        return acc + valorNeto
      }, 0) || 0
      setOficinasVirtuales(Math.round(sumVirtuales))

      // 4. EGRESOS (Filtramos los que NO son traspasos internos)
      const { data: egr } = await supabase
        .from('egresos')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)
      
      const egresosValidos = (egr || []).filter(e => !e.es_traspaso)
      setEgresosLista(egresosValidos)
      const sumEgresos = egresosValidos.reduce((acc, curr) => acc + (Number(curr.monto || 0)), 0)
      setTotalEgresosReales(sumEgresos)

      mostrarExito('¡Estado de resultados sincronizado con éxito!')
    } catch (err: any) {
      console.error('Error al traer totales:', err.message)
      mostrarError('Error al sincronizar las tablas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTotalesRealesBD()
  }, [periodo])

  // Agrupar y sumar los egresos por categoría
  const egresosAgrupados = egresosLista.reduce((acc: Record<string, number>, curr) => {
    const categoria = curr.categoria || 'Sin Categoría'
    const monto = Number(curr.monto || 0)
    if (!acc[categoria]) acc[categoria] = 0
    acc[categoria] += monto
    return acc
  }, {})

  const listaEgresosAgrupados = Object.entries(egresosAgrupados).map(([categoria, total]) => ({
    categoria,
    total,
  }))

  const totalIngresos = ventasCafeteriaNetas + oficinasFisicas + oficinasVirtuales + cateringEventos + coworkMembresias
  const resultadoNeto = totalIngresos - totalEgresosReales

  return (
    <div className="mx-auto max-w-6xl space-y-7 font-sans relative pb-12 p-6 bg-transparent">
      
      {/* Notificaciones */}
      {(mensajeExito || mensajeError) && (
        <div className="fixed top-6 right-6 z-[9999] max-w-md">
          {mensajeExito && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-900 text-emerald-50 px-5 py-4 shadow-2xl">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div className="text-xs font-semibold">{mensajeExito}</div>
              <button onClick={() => setMensajeExito(null)} className="ml-auto text-emerald-300"><X size={16} /></button>
            </div>
          )}
          {mensajeError && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-950 text-rose-50 px-5 py-4 shadow-2xl">
              <AlertCircle size={22} className="text-rose-400 shrink-0" />
              <div className="text-xs font-semibold">{mensajeError}</div>
              <button onClick={() => setMensajeError(null)} className="ml-auto text-rose-300"><X size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Encabezado y Selector de Periodo */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-red-700">Estado de Resultados</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">Sustrato WorkCoffee • Arica (Resumen financiero por categorías)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5">
            <Calendar size={16} className="text-slate-500" />
            <input 
              type="month" 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-[#181818] hover:bg-slate-900 text-[#D4AF37] font-black px-5 py-3 rounded-2xl text-xs shadow transition cursor-pointer"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </section>

      {/* REPORTE PRINCIPAL */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="bg-[#181818] text-[#D4AF37] px-7 py-4 flex justify-between items-center font-black uppercase tracking-wider">
          <span>Ingresos del Periodo ({periodo}) {loading && '— Sincronizando...'}</span>
          <span>Monto (CLP)</span>
        </div>
        
        <div className="divide-y divide-slate-100 font-medium">
          <div className="flex justify-between items-center px-7 py-4 hover:bg-slate-50">
            <span className="text-slate-800">Ventas cafetería (Neto real post-comisión, propinas e IVA)</span>
            <span className="font-bold text-slate-900 font-mono">${ventasCafeteriaNetas.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center px-7 py-4 hover:bg-slate-50">
            <span className="text-slate-800">Oficinas físicas (Pagos + Particulares - IVA)</span>
            <span className="font-bold text-slate-900 font-mono">${oficinasFisicas.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center px-7 py-4 hover:bg-slate-50">
            <span className="text-slate-800">Oficinas virtuales (Pagos - IVA)</span>
            <span className="font-bold text-slate-900 font-mono">${oficinasVirtuales.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center px-7 py-4 hover:bg-slate-50">
            <span className="text-slate-800">Catering y eventos <span className="text-[10px] text-amber-600 font-normal italic">(Pendiente integración)</span></span>
            <span className="font-bold text-slate-900 font-mono">${cateringEventos.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center px-7 py-4 hover:bg-slate-50">
            <span className="text-slate-800">Cowork y membresías <span className="text-[10px] text-amber-600 font-normal italic">(Pendiente integración)</span></span>
            <span className="font-bold text-slate-900 font-mono">${coworkMembresias.toLocaleString('es-CL')}</span>
          </div>
        </div>

        {/* Total Ingresos */}
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-7 py-4 flex justify-between items-center font-black text-slate-900 text-sm">
          <span>TOTAL INGRESOS LÍQUIDOS</span>
          <span className="text-amber-700 font-mono">${totalIngresos.toLocaleString('es-CL')}</span>
        </div>

        {/* EGRESOS SECCIÓN AGRUPADA POR CATEGORÍAS */}
        <div className="bg-[#181818] text-rose-400 px-7 py-4 flex justify-between items-center font-black uppercase tracking-wider border-t-2 border-slate-800">
          <span>Egresos y Costos Operativos (Agrupados por Categoría)</span>
          <span>Monto (CLP)</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {listaEgresosAgrupados.length === 0 ? (
            <div className="px-7 py-6 text-slate-400 italic text-center font-medium">No hay egresos operativos registrados para este periodo.</div>
          ) : (
            listaEgresosAgrupados.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-7 py-4 hover:bg-slate-50 transition">
                <span className="font-black text-slate-800">{item.categoria}</span>
                <span className="font-black text-rose-600 font-mono text-sm">-${item.total.toLocaleString('es-CL')}</span>
              </div>
            ))
          )}
        </div>

        {/* Total Egresos */}
        <div className="bg-rose-500/10 border-t border-rose-500/20 px-7 py-4 flex justify-between items-center font-black text-slate-900 text-sm">
          <span>TOTAL EGRESOS OPERATIVOS</span>
          <span className="text-rose-600 font-mono">-${totalEgresosReales.toLocaleString('es-CL')}</span>
        </div>

        {/* RESULTADO NETO FINAL */}
        <div className="bg-slate-900 text-white px-7 py-5 flex justify-between items-center font-black text-base border-t-2 border-slate-950">
          <span className="tracking-wide">ESTADO NETO DEL PERIODO (UTILIDAD)</span>
          <span className={`font-mono ${resultadoNeto >= 0 ? 'text-emerald-400 text-lg' : 'text-rose-400 text-lg'}`}>
            ${resultadoNeto.toLocaleString('es-CL')}
          </span>
        </div>
      </section>
    </div>
  )
}