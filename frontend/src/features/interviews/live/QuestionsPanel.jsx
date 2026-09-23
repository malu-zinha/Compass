import { InfoIcon, FileTextIcon } from '../../../components/icons';

const HINT_STYLE = { textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' };

// A classe `selected` marca as perguntas já feitas; clicar alterna o estado.
function QuestionsPanel({ questions, onToggleAsked, loading = false, isLive = false }) {
  return (
    <div className="questions-section">
      <h3>Perguntas</h3>

      <div className="questions-list">
        {loading && (
          <p style={HINT_STYLE}>
            Carregando perguntas...
          </p>
        )}
        {!loading && questions.length === 0 && (
          <p style={HINT_STYLE}>
            {isLive ? 'Sugestões de perguntas aparecerão aqui...' : 'Aguardando sugestões de perguntas...'}
          </p>
        )}
        {questions.map((question) => (
          <div
            key={question.id}
            className={`question-item ${question.asked ? 'selected' : ''}`}
            onClick={() => onToggleAsked(question)}
          >
            <div className="question-header">
              <div className="question-number-status">
                <span className="question-number">
                  {question.source === 'ai' ? (
                    <>
                      <InfoIcon size={16} />
                      IA
                    </>
                  ) : (
                    <>
                      <FileTextIcon size={16} />
                      Cadastrada
                    </>
                  )}
                </span>
              </div>
            </div>

            <p className="question-text">{question.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuestionsPanel;
