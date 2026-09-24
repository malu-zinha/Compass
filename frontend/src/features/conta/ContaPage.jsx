import { useSearchParams } from 'react-router-dom';
import ProfilePage from '../profile/ProfilePage';
import SettingsPage from '../settings/SettingsPage';

// Provisório: /conta junta Perfil e Preferências; a tela definitiva com abas vem na fase de telas.
export default function ContaPage() {
  const [searchParams] = useSearchParams();
  return searchParams.get('aba') === 'preferencias' ? <SettingsPage /> : <ProfilePage />;
}
