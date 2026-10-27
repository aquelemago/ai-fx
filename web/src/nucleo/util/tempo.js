// "8 s", "4 min 05 s"
export function formatarTempo(segundos) {
  if (segundos < 60) return `${Math.max(1, Math.round(segundos))} s`;
  const min = Math.floor(segundos / 60);
  const seg = Math.round(segundos % 60);
  return `${min} min ${String(seg).padStart(2, '0')} s`;
}
