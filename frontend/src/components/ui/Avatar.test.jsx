import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar, { initials } from './Avatar';

describe('Avatar', () => {
  it('calcula iniciais de primeiro e último nome', () => {
    expect(initials('Ana Maria Souza')).toBe('AS');
    expect(initials('ana')).toBe('A');
    expect(initials('')).toBe('?');
  });

  it('mostra a foto nomeada e cai nas iniciais se ela falhar', () => {
    render(<Avatar src="/a.png" name="Ana Souza" />);
    const img = screen.getByRole('img', { name: 'Ana Souza' });
    expect(img.tagName).toBe('IMG');
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: 'Ana Souza' })).toHaveTextContent('AS');
  });
});
