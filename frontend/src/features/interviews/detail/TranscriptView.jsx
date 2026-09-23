import React, { useEffect, useRef } from 'react';
import { speakerLabel } from '../../../lib/transcript';

// Coluna de transcrição: mensagens com o rótulo do falante (via speakerLabel),
// destaque da mensagem ativa (recebida de useAudioPlayer) e auto-scroll até
// ela. Mesma marcação/classes da página antiga.
function TranscriptView({
  transcript, speakerRoles, activeMessageIndex, statusMessage,
}) {
  const transcriptionRef = useRef(null);
  const messageRefs = useRef({});

  useEffect(() => {
    if (activeMessageIndex === null || activeMessageIndex === undefined) return;
    const messageElement = messageRefs.current[activeMessageIndex];
    const container = transcriptionRef.current;
    if (!messageElement || !container) return;

    const messageTop = messageElement.offsetTop;
    const messageHeight = messageElement.offsetHeight;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    const messageBottom = messageTop + messageHeight;
    const containerBottom = scrollTop + containerHeight;

    if (messageTop < scrollTop || messageBottom > containerBottom) {
      const targetScroll = messageTop - (containerHeight / 2) + (messageHeight / 2);
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [activeMessageIndex]);

  if (!transcript || transcript.length === 0) {
    return (
      <div className="transcription-content" ref={transcriptionRef}>
        <div className="loading-overlay">
          {statusMessage && <div className="spinner"></div>}
          <p style={{
            marginTop: '1rem', color: '#666', fontSize: '0.9rem', textAlign: 'center',
          }}
          >
            {statusMessage || 'Nenhuma informação coletada'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcription-content" ref={transcriptionRef}>
      {transcript.map((message, idx) => {
        const label = speakerLabel(message.speaker, speakerRoles || []);
        const isInterviewer = label === 'Entrevistador';
        const isActive = activeMessageIndex === idx;
        return (
          <div
            key={idx}
            ref={(el) => { messageRefs.current[idx] = el; }}
            className={`transcription-message ${isInterviewer ? 'message-right' : 'message-left'} ${isActive ? 'active-message' : ''}`}
          >
            <div className="message-speaker">{label}</div>
            <div className={`message-bubble ${isInterviewer ? 'interviewer' : 'interviewee'}`}>
              {message.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TranscriptView;
