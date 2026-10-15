import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './services/supabase'
import MainLayout from './layouts/MainLayout'
import TrustedDeviceGate from './layouts/TrustedDeviceGate'
// Páginas de Login y Dashboard principal
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Empresas from './pages/Empresas'
import DetalleDocumento from './pages/DetalleDocumento'
import NoVigentes from './pages/NoVigentes'
// Páginas del Módulo de Oficinas Físicas
import OficinasFisicas from './pages/OficinasFisicas'
import AdministracionComercialPage from './pages/AdministracionComercialPage'
import ClientesParticularesPage from './pages/ClientesParticularesPage'
import CalendarioOficinasPage from './pages/CalendarioOficinasPage'
import ContratosFisicasPage from './pages/ContratosFisicasPage'
import PlantillaContratoFisicas from './pages/PlantillaContratoFisicas'
import HistorialSiiOfFisicasPage from './pages/HistorialSiiOfFisicas'
import ReportesPage from './pages/ReportesPage'
// Lazy loading para páginas secundarias de Oficinas Virtuales
const Contratos = lazy(() => import('./pages/Contratos'))
const ContratoEditor = lazy(() => import('./pages/ContratoEditor'))
const HistorialSII = lazy(() => import('./pages/HistorialSII'))
const PlantillaContrato = lazy(() => import('./pages/PlantillaContrato'))
const Reportes = lazy(() => import('./pages/Reportes'))

function App() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        
        if (data) {
          setUserRole(data.role)
        }
      }
      setLoadingRole(false)
    }
    fetchRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        
        if (data) {
          setUserRole(data.role)
        }
      } else {
        setUserRole(null)
      }
      setLoadingRole(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loadingRole) {
    return <div className="p-8 text-sm text-slate-500">Cargando sistema...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas dentro del Layout Principal */}
        <Route element={<TrustedDeviceGate />}>
          <Route element={<MainLayout />}>
            
            {userRole === 'OfFisica' ? (
              <>
                {/* Redirección estricta obligatoria para el rol OfFisica a su único módulo permitido */}
                <Route path="/dashboard" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/no-vigentes" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/documentos" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/documentos/:id" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/contratos" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/contratos/:id" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/historial-sii" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/reportes" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/configuracion/plantilla-contrato" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/catering/dashboard" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/catering/pedidos" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
              </>
            ) : (
              <>
                {/* 🏢 1. OFICINAS VIRTUALES Y GESTOR ADMINISTRATIVO (Solo para Admin u otros roles) */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/no-vigentes" element={<NoVigentes />} />
                <Route path="/documentos" element={<Empresas />} />
                <Route path="/documentos/:id" element={<DetalleDocumento />} />
                <Route path="/contratos" element={
                  <Suspense fallback={<p className="p-6 text-sm text-slate-500">Cargando contratos...</p>}>
                    <Contratos />
                  </Suspense>
                } />
                <Route path="/contratos/:id" element={
                  <Suspense fallback={<p className="p-6 text-sm text-slate-500">Cargando editor...</p>}>
                    <ContratoEditor />
                  </Suspense>
                } />
                <Route path="/historial-sii" element={
                  <Suspense fallback={<p className="p-6 text-sm text-slate-500">Cargando Historial SII...</p>}>
                    <HistorialSII />
                  </Suspense>
                } />
                <Route path="/reportes" element={
                  <Suspense fallback={<p className="p-6 text-sm text-slate-500">Cargando reportes...</p>}>
                    <Reportes />
                  </Suspense>
                } />
                <Route path="/configuracion/plantilla-contrato" element={
                  <Suspense fallback={<p className="p-6 text-sm text-slate-500">Cargando plantilla...</p>}>
                    <PlantillaContrato />
                  </Suspense>
                } />
                {/* ☕ 3. COFFEE & CATERING */}
                <Route path="/catering/dashboard" element={
                  <div className="p-8">
                    <h1 className="text-2xl font-extrabold text-slate-900">Panel de Coffee & Catering</h1>
                    <p className="mt-1 text-slate-500">Gestión y control de servicios de banquetería, coffee breaks y eventos corporativos.</p>
                  </div>
                } />
                <Route path="/catering/pedidos" element={
                  <div className="p-8">
                    <h1 className="text-2xl font-extrabold text-slate-900">Eventos y Pedidos</h1>
                    <p className="mt-1 text-slate-500">Listado de entregas y requerimientos programados.</p>
                  </div>
                } />
              </>
            )}

            {/* 🏢 2. OFICINAS FÍSICAS Y PRESENCIALES (Accesible para OfFisica y Admin) */}
            <Route path="/oficinas-fisicas/dashboard" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
            <Route path="/oficinas-fisicas/resumen" element={<OficinasFisicas />} />
            <Route path="/oficinas-fisicas/administracion" element={<AdministracionComercialPage />} />
            <Route path="/oficinas-fisicas/particulares" element={<ClientesParticularesPage />} />
            <Route path="/oficinas-fisicas/calendario" element={<CalendarioOficinasPage />} />
            <Route path="/oficinas-fisicas/contratos" element={<ContratosFisicasPage />} />
            <Route path="/oficinas-fisicas/plantilla-contrato" element={<PlantillaContratoFisicas />} />
            <Route path="/oficinas-fisicas/historial-sii" element={<HistorialSiiOfFisicasPage />} />
            <Route path="/oficinas-fisicas/reportes" element={<ReportesPage />} />

          </Route>
        </Route>

        {/* Redirección por defecto si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App