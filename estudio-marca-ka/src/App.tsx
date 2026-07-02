import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RootRedirect } from './pages/RootRedirect'
import { Login } from './pages/Login'
import { DemoStudio } from './pages/DemoStudio'
import { AdminHome } from './pages/AdminHome'
import { EstudioHome } from './pages/EstudioHome'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          {/* Demonstração pública dos layouts (sem login) — ex.: /ver/shapes */}
          <Route path="/ver/:slug" element={<DemoStudio />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute papel="admin">
                <AdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudio"
            element={
              <ProtectedRoute papel="cliente">
                <EstudioHome />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
