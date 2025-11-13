import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import NewInterviewPage from './pages/NewInterviewpage';
import InterviewTypePage from './pages/InterviewTypePage';
import UploadAudioPage from './pages/UploadAudioPage';
import RecordPage from './pages/RecordPage';
import ResultsPage from './pages/ResultsPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import JobsPage from './pages/JobsPage';
import JobEditorPage from './pages/JobEditorPage';
import RankingSelectPage from './pages/RankingSelectPage';
import AuthScreen from './pages/AuthScreen';
import QuestionsPage from './pages/QuestionsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/ranking" element={<RankingSelectPage />} />
          <Route path="/entrevistas" element={<ResultsPage />} />
          <Route path="/entrevistas/:positionId" element={<ResultsPage />} />
          <Route path="/nova-entrevista" element={<NewInterviewPage />} />
          <Route path="/tipo-entrevista" element={<InterviewTypePage />} />
          <Route path="/upload" element={<UploadAudioPage />} />
          <Route path="/gravar" element={<RecordPage />} />
          <Route path="/entrevista/:id" element={<InterviewDetailPage />} />
          <Route path="/cargos" element={<JobsPage />} />
          <Route path="/cargos/novo" element={<JobEditorPage />} />
          <Route path="/cargos/editar/:id" element={<JobEditorPage />} />
          <Route path="/perguntas" element={<QuestionsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
