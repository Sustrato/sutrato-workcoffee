import {
  AlertTriangle,
  Bell,
  BarChart3,
  Clock3,
  CreditCard,
  Files,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Settings2,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  MinusCircle,
  Building2,
  Store, 
  Landmark,
  ArrowRightLeft,
  PieChart,
  Users,
  Calculator,
  Calendar as CalendarIcon
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { EMPRESAS_UPDATED_EVENT } from '../services/siiNotices'
import { getNotificationFeed, PAYMENTS_UPDATED_EVENT, type NotificationFeed } from '../services/notifications'
import { supabase } from '../services/supabase'

// 1. Navegación del módulo de Oficinas Virtuales
const navigationOficinas = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Empresas', to: '/documentos', icon: Files },
  { label: 'Contratos', to: '/contratos', icon: FileText },
  { label: 'Plantilla de contrato', to: '/configuracion/plantilla-contrato', icon: Settings2 },
  { label: 'Historial SII', to: '/historial-sii', icon: Clock3 },
  { label: 'Reportes', to: '/reportes', icon: BarChart3 },
]

// 2. Navegación del módulo de Oficinas Físicas
const navigationOficinasFisicas = [
  { label: 'Resumen comercial', to: '/oficinas-fisicas/resumen', icon: Store, end: true },
  { label: 'Administración comercial', to: '/oficinas-fisicas/administracion', icon: Building2 },
  { label: 'Clientes particulares', to: '/oficinas-fisicas/particulares', icon: Users },
  { label: 'Calendario de oficinas', to: '/oficinas-fisicas/calendario', icon: CalendarIcon },
  { label: 'Contratos', to: '/oficinas-fisicas/contratos', icon: FileText },
  { label: 'Plantilla de contrato', to: '/oficinas-fisicas/plantilla-contrato', icon: Settings2 },
  { label: 'Historial SII', to: '/oficinas-fisicas/historial-sii', icon: Clock3 },
  { label: 'Reportes', to: '/oficinas-fisicas/reportes', icon: BarChart3 },
]

// Menú exclusivo limitado para rol OfFisica
const navigationOficinasFisicasLimitada = [
  { label: 'Clientes particulares', to: '/oficinas-fisicas/particulares', icon: Users, end: true },
  { label: 'Calendario de oficinas', to: '/oficinas-fisicas/calendario', icon: CalendarIcon },
]

// 3. Navegación del módulo de Coffee & Catering
const navigationCatering = [
  { label: 'Resumen general', to: '/catering/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Clientes', to: '/catering/clientes', icon: Users },
  { label: 'Eventos y cotizaciones', to: '/catering/pedidos', icon: FileText },
  { label: 'Calculadora de rentabilidad', to: '/catering/calculadora', icon: Calculator },
  { label: 'Calendario', to: '/catering/calendario', icon: CalendarIcon },
  { label: 'Pagos y cobranzas', to: '/catering/pagos', icon: CreditCard },
  { label: 'Reportes', to: '/catering/reportes', icon: BarChart3 },
]

