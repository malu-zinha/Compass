import { useEffect, useRef } from 'react';

const STATUS_STYLE = { fontSize: '0.8rem', marginLeft: '0.5rem' };
const WARNING_STYLE = { color: '#eab308', ...STATUS_STYLE };

function TranscriptPanel({ turns, status, errorMessage }) {
  // Ref para auto-scroll da transcrição
  const transcriptionContentRef = useRef(null);

  useEffect(() => {
    if (transcriptionContentRef.current && turns.length > 0) {
      transcriptionContentRef.current.scrollTop = transcriptionContentRef.current.scrollHeight;
    }
  }, [turns]);

  const isConnecting = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="transcription-panel">
      <div className="transcription-card">
        <h3>
          Transcrição
          {status === 'live' && <span style={{ color: '#16a34a', ...STATUS_STYLE }}>● AO VIVO</span>}
          {isConnecting && <span style={WARNING_STYLE}>⚠ Conectando...</span>}
        </h3>
        {errorMessage && <span style={WARNING_STYLE}>{errorMessage}</span>}
        <div className="transcription-content" ref={transcriptionContentRef}>
          {turns.length === 0 ? (
            <div className="transcription-empty">
              Aguardando transcrição em tempo real...
            </div>
          ) : (
            <div className="transcription-text-block">
              {turns.map((turn, index) => {
                const isLastItem = index === turns.length - 1;
                const showTypingIndicator = !turn.is_final && isLastItem;

                return (
                  <span
                    key={`${turn.generation}-${turn.turn_id}`}
                    className={`transcription-segment ${turn.is_final ? 'final' : 'transcribing'}`}
                  >
                    {turn.text}
                    {showTypingIndicator && <span className="typing-indicator">...</span>}
                    {' '}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TranscriptPanel;
