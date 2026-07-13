import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { DemoStudio } from './pages/DemoStudio'
import { AdminPanel } from './pages/AdminPanel'
import { Studio } from './pages/Studio'
import { NotFound } from './pages/NotFound'
import { OrcamentoPublico } from './pages/publico/OrcamentoPublico'
import { ContratoPublico } from './pages/publico/ContratoPublico'
import { CadastroPublico } from './pages/publico/CadastroPublico'
import { CuidadoraCadastro } from './pages/publico/CuidadoraCadastro'
import { ProjetoPublico } from './pages/publico/ProjetoPublico'
import { PortalVM } from './pages/publico/PortalVM'
import { PropostaDoc } from './pages/publico/PropostaDoc'
import { modeloPropostaPadrao } from './lib/gestao'

// Dev-only: /proposta-modelo mostra o layout da proposta com o modelo padrão.
function PropostaModeloDev() {
  return (
    <div className="pub-wrap" style={{ padding: '2rem 1rem' }}>
      <PropostaDoc
        dados={{
          titulo: 'Sistema Visual de Publicações da Marca',
          destinatario_nome: 'Larissa · Shape Design',
          criado_em: '2026-07-07T12:00:00.000Z',
          validade: '2026-08-06',
          proposta: { ...modeloPropostaPadrao(), cidade: 'Curitiba/PR' },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          {/* Painel administrativo da KA (gestão) — aberto, sem login.
              Fica na raiz e em /admin. O /ka agora é o ESTÚDIO da marca KA
              (cai na rota dinâmica /:slug lá embaixo), igual ao /shapes. */}
          <Route path="/" element={<AdminPanel />} />

          {/* Estúdio público por marca — ex.: /shapes, /ka (e alias /ver/:slug) */}
          <Route path="/ver/:slug" element={<DemoStudio />} />

          {/* Links públicos enviados ao cliente (por token) */}
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
          <Route path="/contrato/:token" element={<ContratoPublico />} />
          <Route path="/cadastro" element={<CadastroPublico />} />

          {/* Cadastro público de cuidadora (controle pessoal da KA) */}
          <Route path="/cadastro-cuidadora" element={<CuidadoraCadastro />} />

          {/* Acompanhamento de projeto pelo cliente (tempo real, por token) */}
          <Route path="/projeto/:token" element={<ProjetoPublico />} />

          {/* Portal só-leitura da VM Rocks (parceira) — URL limpa /vm-rocks */}
          <Route path="/vm-rocks" element={<PortalVM />} />

          {/* Pré-visualização do modelo de proposta (só em desenvolvimento) */}
          {import.meta.env.DEV && <Route path="/proposta-modelo" element={<PropostaModeloDev />} />}

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
      </ToastProvider>
    </AuthProvider>
  )
}
