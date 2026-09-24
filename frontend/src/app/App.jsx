import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import HomePage from '../features/home/HomePage';
import AuthScreen from '../features/auth/AuthScreen';
import NewInterviewPage from '../features/interviews/new/NewInterviewPage';
import InterviewTypePage from '../features/interviews/new/InterviewTypePage';
import UploadAudioPage from '../features/interviews/new/UploadAudioPage';
import RecordPage from '../features/interviews/live/RecordPage';
import EntrevistasPage from '../features/entrevistas/lista/EntrevistasPage';
import ComparePage from '../features/interviews/results/ComparePage';
import InterviewDetailPage from '../features/entrevistas/detalhe/InterviewDetailPage';
import VagasPage from '../features/vagas/lista/VagasPage';
import VagaEditorPage from '../features/vagas/editor/VagaEditorPage';
import VagaPage from '../features/vagas/pagina/VagaPage';
import PerguntasPage from '../features/perguntas/PerguntasPage';
import ContaPage from '../features/conta/ContaPage';
import NotFoundPage from '../features/not-found/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from './AppLayout';
import FlowLayout from './FlowLayout';
import { paths, ROUTE_PATTERNS as R } from './paths';
import { LegacyCompareRedirect, ParamRedirect } from './redirects';

// A tabela de rotas, sem o router: o App a envolve no BrowserRouter e os
// testes num MemoryRouter.
export function AppRoutes() {
  return (
    <Routes>
      <Route path={R.landing} element={<LandingPage />} />
      <Route path={R.login} element={<AuthScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={R.inicio} element={<HomePage />} />
          <Route path={R.entrevistas} element={<EntrevistasPage />} />
          <Route path={R.entrevista} element={<InterviewDetailPage />} />
          <Route path={R.vagas} element={<VagasPage />} />
          <Route path={R.novaVaga} element={<VagaEditorPage />} />
          <Route path={R.vaga} element={<VagaPage />} />
          <Route path={R.editarVaga} element={<VagaEditorPage />} />
          <Route path={R.comparar} element={<ComparePage />} />
          <Route path={R.perguntas} element={<PerguntasPage />} />
          <Route path={R.conta} element={<ContaPage />} />
        </Route>
        <Route element={<FlowLayout />}>
          <Route path={R.novaEntrevista} element={<NewInterviewPage />} />
          <Route path={R.tipoEntrevista} element={<InterviewTypePage />} />
          <Route path={R.enviar} element={<UploadAudioPage />} />
          <Route path={R.gravar} element={<RecordPage />} />
        </Route>

        {/* Endereços antigos */}
        <Route path="/ranking" element={<Navigate to={paths.vagas} replace />} />
        <Route path="/cargos" element={<Navigate to={paths.vagas} replace />} />
        <Route path="/cargos/novo" element={<Navigate to={paths.novaVaga} replace />} />
        <Route path="/cargos/editar/:id" element={<ParamRedirect to={({ id }) => paths.editarVaga(id)} />} />
        <Route path="/entrevistas/:id" element={<ParamRedirect to={({ id }) => paths.vaga(id)} />} />
        <Route path="/comparar" element={<LegacyCompareRedirect />} />
        <Route path="/perfil" element={<Navigate to={paths.conta()} replace />} />
        <Route path="/configuracoes" element={<Navigate to={paths.conta('preferencias')} replace />} />
        <Route path="/upload" element={<Navigate to={paths.enviar} replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
