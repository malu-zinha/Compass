import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { TestProviders, fakeAuthValue, fakeUser, LayoutOutlet } from '../../test/render';
import { apiUrl } from '../../api/client';
import ProfilePage from './ProfilePage';

vi.mock('../../api/users', () => ({
  updateMe: vi.fn(),
  uploadAvatar: vi.fn(),
}));

const user = {
  ...fakeUser,
  name: 'Ana Souza',
  email: 'ana@example.com',
  job_title: 'Entrevistadora',
  phone: '(11) 99999-0000',
  company: 'Trilha',
  department: 'RH',
  avatar_url: null,
};

// Uma AuthContext estática não reflete o setUser() do componente; este
// harness simula o AuthProvider real (setUser atualiza o próprio user),
// enquanto ainda expõe um mock espiável para as asserções dos testes.
function renderProfile(initialUser = user) {
  const setUser = vi.fn();
  function Harness() {
    const [currentUser, setCurrentUser] = useState(initialUser);
    const handleSetUser = (updated) => { setUser(updated); setCurrentUser(updated); };
    return (
      <TestProviders auth={fakeAuthValue({ user: currentUser, setUser: handleSetUser })}>
        <MemoryRouter initialEntries={['/perfil']}>
          <Routes>
            <Route element={<LayoutOutlet />}>
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TestProviders>
    );
  }
  const view = render(<Harness />);
  return { ...view, setUser };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.alert = vi.fn();
});

test('(a) os campos começam com os valores de useAuth().user, sem dado fixo', () => {
  renderProfile();

  expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
  expect(screen.getAllByText('ana@example.com').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Entrevistadora').length).toBeGreaterThan(0);
  expect(screen.getByText('(11) 99999-0000')).toBeInTheDocument();
  expect(screen.getByText('Trilha')).toBeInTheDocument();
  expect(screen.getByText('RH')).toBeInTheDocument();
  expect(screen.queryByText('Compass Tech')).not.toBeInTheDocument();
  expect(screen.queryByText('(11) 98765-4321')).not.toBeInTheDocument();
});

test('(b) Editar, mudar telefone e Salvar chama updateMe e setUser', async () => {
  const { updateMe } = await import('../../api/users');
  const updated = { ...user, phone: '(11) 12345-6789' };
  updateMe.mockResolvedValue(updated);

  const { setUser } = renderProfile();

  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const phoneInput = screen.getByDisplayValue('(11) 99999-0000');
  await userEvent.clear(phoneInput);
  await userEvent.type(phoneInput, '(11) 12345-6789');
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

  expect(updateMe).toHaveBeenCalledWith({
    name: 'Ana Souza',
    email: 'ana@example.com',
    job_title: 'Entrevistadora',
    phone: '(11) 12345-6789',
    company: 'Trilha',
    department: 'RH',
  });
  await screen.findByRole('button', { name: 'Editar' });
  expect(setUser).toHaveBeenCalledWith(updated);
});

test('(c) Cancelar restaura os valores', async () => {
  renderProfile();

  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const phoneInput = screen.getByDisplayValue('(11) 99999-0000');
  await userEvent.clear(phoneInput);
  await userEvent.type(phoneInput, '(11) 00000-0000');
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect(screen.getByDisplayValue('(11) 99999-0000')).toBeInTheDocument();
});

test('(d) escolher arquivo em Alterar foto chama uploadAvatar e renderiza a img', async () => {
  const { uploadAvatar } = await import('../../api/users');
  const updated = { ...user, avatar_url: '/users/1/avatar?expires=1&signature=abc' };
  uploadAvatar.mockResolvedValue(updated);

  const { setUser } = renderProfile();

  const file = new File(['x'], 'foto.png', { type: 'image/png' });
  await userEvent.upload(document.querySelector('input[type=file]'), file);

  expect(uploadAvatar).toHaveBeenCalledWith(file);
  const img = await screen.findByAltText('Foto de perfil');
  expect(img).toHaveAttribute('src', apiUrl(updated.avatar_url));
  expect(setUser).toHaveBeenCalledWith(updated);
});

test('erro no upload da foto mostra o detail em alert', async () => {
  const { uploadAvatar } = await import('../../api/users');
  uploadAvatar.mockRejectedValue({ detail: 'O arquivo excede o limite de 2 MB.' });

  renderProfile();

  const file = new File(['x'], 'foto.png', { type: 'image/png' });
  await userEvent.upload(document.querySelector('input[type=file]'), file);

  expect(window.alert).toHaveBeenCalledWith('O arquivo excede o limite de 2 MB.');
});
