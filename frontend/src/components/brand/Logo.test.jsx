import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('é uma imagem nomeada "Compass" em todas as variantes', () => {
    render(
      <>
        <Logo variant="mark" />
        <Logo variant="full" />
        <Logo variant="lockup" />
      </>,
    );
    expect(screen.getAllByRole('img', { name: 'Compass' })).toHaveLength(3);
  });

  it('full e lockup trazem o nome escrito; mark só o símbolo', () => {
    const { container: full } = render(<Logo variant="full" />);
    expect(full).toHaveTextContent('Compass');
    const { container: mark } = render(<Logo variant="mark" />);
    expect(mark).not.toHaveTextContent('Compass');
  });

  it('pode ser decorativo quando já há texto ao lado', () => {
    const { container } = render(<Logo variant="mark" decorative />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
