import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../../components/layout';
import { useLayout } from '../../../app/AppLayout';
import { getInterview } from '../../../api/interviews';
import { compareInterviews } from '../../../api/comparisons';
import { scoreToPercent } from '../../../lib/format';
// Mesmas classes de cartão do ranking; importado aqui para funcionar mesmo
// quando esta é a primeira página carregada.
import './ResultsPage.css';
import { useToast } from '../../../components/ui';

const MIN_COMPARE = 2;
const MAX_COMPARE = 3;
const SUBSCORES = [
  ['technical', 'Técnico'],
  ['communication', 'Comunicação'],
  ['work_culture', 'Cultura de Trabalho'],
  ['experience', 'Experiência'],
];

function parseIds(value) {
  const ids = (value || '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

function CardSection({ label, tone = 'positives', lines, bracket = false }) {
  const items = lines && lines.length > 0 ? lines : ['Nenhuma informação coletada'];
  return (
    <div className="card-section">
      <div className={`section-label ${tone}`}>{label}</div>
      {items.map((line, idx) => (
        <div key={idx} className="section-text">{bracket && lines?.length ? `[${line}]` : line}</div>
      ))}
    </div>
  );
}

function CompareCard({ interview }) {
  const analysis = interview.analysis || {};
  const subscores = analysis.score?.subscores || {};
  return (
    <div className="interview-card">
      <div className="card-header">
        <h3 className="card-title">{interview.candidate_name}</h3>
        <span className="card-email">{interview.position_name}</span>
      </div>
      <CardSection
        label={`${scoreToPercent(interview.score)}% match`}
        lines={SUBSCORES.map(([key, label]) => `${label}: ${scoreToPercent(subscores[key])}%`)}
      />
      <CardSection label="Pontos positivos" lines={analysis.positives} bracket />
      <CardSection label="Pontos negativos" tone="negatives" lines={analysis.negatives} bracket />
      <CardSection label="Habilidades" lines={analysis.skills} />
      <CardSection
        label="Aderência ao perfil ideal"
        lines={analysis.ideal_profile_fit ? [analysis.ideal_profile_fit] : []}
      />
    </div>
  );
}

function ComparePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openSidebar } = useLayout();
  const idsParam = searchParams.get('ids');
  const ids = useMemo(() => parseIds(idsParam), [idsParam]);
  const validIds = ids.length >= MIN_COMPARE && ids.length <= MAX_COMPARE;
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!validIds) {
      navigate('/ranking', { replace: true });
      return undefined;
    }
    let active = true;
    setLoading(true);
    setComparison(null);
    Promise.all(ids.map((id) => getInterview(id)))
      .then((data) => {
        if (active) setInterviews(data);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Erro ao carregar entrevistas para comparar:', error);
        toast.error(error.detail || 'Erro ao carregar as entrevistas. Tente novamente.');
        navigate('/ranking', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [ids, validIds, navigate, toast]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setComparison(await compareInterviews(ids));
    } catch (error) {
      console.error('Erro ao gerar parecer da IA:', error);
      toast.error(error.detail || 'Erro ao gerar o parecer da IA. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const nameOf = (interviewId) => (
    interviews.find((item) => item.id === interviewId)?.candidate_name || `Entrevista ${interviewId}`
  );

  if (!validIds || loading) {
    return <div className="loading">Carregando...</div>;
  }

  const ranking = comparison ? [...comparison.ranking].sort((a, b) => a.rank - b.rank) : [];

  return (
    <div className="results-page">
      <Header title="Comparar candidatos" onMenuClick={openSidebar} />

      <div className="results-container" style={{ gridTemplateColumns: '1fr' }}>
        <div
          className="interviews-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
        >
          {interviews.map((interview) => (
            <CompareCard key={interview.id} interview={interview} />
          ))}
        </div>

        <div className="interviews-grid">
          <button className="btn-ver-detalhes" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Gerando parecer...' : 'Gerar parecer da IA'}
          </button>

          {comparison && (
            <div className="interview-card">
              <div className="card-header">
                <h3 className="card-title">Parecer da IA</h3>
              </div>
              <div className="card-section">
                <div className="section-text">{comparison.summary}</div>
              </div>
              <div className="card-section">
                <div className="section-label positives">Ranking</div>
                {ranking.map((item) => (
                  <div key={item.interview_id} className="section-text">
                    {`${item.rank}. ${nameOf(item.interview_id)} — ${item.rationale}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
