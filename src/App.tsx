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
// Páginas del Módulo de Coffee & Catering
import CateringClientesPage from './pages/CateringClientesPage'
import CateringPedidosPage from './pages/CateringPedidosPage'
import CateringPagosPage from './pages/CateringPagosPage'
import CateringCalculadoraPage from './pages/CateringCalculadoraPage'
import CateringCalendarioPage from './pages/CateringCalendarioPage'

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
                {/* Restricción estricta para el rol OfFisica: Redirige todo lo prohibido a Clientes Particulares */}
                <Route path="/dashboard" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/no-vigentes" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/documentos" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/documentos/:id" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/contratos" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/contratos/:id" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/historial-sii" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/reportes" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/configuracion/plantilla-contrato" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                
                <Route path="/oficinas-fisicas/dashboard" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/resumen" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/administracion" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/contratos" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/plantilla-contrato" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/historial-sii" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/oficinas-fisicas/reportes" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                
                <Route path="/catering/dashboard" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/clientes" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/pedidos" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/calculadora" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/calendario" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/pagos" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />
                <Route path="/catering/reportes" element={<Navigate to="/oficinas-fisicas/particulares" replace />} />

                {/* ÚNICAS DOS VISTAS PERMITIDAS PARA OFISICA */}
                <Route path="/oficinas-fisicas/particulares" element={<ClientesParticularesPage />} />
                <Route path="/oficinas-fisicas/calendario" element={<CalendarioOficinasPage />} />
              </>
            ) : (
              <>
                {/* 🏢 1. OFICINAS VIRTUALES Y GESTOR ADMINISTRATIVO (Solo Admin u otros roles) */}
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
                    <h1 className="text-2xl font-extrabold text-slate-900">Resumen de catering y eventos</h1>
                    <p className="mt-1 text-slate-500">Vista comercial y operativa de banquetería y eventos corporativos.</p>
                  </div>
                } />
                <Route path="/catering/clientes" element={<CateringClientesPage />} />
                <Route path="/catering/pedidos" element={<CateringPedidosPage />} />
                <Route path="/catering/calculadora" element={<CateringCalculadoraPage />} />
                <Route path="/catering/calendario" element={<CateringCalendarioPage />} />
                <Route path="/catering/pagos" element={<CateringPagosPage />} />
                <Route path="/catering/reportes" element={
                  <div className="p-8">
                    <h1 className="text-2xl font-extrabold text-slate-900">Reportes de catering</h1>
                    <p className="mt-1 text-slate-500">Estadísticas de ventas, personas atendidas y arriendos.</p>
                  </div>
                } />

                {/* 🏢 2. OFICINAS FÍSICAS Y PRESENCIALES (Admin tiene acceso total) */}
                <Route path="/oficinas-fisicas/dashboard" element={<Navigate to="/oficinas-fisicas/resumen" replace />} />
                <Route path="/oficinas-fisicas/resumen" element={<OficinasFisicas />} />
                <Route path="/oficinas-fisicas/administracion" element={<AdministracionComercialPage />} />
                <Route path="/oficinas-fisicas/particulares" element={<ClientesParticularesPage />} />
                <Route path="/oficinas-fisicas/calendario" element={<CalendarioOficinasPage />} />
                <Route path="/oficinas-fisicas/contratos" element={<ContratosFisicasPage />} />
                <Route path="/oficinas-fisicas/plantilla-contrato" element={<PlantillaContratoFisicas />} />
                <Route path="/oficinas-fisicas/historial-sii" element={<HistorialSiiOfFisicasPage />} />
                <Route path="/oficinas-fisicas/reportes" element={<ReportesPage />} />
              </>
            )}

          </Route>
        </Route>

        {/* Redirección por defecto si la ruta no existe */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App