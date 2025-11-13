import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from '../styles/auth.module.css';
import logo from '../logo.svg';

const AuthScreen = () => {
  const [searchParams] = useSearchParams();
  const initialScreen = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    usuario: '',
    senha: ''
  });
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // reset errors
    setErrors({});

    if (currentScreen === 'login') {
      const newErrors = {};
      if (!formData.usuario || formData.usuario.trim() === '') newErrors.usuario = 'Por favor, insira o usuário.';
      if (!formData.senha || formData.senha.trim() === '') newErrors.senha = 'Por favor, insira a senha.';
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }

      // Simulate auth check (replace with real API call)
      // For now accept joaquimgermano/12345 as valid credentials
      if (formData.usuario === 'joaquimgermano' && formData.senha === '12345') {
        setNotification({ type: 'success', message: 'Login realizado com sucesso!' });
        // Navigate to homepage after 1 second
        setTimeout(() => {
          navigate('/inicio');
        }, 1000);
      } else {
        setErrors({ general: 'Usuário ou senha incorretos.' });
      }
    } else {
      const newErrors = {};
      if (!formData.nome || formData.nome.trim() === '') newErrors.nome = 'Por favor insira o nome.';
      if (!formData.email || formData.email.trim() === '') newErrors.email = 'Por favor insira o e-mail.';
      else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'E-mail inválido.';
      if (!formData.usuario || formData.usuario.trim() === '') newErrors.usuario = 'Por favor insira o usuário.';
      if (!formData.senha || formData.senha.trim() === '') newErrors.senha = 'Por favor insira a senha.';
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }

      // Simulate successful registration
      setNotification({ type: 'success', message: 'Cadastro realizado com sucesso!' });
      // Switch to login after 1 second
      setTimeout(() => {
        setCurrentScreen('login');
        setFormData({ nome: '', email: '', usuario: '', senha: '' });
      }, 1000);
    }
  };

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setCurrentScreen('register');
    } else {
      setCurrentScreen('login');
    }
  }, [searchParams]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <button 
          className={styles.closeButton} 
          aria-label="Voltar" 
          onClick={() => navigate('/')}
        >
          &times;
        </button>

        {currentScreen === 'login' ? (
          <LoginScreen 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            switchToRegister={() => setCurrentScreen('register')}
            errors={errors}
            notification={notification}
          />
        ) : (
          <RegisterScreen 
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            switchToLogin={() => setCurrentScreen('login')}
            errors={errors}
            notification={notification}
          />
        )}
      </div>
    </div>
  );
};

const LoginScreen = ({ formData, handleInputChange, handleSubmit, switchToRegister, errors = {}, notification = null }) => {
  return (
    <div className={styles.card}>
      {notification && (
        <div className={styles.notification} role="status" aria-live="polite">
          <span className={styles.sticker} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          {notification.message}
        </div>
      )}
      {errors && errors.general && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.sticker} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          {errors.general}
        </div>
      )}
      <div className={styles.logoContainer}>
        <img src={logo} alt="Compass" className={styles.logo} />
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          name="usuario"
          placeholder="Usuário"
          value={formData.usuario}
          onChange={handleInputChange}
        />
        {errors.usuario && <div className={styles.errorText}>{errors.usuario}</div>}

        <input
          className={styles.input}
          type="password"
          name="senha"
          placeholder="Senha"
          value={formData.senha}
          onChange={handleInputChange}
        />
        {errors.senha && <div className={styles.errorText}>{errors.senha}</div>}

        <button className={styles.button} type="submit">Entrar</button>
      </form>

      <p className={styles.smallText}>
        Não possui uma conta?{' '}
        <button onClick={switchToRegister} className={styles.linkButton}>Cadastre-se</button>
      </p>
    </div>
  );
};

const RegisterScreen = ({ formData, handleInputChange, handleSubmit, switchToLogin, errors = {}, notification = null }) => {
  return (
    <div className={styles.card}>
      {notification && (
        <div className={styles.notification} role="status" aria-live="polite">
          <span className={styles.sticker} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          {notification.message}
        </div>
      )}
      {errors && errors.general && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.sticker} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17h.01" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
          {errors.general}
        </div>
      )}
      <div className={styles.logoContainer}>
        <img src={logo} alt="Compass" className={styles.logo} />
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          name="nome"
          placeholder="Nome"
          value={formData.nome}
          onChange={handleInputChange}
        />
        {errors.nome && <div className={styles.errorText}>{errors.nome}</div>}

        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={handleInputChange}
        />
        {errors.email && <div className={styles.errorText}>{errors.email}</div>}

        <input
          className={styles.input}
          type="text"
          name="usuario"
          placeholder="Usuário"
          value={formData.usuario}
          onChange={handleInputChange}
        />
        {errors.usuario && <div className={styles.errorText}>{errors.usuario}</div>}

        <input
          className={styles.input}
          type="password"
          name="senha"
          placeholder="Senha"
          value={formData.senha}
          onChange={handleInputChange}
        />
        {errors.senha && <div className={styles.errorText}>{errors.senha}</div>}

        <button className={styles.button} type="submit">Cadastrar</button>
      </form>

      <p className={styles.smallText}>
        Já possui conta?{' '}
        <button onClick={switchToLogin} className={styles.linkButton}>Entrar</button>
      </p>
    </div>
  );
};

export default AuthScreen;
