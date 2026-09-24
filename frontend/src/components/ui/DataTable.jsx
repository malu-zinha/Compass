import { Link } from 'react-router-dom';
import { cx } from './cx';
import styles from './DataTable.module.css';

/*
 * Tabela semântica.
 *
 * columns: [{ key, header, render(row), sortable, align: 'end', width, card: false }]
 *   A primeira coluna é a "principal": com `rowHref`, o conteúdo dela vira um
 *   link que cobre a linha inteira (a linha toda é clicável, mas só um link é
 *   anunciado). `card: false` esconde a coluna no modo cartão do celular.
 * sort / onSortChange: ordenação controlada ({ key, dir: 'asc' | 'desc' }).
 * caption: descrição para leitores de tela (fica visualmente oculta).
 *
 * Abaixo de 720px cada linha vira um cartão, com o cabeçalho de cada campo
 * repetido como rótulo.
 */
export default function DataTable({
  columns, rows, getRowKey, rowHref, sort, onSortChange, caption, empty, className, rowClassName,
}) {
  if (!rows.length && empty) return empty;

  const toggle = (key) => {
    const dir = sort?.key === key && sort.dir === 'desc' ? 'asc' : 'desc';
    onSortChange?.({ key, dir });
  };

  return (
    <div className={cx(styles.wrap, className)}>
      <table className={styles.table}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={col.sortable ? ariaSort ?? 'none' : undefined}
                  className={cx(col.align === 'end' && styles.end)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortable ? (
                    <button type="button" className={styles.sort} onClick={() => toggle(col.key)}>
                      {col.header}
                      <span className={cx(styles.arrow, active && styles.arrowOn)} aria-hidden="true">
                        {active && sort.dir === 'asc' ? '↑' : '↓'}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={getRowKey(row)} className={cx(href && styles.linked, rowClassName?.(row))}>
                {columns.map((col, index) => {
                  const content = col.render ? col.render(row) : row[col.key];
                  return (
                    <td
                      key={col.key}
                      data-label={index === 0 ? undefined : col.header}
                      className={cx(
                        index === 0 && styles.primary,
                        col.align === 'end' && styles.end,
                        col.card === false && styles.noCard,
                      )}
                    >
                      {index === 0 && href ? (
                        <Link to={href} className={styles.rowLink}>{content}</Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
