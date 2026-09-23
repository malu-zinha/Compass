export function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const scoreToPercent = (score) => (score ? Math.round(score / 10) : 0);

export function formatDate(iso, { timezone, date_format: dateFormat }) {
  if (!iso) return 'Data não disponível';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  const { day, month, year } = parts;
  if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}
