import { useCallback, useEffect, useState } from 'react';
import { createQuestion, deleteQuestion, listQuestions, updateQuestion } from '../../api/questions';
import { Button, EmptyState, Input, Skeleton, useToast } from '../../components/ui';
import { PlusIcon, QuestionsIcon } from '../../components/icons';
import QuestionItem from './QuestionItem';
import styles from './QuestionList.module.css';

/*
 * Perguntas de um escopo — gerais (positionId null) ou de uma vaga — com
 * campo de adicionar, edição e remoção. Usada na página de perguntas gerais e
 * na aba Perguntas da vaga.
 */
export default function QuestionList({ positionId = null, emptyText }) {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQuestions(await listQuestions(positionId));
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      toast.error(error.detail || 'Não foi possível carregar as perguntas.');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [positionId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    try {
      await createQuestion(text, positionId);
      setDraft('');
      await load();
    } catch (error) {
      console.error('Erro ao criar pergunta:', error);
      toast.error(error.detail || 'Erro ao criar pergunta. Verifique se o backend está rodando.');
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (id, text) => {
    try {
      const updated = await updateQuestion(id, text);
      setQuestions((list) => list.map((q) => (q.id === id ? { ...q, text: updated?.text ?? text } : q)));
    } catch (error) {
      console.error('Erro ao editar pergunta:', error);
      toast.error(error.detail || 'Erro ao editar pergunta. Verifique se o backend está rodando.');
    }
  };

  const handleDelete = async (question) => {
    try {
      await deleteQuestion(question.id);
      setQuestions((list) => list.filter((q) => q.id !== question.id));
      toast.info('Pergunta removida.');
    } catch (error) {
      console.error('Erro ao deletar pergunta:', error);
      toast.error(error.detail || 'Erro ao deletar pergunta. Verifique se o backend está rodando.');
    }
  };

  return (
    <div className={styles.box}>
      <form className={styles.addForm} onSubmit={handleAdd}>
        <Input
          aria-label="Nova pergunta"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma pergunta e pressione Enter"
        />
        <Button type="submit" variant="primary" icon={<PlusIcon size={16} />} loading={adding} disabled={!draft.trim()}>
          Adicionar
        </Button>
      </form>

      {loading ? (
        <div className={styles.loading} aria-busy="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="line" />)}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<QuestionsIcon size={24} />}
          title="Nenhuma pergunta aqui ainda"
          description={emptyText ?? 'Adicione acima as perguntas que você costuma fazer.'}
        />
      ) : (
        <ol className={styles.list}>
          {questions.map((q, i) => (
            <QuestionItem key={q.id} question={q} index={i} onSave={handleSave} onDelete={handleDelete} />
          ))}
        </ol>
      )}
    </div>
  );
}
