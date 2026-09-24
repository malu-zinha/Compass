import { useId, useRef, useState } from 'react';
import { cx } from './cx';
import styles from './Tabs.module.css';

/*
 * Padrão WAI-ARIA de abas com ativação automática: setas trocam de aba e já
 * mostram o painel; Home/End vão às pontas; só a aba ativa entra no Tab
 * (tabindex móvel), e o próximo Tab vai para o painel.
 *
 * items: [{ id, label, content }]. Controlado com value/onChange, ou não.
 */
export default function Tabs({ items, label, value, defaultValue, onChange, className }) {
  const baseId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const tabRefs = useRef({});

  const select = (id, focus = false) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
    if (focus) tabRefs.current[id]?.focus();
  };

  const onKeyDown = (event) => {
    const index = items.findIndex((item) => item.id === active);
    const last = items.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(items[next].id, true);
  };

  const current = items.find((item) => item.id === active) ?? items[0];

  return (
    <div className={cx(styles.tabs, className)}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {items.map((item) => {
          const selected = item.id === current.id;
          return (
            <button
              key={item.id}
              ref={(el) => { tabRefs.current[item.id] = el; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.id}`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        tabIndex={0}
        className={styles.panel}
      >
        {current.content}
      </div>
    </div>
  );
}
