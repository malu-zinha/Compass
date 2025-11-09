import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewInterviewPage from './pages/NewInterviewpage';
import RecordPage from './pages/RecordPage';
import ResultsPage from './pages/ResultsPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import JobsPage from './pages/JobsPage';
import JobEditorPage from './pages/JobEditorPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/entrevistas" element={<ResultsPage />} />
          <Route path="/nova-entrevista" element={<NewInterviewPage />} />
          <Route path="/gravar" element={<RecordPage />} />
          <Route path="/entrevista/:id" element={<InterviewDetailPage />} />
          <Route path="/cargos" element={<JobsPage />} />
          <Route path="/cargos/novo" element={<JobEditorPage />} />
          <Route path="/cargos/editar/:id" element={<JobEditorPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
