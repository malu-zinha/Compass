import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Outlet, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../auth/AuthContext';
import { ThemeProvider } from '../theme/ThemeProvider';

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

// Providers globais do app (os de main.jsx), com o AuthContext falso no lugar do real.
export function TestProviders({ auth = fakeAuthValue(), children }) {
  return (
    <ThemeProvider>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </ThemeProvider>
  );
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
    <TestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<LayoutOutlet />}>
            <Route path="*" element={ui} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

// Renders `ui` at `path` using a real data router (createMemoryRouter), so
// pages that navigate can be asserted on via `router.state.location`.
// `extraPaths` are registered as simple routes (each rendering `<p/>`) so
// navigation targets resolve instead of erroring.
export function renderWithRouter(ui, path = '/', extraPaths = []) {
  const router = createMemoryRouter(
    [
      { path, element: ui },
      ...extraPaths.map((extraPath) => ({ path: extraPath, element: <p>{extraPath}</p> })),
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <TestProviders>
      <RouterProvider router={router} />
    </TestProviders>,
  );
  return { router, ...view };
}

export function omit(obj, key) {
  const { [key]: _omitted, ...rest } = obj;
  return rest;
}
