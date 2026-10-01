import {
  Bell,
  BriefcaseBusiness,
  Clock3,
  Files,
  FileText,
  LayoutDashboard,
  Settings2,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Empresas', to: '/documentos', icon: Files },
  { label: 'Contratos', to: '/contratos', icon: FileText },
  { label: 'Plantilla de contrato', to: '/configuracion/plantilla-contrato', icon: Settings2 },
  { label: 'Historial SII', to: '/historial-sii', icon: Clock3 },
  { label: 'Categorías', to: '/categorias', icon: BriefcaseBusiness },
  { label: 'Historial', to: '/historial', icon: Clock3 },
]

export default function MainLayout() {
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
        <header className="app-navbar sticky top-0 z-10 flex h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8 print:hidden">
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative flex size-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-primary-600" />
            </button>
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