import {
  ArrowDownRight,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileWarning,
  LoaderCircle,
  Plus,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'

interface EmpresaRow {
  id: string | number
  rut: string
  nombre: string
  estado: string | boolean | null
  frecuencia: string | null
}

interface PagoRow {
  id: string | number
  empresa_id: string | number
  fecha_pago: string
  forma_pago: string | null
  bruto: number | string | null
  neto: number | string | null
}

interface DashboardData {
  empresas: EmpresaRow[]
  pagos: PagoRow[]
  mesActual: string
}

const PAGE_SIZE = 1000

function normalizeCompanyStatus(estado: EmpresaRow['estado']): 'VIGENTE' | 'NO VIGENTE' | 'DESVINCULADA' | 'OTRO' {
  if (typeof estado === 'boolean') return estado ? 'VIGENTE' : 'NO VIGENTE'
  const normalized = String(estado ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-CL')

  if (['VIGENTE', 'ACTIVO', 'ACTIVA', 'TRUE', 'AL DIA'].includes(normalized)) return 'VIGENTE'
  if (normalized === 'NO VIGENTE' || normalized === 'NO_VIGENTE') return 'NO VIGENTE'
  if (normalized === 'DESVINCULADA') return 'DESVINCULADA'
  return 'OTRO'
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const results: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    results.push(...page)
    if (page.length < PAGE_SIZE) return results
  }
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconStyle,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: typeof Building2
  iconStyle: string
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon size={20} strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{subtitle}</p>
    </article>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({ empresas: [], pagos: [], mesActual: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setError('')
    try {
      const [empresas, pagos] = await Promise.all([
        fetchAllRows<EmpresaRow>((from, to) =>
          supabase.from('empresas').select('id, rut, nombre, estado, frecuencia').range(from, to),
        ),
        fetchAllRows<PagoRow>((from, to) =>
          supabase.from('pagos').select('id, empresa_id, fecha_pago, forma_pago, bruto, neto').range(from, to),
        ),
      ])
      const now = new Date()
      const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setData({ empresas, pagos, mesActual })
    } catch (loadError) {
      console.error('No se pudieron cargar las métricas del dashboard:', loadError)
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el resumen desde Supabase.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(requestId)
  }, [loadDashboard])

  function refreshDashboard() {
    setIsLoading(true)
    void loadDashboard()
  }

  const totalEmpresas = data.empresas.length
  const empresasVigentes = data.empresas.filter((empresa) => normalizeCompanyStatus(empresa.estado) === 'VIGENTE').length
  const empresasNoVigentes = data.empresas.filter((empresa) => normalizeCompanyStatus(empresa.estado) === 'NO VIGENTE').length
  const empresasDesvinculadas = data.empresas.filter((empresa) => normalizeCompanyStatus(empresa.estado) === 'DESVINCULADA').length
  const empresasById = new Map(data.empresas.map((empresa) => [String(empresa.id), empresa]))
  const pagosDelMes = data.pagos.filter((pago) => pago.fecha_pago.slice(0, 10).startsWith(data.mesActual))
  const totalBrutoMes = pagosDelMes.reduce((total, pago) => total + (Number(pago.bruto) || 0), 0)
  const ingresosMensuales = pagosDelMes.reduce((total, pago) => {
    const company = empresasById.get(String(pago.empresa_id))
    return company?.frecuencia?.trim().toLocaleLowerCase('es-CL') === 'mensual'
      ? total + (Number(pago.bruto) || 0)
      : total
  }, 0)
  const ingresosAnuales = pagosDelMes.reduce((total, pago) => {
    const company = empresasById.get(String(pago.empresa_id))
    return company?.frecuencia?.trim().toLocaleLowerCase('es-CL') === 'anual'
      ? total + (Number(pago.bruto) || 0)
      : total
  }, 0)
  const otrosIngresos = totalBrutoMes - ingresosMensuales - ingresosAnuales
  const ivaTotalMes = Math.round(totalBrutoMes * 0.19)
  const utilidadTotalMes = pagosDelMes.reduce((total, pago) => {
    const bruto = Number(pago.bruto) || 0
    const neto = pago.neto === null || pago.neto === undefined ? bruto / 1.19 : Number(pago.neto) || 0
    return total + neto
  }, 0)
  const pagosRecientes = [...data.pagos]
    .sort((first, second) => new Date(second.fecha_pago).getTime() - new Date(first.fecha_pago).getTime())
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-primary-600"></p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Resumen Comercial</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Vista general de empresas, vigencia e ingresos registrados.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshDashboard}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
        >
          {isLoading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Actualizar datos
        </button>
      </section>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
          <span>No se pudieron cargar los datos comerciales: {error}</span>
          <button type="button" onClick={refreshDashboard} className="shrink-0 font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      <section aria-label="Indicadores comerciales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total recaudado del mes"
          value={isLoading ? '—' : formatMoney(totalBrutoMes)}
          subtitle="Flujo real de pagos ingresados este mes"
          icon={CircleDollarSign}
          iconStyle="bg-violet-50 text-violet-600"
        />
        <MetricCard
          title="Planes mensuales"
          value={isLoading ? '—' : formatMoney(ingresosMensuales)}
          subtitle="Recaudación bruta mensual del periodo"
          icon={CreditCard}
          iconStyle="bg-sky-50 text-sky-600"
        />
        <MetricCard
          title="Planes anuales"
          value={isLoading ? '—' : formatMoney(ingresosAnuales)}
          subtitle="Pagos anuales recibidos este mes"
          icon={CalendarClock}
          iconStyle="bg-indigo-50 text-indigo-600"
        />
        <MetricCard
          title="Otros planes"
          value={isLoading ? '—' : formatMoney(otrosIngresos)}
          subtitle="Trimestrales, semestrales u otros"
          icon={CircleDollarSign}
          iconStyle="bg-slate-100 text-slate-600"
        />
        <MetricCard
          title="IVA total"
          value={isLoading ? '—' : formatMoney(ivaTotalMes)}
          subtitle="19% de la recaudación bruta mensual"
          icon={CircleDollarSign}
          iconStyle="bg-amber-50 text-amber-600"
        />
        <MetricCard
          title="Utilidad total"
          value={isLoading ? '—' : formatMoney(utilidadTotalMes)}
          subtitle="Suma del neto real registrado"
          icon={CircleDollarSign}
          iconStyle="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="Total de empresas"
          value={isLoading ? '—' : totalEmpresas.toLocaleString('es-CL')}
          subtitle="Empresas registradas"
          icon={Building2}
          iconStyle="bg-primary-50 text-primary-600"
        />
        <MetricCard
          title="Vigentes"
          value={isLoading ? '—' : empresasVigentes.toLocaleString('es-CL')}
          subtitle="Estado VIGENTE"
          icon={CheckCircle2}
          iconStyle="bg-emerald-50 text-emerald-600"
        />
        <MetricCard
          title="No vigentes"
          value={isLoading ? '—' : empresasNoVigentes.toLocaleString('es-CL')}
          subtitle="Estado NO VIGENTE"
          icon={FileWarning}
          iconStyle="bg-rose-50 text-rose-600"
        />
        <MetricCard
          title="Desvinculadas"
          value={isLoading ? '—' : empresasDesvinculadas.toLocaleString('es-CL')}
          subtitle="Procesadas por cese SII"
          icon={UsersRound}
          iconStyle="bg-slate-100 text-slate-600"
        />
        <MetricCard
          title="Pagos del mes"
          value={isLoading ? '—' : pagosDelMes.length.toLocaleString('es-CL')}
          subtitle="Transacciones de este periodo"
          icon={CreditCard}
          iconStyle="bg-amber-50 text-amber-600"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Accesos rápidos">
        <Link
          to="/documentos"
          className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:border-primary-200 hover:shadow-md sm:p-6"
        >
          <span className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <UsersRound size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">Ir a Directorio de Empresas</span>
              <span className="mt-1 block text-sm text-slate-500">Consultar, buscar y actualizar clientes</span>
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
        </Link>
        <Link
          to="/documentos"
          className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:border-primary-200 hover:shadow-md sm:p-6"
        >
          <span className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Plus size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">Registrar Nuevo Pago o Empresa</span>
              <span className="mt-1 block text-sm text-slate-500">Crear registros de pagos o empresas</span>
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
        </Link>
        <Link
          to="/no-vigentes"
          className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:border-amber-200 hover:shadow-md sm:p-6"
        >
          <span className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileWarning size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">Cese de arriendos SII</span>
              <span className="mt-1 block text-sm text-slate-500">Generar petición para empresas no vigentes</span>
            </span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-amber-600" />
        </Link>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-primary-600" />
              <h2 className="text-base font-semibold text-slate-900">Últimos pagos recibidos</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Actividad reciente consultada desde Supabase</p>
          </div>
          <Link to="/documentos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Ver empresas <ArrowRight size={15} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-primary-600" />
            Cargando actividad...
          </div>
        ) : pagosRecientes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3 sm:px-6">Empresa</th>
                  <th scope="col" className="px-4 py-3">Fecha de pago</th>
                  <th scope="col" className="px-4 py-3">Forma de pago</th>
                  <th scope="col" className="px-5 py-3 text-right sm:px-6">Monto bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagosRecientes.map((pago) => {
                  const empresa = empresasById.get(String(pago.empresa_id))
                  return (
                    <tr key={String(pago.id)} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Building2 size={17} /></span>
                          <span>
                            <span className="block text-sm font-medium text-slate-800">{empresa?.nombre ?? 'Empresa no encontrada'}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">RUT {empresa?.rut ?? '—'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">{formatDate(pago.fecha_pago)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{pago.forma_pago || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-800 sm:px-6">{formatMoney(Number(pago.bruto) || 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><ArrowDownRight size={20} /></span>
            <p className="mt-3 text-sm font-semibold text-slate-800">Aún no hay pagos registrados</p>
            <p className="mt-1 text-sm text-slate-500">Cuando se registre un pago aparecerá aquí.</p>
            <Link to="/documentos" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
              Ir a Gestión Comercial <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
