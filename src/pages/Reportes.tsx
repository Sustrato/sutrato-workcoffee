import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, LoaderCircle, Search } from 'lucide-react'
import { supabase } from '../services/supabase'

interface PagoReporte {
  id: string | number
  fecha_pago: string
  bruto: number | string | null
  neto: number | string | null
  iva: number | string | null
  proximo_pago: string | null
}

interface EmpresaReporte {
  id: string | number
  nombre: string
  rut: string
  frecuencia: string | null
  estado: string | boolean | null
  pagos: PagoReporte[] | null
}

type EstadoEmpresa = 'VIGENTE' | 'NO VIGENTE' | 'DESVINCULADA'
type EstadoVencimiento = 'on-time' | 'upcoming' | 'overdue' | 'unavailable'

interface ReportRow {
  empresa: EmpresaReporte
  estado: EstadoEmpresa
  vencimiento: EstadoVencimiento
  proximoPago: string | null
  cantidadPagos: number
  recaudacion: number
  iva: number
  utilidad: number
}

const PAGE_SIZE = 1000
const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function normalizeEstado(value: EmpresaReporte['estado']): EstadoEmpresa {
  if (typeof value === 'boolean') return value ? 'VIGENTE' : 'NO VIGENTE'
  const normalized = String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-CL')
  if (normalized === 'DESVINCULADA') return 'DESVINCULADA'
  if (normalized === 'NO VIGENTE' || normalized === 'NO_VIGENTE') return 'NO VIGENTE'
  return 'VIGENTE'
}

