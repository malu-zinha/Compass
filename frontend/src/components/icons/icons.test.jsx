import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as icons from './index';

const entries = Object.entries(icons);

describe('ícones', () => {
  it('exporta os 19 ícones', () => {
    expect(entries).toHaveLength(19);
  });

  describe.each(entries)('%s', (_name, Icon) => {
    it('herda a cor do texto em vez de cravar um hex', () => {
      const { container } = render(<Icon />);
      const painted = container.querySelectorAll('[stroke], [fill]');
      painted.forEach((el) => {
        for (const attr of ['stroke', 'fill']) {
          const value = el.getAttribute(attr);
          if (value !== null) expect(['currentColor', 'none']).toContain(value);
        }
      });
    });

    it('usa 20px por padrão e aceita size', () => {
      const { container, rerender } = render(<Icon />);
      expect(container.firstChild).toHaveAttribute('width', '20');
      rerender(<Icon size={32} />);
      expect(container.firstChild).toHaveAttribute('height', '32');
    });

    it('aceita className e repassa props', () => {
      const { container } = render(<Icon className="x" data-foo="bar" />);
      expect(container.firstChild).toHaveClass('x');
      expect(container.firstChild).toHaveAttribute('data-foo', 'bar');
    });

    it('é decorativo por padrão, mas pode ser rotulado', () => {
      const { container, rerender } = render(<Icon />);
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
      rerender(<Icon aria-hidden={false} aria-label="rótulo" role="img" />);
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'false');
    });
  });
});
