import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Download, Search, Calendar, Filter } from 'lucide-react'

interface ReporteUnificado {
  id: string
  nombre: string
  rut: string
  tipo: 'Empresa Mensual' | 'Particular (Hora/Día)'
  estado: string
  frecuencia: string
  fecha: string
  recaudacion: number
  comision: number
}

export default function ReportesPage() {
  const [datosReporte, setDatosReporte] = useState<ReporteUnificado[]>([])
  const [loading, setLoading] = useState(false)
  
  // 🔍 Filtros avanzados
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('Todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const fetchTodosLosIngresos = async () => {
    setLoading(true)
    
    // 1. Obtener empresas de arriendo mensual
    const { data: empresas } = await supabase
      .from('oficinas_fisicas')
      .select('*')
      
    // 2. Obtener clientes particulares
    const { data: particulares } = await supabase
      .from('uso_oficinas_particulares')
      .select('*, clientes_particulares(nombre_completo, rut)')

    const listaUnificada: ReporteUnificado[] = []

    if (empresas) {
      empresas.forEach(e => {
        const monto = Number(e.monto_mensual) || 0
        const comision = Number(e.comision_tarjeta) || 0
        listaUnificada.push({
          id: e.id,
          nombre: e.nombre_cliente || 'Sin nombre',
          rut: e.rut_empresa || 'Sin RUT',
          tipo: 'Empresa Mensual',
          estado: e.vigencia || e.estado || 'Activo',
          frecuencia: e.frecuencia || 'Mensual',
          fecha: e.fecha_inicio || '',
          recaudacion: monto,
          comision: comision
        })
      })
    }

    if (particulares) {
      particulares.forEach((p: any) => {
        const monto = Number(p.monto_total) || 0
        const comision = Number(p.comision_tarjeta) || 0
        listaUnificada.push({
          id: p.id,
          nombre: p.clientes_particulares?.nombre_completo || 'Cliente Particular',
          rut: p.clientes_particulares?.rut || 'Sin RUT',
          tipo: 'Particular (Hora/Día)',
          estado: p.estado_pago || 'Pagado',
          frecuencia: p.modalidad || 'Por hora',
          fecha: p.fecha_inicio || '',
          recaudacion: monto,
          comision: comision
        })
      })
    }

    // 📌 Ordenar siempre de la fecha más reciente a la más antigua por defecto
    listaUnificada.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    setDatosReporte(listaUnificada)
    setLoading(false)
  }

  useEffect(() => {
    fetchTodosLosIngresos()
  }, [])

  // 🔎 Filtrado inteligente (Nombre/RUT, Estado y Rango de Fechas)
  const datosFiltrados = datosReporte.filter((item) => {
    const matchTexto = 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rut.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchEstado = 
      selectedEstado === 'Todos' || 
      item.estado.toLowerCase() === selectedEstado.toLowerCase()

    let matchFecha = true
    if (fechaDesde && item.fecha) {
      matchFecha = matchFecha && item.fecha >= fechaDesde
    }
    if (fechaHasta && item.fecha) {
      matchFecha = matchFecha && item.fecha <= fechaHasta
    }

    return matchTexto && matchEstado && matchFecha
  })

  // 🧮 Cálculos globales ajustados quitando el IVA correctamente (Bruto / 1.19)
  const recaudacionTotal = datosFiltrados.reduce((acc, curr) => acc + curr.recaudacion, 0)
  const netoTotal = recaudacionTotal > 0 ? recaudacionTotal / 1.19 : 0
  const ivaTotal = Math.round(recaudacionTotal - netoTotal)
  const comisionTotal = datosFiltrados.reduce((acc, curr) => acc + curr.comision, 0)
  const utilidadNeta = Math.round(netoTotal - comisionTotal)

  // 📄 Exportar CSV con Blob y UTF-8 BOM
  const exportarCSV = () => {
    const headers = ['Empresa / Cliente', 'RUT', 'Tipo de Servicio', 'Frecuencia', 'Estado', 'Fecha', 'Recaudacion', 'IVA (19%)', 'Comision Tarjeta', 'Utilidad Neta']
    
    const rows = datosFiltrados.map(r => {
      const netoR = r.recaudacion > 0 ? r.recaudacion / 1.19 : 0
      const iva = Math.round(r.recaudacion - netoR)
      const utilidad = Math.round(netoR - r.comision)
      const nombreLimpio = (r.nombre || '').replace(/[^\w\s]/gi, '').trim()
      const rutLimpio = (r.rut || '').trim()
      
      return [
        `"${nombreLimpio}"`,
        `"${rutLimpio}"`,
        `"${r.tipo}"`,
        `"${r.frecuencia}"`,
        `"${r.estado}"`,
        `"${r.fecha}"`,
        r.recaudacion,
        iva,
        r.comision,
        utilidad
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_general_sutrato_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans">
      
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Reportes</h1>
          <p className="mt-1 text-sm text-slate-500">Resumen comercial unificado (Empresas y Clientes Particulares)</p>
        </div>
        <button 
          onClick={exportarCSV}
          className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59049] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition cursor-pointer whitespace-nowrap"
        >
          <Download size={15} /> Exportar CSV por columnas
        </button>
      </div>

      {/* 🔍 Filtros avanzados */}
      <section className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Search size={13} className="text-[#C5A059]" /> Buscar por nombre o RUT
          </label>
          <input
            type="text"
            placeholder="Ej. Juan Pérez o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Filter size={13} className="text-[#C5A059]" /> Estado
          </label>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white font-medium cursor-pointer"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Pagado">Pagado</option>
            <option value="VIGENTE">Vigente</option>
            <option value="NO VIGENTE">No Vigente</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-[#C5A059]" /> Desde fecha
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar size={13} className="text-[#C5A059]" /> Hasta fecha
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>
      </section>

      {/* 📊 Tarjetas de Métricas unificadas */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400">Recaudación bruta total</p>
          <h3 className="text-xl font-black text-slate-900">${recaudacionTotal.toLocaleString('es-CL')}</h3>
        </article>
        <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400">IVA (19% desglosado)</p>
          <h3 className="text-xl font-black text-slate-900">${ivaTotal.toLocaleString('es-CL')}</h3>
        </article>
        <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400">Comisión tarjeta total</p>
          <h3 className="text-xl font-black text-amber-700">${comisionTotal.toLocaleString('es-CL')}</h3>
        </article>
        <article className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-400">Utilidad neta real</p>
          <h3 className="text-xl font-black text-emerald-700">${utilidadNeta.toLocaleString('es-CL')}</h3>
        </article>
      </section>

      {/* 📋 Tabla de Resultados detallados */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181818] text-[#C5A059] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Empresa / Cliente</th>
                <th className="py-3.5 px-4">Frecuencia</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4 text-right">Recaudación</th>
                <th className="py-3.5 px-4 text-right">IVA</th>
                <th className="py-3.5 px-4 text-right">Comisión</th>
                <th className="py-3.5 px-4 text-right">Utilidad Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">Cargando ingresos unificados...</td>
                </tr>
              ) : datosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">No hay registros financieros para este filtro.</td>
                </tr>
              ) : (
                datosFiltrados.map((item) => {
                  const monto = item.recaudacion
                  const netoItem = monto > 0 ? monto / 1.19 : 0
                  const ivaItem = Math.round(monto - netoItem)
                  const comisionItem = item.comision
                  const utilidadItem = Math.round(netoItem - comisionItem)
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-6 font-bold text-slate-900">
                        {item.nombre}
                        <span className="block text-[11px] font-normal text-slate-500">{item.rut} · <span className="text-blue-600 font-semibold">{item.tipo}</span></span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{item.frecuencia}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.estado === 'Activo' || item.estado === 'Pagado' || item.estado === 'VIGENTE' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{item.fecha || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">${monto.toLocaleString('es-CL')}</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">${ivaItem.toLocaleString('es-CL')}</td>
                      <td className="py-3.5 px-4 text-right text-amber-700 font-semibold">${comisionItem.toLocaleString('es-CL')}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">${utilidadItem.toLocaleString('es-CL')}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}