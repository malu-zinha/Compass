import styles from './Logo.module.css';

/*
 * A marca do Compass: um anel aberto a nordeste e uma agulha cuja ponta norte
 * sai pela abertura — direção, não só orientação. O anel herda currentColor;
 * a metade norte da agulha é o laranja de detalhe e a sul fica esmaecida, então o
 * símbolo funciona nos dois temas sem duplicar arquivo.
 *
 * Mesma geometria de public/favicon.svg — mudou aqui, muda lá.
 */
export function LogoMark({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M27.78 10.51A13 13 0 1 1 21.49 4.22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M26.6 5.4 18.26 18.26 13.74 13.74Z" className={styles.north} />
      <path d="M9.64 22.36 13.74 13.74 18.26 18.26Z" className={styles.south} />
    </svg>
  );
}

const SIZES = { mark: 32, full: 28, lockup: 56 };

/*
 * variant: mark (só símbolo) | full (símbolo + nome, sidebar/topo) |
 * lockup (grande, empilhado, para a entrada e o login).
 */
export default function Logo({ variant = 'full', size, decorative = false, className }) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Compass' };
  const markSize = size ?? SIZES[variant];

  return (
    <span className={[styles.logo, styles[variant], className].filter(Boolean).join(' ')} {...a11y}>
      <LogoMark size={markSize} />
      {variant !== 'mark' && (
        <span className={styles.wordmark} aria-hidden="true">
          Compass
        </span>
      )}
    </span>
  );
}
