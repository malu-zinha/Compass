import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RecordPage from './pages/RecordPage';
import ResultsPage from './pages/ResultsPage';
import AuthScreen from './pages/AuthScreen';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>COMPASS</h1>
          <div className="nav-links">
            <Link to="/">🎙️ Gravar</Link>
            <Link to="/results">📋 Resultados</Link>
            <Link to="/auth">🔒 Entrar / Cadastrar</Link>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/auth" element={<AuthScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
