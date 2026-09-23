import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Logo } from '../../components/brand';
import { Button, Field, Input, useToast } from '../../components/ui';
import { ChartIcon, MicrophoneIcon, QuestionsIcon } from '../../components/icons';
import styles from './AuthScreen.module.css';

const EMPTY = { nome: '', email: '', usuario: '', senha: '' };

function validate(mode, form) {
  const errors = {};
  if (mode === 'register') {
    if (!form.nome.trim()) errors.nome = 'Informe seu nome.';
    if (!form.email.trim()) errors.email = 'Informe seu e-mail.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'E-mail inválido.';
  }
  if (!form.usuario.trim()) errors.usuario = 'Informe o usuário.';
  if (!form.senha.trim()) errors.senha = 'Informe a senha.';
  return errors;
}

const HIGHLIGHTS = [
  { Icon: MicrophoneIcon, text: 'Transcrição ao vivo, com perguntas sugeridas durante a conversa' },
  { Icon: ChartIcon, text: 'Pontuação por competência e ranking por cargo' },
  { Icon: QuestionsIcon, text: 'Banco de perguntas organizado por cargo' },
];

export default function AuthScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login, register, user } = useAuth();

  if (user) return <Navigate to="/inicio" replace />;

  const isLogin = mode === 'login';

  const switchMode = (next) => {
    setErrors({});
    setSearchParams(next === 'register' ? { mode: 'register' } : {}, { replace: true, state: location.state });
  };

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(mode, form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.usuario, form.senha);
        navigate(location.state?.from ?? '/inicio', { replace: true });
        return;
      }
      await register({ name: form.nome, email: form.email, username: form.usuario, password: form.senha });
      toast.success('Conta criada. Entre com seu usuário e senha.');
      setForm({ ...EMPTY, usuario: form.usuario });
      switchMode('login');
    } catch (error) {
      setErrors({ general: error.detail || 'Não foi possível concluir. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <Link to="/" className={styles.brandLink} aria-label="Compass — página inicial">
          <Logo variant="full" decorative />
        </Link>
        <div className={styles.pitch}>
          <h2 className={styles.pitchTitle}>Entrevistas que viram decisões.</h2>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ Icon, text }) => (
              <li key={text}>
                <span className={styles.highlightIcon}><Icon size={18} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className={styles.formSide}>
        <Link to="/" className={styles.back}>← Voltar ao site</Link>

        <div className={styles.formWrap}>
          <div className={styles.mobileLogo}>
            <Logo variant="lockup" />
          </div>
          <h1 className={styles.title}>{isLogin ? 'Entrar no Compass' : 'Criar sua conta'}</h1>
          <p className={styles.subtitle}>
            {isLogin ? 'Bem-vindo de volta.' : 'Leva menos de um minuto.'}
          </p>

          {errors.general && (
            <div className={styles.errorBanner} role="alert">
              {errors.general}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <>
                <Field label="Nome" error={errors.nome}>
                  <Input name="nome" value={form.nome} onChange={change} autoComplete="name" />
                </Field>
                <Field label="E-mail" error={errors.email}>
                  <Input name="email" type="email" value={form.email} onChange={change} autoComplete="email" />
                </Field>
              </>
            )}
            <Field label="Usuário" error={errors.usuario}>
              <Input name="usuario" value={form.usuario} onChange={change} autoComplete="username" />
            </Field>
            <Field label="Senha" error={errors.senha}>
              <Input
                name="senha"
                type="password"
                value={form.senha}
                onChange={change}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </Field>
            <Button type="submit" variant="primary" size="lg" loading={submitting} className={styles.submit}>
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className={styles.switch}>
            {isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" className={styles.switchButton} onClick={() => switchMode(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
