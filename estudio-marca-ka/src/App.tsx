import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { DemoStudio } from './pages/DemoStudio'
import { AdminPanel } from './pages/AdminPanel'
import { Studio } from './pages/Studio'
import { NotFound } from './pages/NotFound'
import { OrcamentoPublico } from './pages/publico/OrcamentoPublico'
import { ContratoPublico } from './pages/publico/ContratoPublico'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Painel da KA — aberto, sem login (uso interno da KA) */}
          <Route path="/" element={<AdminPanel />} />
          <Route path="/ka" element={<AdminPanel />} />

          {/* Estúdio público por marca — ex.: /shapes, /aa (e alias /ver/:slug) */}
          <Route path="/ver/:slug" element={<DemoStudio />} />

          {/* Links públicos enviados ao cliente (por token) */}
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
          <Route path="/contrato/:token" element={<ContratoPublico />} />

          {/* Fluxo autenticado (para o futuro: logins de cliente) */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute papel="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudio"
            element={
              <ProtectedRoute papel="cliente">
                <Studio />
              </ProtectedRoute>
            }
          />

          {/* Marca por slug (deixe por último: rota dinâmica) */}
          <Route path="/:slug" element={<DemoStudio />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
