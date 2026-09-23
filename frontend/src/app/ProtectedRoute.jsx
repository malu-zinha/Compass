import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute() {
  const { user, loading, connectionError, retry } = useAuth();
  const location = useLocation();
  if (loading) return <div>Carregando...</div>;
  if (!user && connectionError) {
    return (
      <div>
        Não foi possível conectar ao servidor.
        <button onClick={retry}>Tentar novamente</button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
