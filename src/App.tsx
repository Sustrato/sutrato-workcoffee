import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import DetalleDocumento from './pages/DetalleDocumento'
import Documentos from './pages/Documentos'
import Login from './pages/Login'
import NoVigentes from './pages/NoVigentes'; //

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
        <Route path="/no-vigentes" element={<NoVigentes />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/documentos/:id" element={<DetalleDocumento />} />
          <Route path="/categorias" element={<></>} />
          <Route path="/historial" element={<></>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
