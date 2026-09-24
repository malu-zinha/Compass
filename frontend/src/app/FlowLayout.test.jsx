import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test } from 'vitest';
import FlowLayout from './FlowLayout';
import { TestProviders } from '../test/render';

function renderFlow(path) {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<FlowLayout />}>
            <Route path="/nova-entrevista" element={<p>form</p>} />
            <Route path="/enviar" element={<p>upload</p>} />
            <Route path="/gravar/:id" element={<p>gravando</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

const current = () =>
  screen.getByRole('list', { name: 'Etapas da nova entrevista' }).querySelector('[aria-current="step"]');

test('primeira etapa marcada e saída para o início', () => {
  renderFlow('/nova-entrevista');
  expect(current()).toHaveTextContent('Candidato e formato');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/inicio');
  expect(screen.getByRole('main')).toHaveTextContent('form');
});

test('envio é a segunda etapa, "Enviar"', () => {
  renderFlow('/enviar');
  expect(current()).toHaveTextContent('Enviar');
});

test('gravação ao vivo não oferece Cancelar', () => {
  renderFlow('/gravar/7');
  expect(current()).toHaveTextContent('Gravar');
  expect(screen.queryByRole('link', { name: 'Cancelar' })).not.toBeInTheDocument();
});
