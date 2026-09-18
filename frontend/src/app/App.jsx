import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage';
import HomePage from '../features/home/HomePage';
import AuthScreen from '../features/auth/AuthScreen';
import NewInterviewPage from '../features/interviews/new/NewInterviewPage';
import InterviewTypePage from '../features/interviews/new/InterviewTypePage';
import UploadAudioPage from '../features/interviews/new/UploadAudioPage';
import RecordPage from '../pages/RecordPage';
import ResultsPage from '../pages/ResultsPage';
import InterviewDetailPage from '../pages/InterviewDetailPage';
import JobsPage from '../features/positions/JobsPage';
import JobEditorPage from '../features/positions/JobEditorPage';
import RankingSelectPage from '../features/interviews/results/RankingSelectPage';
import QuestionsPage from '../features/questions/QuestionsPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from './AppLayout';
import './App.css';

// Placeholder até a T3.6 criar a página de comparação de verdade.
const ComparePlaceholder = () => null;

export const ROUTES = {
  home: '/',
  login: '/login',
  inicio: '/inicio',
  ranking: '/ranking',
  entrevistas: '/entrevistas',
  entrevistasPorCargo: '/entrevistas/:positionId',
  comparar: '/comparar',
  entrevista: '/entrevista/:id',
  cargos: '/cargos',
  cargosNovo: '/cargos/novo',
  cargosEditar: '/cargos/editar/:id',
  perguntas: '/perguntas',
  perfil: '/perfil',
  configuracoes: '/configuracoes',
  novaEntrevista: '/nova-entrevista',
  tipoEntrevista: '/tipo-entrevista',
  upload: '/upload',
  gravar: '/gravar/:id',
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path={ROUTES.home} element={<LandingPage />} />
          <Route path={ROUTES.login} element={<AuthScreen />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.inicio} element={<HomePage />} />
              <Route path={ROUTES.ranking} element={<RankingSelectPage />} />
              <Route path={ROUTES.entrevistas} element={<ResultsPage />} />
              <Route path={ROUTES.entrevistasPorCargo} element={<ResultsPage />} />
              <Route path={ROUTES.comparar} element={<ComparePlaceholder />} />
              <Route path={ROUTES.entrevista} element={<InterviewDetailPage />} />
              <Route path={ROUTES.cargos} element={<JobsPage />} />
              <Route path={ROUTES.cargosNovo} element={<JobEditorPage />} />
              <Route path={ROUTES.cargosEditar} element={<JobEditorPage />} />
              <Route path={ROUTES.perguntas} element={<QuestionsPage />} />
              <Route path={ROUTES.perfil} element={<ProfilePage />} />
              <Route path={ROUTES.configuracoes} element={<SettingsPage />} />
            </Route>
            <Route path={ROUTES.novaEntrevista} element={<NewInterviewPage />} />
            <Route path={ROUTES.tipoEntrevista} element={<InterviewTypePage />} />
            <Route path={ROUTES.upload} element={<UploadAudioPage />} />
            <Route path={ROUTES.gravar} element={<RecordPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
