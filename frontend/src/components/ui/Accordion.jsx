import { useId, useState } from 'react';
import { ChevronDownIcon } from '../icons';
import { cx } from './cx';
import styles from './Accordion.module.css';

/* Um item recolhível: botão com aria-expanded controlando uma região nomeada. */
export default function Accordion({ title, defaultOpen = false, children, className }) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cx(styles.item, className)}>
      <h3 className={styles.heading}>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={`${id}-region`}
          className={styles.trigger}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{title}</span>
          <ChevronDownIcon size={16} className={cx(styles.chevron, open && styles.open)} />
        </button>
      </h3>
      {open && (
        <div role="region" id={`${id}-region`} aria-labelledby={`${id}-button`} className={styles.region}>
          {children}
        </div>
      )}
    </div>
  );
}
