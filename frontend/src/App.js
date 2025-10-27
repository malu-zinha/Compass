import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RecordPage from './pages/RecordPage';
import ResultsPage from './pages/ResultsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <h1>COMPASS CERTO</h1>
          <div className="nav-links">
            <Link to="/">🎙️ Gravar</Link>
            <Link to="/results">📋 Resultados</Link>
          </div>
        </nav>
        
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
