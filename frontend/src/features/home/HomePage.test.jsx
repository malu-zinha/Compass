import { screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import HomePage from './HomePage';

vi.mock('../../api/interviews', () => ({ listInterviews: vi.fn() }));
vi.mock('../../api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY' } }),
}));

const recent = [
  { id: 4, candidate_name: 'Carla Mendes', position_name: 'Frontend', status: 'done', score: 870, created_at: '2026-09-20T12:00:00Z' },
  { id: 5, candidate_name: 'Rafael Lima', position_name: 'Dados', status: 'analyzing', score: null, created_at: '2026-09-21T12:00:00Z' },
];

beforeEach(async () => {
  const { listInterviews } = await import('../../api/interviews');
  const { listPositions } = await import('../../api/positions');
  listInterviews.mockImplementation(({ status, sort }) => {
    if (sort) return Promise.resolve({ items: recent, total: 2 });
    const totals = { done: 12, error: 1 };
    return Promise.resolve({ items: [], total: Array.isArray(status) ? 3 : totals[status] });
  });
  listPositions.mockResolvedValue({ items: [], total: 4 });
});

test('cumprimenta pelo primeiro nome e mostra os números reais', async () => {
  renderWithLayout(<HomePage />, '/inicio');
  expect(screen.getByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument();
  const resumo = await screen.findByRole('region', { name: 'Resumo' });
  expect(await within(resumo).findByText('12')).toBeInTheDocument();
  expect(within(resumo).getByText('Em processamento').parentElement).toHaveTextContent('3');
  expect(within(resumo).getByText('Com falha').parentElement).toHaveTextContent('1');
  expect(within(resumo).getByText('Cargos').parentElement).toHaveTextContent('4');
});

test('lista as últimas entrevistas com status e link para o detalhe', async () => {
  renderWithLayout(<HomePage />, '/inicio');
  const link = await screen.findByRole('link', { name: /Carla Mendes/ });
  expect(link).toHaveAttribute('href', '/entrevista/4');
  expect(within(link).getByText('Concluída')).toBeInTheDocument();
  expect(within(screen.getByRole('link', { name: /Rafael Lima/ })).getByText('Analisando')).toBeInTheDocument();
});

test('sem entrevistas mostra estado vazio com a ação principal', async () => {
  const { listInterviews } = await import('../../api/interviews');
  listInterviews.mockResolvedValue({ items: [], total: 0 });
  renderWithLayout(<HomePage />, '/inicio');
  expect(await screen.findByRole('heading', { name: 'Nenhuma entrevista ainda' })).toBeInTheDocument();
});
