// Junta classes ignorando valores falsos: cx('a', cond && 'b', undefined).
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}
