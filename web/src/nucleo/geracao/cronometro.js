// Mede quanto cada etapa de um quadro leva. `medir(nome)` fecha a etapa que começou na medida
// anterior (ou na criação), então basta chamá-lo ao fim de cada etapa.
export function criarCronometro(agora = () => performance.now()) {
  const inicio = agora();
  let marca = inicio;
  const tempos = {};
  return {
    tempos,
    medir(nome) {
      const t = agora();
      tempos[nome] = (tempos[nome] ?? 0) + (t - marca);
      marca = t;
    },
    total: () => agora() - inicio,
  };
}

/** "total 40.1 s · cena 9.3 · rosto 0.02 ..." (segundos), para o console. */
export function resumoDosTempos(tempos, total) {
  const s = (ms) => (ms / 1000).toFixed(ms < 100 ? 3 : 1);
  return [`total ${s(total)} s`, ...Object.entries(tempos).map(([nome, ms]) => `${nome} ${s(ms)}`)].join(' · ');
}
