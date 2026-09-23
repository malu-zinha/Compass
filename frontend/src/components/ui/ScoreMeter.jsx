import { scoreBand } from '../../lib/score';
import { scoreToPercent } from '../../lib/format';
import { cx } from './cx';
import styles from './ScoreMeter.module.css';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/*
 * Score 0–1000 como anel (variant="ring") ou barra (variant="bar"), com a cor da
 * faixa (lib/score.js). A faixa também vai em texto (aria-valuetext e rótulo
 * visível no anel), para que a cor nunca seja o único sinal.
 */
export default function ScoreMeter({
  score, label, variant = 'ring', size = 'md', showBand = true, showLabel = true, className,
}) {
  const band = scoreBand(score);
  if (!band) {
    return (
      <span className={cx(styles.empty, className)} aria-label={`${label}: sem pontuação`}>
        —
      </span>
    );
  }
  const percent = scoreToPercent(score);
  const meterProps = {
    role: 'meter',
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': percent,
    'aria-valuetext': `${percent}% — ${band.label}`,
  };

  if (variant === 'bar') {
    return (
      <div className={cx(styles.bar, styles[band.tone], className)} {...meterProps}>
        <div className={styles.barHead}>
          {showLabel && <span className={styles.barLabel}>{label}</span>}
          <span className={styles.value}>{percent}%</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cx(styles.ring, styles[size], styles[band.tone], className)} {...meterProps}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.ringTrack} cx="50" cy="50" r={RADIUS} />
        <circle
          className={styles.ringFill}
          cx="50"
          cy="50"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
        />
      </svg>
      <span className={styles.ringCenter}>
        <span className={styles.value}>{percent}%</span>
        {showBand && <span className={styles.band}>{band.label}</span>}
      </span>
    </div>
  );
}