function getVencimiento(payments: PagoReporte[]): { status: EstadoVencimiento; date: string | null } {
  const latestPayment = [...payments]
    .filter((payment) => Boolean(payment.proximo_pago))
    .sort((first, second) => second.fecha_pago.localeCompare(first.fecha_pago))[0]
  if (!latestPayment?.proximo_pago) return { status: 'unavailable', date: null }

  const [year, month, day] = latestPayment.proximo_pago.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return { status: 'unavailable', date: latestPayment.proximo_pago }

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dueUtc = Date.UTC(year, month - 1, day)
  const daysUntilDue = Math.round((dueUtc - todayUtc) / 86_400_000)
  if (daysUntilDue < 0) return { status: 'overdue', date: latestPayment.proximo_pago }
  if (daysUntilDue <= 5) return { status: 'upcoming', date: latestPayment.proximo_pago }
  return { status: 'on-time', date: latestPayment.proximo_pago }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

async function fetchCompanies(): Promise<EmpresaReporte[]> {
  const allCompanies: EmpresaReporte[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre, rut, frecuencia, estado, pagos(id, fecha_pago, bruto, neto, iva, proximo_pago)')
      .order('nombre', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`No se pudieron cargar los datos para reportes: ${error.message}`)
    const page = (data ?? []) as EmpresaReporte[]
    allCompanies.push(...page)
    if (page.length < PAGE_SIZE) return allCompanies
  }
}

export default function Reportes() {
  const [companies, setCompanies] = useState<EmpresaReporte[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR))
  const [selectedMonth, setSelectedMonth] = useState('TODOS')
  const [selectedEstado, setSelectedEstado] = useState('TODOS')
  const [selectedVencimiento, setSelectedVencimiento] = useState('TODOS')

  useEffect(() => {
    let active = true
    fetchCompanies()
      .then((rows) => { if (active) setCompanies(rows) })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los reportes.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set(companies.flatMap((company) => (company.pagos ?? []).map((payment) => payment.fecha_pago.slice(0, 4))))
    years.add(String(CURRENT_YEAR))
    return [...years].sort((first, second) => Number(second) - Number(first))
  }, [companies])

  const reportRows = useMemo<ReportRow[]>(() => {
    const query = search.trim().toLocaleLowerCase('es-CL')
    return companies.flatMap((empresa) => {
      const status = normalizeEstado(empresa.estado)
      if (selectedEstado !== 'TODOS' && status !== selectedEstado) return []
      if (query && !`${empresa.nombre} ${empresa.rut}`.toLocaleLowerCase('es-CL').includes(query)) return []

      const periodPayments = (empresa.pagos ?? []).filter((payment) => {
        const date = payment.fecha_pago.slice(0, 10)
        const yearMatches = selectedYear === 'TODOS' || date.startsWith(`${selectedYear}-`)
        const monthMatches = selectedMonth === 'TODOS' || date.slice(5, 7) === selectedMonth
        return yearMatches && monthMatches
      })
      const due = getVencimiento(empresa.pagos ?? [])
      if (selectedVencimiento !== 'TODOS' && due.status !== selectedVencimiento) return []

      const recaudacion = periodPayments.reduce((total, payment) => total + (Number(payment.bruto) || 0), 0)
      const utilidad = periodPayments.reduce((total, payment) => {
        const bruto = Number(payment.bruto) || 0
        return total + (payment.neto === null || payment.neto === undefined ? bruto / 1.19 : Number(payment.neto) || 0)
      }, 0)
      const iva = periodPayments.reduce((total, payment) => {
        if (payment.iva !== null && payment.iva !== undefined) return total + (Number(payment.iva) || 0)
        const bruto = Number(payment.bruto) || 0
        const neto = payment.neto === null || payment.neto === undefined ? bruto / 1.19 : Number(payment.neto) || 0
        return total + bruto - neto
      }, 0)

      return [{
        empresa,
        estado: status,
        vencimiento: due.status,
        proximoPago: due.date,
        cantidadPagos: periodPayments.length,
        recaudacion,
        iva,
        utilidad,
      }]
    })
  }, [companies, search, selectedEstado, selectedMonth, selectedVencimiento, selectedYear])

  const totals = reportRows.reduce((result, row) => ({
    recaudacion: result.recaudacion + row.recaudacion,
    iva: result.iva + row.iva,
    utilidad: result.utilidad + row.utilidad,
  }), { recaudacion: 0, iva: 0, utilidad: 0 })

  function exportReport() {
    const headers = ['Empresa', 'RUT', 'Estado empresa', 'Frecuencia', 'Estado de pago', 'Próximo pago', 'Transacciones', 'Recaudación bruta', 'IVA', 'Utilidad neta']
    const statusLabels: Record<EstadoVencimiento, string> = {
      'on-time': 'Al día',
      upcoming: 'Por vencer',
      overdue: 'Atrasados',
      unavailable: 'Sin fecha',
    }
    const csv = `\uFEFF${[headers, ...reportRows.map((row) => [
      row.empresa.nombre,
      row.empresa.rut,
      row.estado,
      row.empresa.frecuencia,
      statusLabels[row.vencimiento],
      row.proximoPago,
      row.cantidadPagos,
      row.recaudacion,
      row.iva,
      row.utilidad,
    ])].map((record) => record.map(escapeCsv).join(';')).join('\r\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reportes_${selectedYear}_${selectedMonth.toLowerCase()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const dueBadgeClasses: Record<EstadoVencimiento, string> = {
    'on-time': 'bg-emerald-50 text-emerald-700',
    upcoming: 'bg-amber-50 text-amber-700',
    overdue: 'bg-rose-50 text-rose-700',
    unavailable: 'bg-slate-100 text-slate-500',
  }
  const dueLabels: Record<EstadoVencimiento, string> = {
    'on-time': 'Al día',
    upcoming: 'Por vencer',
    overdue: 'Atrasados',
    unavailable: 'Sin fecha',
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><BarChart3 size={21} /></span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Reportes avanzados</h1>
            <p className="mt-1 text-sm text-slate-500">Recaudación, utilidad y vencimientos por periodo.</p>
          </div>
        </div>
        <button type="button" onClick={exportReport} disabled={isLoading || reportRows.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Download size={16} /> Exportar CSV
        </button>
      </header>

      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <section aria-label="Filtros de reportes" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-600">Año
          <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
            <option value="TODOS">Todos los años</option>
            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Mes
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
            <option value="TODOS">Todos los meses</option>
            {MONTHS.map((month, index) => <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Estado de empresa
          <select value={selectedEstado} onChange={(event) => setSelectedEstado(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
            <option value="TODOS">Todos los estados</option><option value="VIGENTE">VIGENTE</option><option value="NO VIGENTE">NO VIGENTE</option><option value="DESVINCULADA">DESVINCULADA</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Estado de pago
          <select value={selectedVencimiento} onChange={(event) => setSelectedVencimiento(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
            <option value="TODOS">Todos los vencimientos</option><option value="on-time">Al día</option><option value="upcoming">Por vencer</option><option value="overdue">Atrasados</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Buscar empresa
          <span className="relative mt-1.5 block">
            <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o RUT" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
          </span>
        </label>
      </section>

      <section aria-label="Totales del periodo" className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Recaudación bruta</p><p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(totals.recaudacion)}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">IVA</p><p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(totals.iva)}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">Utilidad neta</p><p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(totals.utilidad)}</p></article>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Cargando reporte...</div>
        ) : reportRows.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No hay empresas que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr>
                <th className="px-4 py-3">Empresa / RUT</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Próximo pago</th><th className="px-4 py-3 text-right">Pagos</th><th className="px-4 py-3 text-right">Recaudación</th><th className="px-4 py-3 text-right">IVA</th><th className="px-4 py-3 text-right">Utilidad</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reportRows.map((row) => <tr key={String(row.empresa.id)}>
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{row.empresa.nombre}</p><p className="mt-0.5 text-xs text-slate-500">{row.empresa.rut}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{row.estado}</td>
                  <td className="px-4 py-3 text-slate-600">{row.empresa.frecuencia || '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dueBadgeClasses[row.vencimiento]}`}>{dueLabels[row.vencimiento]}</span></td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.proximoPago)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.cantidadPagos}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{formatMoney(row.recaudacion)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatMoney(row.iva)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatMoney(row.utilidad)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {!isLoading && <p className="text-xs text-slate-500">{reportRows.length} empresas incluidas según los filtros activos.</p>}
    </div>
  )
}
