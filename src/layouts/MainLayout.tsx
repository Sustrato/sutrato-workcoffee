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
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { EMPRESAS_UPDATED_EVENT } from '../services/siiNotices'
import { getNotificationFeed, PAYMENTS_UPDATED_EVENT, type NotificationFeed } from '../services/notifications'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Empresas', to: '/documentos', icon: Files },
  { label: 'Contratos', to: '/contratos', icon: FileText },
  { label: 'Plantilla de contrato', to: '/configuracion/plantilla-contrato', icon: Settings2 },
  { label: 'Historial SII', to: '/historial-sii', icon: Clock3 },
  { label: 'Reportes', to: '/reportes', icon: BarChart3 },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const [notificationError, setNotificationError] = useState('')
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeed>({ alerts: [], recentPayments: [] })
  const alertCount = notificationFeed.alerts.length

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
    navigate('/documentos')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <img
            src="/Sustrato%20Logo.png"
            alt="Logo de Sutrato"
            className="size-10 shrink-0 rounded-xl object-cover"
          />
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">Sutrato WorkCoffee</p>
            <p className="text-xs text-slate-500">Gestión de Planillas</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Menú principal
          </p>
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Centro de documentos</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tus planillas empresariales, organizadas en un solo lugar.
          </p>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="app-navbar sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8 print:hidden">
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={openNotifications}
                aria-label={alertCount ? `Notificaciones, ${alertCount} alertas pendientes` : 'Notificaciones'}
                aria-expanded={isNotificationsOpen}
                aria-controls="notifications-panel"
                className="relative flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <Bell size={19} />
                {alertCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-0.5 text-[9px] font-bold leading-none text-white">{alertCount > 9 ? '9+' : alertCount}</span>}
              </button>

              {isNotificationsOpen && (
                <section id="notifications-panel" role="dialog" aria-label="Notificaciones recientes" className="absolute left-0 right-auto top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/15">
                  <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Notificaciones</h2>
                      <p className="mt-0.5 text-xs text-slate-500">{alertCount ? `${alertCount} alertas pendientes` : 'Sin alertas pendientes'}</p>
                    </div>
                    <button type="button" onClick={() => void loadNotifications()} aria-label="Actualizar notificaciones" className="text-xs font-semibold text-primary-700 hover:text-primary-800">Actualizar</button>
                  </header>

                  <div className="max-h-[min(70vh,32rem)] overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Cargando...</div>
                    ) : notificationError ? (
                      <div role="alert" className="px-4 py-4 text-sm text-rose-700">{notificationError}</div>
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
                              <CreditCard size={16} className="mt-0.5 shrink-0 text-primary-600" />
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
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                GE
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-5 text-slate-800">gerencia@sutrato.com</p>
                <p className="text-xs leading-4 text-slate-500">Usuario activo</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] p-4 sm:p-8 print:min-h-0 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}