import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createQuestion, deleteQuestion, listQuestions, updateQuestion } from '../../api/questions';
import { listPositions } from '../../api/positions';
import { PageHeader } from '../../components/layout';
import { Button, Card, EmptyState, Input, Select, Skeleton, useToast } from '../../components/ui';
import { BriefcaseIcon, PlusIcon, QuestionsIcon } from '../../components/icons';
import QuestionItem from './QuestionItem';
import styles from './QuestionsPage.module.css';

/*
 * Banco de perguntas numa tela só: escopo (gerais ou um cargo) à esquerda,
 * perguntas daquele escopo à direita. O escopo mora na URL (?cargo=3), então
 * recarregar ou compartilhar o link mantém o contexto.
 */
export default function QuestionsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const positionId = searchParams.get('cargo') ? Number(searchParams.get('cargo')) : null;

  const [positions, setPositions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    listPositions()
      .then((data) => setPositions(data.items))
      .catch((error) => console.error('Erro ao carregar cargos:', error));
  }, []);

  const loadQuestions = useCallback(async () => {
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
    loadQuestions();
  }, [loadQuestions]);

  const selectScope = (id) => setSearchParams(id ? { cargo: String(id) } : {}, { replace: true });

  const handleAdd = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    try {
      await createQuestion(text, positionId);
      setDraft('');
      await loadQuestions();
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

  const scopes = [{ id: null, name: 'Perguntas gerais' }, ...positions];
  const current = scopes.find((s) => s.id === positionId) ?? { id: positionId, name: 'Cargo' };

  return (
    <div className={styles.page}>
      <PageHeader title="Perguntas" />

      <div className={styles.layout}>
        <nav aria-label="Escopo das perguntas" className={styles.scopes}>
          <label className={styles.scopeSelect}>
            <span className="sr-only">Escopo</span>
            <Select value={positionId ?? ''} onChange={(e) => selectScope(e.target.value ? Number(e.target.value) : null)}>
              {scopes.map((s) => <option key={s.id ?? 'geral'} value={s.id ?? ''}>{s.name}</option>)}
            </Select>
          </label>
          <ul className={styles.scopeList}>
            {scopes.map((s) => (
              <li key={s.id ?? 'geral'}>
                <button
                  type="button"
                  className={styles.scope}
                  aria-current={s.id === positionId ? 'true' : undefined}
                  onClick={() => selectScope(s.id)}
                >
                  {s.id ? <BriefcaseIcon size={16} /> : <QuestionsIcon size={16} />}
                  <span>{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <Card padding="none" as="section" aria-labelledby="lista-titulo" className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 id="lista-titulo" className={styles.panelTitle}>{current.name}</h2>
              <p className={styles.panelHint}>
                {positionId ? 'Aparecem nas entrevistas deste cargo.' : 'Aparecem em todas as entrevistas.'}
              </p>
            </div>
          </div>

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
              description="Adicione acima as perguntas que você costuma fazer."
            />
          ) : (
            <ol className={styles.list}>
              {questions.map((q, i) => (
                <QuestionItem key={q.id} question={q} index={i} onSave={handleSave} onDelete={handleDelete} />
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
