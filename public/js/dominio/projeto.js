// Regras puras sobre projetos.

/** "Projeto 1", "Projeto 2"... o menor número que ainda não está em uso. */
export function nomeDoNovoProjeto(nomesExistentes) {
  const usados = new Set(nomesExistentes.map((n) => n.trim().toLowerCase()));
  for (let n = 1; ; n++) {
    if (!usados.has(`projeto ${n}`)) return `Projeto ${n}`;
  }
}

/** Estado dos quadros que vai para o manifesto (sem as imagens, que ficam em arquivos). */
export const resumoDosQuadros = (lista) => lista.map(({ indice, cena, fora }) => ({ indice, cena, fora }));

export const arquivoDoQuadroFinal = (indice) => `quadros/final_${String(indice).padStart(4, '0')}.png`;
