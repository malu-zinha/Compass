import { useState } from 'react';
import { cx } from './cx';
import styles from './Avatar.module.css';

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/* Foto com fallback de iniciais; se a imagem falhar ao carregar, cai nas iniciais. */
export default function Avatar({ src, name, alt, size = 'md', className }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span className={cx(styles.avatar, styles[size], className)}>
      {showImage ? (
        <img src={src} alt={alt ?? name ?? ''} onError={() => setFailed(true)} />
      ) : (
        <span role="img" aria-label={name}>
          <span aria-hidden="true">{initials(name)}</span>
        </span>
      )}
    </span>
  );
}
