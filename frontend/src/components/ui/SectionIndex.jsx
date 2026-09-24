import { useEffect, useState } from 'react';
import { cx } from './cx';
import styles from './SectionIndex.module.css';

/*
 * Índice de uma página longa: links para as seções (por id) e a seção que
 * está na tela marcada com aria-current. sections: [{ id, label }].
 */
export default function SectionIndex({ sections, label = 'Nesta página', className }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Conta como "atual" a seção que cruza a faixa logo abaixo do cabeçalho.
      { rootMargin: '-80px 0px -60% 0px' },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={label} className={cx(styles.index, className)}>
      <p className={styles.title}>{label}</p>
      <ol className={styles.list}>
        {sections.map(({ id, label: text }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={styles.link}
              aria-current={active === id ? 'true' : undefined}
              onClick={() => setActive(id)}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
