import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Search, RefreshCw, Filter } from 'lucide-react'

interface TransaccionMP {
  id: string
  payment_id: string
  fecha: string
  descripcion: string
  monto_bruto: number
  payment_type_id: string
}

export default function TraspasosRetirosPage() {
  const [transacciones, setTransacciones] = useState<TransaccionMP[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroDia, setFiltroDia] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  const fetchTransacciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transacciones_mp')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error al cargar transacciones_mp:', error.message)
    }

    if (data) {
      setTransacciones(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransacciones()
  }, [])

  const filtradas = transacciones.filter(t => {
    const type = String(t.payment_type_id || '').toLowerCase()
    const pid = String(t.payment_id || '').toLowerCase()

    const esPayout = type.includes('payout') || pid.includes('payout')

    const desc = (t.descripcion || '').toLowerCase()
    const matchSearch = searchTerm === '' || desc.includes(searchTerm.toLowerCase()) || pid.includes(searchTerm.toLowerCase())

    const fechaStr = t.fecha ? t.fecha.split('T')[0] : ''
    const matchDia = !filtroDia || fechaStr === filtroDia

    const mesStr = t.fecha ? t.fecha.slice(0, 7) : ''
    const matchMes = !filtroMes || mesStr === filtroMes

    return esPayout && matchSearch && matchDia && matchMes
  })

  const totalMonto = filtradas.reduce((acc, curr) => acc + Math.abs(Number(curr.monto_bruto || 0)), 0)

  const limpiarFiltros = () => {
    setSearchTerm('')
    setFiltroDia('')
    setFiltroMes('')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 font-sans relative">
      {/* Encabezado */}
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Retiros y Payouts (Mercado Pago)</h1>
          <p className="mt-1 text-sm text-slate-500">Historial exclusivo de movimientos con etiqueta payout en transacciones_mp</p>
        </div>
        <button 
          onClick={fetchTransacciones} 
          className="flex items-center gap-2 bg-[#C5A059] text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-amber-600 transition shadow-sm"
        >
          <RefreshCw size={14} /> Recargar Datos BD
        </button>
      </section>

      {/* Tarjeta Resumen */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm border-l-4 border-l-[#C5A059]">
          <p className="text-xs font-semibold text-slate-400">Total Payouts Filtrados</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            -${totalMonto.toLocaleString('es-CL')}
          </h3>
        </article>
      </section>

      {/* Filtros */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter size={14} className="text-[#C5A059]" /> Filtros de búsqueda
          </div>
          {(searchTerm || filtroDia || filtroMes) && (
            <button onClick={limpiarFiltros} className="text-xs font-semibold text-rose-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar descripción o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 text-[10px] font-bold uppercase">Día:</span>
            <input 
              type="date"
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white text-slate-700"
            />
          </div>

          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 text-[10px] font-bold uppercase">Mes:</span>
            <input 
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="w-full pl-12 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white text-slate-700"
            />
          </div>
        </div>
      </section>

      {/* Listado limpio */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#181818] text-[#C5A059] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4">FECHA</th>
              <th className="py-3.5 px-4">ID DE PAGO</th>
              <th className="py-3.5 px-4">DESCRIPCIÓN</th>
              <th className="py-3.5 px-4">PAYMENT_TYPE_ID</th>
              <th className="py-3.5 px-4 text-right">MONTO BRUTO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Cargando datos...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No hay registros de payouts para los filtros seleccionados.</td></tr>
            ) : (
              filtradas.map(t => (
                <tr key={t.id || t.payment_id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{t.fecha ? t.fecha.replace('T', ' ').slice(0, 19) : '—'}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{t.payment_id}</td>
                  <td className="py-3 px-4 text-slate-900 font-semibold">{t.descripcion || 'Retiro a Cuenta Bancaria'}</td>
                  <td className="py-3 px-4">
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {t.payment_type_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                    -${Math.abs(Number(t.monto_bruto || 0)).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}