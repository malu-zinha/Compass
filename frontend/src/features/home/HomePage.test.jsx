import { screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { renderWithLayout } from '../../test/render';
import HomePage from './HomePage';

vi.mock('../../api/interviews', () => ({ listInterviews: vi.fn() }));
vi.mock('../../api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({
  useUserSettings: () => ({ settings: { timezone: 'America/Sao_Paulo', date_format: 'DD/MM/YYYY' } }),
}));

const it = (id, extra) => ({
  id, candidate_name: `C${id}`, position_id: 3, position_name: 'Frontend', status: 'done', score: 800, created_at: '2026-09-20T12:00:00Z', ...extra,
});

beforeEach(async () => {
  const { listInterviews } = await import('../../api/interviews');
  const { listPositions } = await import('../../api/positions');
  listPositions.mockResolvedValue({ items: [{ id: 3, name: 'Frontend' }] });
  listInterviews.mockImplementation(({ status, positionId, perPage }) => {
    if (positionId) {
      return Promise.resolve(status === 'done'
        ? { items: [it(1, { candidate_name: 'Carla', score: 870 })], total: 1 }
        : { items: [], total: 4 });
    }
    if (status === 'error') return Promise.resolve({ items: [it(7, { status: 'error', candidate_name: 'Marina' })], total: 1 });
    if (Array.isArray(status)) return Promise.resolve({ items: [it(8, { status: 'analyzing', candidate_name: 'Júlia' })], total: 1 });
    return Promise.resolve({ items: [it(1, { candidate_name: 'Carla' }), it(2, { candidate_name: 'Rafael' })], total: 12, perPage });
  });
});

test('cumprimenta e mostra as contagens reais', async () => {
  renderWithLayout(<HomePage />, '/inicio');
  expect(screen.getByRole('heading', { name: 'Olá, Ana.' })).toBeInTheDocument();
  expect(await screen.findByText('12 entrevistas concluídas · 1 em processamento · 1 com falha')).toBeInTheDocument();
});

test('"Precisa de você" lista falhas e em processamento com link para o detalhe', async () => {
  renderWithLayout(<HomePage />, '/inicio');
  const section = (await screen.findByRole('heading', { name: 'Precisa de você' })).closest('section');
  const marina = await within(section).findByRole('link', { name: /Marina/ });
  expect(marina).toHaveAttribute('href', '/entrevista/7');
  expect(marina).toHaveTextContent('Ver e reprocessar');
  expect(within(section).getByRole('link', { name: /Júlia/ })).toHaveTextContent('Acompanhar');
});

test('recentes em tabela e vagas com a melhor candidata', async () => {
  renderWithLayout(<HomePage />, '/inicio');
  const table = await screen.findByRole('table', { name: 'Entrevistas concluídas recentemente' });
  expect(within(table).getByRole('link', { name: 'Rafael' })).toHaveAttribute('href', '/entrevista/2');
  const vaga = await screen.findByRole('link', { name: /Frontend.*4 entrevistas/ });
  expect(vaga).toHaveAttribute('href', '/vagas/3');
  expect(vaga).toHaveTextContent('Melhor: Carla');
});

test('sem pendências mostra mensagem calma', async () => {
  const { listInterviews } = await import('../../api/interviews');
  listInterviews.mockResolvedValue({ items: [], total: 0 });
  renderWithLayout(<HomePage />, '/inicio');
  expect(await screen.findByText('Nada pendente. Todas as entrevistas foram analisadas.')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Nenhuma entrevista ainda' })).toBeInTheDocument();
});
