import { act, renderHook } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useTabParam, useUrlFilters } from './urlState';

function withRouter(hook, url) {
  let result;
  let location;
  function Harness() {
    result = hook();
    location = useLocation();
    return null;
  }
  const router = createMemoryRouter([{ path: '*', element: <Harness /> }], { initialEntries: [url] });
  render(<RouterProvider router={router} />);
  return { get result() { return result; }, get search() { return location.search; } };
}

test('useUrlFilters lê a URL, cai no padrão e omite valores padrão ao gravar', () => {
  const h = withRouter(() => useUrlFilters({ status: 'todos', q: '' }), '/entrevistas?q=ana');
  expect(h.result[0]).toEqual({ status: 'todos', q: 'ana' });

  act(() => h.result[1]('status', 'done'));
  expect(h.search).toBe('?q=ana&status=done');

  act(() => h.result[1]('status', 'todos'));
  act(() => h.result[1]('q', ''));
  expect(h.search).toBe('');
});

test('useTabParam valida a aba e usa a padrão para ids desconhecidos', () => {
  const h = withRouter(() => useTabParam(['candidatos', 'perguntas', 'perfil']), '/vagas/3?aba=xyz');
  expect(h.result[0]).toBe('candidatos');
  act(() => h.result[1]('perfil'));
  expect(h.result[0]).toBe('perfil');
  expect(h.search).toBe('?aba=perfil');
  act(() => h.result[1]('candidatos'));
  expect(h.search).toBe('');
});

test('renderHook sem router não é suportado (documenta a dependência)', () => {
  expect(() => renderHook(() => useUrlFilters({ a: '1' }))).toThrow();
});
