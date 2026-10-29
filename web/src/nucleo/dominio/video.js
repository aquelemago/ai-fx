// Vídeo como base: quais instantes do vídeo viram quadros-fonte. Funções puras.
//
// O vídeo é amostrado a 8 quadros por segundo e só os primeiros 10 s entram, para a geração
// (alguns segundos por quadro no processador) não durar horas por engano.

export const QUADROS_POR_SEGUNDO = 8;
export const DURACAO_MAXIMA = 10; // segundos

/** Instantes (em segundos) dos quadros-fonte, quantos são e se o vídeo foi cortado. */
export function amostragem(duracao) {
  const util = Number.isFinite(duracao) && duracao > 0 ? Math.min(duracao, DURACAO_MAXIMA) : 0;
  const total = Math.floor(util * QUADROS_POR_SEGUNDO);
  return {
    instantes: Array.from({ length: total }, (_, i) => i / QUADROS_POR_SEGUNDO),
    total,
    cortado: util > 0 && duracao > DURACAO_MAXIMA,
  };
}
