import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { ReactComponent as Icon15 } from '../assets/icons/image 15.svg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-brand">
          <h1 className="brand-title">
            Compass
            <span className="brand-icon">
              <Icon15 className="icon-svg" />
            </span>
          </h1>
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
            ajudando você a encontrar os melhores candidatos com tecnologia de ponta.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/login')} className="btn-primary">
              Começar agora
            </button>
            <button className="btn-secondary">
              Saiba mais
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-card visual-card-1">
            <div className="card-icon">🎤</div>
            <div className="card-text">Gravação em tempo real</div>
          </div>
          <div className="visual-card visual-card-2">
            <div className="card-icon">📝</div>
            <div className="card-text">Transcrição automática</div>
          </div>
          <div className="visual-card visual-card-3">
            <div className="card-icon">📊</div>
            <div className="card-text">Análise inteligente</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h3 className="section-title">Recursos principais</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#EDE9FF', color: '#371C68' }}>
              🎯
            </div>
            <h4 className="feature-title">Análise Inteligente</h4>
            <p className="feature-description">
              Avaliação automática de competências e fit cultural baseada em critérios personalizados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#FFE2DE', color: '#602309' }}>
              ⚡
            </div>
            <h4 className="feature-title">Tempo Real</h4>
            <p className="feature-description">
              Transcrição e análise durante a entrevista, com perguntas sugeridas automaticamente.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#D2EAFF', color: '#092260' }}>
              📈
            </div>
            <h4 className="feature-title">Ranking Automático</h4>
            <p className="feature-description">
              Compare candidatos objetivamente com pontuações e insights detalhados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#E8F5E9', color: '#1B5E20' }}>
              🔒
            </div>
            <h4 className="feature-title">Segurança</h4>
            <p className="feature-description">
              Seus dados protegidos com criptografia e armazenamento seguro na nuvem.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#FFF3E0', color: '#E65100' }}>
              💼
            </div>
            <h4 className="feature-title">Gestão de Cargos</h4>
            <p className="feature-description">
              Crie perfis de cargo completos com competências e critérios personalizados.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#F3E5F5', color: '#6A1B9A' }}>
              🎓
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
          <button onClick={() => navigate('/login')} className="cta-button">
            Criar conta gratuita
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h4 className="footer-title">
              Compass
              <span className="footer-icon">
                <Icon15 className="icon-svg-small" />
              </span>
            </h4>
            <p className="footer-tagline">Contratação inteligente, decisões melhores.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h5>Produto</h5>
              <a href="#features">Recursos</a>
              <a href="#pricing">Preços</a>
              <a href="#demo">Demo</a>
            </div>
            <div className="footer-column">
              <h5>Empresa</h5>
              <a href="#about">Sobre</a>
              <a href="#blog">Blog</a>
              <a href="#contact">Contato</a>
            </div>
            <div className="footer-column">
              <h5>Suporte</h5>
              <a href="#help">Ajuda</a>
              <a href="#docs">Documentação</a>
              <a href="#status">Status</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 Compass. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

