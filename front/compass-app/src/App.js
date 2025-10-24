import React, { useState, useEffect } from 'react';
import './App.css'; 

// Componente do Logo da Bússola (SVG) 
function CompassLogo() {
  return (
    <svg 
      width="36" 
      height="36" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="compass-logo-svg"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

//  Componente Principal APP
function App() {
  // Estado para controlar o Splash Screen
  const [isLoading, setIsLoading] = useState(true);

  // Efeito para simular o carregamento
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500); 

    return () => clearTimeout(timer); 
  }, []); // Roda só uma vez

  
  //  RENDERIZAÇÃO DA SPLASH SCREEN
  if (isLoading) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <CompassLogo />
          <h1>COMPASS</h1>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO DO APP PRINCIPAL (LANDING PAGE) 
  return (
    <div className="app-container">
      {/* O Modal foi removido daqui */}

      <header className="header">
        <div className="logo-container">
          <CompassLogo />
          <h1>COMPASS</h1>
        </div>
        <nav className="nav">
          <a href="#">Extensões</a>
          <a href="#">Análise</a>
          <a href="#">Sobre</a>
        </nav>
        {/* O botão "Nova Entrevista" foi removido. Este botão agora é o CTA principal */}
        <button className="button-primary button-cta-header">
          Instale Agora
        </button>
      </header>

      <main>
        <section className="hero">
          <h2 className="hero-title">
            <span>Revolucione</span> suas entrevistas
          </h2>
          <p>Potencione seu processo de seleção com IA e análise de dados precisa.</p>
          <div className="hero-buttons">
            <button className="button-primary">Comece Agora</button>
            <button className="button-secondary">Ver Demonstração</button>
          </div>
        </section>

        <section className="features">
          <h3 className="section-title">Inteligência a seu favor</h3>
          <p className="section-subtitle">Tudo o que você precisa para conduzir entrevistas mais eficientes.</p>
          <div className="features-grid">
            <div className="feature-card">
              <h4>Transcrição Automática</h4>
              <p>Capture áudio e transcrições em tempo real, gerando resumos padronizados.</p>
            </div>
            <div className="feature-card">
              <h4>Análise de Perfil</h4>
              <p>Receba insights do candidato com checklists automáticos e perfis de resultado.</p>
            </div>
            <div className="feature-card">
              <h4>Análise Comportamental</h4>
              <p>Defina o perfil ideal e a IA monitora padrões e comportamentos na sua entrevista.</p>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h3 className="section-title">Como funciona</h3>
          <div className="steps-container">
            <div className="step-card">
              <span className="step-number">1</span>
              <h4>Instale a Extensão</h4>
              <p>Adicione a extensão ao seu navegador com apenas um clique.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h4>Receba o Resumo</h4>
              <p>Redução de tempo na análise com nossos resumos inteligentes.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h4>Compare Relatórios</h4>
              <p>Padronização dos relatórios para facilitar a comparação.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;