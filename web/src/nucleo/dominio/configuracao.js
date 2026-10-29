// Configuração de um projeto: o que a montagem (descrição, roteiro, quadros, ajustes) e o palco
// (formato, ritmo) guardam no manifesto, e o pedido de geração que sai dela. Funções puras.
import { FORMATOS, FORMATO_PADRAO } from './formatos.js';
import { PERSONALIZADO, ROTEIROS, SO_A_IMAGEM, montarPrompts } from './roteiros.js';

export const QUANTIDADES = [12, 24, 48, 96];
export const ROTEIRO_PADRAO = 'Um dia inteiro';

export const CONFIGURACAO_PADRAO = {
  descricao: 'a young man with short dark hair',
  roteiro: ROTEIRO_PADRAO,
  cenas: ROTEIROS[ROTEIRO_PADRAO].cenas.join('\n'), // texto de "Editar cenas", uma por linha
  quadros: 24,
  ajustes: { forca: 0.82, passos: 1, suavidade: 6, rosto: 0.9, harmonia: 0.6, naturalidade: 0.45, continuidade: 0.25, semente: 42 },
  formato: FORMATO_PADRAO,
  ritmo: { fps: 8, transicao: 0.6 },
};

/** A configuração salva de um projeto, completada com o padrão e com valores inválidos trocados. */
export function completarConfiguracao(salva = {}) {
  const p = CONFIGURACAO_PADRAO;
  const c = { ...p, ...salva, ajustes: { ...p.ajustes, ...salva.ajustes }, ritmo: { ...p.ritmo, ...salva.ritmo } };
  if (!ROTEIROS[c.roteiro] && c.roteiro !== PERSONALIZADO && c.roteiro !== SO_A_IMAGEM) c.roteiro = p.roteiro;
  c.cenas = ROTEIROS[c.roteiro]?.cenas.join('\n') ?? salva.cenas ?? '';
  c.quadros = QUANTIDADES.includes(Number(c.quadros)) ? Number(c.quadros) : p.quadros;
  if (!FORMATOS[c.formato]) c.formato = p.formato;
  return c;
}

/** Escolher um roteiro pronto troca as cenas; "Personalizado" mantém o texto que já estava. */
export function comRoteiro(c, nome) {
  return { ...c, roteiro: nome, cenas: ROTEIROS[nome]?.cenas.join('\n') ?? c.cenas };
}

/** Editar as cenas à mão vira o roteiro "Personalizado". */
export const comCenas = (c, cenas) => ({ ...c, roteiro: PERSONALIZADO, cenas });

/** Parte da montagem no manifesto. As cenas só vão quando não são de um roteiro pronto. */
export function parteDaMontagem(c) {
  const parte = { descricao: c.descricao, roteiro: c.roteiro, quadros: c.quadros, ajustes: { ...c.ajustes } };
  if (!ROTEIROS[c.roteiro]) parte.cenas = c.cenas;
  return parte;
}

/** Parte do palco no manifesto. */
export const parteDoPalco = (c) => ({ formato: c.formato, ritmo: { ...c.ritmo } });

// Suavidade infinita: a semente nunca muda de bloco, então o ruído é o mesmo em todos os quadros
const RUIDO_FIXO = Infinity;

/**
 * O que a sessão de geração precisa. Lança erro se não houver nenhuma cena ("Só a imagem" vai
 * com o prompt vazio).
 * Com um vídeo como base, o total vem do vídeo e o ruído fica fixo, sem continuidade nem
 * naturalidade: num vídeo elas viram rastro e tremido. A configuração salva não muda.
 */
export function pedidoDeGeracao(c, video = null) {
  const soAImagem = c.roteiro === SO_A_IMAGEM;
  const prompts = soAImagem ? [''] : montarPrompts(c.cenas, c.descricao);
  if (!prompts.length) throw new Error('Escreva pelo menos uma cena em Editar cenas.');
  const nomes = soAImagem ? ['só a imagem'] : ROTEIROS[c.roteiro]?.nomes;
  if (!video) return { prompts, nomes, total: c.quadros, ajustes: { ...c.ajustes } };
  return {
    prompts, nomes, total: video.total,
    ajustes: { ...c.ajustes, suavidade: RUIDO_FIXO, continuidade: 0, naturalidade: 0 },
  };
}
