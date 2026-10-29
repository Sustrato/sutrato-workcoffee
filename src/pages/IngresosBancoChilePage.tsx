import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { Search, Landmark, Calendar, Filter, BarChart3, ListOrdered, TrendingUp, PieChart, ShieldCheck, Clock, Award, Info, Receipt, Percent } from 'lucide-react'

interface IngresoUnificado {
  id: string
  origen: string
  cliente_nombre: string
  rut: string
  tipo_oficina: string
  fecha_pago: string
  monto_bruto: number
  comision: number
  concepto: string
  estado: string
  forma_pago: string
}

const normalizarRut = (valor: string) => {
  if (!valor) return ''
  return valor.toLowerCase().replace(/[\.\-\s]/g, '')
}

export default function IngresosBancoChilePage() {
  const [ingresos, setIngresos] = useState<IngresoUnificado[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [mesFiltro, setMesFiltro] = useState<string>('todos')
  const [formaPagoFiltro, setFormaPagoFiltro] = useState<string>('todos')
  const [activeTab, setActiveTab] = useState<'tabla' | 'graficos'>('tabla')
  const [loading, setLoading] = useState(false)

  const fetchIngresos = async () => {
    setLoading(true)

    const [
      { data: empresasData },
      { data: clientesParticularesData },
      { data: dataVirtuales, error: errVirtuales },
      { data: dataFisicas, error: errFisicas },
      { data: dataParticulares, error: errParticulares }
    ] = await Promise.all([
      supabase.from('empresas').select('id, nombre, razon_social, rut'),
      supabase.from('clientes_particulares').select('id, nombre_completo, rut'),
      supabase.from('pagos').select('*').order('fecha_pago', { ascending: false }),
      supabase.from('pagos_oficinas_fisicas').select('*').order('fecha_pago', { ascending: false }),
      supabase.from('uso_oficinas_particulares').select('*').order('fecha_inicio', { ascending: false })
    ])

    if (errVirtuales) console.error('Error en pagos virtuales:', errVirtuales.message)
    if (errFisicas) console.error('Error en pagos físicas:', errFisicas.message)
    if (errParticulares) console.error('Error en particulares:', errParticulares.message)

    const empresasMap = new Map((empresasData || []).map((e: any) => [e.id, e]))
    const clientesParticularesMap = new Map((clientesParticularesData || []).map((c: any) => [c.id, c]))

    const virtuales: IngresoUnificado[] = (dataVirtuales || []).map((item: any) => {
      const emp = empresasMap.get(item.empresa_id) || {}
      return {
        id: item.id,
        origen: 'Oficina Virtual',
        cliente_nombre: emp.nombre || emp.razon_social || item.cliente_nombre || item.empresa_nombre || 'Empresa Virtual',
        rut: emp.rut || item.rut || '',
        tipo_oficina: 'Oficina Virtual',
        fecha_pago: item.fecha_pago || item.created_at?.split('T')[0] || '',
        monto_bruto: Number(item.bruto || item.monto_bruto || item.monto_liquido || item.neto || 0),
        comision: Number(item.comision || item.comision_banco || item.comision_transaccion || 0),
        concepto: item.concepto || 'Arriendo Oficina Virtual',
        estado: item.estado || 'Confirmado',
        forma_pago: item.forma_pago || 'Transferencia'
      }
    })

    const fisicas: IngresoUnificado[] = (dataFisicas || []).map((item: any) => {
      const emp = empresasMap.get(item.empresa_id) || {}
      return {
        id: item.id,
        origen: 'Oficina Física',
        cliente_nombre: emp.nombre || emp.razon_social || item.cliente_nombre || 'Empresa Física',
        rut: emp.rut || '',
        tipo_oficina: 'Oficina Física',
        fecha_pago: item.fecha_pago || item.created_at?.split('T')[0] || '',
        monto_bruto: Number(item.monto_bruto || item.monto_liquido || item.monto_neto || 0),
        comision: Number(item.comision || item.comision_banco || 0),
        concepto: item.concepto || 'Arriendo Oficina Física',
        estado: item.estado || 'Confirmado',
        forma_pago: item.forma_pago || 'Transferencia'
      }
    })

    const particulares: IngresoUnificado[] = (dataParticulares || []).map((item: any) => {
      const cli = clientesParticularesMap.get(item.cliente_id) || {}
      return {
        id: item.id,
        origen: 'Oficina Física',
        cliente_nombre: cli.nombre_completo || item.cliente_nombre || 'Particular',
        rut: cli.rut || item.rut || '',
        tipo_oficina: item.oficina_asignada || 'Sala / Oficina',
        fecha_pago: item.fecha_inicio || item.created_at?.split('T')[0] || '',
        monto_bruto: Number(item.monto_total || 0),
        comision: Number(item.comision || item.comision_banco || 0),
        concepto: `Uso por ${item.modalidad || 'hora'} (${item.horas_calculadas || 0} hrs)`,
        estado: item.estado_pago || 'Pagado',
        forma_pago: item.forma_pago || 'Transferencia'
      }
    })

    const combinados = [...virtuales, ...fisicas, ...particulares].sort((a, b) => 
      new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
    )

    setIngresos(combinados)
    setLoading(false)
  }

  useEffect(() => {
    fetchIngresos()
  }, [])

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>()
    ingresos.forEach(item => {
      if (item.fecha_pago && item.fecha_pago.length >= 7) {
        setMeses.add(item.fecha_pago.substring(0, 7))
      }
    })
    return Array.from(setMeses).sort().reverse()
  }, [ingresos])

  const ingresosFiltered = useMemo(() => {
    const queryLimpio = normalizarRut(searchTerm)
    return ingresos.filter(i => {
      const nombreMatch = i.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      const conceptoMatch = i.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      const rutLimpio = normalizarRut(i.rut || '')
      const rutMatch = queryLimpio ? rutLimpio.includes(queryLimpio) : false
      const textoMatch = nombreMatch || conceptoMatch || rutMatch

      const mesMatch = mesFiltro === 'todos' || (i.fecha_pago && i.fecha_pago.startsWith(mesFiltro))
      const pagoMatch = formaPagoFiltro === 'todos' || i.forma_pago?.toLowerCase().includes(formaPagoFiltro.toLowerCase())

      return textoMatch && mesMatch && pagoMatch
    })
  }, [ingresos, searchTerm, mesFiltro, formaPagoFiltro])

  // --- CÁLCULOS FINANCIEROS REALES CON COMISIÓN EXTRAÍDA DE LA BD ---
  const resumenFinanciero = useMemo(() => {
    let brutoTotal = 0
    let comisionTotal = 0

    ingresosFiltered.forEach(i => {
      brutoTotal += Number(i.monto_bruto) || 0
      comisionTotal += Number(i.comision) || 0
    })

    const netoTotal = brutoTotal / 1.19
    const ivaTotal = brutoTotal - netoTotal
    const flujoNetoReal = netoTotal - comisionTotal

    return {
      brutoTotal,
      netoTotal,
      ivaTotal,
      comisionTotal,
      flujoNetoReal
    }
  }, [ingresosFiltered])

  // --- DATOS PARA GRÁFICOS ---
  const recaudacionPorMes = useMemo(() => {
    const mapa: { [key: string]: number } = {}
    ingresosFiltered.forEach(i => {
      if (!i.fecha_pago) return
      const mes = i.fecha_pago.substring(0, 7)
      mapa[mes] = (mapa[mes] || 0) + i.monto_bruto
    })
    return Object.entries(mapa).sort((a, b) => a[0].localeCompare(b[0]))
  }, [ingresosFiltered])

  const recaudacionPorModulo = useMemo(() => {
    const mapa: { [key: string]: number } = {}
    ingresosFiltered.forEach(i => {
      const categoria = i.origen === 'Oficina Virtual' ? 'Oficina Virtual' : 'Oficina Física'
      mapa[categoria] = (mapa[categoria] || 0) + i.monto_bruto
    })
    return Object.entries(mapa)
  }, [ingresosFiltered])

  // --- DESEMPEÑO CRUZADO POR DÍA DE LA SEMANA ---
  const desempenoPorDia = useMemo(() => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const mapa: { [key: string]: number } = { Lunes: 0, Martes: 0, Miércoles: 0, Jueves: 0, Viernes: 0, Sábado: 0, Domingo: 0 }
    
    ingresosFiltered.forEach(i => {
      if (!i.fecha_pago) return
      const fecha = new Date(i.fecha_pago + 'T00:00:00')
      if (!isNaN(fecha.getTime())) {
        const nombreDia = dias[fecha.getDay()]
        mapa[nombreDia] = (mapa[nombreDia] || 0) + i.monto_bruto
      }
    })
    return Object.entries(mapa)
  }, [ingresosFiltered])

  const coloresModulo: { [key: string]: string } = {
    'Oficina Virtual': '#3B82F6',
    'Oficina Física': '#C5A059'
  }

  let acumuladoAngulo = 0
  const totalDonut = resumenFinanciero.brutoTotal || 1
  const porcionesDonut = recaudacionPorModulo.map(([origen, monto]) => {
    const porcentaje = monto / totalDonut
    const dashArray = `${porcentaje * 100} 100`
    const dashOffset = -acumuladoAngulo * 100
    acumuladoAngulo += porcentaje
    return {
      origen,
      monto,
      porcentaje: Math.round(porcentaje * 100),
      color: coloresModulo[origen] || '#94A3B8',
      dashArray,
      dashOffset
    }
  })

  const formatearMesAnio = (YYYY_MM: string) => {
    try {
      const [anio, mes] = YYYY_MM.split('-')
      const fecha = new Date(Number(anio), Number(mes) - 1, 1)
      return fecha.toLocaleString('es-CL', { month: 'short', year: 'numeric' })
    } catch {
      return YYYY_MM
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 font-sans pb-16">
      
      {/* HEADER ULTRA MODERN FINTECH */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-gradient-to-r from-white via-white to-amber-50/20 border border-slate-200/90 p-7 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-[#181818] border border-amber-500/30 flex items-center justify-center text-[#C5A059] shadow-lg">
            <Landmark size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Ingresos Banco Chile</h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Auditoría gerencial, comisiones desde BD y desglose de IVA (19%)</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* TABS ULTRA MODERNOS (ESTILO PÍLLORA FLOTANTE FINTECH) */}
          <div className="relative flex bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner">
            <button
              onClick={() => setActiveTab('tabla')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'tabla' ? 'text-[#C5A059]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ListOrdered size={15} /> Transacciones
            </button>
            <button
              onClick={() => setActiveTab('graficos')}
              className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'graficos' ? 'text-[#C5A059]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={15} /> Analítica Pro
            </button>
            
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#181818] rounded-xl shadow-md transition-transform duration-300 ease-out ${
                activeTab === 'graficos' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
              }`}
            />
          </div>

          {/* SELECTOR DE MES */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
            <Calendar size={16} className="text-[#C5A059]" />
            <select 
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="todos">📅 Todo el historial</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m} className="capitalize">
                  {formatearMesAnio(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* TARJETAS DE MÉTRICAS KPI FINANCIERAS CON COMISIÓN EXTRAÍDA DE LA BD */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm border-l-6 border-l-[#C5A059]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recaudación Bruta</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5 font-mono tracking-tight">${Math.round(resumenFinanciero.brutoTotal).toLocaleString('es-CL')}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-[#C5A059] border border-amber-100">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Total abonado en cuenta</p>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm border-l-6 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IVA Fiscal (19%)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5 font-mono tracking-tight">${Math.round(resumenFinanciero.ivaTotal).toLocaleString('es-CL')}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
              <Receipt size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Retención fiscal estimada</p>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm border-l-6 border-l-amber-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comisión Real (BD)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5 font-mono tracking-tight">${Math.round(resumenFinanciero.comisionTotal).toLocaleString('es-CL')}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-700 border border-amber-100">
              <Percent size={20} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Extraída de registros de pago</p>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm border-l-6 border-l-emerald-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flujo Neto Real</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1.5 font-mono tracking-tight">${Math.round(resumenFinanciero.flujoNetoReal).toLocaleString('es-CL')}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
              <ShieldCheck size={20} />
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">Disponible post-IVA y comisiones</p>
        </article>
      </section>

      {/* VISTA 1: TABLA */}
      {activeTab === 'tabla' && (
        <div className="space-y-5 animate-fadeIn">
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">Búsqueda inteligente</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, RUT o concepto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">Canal de pago</label>
              <div className="relative">
                <Filter className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <select 
                  value={formaPagoFiltro}
                  onChange={(e) => setFormaPagoFiltro(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 font-bold cursor-pointer"
                >
                  <option value="todos">⚡ Todos los canales</option>
                  <option value="Transferencia">🏦 Transferencia Banco Chile</option>
                  <option value="Tarjeta">💳 Tarjeta de Débito/Crédito</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181818] text-[#C5A059] font-extrabold uppercase tracking-widest text-[10px]">
                    <th className="py-4 px-5">Fecha / Estado</th>
                    <th className="py-4 px-5">Cliente / RUT</th>
                    <th className="py-4 px-5">Módulo / Canal</th>
                    <th className="py-4 px-5">Concepto</th>
                    <th className="py-4 px-5 text-right">Comisión BD</th>
                    <th className="py-4 px-5 text-right">Monto Bruto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">Cargando registros financieros...</td></tr>
                  ) : ingresosFiltered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No se encontraron transacciones con los filtros actuales.</td></tr>
                  ) : (
                    ingresosFiltered.map(item => (
                      <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-900 font-mono">{item.fecha_pago}</span>
                          <span className={`block mt-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full w-fit ${item.estado === 'Confirmado' || item.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-900 block">{item.cliente_nombre}</span>
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{item.rut || 'Sin RUT'}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-2.5 py-1 rounded-xl font-bold text-[10px] bg-slate-100 text-slate-800 inline-block">
                            {item.origen}
                          </span>
                          <span className="block mt-1 text-slate-500 font-medium text-[11px]">{item.forma_pago}</span>
                        </td>
                        <td className="py-4 px-5 text-slate-600 font-medium">
                          {item.concepto}
                        </td>
                        <td className="py-4 px-5 text-right font-bold text-amber-700 font-mono">
                          ${Number(item.comision).toLocaleString('es-CL')}
                        </td>
                        <td className="py-4 px-5 text-right font-black text-emerald-700 text-sm font-mono">
                          ${Number(item.monto_bruto).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* VISTA 2: ANALÍTICA PRO */}
      {activeTab === 'graficos' && (
        <div className="grid gap-6 md:grid-cols-2 animate-fadeIn">
          
          {/* GRÁFICO 1: DISTRIBUCIÓN DONUT */}
          <article className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <PieChart size={18} className="text-[#C5A059]" /> Distribución de Ingresos por Módulo
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Participación porcentual entre oficinas virtuales y físicas</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
              <div className="relative size-44 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="size-full rotate-[-90deg]">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F1F5F9" strokeWidth="3.5"></circle>
                  {porcionesDonut.map((p, idx) => (
                    <circle
                      key={idx}
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke={p.color}
                      strokeWidth="3.5"
                      strokeDasharray={p.dashArray}
                      strokeDashoffset={p.dashOffset}
                      className="transition-all duration-1000 ease-out"
                    ></circle>
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bruto Total</span>
                  <span className="text-base font-black text-slate-900 font-mono">${(resumenFinanciero.brutoTotal / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <div className="space-y-3.5 w-full sm:w-auto">
                {porcionesDonut.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-6 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="size-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: p.color }} />
                      <span className="font-bold text-slate-700">{p.origen}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block font-mono">${p.monto.toLocaleString('es-CL')}</span>
                      <span className="text-[10px] text-slate-400 font-extrabold">{p.porcentaje}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* GRÁFICO 2: DESEMPEÑO CRUZADO POR DÍA */}
          <article className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Clock size={18} className="text-[#C5A059]" /> Recaudación Acumulada por Día de la Semana
                </h3>
                <span className="bg-amber-50 text-[#C5A059] border border-amber-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg">Auditoría</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Info size={14} className="text-[#C5A059] shrink-0" />
                Suma total de dinero recibido agrupado según el día de la semana en que se efectuó el pago. Muestra qué días concentran mayor flujo.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {desempenoPorDia.map(([dia, monto]) => {
                const maxDia = Math.max(...desempenoPorDia.map(d => d[1]), 1)
                const esTop = monto === maxDia && monto > 0
                return (
                  <div key={dia} className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${esTop ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-slate-50/60 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-700">{dia}</span>
                      {esTop && <Award size={14} className="text-[#C5A059]" />}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 font-mono block">${monto.toLocaleString('es-CL')}</span>
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-[#C5A059] h-full rounded-full" style={{ width: `${Math.round((monto / maxDia) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          {/* GRÁFICO 3: BARRAS VERTICALES WATERFALL GRANDE ABAJO */}
          <article className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm space-y-6 md:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp size={20} className="text-[#C5A059]" /> Evolución Mensual de Ingresos (Columnas con Gradiente)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Rendimiento gerencial y comparativa de recaudación mes a mes con efecto de luz superior</p>
              </div>
              <span className="bg-amber-50 text-[#C5A059] border border-amber-200 text-xs font-bold px-3 py-1 rounded-xl">Waterfall Pro</span>
            </div>

            {recaudacionPorMes.length === 0 ? (
              <p className="text-xs text-slate-400 py-20 text-center font-medium">Sin datos suficientes para graficar la evolución.</p>
            ) : (() => {
              const maxVal = Math.max(...recaudacionPorMes.map(m => m[1]), 1000)
              return (
                <div className="space-y-4">
                  <div className="w-full h-80 bg-slate-50/80 rounded-3xl border border-slate-100 p-6 flex items-end justify-between gap-4 overflow-x-auto pt-10">
                    {recaudacionPorMes.map(([mes, monto]) => {
                      const alturaPorcentaje = Math.max((monto / maxVal) * 100, 10)
                      return (
                        <div key={mes} className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[50px]">
                          <div className="absolute -top-10 bg-[#181818] text-[#C5A059] text-xs font-black px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl z-20">
                            ${monto.toLocaleString('es-CL')}
                          </div>
                          
                          <div 
                            className="w-full rounded-t-2xl bg-gradient-to-t from-amber-600 via-[#C5A059] to-amber-300 relative shadow-md group-hover:brightness-110 transition-all duration-300"
                            style={{ height: `${alturaPorcentaje}%` }}
                          >
                            <div className="absolute top-0 inset-x-0 h-2 bg-white/70 rounded-t-2xl" />
                          </div>

                          <span className="text-xs font-bold text-slate-600 mt-3 truncate w-full text-center capitalize">
                            {formatearMesAnio(mes)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium px-2">
                    <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#C5A059]" /> Recaudación bruta por periodo mensual</span>
                    <span className="text-emerald-700 font-black">Vista Ampliada Corporativa</span>
                  </div>
                </div>
              )
            })()}
          </article>

        </div>
      )}

    </div>
  )
}