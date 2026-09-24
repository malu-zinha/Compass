import { useState } from 'react';
import { Chip, Input } from '../../../components/ui';
import styles from './SkillsInput.module.css';

/*
 * Competências como chips. Enter ou vírgula adicionam; Backspace num campo
 * vazio remove a última; cada chip tem seu botão "Remover <nome>". Deve ficar
 * dentro de um <Field>, que rotula o campo de digitação.
 */
export default function SkillsInput({ value, onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const skill = draft.trim().replace(/,$/, '').trim();
    if (skill && !value.some((s) => s.toLowerCase() === skill.toLowerCase())) onChange([...value, skill]);
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={styles.box}>
      {value.length > 0 && (
        <ul className={styles.chips}>
          {value.map((skill) => (
            <li key={skill}>
              <Chip tone="info" onRemove={() => onChange(value.filter((s) => s !== skill))}>{skill}</Chip>
            </li>
          ))}
        </ul>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder="Digite e pressione Enter"
      />
    </div>
  );
}
