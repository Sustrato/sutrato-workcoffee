import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import DetalleDocumento from './pages/DetalleDocumento'
import Empresas from './pages/Empresas'
import Login from './pages/Login'
import NoVigentes from './pages/NoVigentes'; //

const ContratoEditor = lazy(() => import('./pages/ContratoEditor'))
const Contratos = lazy(() => import('./pages/Contratos'))
const PlantillaContrato = lazy(() => import('./pages/PlantillaContrato'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
        <Route path="/no-vigentes" element={<NoVigentes />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documentos" element={<Empresas />} />
          <Route path="/documentos/:id" element={<DetalleDocumento />} />
          <Route path="/contratos" element={<Suspense fallback={<p className="text-sm text-slate-500">Cargando contratos...</p>}><Contratos /></Suspense>} />
          <Route path="/contratos/:id" element={<Suspense fallback={<p className="text-sm text-slate-500">Cargando editor...</p>}><ContratoEditor /></Suspense>} />
          <Route path="/configuracion/plantilla-contrato" element={<Suspense fallback={<p className="text-sm text-slate-500">Cargando plantilla...</p>}><PlantillaContrato /></Suspense>} />
          <Route path="/categorias" element={<></>} />
          <Route path="/historial" element={<></>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
