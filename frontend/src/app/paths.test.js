import { describe, expect, it } from 'vitest';
import { paths } from './paths';

describe('paths', () => {
  it('monta endereços com parâmetro', () => {
    expect(paths.entrevista(7)).toBe('/entrevista/7');
    expect(paths.editarVaga(3)).toBe('/vagas/3/editar');
    expect(paths.gravar(9)).toBe('/gravar/9');
    expect(paths.comparar(3, [1, 2, 5])).toBe('/vagas/3/comparar?ids=1,2,5');
  });

  it('omite a aba padrão e parâmetros vazios', () => {
    expect(paths.vaga(3)).toBe('/vagas/3');
    expect(paths.vaga(3, 'candidatos')).toBe('/vagas/3');
    expect(paths.vaga(3, 'perguntas')).toBe('/vagas/3?aba=perguntas');
    expect(paths.conta()).toBe('/conta');
    expect(paths.conta('perfil')).toBe('/conta');
    expect(paths.conta('preferencias')).toBe('/conta?aba=preferencias');
    expect(paths.novaEntrevista()).toBe('/nova-entrevista');
    expect(paths.novaEntrevista(3)).toBe('/nova-entrevista?vaga=3');
  });

  it('serializa filtros de entrevistas', () => {
    expect(paths.entrevistasFiltradas()).toBe('/entrevistas');
    expect(paths.entrevistasFiltradas({ vaga: 3, status: 'done', q: '' })).toBe('/entrevistas?vaga=3&status=done');
  });
});