// 4. Navegación del módulo de Finanzas
const navigationFinanzas = [
  { label: 'Panel general', to: '/finanzas/panel-general', icon: Wallet, end: true },
  { label: 'Ventas Cafeteria', to: '/finanzas/ventas-diarias', icon: ArrowUpRight },
  { label: 'Liquidaciones', to: '/finanzas/liquidaciones', icon: RefreshCw },
  { label: 'Egresos', to: '/finanzas/egresos', icon: MinusCircle },
  { label: 'Traspasos y Retiros', to: '/finanzas/traspasos', icon: ArrowRightLeft },
  { label: 'Ingresos Banco Chile', to: '/finanzas/banco-chile', icon: Landmark },
  { label: 'Estado de Resultados', to: '/finanzas/estado-resultados', icon: PieChart },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const [notificationError, setNotificationError] = useState('')
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeed>({ alerts: [], recentPayments: [] })
  
  const [userEmail, setUserEmail] = useState<string>('')
  const [isOfFisicaOnly, setIsOfFisicaOnly] = useState<boolean>(false)
  
  const alertCount = notificationFeed.alerts.length

  useEffect(() => {
    async function fetchUserRoleAndEmail() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const email = session.user.email ?? ''
        setUserEmail(email)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
        
        const hasOfFisica = roleData?.some((r) => r.role === 'OfFisica')
        const isGenericOffice = email.toLowerCase() === 'oficinassutrato@zohomail.com'
        if (hasOfFisica || isGenericOffice) {
          setIsOfFisicaOnly(true)
          const rutasPermitidas = ['/oficinas-fisicas/particulares', '/oficinas-fisicas/calendario']
          if (!rutasPermitidas.includes(location.pathname)) {
            navigate('/oficinas-fisicas/particulares', { replace: true })
          }
        }
      }
    }
    void fetchUserRoleAndEmail()
  }, [location.pathname, navigate])

  const currentModule = location.pathname.startsWith('/finanzas') 
    ? 'finanzas' 
    : location.pathname.startsWith('/oficinas-fisicas') 
      ? 'fisicas' 
      : location.pathname.startsWith('/catering')
        ? 'catering'
        : 'oficinas'

  const loadNotifications = useCallback(async () => {
    setIsLoadingNotifications(true)
    setNotificationError('')
    try {
      setNotificationFeed(await getNotificationFeed())
    } catch (loadError) {
      setNotificationError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las notificaciones.')
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadNotifications(), 0)
    window.addEventListener(PAYMENTS_UPDATED_EVENT, loadNotifications)
    window.addEventListener(EMPRESAS_UPDATED_EVENT, loadNotifications)
    return () => {
      window.clearTimeout(requestId)
      window.removeEventListener(PAYMENTS_UPDATED_EVENT, loadNotifications)
      window.removeEventListener(EMPRESAS_UPDATED_EVENT, loadNotifications)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!isNotificationsOpen) return
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNotificationsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isNotificationsOpen])

  function openNotifications() {
    if (!isNotificationsOpen) void loadNotifications()
    setIsNotificationsOpen((open) => !open)
  }

  function openNotification() {
    setIsNotificationsOpen(false)
    navigate(isOfFisicaOnly ? '/oficinas-fisicas/particulares' : '/documentos')
  }

  const handleModuleSwitch = (module: 'oficinas' | 'fisicas' | 'catering' | 'finanzas') => {
    if (isOfFisicaOnly) return
    if (module === 'oficinas') {
      navigate('/dashboard')
    } else if (module === 'fisicas') {
      navigate('/oficinas-fisicas/resumen')
    } else if (module === 'catering') {
      navigate('/catering/dashboard')
    } else {
      navigate('/finanzas/panel-general')
    }
  }

  const activeNavigation = isOfFisicaOnly
    ? navigationOficinasFisicasLimitada
    : currentModule === 'oficinas' 
      ? navigationOficinas 
      : currentModule === 'fisicas' 
        ? navigationOficinasFisicas 
        : currentModule === 'catering'
          ? navigationCatering
          : navigationFinanzas

  const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'US'

  return (
    <div className="min-h-screen bg-[#F5EEDB] text-slate-900 font-sans">
      
      {/* BARRA LATERAL OSCURA ELEGANTE */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#333333] bg-[#181818] md:flex print:hidden">
        <div className="flex h-20 items-center gap-3 border-b border-[#333333] px-6">
          <img
            src="/Sustrato%20Logo.png"
            alt="Logo de Sustrato"
            className="size-10 shrink-0 rounded-xl object-cover border border-[#D4AF37]/30"
          />
          <div>
            <p className="text-sm font-bold tracking-tight text-white">SUTRATO</p>
            <p className="text-xs text-slate-400">
              {currentModule === 'oficinas' 
                ? 'Gestor Administrativo' 
                : currentModule === 'fisicas' 
                  ? 'Oficinas Físicas' 
                  : currentModule === 'catering'
                    ? 'Coffee & Catering'
                    : 'Control financiero'}
            </p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1.5 px-3 py-6">
          {activeNavigation.map(({ label, to, icon: Icon, end }) => {
            const isItemActive = end ? location.pathname === to : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                  isItemActive
                    ? 'bg-[#2E2E2E] text-[#D4AF37]'
                    : 'text-slate-300 hover:bg-[#222222] hover:text-white'
                }`}
              >
                <Icon size={18} className={isItemActive ? 'text-[#D4AF37]' : 'text-slate-400 group-hover:text-slate-200'} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="m-4 rounded-2xl border border-[#333333] bg-[#1f1f1f] p-4 shadow-inner">
          <p className="text-xs font-bold text-slate-200">PROTOTIPO</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Preparado para futura integración automática con bancos y medios de pago.
          </p>
        </div>
      </aside>

      <div className="md:pl-64">
        
        {/* HEADER SUPERIOR CON EL TONO EXACTO */}
        <header className="app-navbar sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-amber-900/15 bg-[#F0E6D2]/95 px-4 backdrop-blur sm:px-8 print:hidden shadow-sm">
          
          <div className="flex items-center gap-4">
            {!isOfFisicaOnly && (
              <div className="flex bg-amber-900/10 p-1 rounded-xl border border-amber-900/15">
                <button 
                  type="button"
                  onClick={() => handleModuleSwitch('oficinas')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currentModule === 'oficinas' ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Oficinas Virtuales
                </button>
                <button 
                  type="button"
                  onClick={() => handleModuleSwitch('fisicas')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currentModule === 'fisicas' ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Oficinas Físicas
                </button>
                <button 
                  type="button"
                  onClick={() => handleModuleSwitch('catering')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currentModule === 'catering' ? 'bg-white shadow-sm text-orange-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Coffee & Catering
                </button>
                <button 
                  type="button"
                  onClick={() => handleModuleSwitch('finanzas')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    currentModule === 'finanzas' ? 'bg-white shadow-sm text-amber-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Finanzas
                </button>
              </div>
            )}

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={openNotifications}
                aria-label={alertCount ? `Notificaciones, ${alertCount} alertas pendientes` : 'Notificaciones'}
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-panel"
                className="relative flex size-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-amber-900/10 hover:text-slate-900"
              >
                <Bell size={19} />
                {alertCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-0.5 text-[9px] font-bold leading-none text-white">{alertCount > 9 ? '9+' : alertCount}</span>}
              </button>
              
              {isNotificationsOpen && (
                <section id="notifications-panel" role="dialog" aria-label="Notificaciones recientes" className="absolute left-0 right-auto top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/15 text-slate-800">
                  <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Notificaciones</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{alertCount ? `${alertCount} alertas pendientes` : 'Sin alertas pendientes'}</p>
                    </div>
                    <button type="button" onClick={() => void loadNotifications()} aria-label="Actualizar notificaciones" className="text-xs font-semibold text-amber-800 hover:underline">Actualizar</button>
                  </header>
                  <div className="max-h-[min(70vh,32rem)] overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Cargando...</div>
                    ) : notificationError ? (
                      <div role="alert" className="px-4 py-4 text-sm text-rose-600">{notificationError}</div>
                    ) : (
                      <>
                        <div className="border-b border-slate-100 px-4 py-3">
                          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vencimientos</h3>
                          {notificationFeed.alerts.length === 0 ? (
                            <p className="text-xs text-slate-500">No hay pagos próximos a vencer o atrasados.</p>
                          ) : notificationFeed.alerts.slice(0, 6).map((item) => (
                            <button key={item.id} type="button" onClick={openNotification} className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50">
                              <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${item.kind === 'overdue' ? 'text-rose-600' : 'text-amber-600'}`} />
                              <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.detail}</span></span>
                            </button>
                          ))}
                        </div>
                        <div className="px-4 py-3">
                          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pagos recientes</h3>
                          {notificationFeed.recentPayments.length === 0 ? (
                            <p className="text-xs text-slate-500">Aún no hay pagos registrados.</p>
                          ) : notificationFeed.recentPayments.map((item) => (
                            <button key={item.id} type="button" onClick={openNotification} className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50">
                              <CreditCard size={16} className="mt-0.5 shrink-0 text-amber-600" />
                              <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.detail}</span></span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden h-8 w-px bg-amber-900/15 sm:block" />
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-900/10 text-xs font-bold text-amber-900 border border-amber-900/20">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-5 text-slate-900">{userEmail || 'gerencia@sutrato.com'}</p>
                <p className="text-xs leading-4 text-slate-600">{isOfFisicaOnly ? 'Oficina Física' : 'Usuario activo'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Navbar responsiva inferior para móviles */}
        <nav aria-label="Navegación principal" className="sticky top-20 z-20 border-b border-amber-900/15 bg-[#F0E6D2] px-4 py-2 md:hidden print:hidden">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {activeNavigation.map(({ label, to, icon: Icon, end }) => {
              const isItemActive = end ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isItemActive
                      ? 'bg-amber-900/15 text-amber-950 font-bold'
                      : 'text-slate-700 hover:bg-amber-900/10 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* 🚀 CONTENIDO PRINCIPAL CON EL TONO AMARILLO EXACTO DE TU CAPTURA */}
        <main 
          className="min-h-[calc(100vh-5rem)] min-w-0 p-4 sm:p-8 print:min-h-0 print:p-0 [&_h1]:text-amber-900 [&_h1]:font-black [&_h2]:text-amber-900 [&_h2]:font-bold"
          style={{
            backgroundColor: '#F5EEDB'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}