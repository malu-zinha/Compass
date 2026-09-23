import React from 'react';
import ChevronDownIcon from '../../../components/icons/ChevronDownIcon';
import ChevronRightIcon from '../../../components/icons/ChevronRightIcon';

function AccordionIcon({ open }) {
  return (
    <span className="accordion-icon">
      {open ? (
        <ChevronDownIcon size={16} color="#1a1a1a" />
      ) : (
        <ChevronRightIcon size={16} color="#1a1a1a" />
      )}
    </span>
  );
}

// Acordeões da coluna "Resumo": lê de `analysis` (interview.analysis) e
// `notes` (interview.notes), com a mesma marcação/classes da página antiga.
function AnalysisSections({
  analysis, notes, questions, expandedSections, onToggleSection,
}) {
  const data = analysis || {};
  const skills = data.skills || [];
  const history = (data.experiences || []).filter((item) => item.company && item.role);
  const positives = data.positives || [];
  const negatives = data.negatives || [];
  const specific = data.summary || 'Sem informações específicas';
  const qaPairs = data.qa_pairs || [];
  const idealProfileFit = data.ideal_profile_fit;
  const askedQuestions = (questions || []).filter((q) => q.asked);
  const score = data.score;

  return (
    <>
      {/* Habilidades */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('habilidades')}>
          <span>Habilidades</span>
          <AccordionIcon open={expandedSections.habilidades} />
        </button>
        {expandedSections.habilidades && (
          <div className="accordion-content">
            {skills.length > 0 ? (
              <ol className="skills-list">
                {skills.map((skill, idx) => (
                  <li key={idx}>{skill}</li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Histórico - só exibe se houver dados válidos */}
      {history.length > 0 && (
        <div className="accordion-section">
          <button className="accordion-header" onClick={() => onToggleSection('historico')}>
            <span>Histórico</span>
            <AccordionIcon open={expandedSections.historico} />
          </button>
          {expandedSections.historico && (
            <div className="accordion-content">
              {history.map((item, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-title">{item.role} - {item.company}</div>
                  {item.description && (
                    <div className="history-description">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pontos Positivos */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('positivos')}>
          <span>Pontos positivos</span>
          <AccordionIcon open={expandedSections.positivos} />
        </button>
        {expandedSections.positivos && (
          <div className="accordion-content">
            {positives.length > 0 ? (
              <ol className="skills-list">
                {positives.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Pontos Negativos */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('negativos')}>
          <span>Pontos negativos</span>
          <AccordionIcon open={expandedSections.negativos} />
        </button>
        {expandedSections.negativos && (
          <div className="accordion-content">
            {negatives.length > 0 ? (
              <ol className="skills-list">
                {negatives.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Análise */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('especificas')}>
          <span>Análise</span>
          <AccordionIcon open={expandedSections.especificas} />
        </button>
        {expandedSections.especificas && (
          <div className="accordion-content">
            <p>{specific}</p>
          </div>
        )}
      </div>

      {/* Pontuação */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('pontuacao')}>
          <span>Pontuação</span>
          <AccordionIcon open={expandedSections.pontuacao} />
        </button>
        {expandedSections.pontuacao && (
          <div className="accordion-content">
            {score ? (
              <div className="scores-container">
                <div className="score-item overall-score">
                  <span className="score-label">Pontuação Geral</span>
                  <span className="score-value">
                    {Math.round((score.overall / 1000) * 100)}%
                  </span>
                </div>
                <div className="subscores">
                  <div className="score-item">
                    <span className="score-label">Técnico</span>
                    <span className="score-value">
                      {Math.round((score.subscores.technical / 1000) * 100)}%
                    </span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Comunicação</span>
                    <span className="score-value">
                      {Math.round((score.subscores.communication / 1000) * 100)}%
                    </span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Cultura de Trabalho</span>
                    <span className="score-value">
                      {Math.round((score.subscores.work_culture / 1000) * 100)}%
                    </span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Experiência</span>
                    <span className="score-value">
                      {Math.round((score.subscores.experience / 1000) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Perguntas e respostas */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('qa')}>
          <span>Perguntas e respostas</span>
          <AccordionIcon open={expandedSections.qa} />
        </button>
        {expandedSections.qa && (
          <div className="accordion-content">
            {qaPairs.length > 0 ? (
              <ol className="skills-list">
                {qaPairs.map((pair, idx) => (
                  <li key={idx}>
                    <strong>{pair.question}</strong>
                    {': '}
                    {pair.answer}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Aderência ao perfil ideal */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('idealFit')}>
          <span>Aderência ao perfil ideal</span>
          <AccordionIcon open={expandedSections.idealFit} />
        </button>
        {expandedSections.idealFit && (
          <div className="accordion-content">
            {idealProfileFit ? <p>{idealProfileFit}</p> : <p>Nenhuma informação coletada</p>}
          </div>
        )}
      </div>

      {/* Perguntas feitas */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('askedQuestions')}>
          <span>Perguntas feitas</span>
          <AccordionIcon open={expandedSections.askedQuestions} />
        </button>
        {expandedSections.askedQuestions && (
          <div className="accordion-content">
            {askedQuestions.length > 0 ? (
              <ol className="skills-list">
                {askedQuestions.map((q) => (
                  <li key={q.id}>{q.text}</li>
                ))}
              </ol>
            ) : (
              <p>Nenhuma informação coletada</p>
            )}
          </div>
        )}
      </div>

      {/* Anotações */}
      <div className="accordion-section">
        <button className="accordion-header" onClick={() => onToggleSection('anotacoes')}>
          <span>Anotações</span>
          <AccordionIcon open={expandedSections.anotacoes} />
        </button>
        {expandedSections.anotacoes && (
          <div className="accordion-content">
            <p>&quot;{notes || 'Sem anotações'}&quot;</p>
          </div>
        )}
      </div>
    </>
  );
}

export default AnalysisSections;
