// Plano de geração: para cada quadro, quais cenas e sementes misturar. Funções puras.
//
// As cenas viram quadros-chave espalhados no tempo; entre duas cenas o texto é misturado
// (mixPrompt). O ruído muda de semente a cada "suavidade" quadros, misturado aos poucos
// (mixSemente), para a imagem mudar de forma contínua em vez de pular.

export function posicaoNaSequencia(i, total, nCenas) {
  return total > 1 ? (i / (total - 1)) * (nCenas - 1) : 0;
}

export function parametrosDoQuadro(i, total, prompts, semente, suavidade) {
  const k = prompts.length;
  const pos = posicaoNaSequencia(i, total, k);
  const a = Math.floor(pos), b = Math.min(a + 1, k - 1);
  const bloco = Math.floor(i / suavidade);
  return {
    promptA: prompts[a],
    promptB: prompts[b],
    mixPrompt: pos - a,
    sementeA: semente + bloco,
    sementeB: semente + bloco + 1,
    mixSemente: suavidade > 1 ? (i % suavidade) / suavidade : 0,
  };
}

/**
 * Semente do repasse do rosto (naturalidade). É independente da suavidade da cena: o cenário
 * muda devagar de um quadro para o outro, mas o rosto precisa variar como em dias diferentes.
 * Se usasse as sementes da cena, quadros vizinhos receberiam quase o mesmo ruído e o rosto
 * ficaria parado, como colado.
 */
export function sementeDoRosto(semente, indice) {
  return (Math.imul(semente + 1, 0x9e3779b1) + Math.imul(indice + 1, 0x85ebca6b)) >>> 1;
}

/** Nome curto da cena mais próxima do quadro, para rotular a tira. */
export function nomeDaCena(i, total, nomes, nCenas) {
  const indice = Math.round(posicaoNaSequencia(i, total, nCenas));
  return nomes?.[indice] ?? `cena ${indice + 1}`;
}
