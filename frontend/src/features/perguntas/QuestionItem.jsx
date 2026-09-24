import { useRef, useState } from 'react';
import { Button, Input } from '../../components/ui';
import styles from './QuestionList.module.css';

/*
 * Uma pergunta. Editar por duplo clique ou pelo botão; Enter salva, Esc
 * cancela, sair do campo salva. Texto vazio cancela em vez de apagar.
 */
export default function QuestionItem({ question, index, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.text);
  const resolved = useRef(true);

  const start = () => {
    resolved.current = false;
    setText(question.text);
    setEditing(true);
  };

  const finish = (save) => {
    if (resolved.current) return;
    resolved.current = true;
    setEditing(false);
    const trimmed = text.trim();
    if (save && trimmed && trimmed !== question.text) onSave(question.id, trimmed);
  };

  return (
    <li className={styles.item}>
      <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      {editing ? (
        <Input
          aria-label="Editar pergunta"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          }}
          onBlur={() => finish(true)}
          autoFocus
          className={styles.editInput}
        />
      ) : (
        <p className={styles.text} onDoubleClick={start}>{question.text}</p>
      )}
      {!editing && (
        <span className={styles.itemActions}>
          <Button variant="ghost" size="sm" onClick={start} aria-label={`Editar ${question.text}`}>Editar</Button>
          <Button
            variant="ghost"
            size="sm"
            className={styles.remove}
            onClick={() => onDelete(question)}
            aria-label={`Remover ${question.text}`}
          >
            Remover
          </Button>
        </span>
      )}
    </li>
  );
}
