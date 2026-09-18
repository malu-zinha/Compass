import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';

export const fakeUser = {
  id: 1,
  name: 'Ana Souza',
  job_title: 'Entrevistador',
  email: 'ana@example.com',
  username: 'ana',
  avatar_url: null,
};

export function LayoutOutlet() {
  return <Outlet context={{ openSidebar: vi.fn() }} />;
}

export function fakeAuthValue(overrides = {}) {
  return {
    user: fakeUser,
    token: 'tok',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    setUser: vi.fn(),
    ...overrides,
  };
}

// Renders `ui` inside a fake AuthContext and a layout route that supplies
// `context={{ openSidebar }}` via an <Outlet>, so useLayout() works.
export function renderWithLayout(ui, path = '/') {
  return render(
    <AuthContext.Provider value={fakeAuthValue()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<LayoutOutlet />}>
            <Route path="*" element={ui} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
