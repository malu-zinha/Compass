import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import { TestProviders } from '../test/render';

// As telas de destino buscam dados; aqui só importa para onde o endereço vai.
vi.mock('../api/interviews', () => ({
  listInterviews: vi.fn(() => new Promise(() => {})),
  getInterview: vi.fn(async () => ({ id: 5, position_id: 3 })),
  listInterviewQuestions: vi.fn(() => new Promise(() => {})),
  getAudioUrl: vi.fn(),
}));
vi.mock('../api/positions', () => ({
  listPositions: vi.fn(() => new Promise(() => {})),
  getPosition: vi.fn(() => new Promise(() => {})),
}));
vi.mock('../api/questions', () => ({ listQuestions: vi.fn(() => new Promise(() => {})) }));

let current;
function Probe() {
  const location = useLocation();
  current = location.pathname + location.search;
  return null;
}

function visit(url) {
  render(
    <TestProviders>
      <MemoryRouter initialEntries={[url]}>
        <AppRoutes />
        <Probe />
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('endereços antigos redirecionam', () => {
  it.each([
    ['/ranking', '/vagas'],
    ['/cargos', '/vagas'],
    ['/cargos/novo', '/vagas/nova'],
    ['/cargos/editar/3', '/vagas/3/editar'],
    ['/entrevistas/3', '/vagas/3'],
    ['/perfil', '/conta'],
    ['/configuracoes', '/conta?aba=preferencias'],
    ['/upload', '/enviar'],
  ])('%s → %s', async (from, to) => {
    // /enviar exige um rascunho de entrevista; sem ele, volta ao começo do fluxo.
    sessionStorage.setItem('compass.interviewDraft', JSON.stringify({ candidate_name: 'Ana', position_id: 3 }));
    visit(from);
    await waitFor(() => expect(current).toBe(to));
  });

  it('/comparar?ids= descobre a vaga pela primeira entrevista', async () => {
    visit('/comparar?ids=5,6');
    await waitFor(() => expect(current).toBe('/vagas/3/comparar?ids=5,6'));
  });

  it('/comparar sem ids vai para entrevistas', async () => {
    visit('/comparar');
    await waitFor(() => expect(current).toBe('/entrevistas'));
  });

  it('o detalhe continua em /entrevista/:id (singular)', async () => {
    visit('/entrevista/5');
    await waitFor(() => expect(current).toBe('/entrevista/5'));
  });
});
