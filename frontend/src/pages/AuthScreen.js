import React, { useState } from 'react';
import styles from '../styles/auth.module.css';
import { ReactComponent as Icon15 } from '../assets/icons/image 15.svg';

const AuthScreen = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    usuario: '',
    senha: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentScreen === 'login') {
      console.log('Login:', { usuario: formData.usuario, senha: formData.senha });
      alert('Login realizado com sucesso!');
    } else {
      console.log('Cadastro:', formData);
      alert('Cadastro realizado com sucesso!');
      setCurrentScreen('login');
    }
  };

  return (
    <div className={styles.authContainer}>
      {currentScreen === 'login' ? (
        <LoginScreen 
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          switchToRegister={() => setCurrentScreen('register')}
        />
      ) : (
        <RegisterScreen 
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          switchToLogin={() => setCurrentScreen('login')}
        />
      )}
    </div>
  );
};

const LoginScreen = ({ formData, handleInputChange, handleSubmit, switchToRegister }) => {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Compass <span className={styles.icon} aria-hidden="true">
        <Icon15 className={styles.iconSvg} aria-hidden="true" />
      </span></h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          name="usuario"
          placeholder="Usuário"
          value={formData.usuario}
          onChange={handleInputChange}
        />

        <input
          className={styles.input}
          type="password"
          name="senha"
          placeholder="Senha"
          value={formData.senha}
          onChange={handleInputChange}
        />

        <button className={styles.button} type="submit">Entrar</button>
      </form>

      <p className={styles.smallText}>
        Não possui uma conta?{' '}
        <button onClick={switchToRegister} className={styles.linkButton}>Cadastre-se</button>
      </p>
    </div>
  );
};

const RegisterScreen = ({ formData, handleInputChange, handleSubmit, switchToLogin }) => {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Compass <span className={styles.icon} aria-hidden="true">
        <Icon15 className={styles.iconSvg} aria-hidden="true" />
      </span></h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="email"
          name="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={handleInputChange}
        />

        <input
          className={styles.input}
          type="text"
          name="usuario"
          placeholder="Usuário"
          value={formData.usuario}
          onChange={handleInputChange}
        />

        <input
          className={styles.input}
          type="password"
          name="senha"
          placeholder="Senha"
          value={formData.senha}
          onChange={handleInputChange}
        />

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
