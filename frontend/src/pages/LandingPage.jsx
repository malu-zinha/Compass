import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import logo from '../logo.svg';
import { ChartIcon, ClockIcon, BriefcaseIcon, InfoIcon, JobsIcon, FileTextIcon, MicrophoneIcon, QuestionsIcon } from '../components/icons';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-brand">
          <img src={logo} alt="Compass" className="brand-logo" />
        </div>
        <nav className="landing-nav">
          <button onClick={() => navigate('/login')} className="nav-btn-login">
            Entrar
          </button>
          <button onClick={() => navigate('/login')} className="nav-btn-signup">
            Cadastre-se
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h2 className="hero-title">
            Transforme suas entrevistas em decisões inteligentes
          </h2>
          <p className="hero-subtitle">
            O Compass analisa, transcreve e avalia entrevistas automaticamente,
            apontando sempre para os melhores candidatos
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/login')} className="btn-primary">
              Começar agora
            </button>
            <button className="btn-secondary" onClick={scrollToFeatures}>
              Saiba mais
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-card visual-card-1">
            <div className="card-icon">
              <FileTextIcon size={32} color="#371C68" />
            </div>
            <div className="card-text">Resumo estruturado</div>
          </div>
          <div className="visual-card visual-card-2">
            <div className="card-icon">
              <ChartIcon size={32} color="#371C68" />
            </div>
            <div className="card-text">Análise inteligente</div>
          </div>
          <div className="visual-card visual-card-3">
            <div className="card-icon">
              <QuestionsIcon size={32} color="#371C68" />
            </div>
            <div className="card-text">Sugestão de perguntas</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="features-section">
        <h3 className="section-title">Recursos principais</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <ChartIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Análise Inteligente</h4>
            <p className="feature-description">
              Avaliação automática de competências baseada em critérios personalizados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <ClockIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Tempo Real</h4>
            <p className="feature-description">
              Transcrição e análise durante a entrevista, com perguntas sugeridas automaticamente.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <ChartIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Ranking de candidatos</h4>
            <p className="feature-description">
              Compare candidatos objetivamente com pontuações e insights detalhados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <FileTextIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Resumo estruturado</h4>
            <p className="feature-description">
              Resumos organizados e estruturados das entrevistas com informações-chave destacadas.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <BriefcaseIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Gestão de Cargos</h4>
            <p className="feature-description">
              Crie perfis de cargo completos com competências e critérios personalizados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              <FileTextIcon size={32} color="#371C68" />
            </div>
            <h4 className="feature-title">Banco de Perguntas</h4>
            <p className="feature-description">
              Biblioteca customizável de perguntas organizadas por competência e cargo.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="how-it-works-section">
        <h3 className="section-title">Como funciona</h3>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h4 className="step-title">Configure seu cargo</h4>
            <p className="step-description">
              Defina competências, descrição e perfil ideal para a vaga.
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <h4 className="step-title">Realize a entrevista</h4>
            <p className="step-description">
              Grave e transcreva automaticamente enquanto conversa com o candidato.
            </p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <h4 className="step-title">Analise os resultados</h4>
            <p className="step-description">
              Veja pontuações, rankings e insights para tomar a melhor decisão.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h3 className="cta-title">Pronto para revolucionar suas entrevistas?</h3>
          <p className="cta-subtitle">
            Junte-se a dezenas de empresas que já estão contratando melhor com o Compass.
          </p>
          <button onClick={() => navigate('/login?mode=register')} className="cta-button">
            Criar conta gratuita
          </button>
        </div>
      </section>
    </div>
  );
}

