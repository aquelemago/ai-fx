// Manifesto do projeto (projeto.json): o que descreve um projeto além dos arquivos de imagem.
// Funções puras. A configuração é da página (descrição, roteiro, ajustes...); aqui só se garante
// que ela tem a forma esperada, sem impor valores padrão.
import { ErroDeValidacao } from '../util/erros.js';

export const VERSAO_DO_MANIFESTO = 1;

const CHAVES_DE_AJUSTE = ['forca', 'passos', 'suavidade', 'rosto', 'harmonia', 'naturalidade', 'continuidade', 'semente'];
const FORMATOS = ['9:16', '1:1'];

export function novoManifesto({ id, nome, agora = new Date() }) {
  const data = agora.toISOString();
  return {
    versao: VERSAO_DO_MANIFESTO,
    id,
    nome,
    criadoEm: data,
    atualizadoEm: data,
    temFoto: false,
    configuracao: {},
    quadros: [],
    videos: [],
  };
}

/** Atualiza manifestos de versões antigas. Hoje só existe a versão 1. */
export function migrarManifesto(m) {
  if (m.versao !== VERSAO_DO_MANIFESTO) throw new Error(`versão de manifesto desconhecida: ${m.versao}`);
  return m;
}

// ---------- validação do que a página pode mudar ----------

export function validarNome(v) {
  if (typeof v !== 'string' || !v.trim()) throw new ErroDeValidacao('o projeto precisa de um nome');
  const nome = v.trim().replace(/\s+/g, ' ');
  if (nome.length > 80) throw new ErroDeValidacao('nome do projeto passa de 80 caracteres');
  return nome;
}

const ehNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const textoCurto = (v, campo, max) => {
  if (typeof v !== 'string' || v.length > max) throw new ErroDeValidacao(`${campo} precisa ser um texto de até ${max} caracteres`);
  return v;
};

export function validarConfiguracao(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErroDeValidacao('configuração inválida');
  const saida = {};
  for (const [chave, valor] of Object.entries(c)) {
    switch (chave) {
      case 'descricao': saida.descricao = textoCurto(valor, 'descricao', 300); break;
      case 'roteiro': saida.roteiro = textoCurto(valor, 'roteiro', 80); break;
      case 'cenas': saida.cenas = textoCurto(valor, 'cenas', 5000); break;
      case 'quadros':
        if (!Number.isInteger(valor) || valor < 1 || valor > 999) throw new ErroDeValidacao('quadros inválido');
        saida.quadros = valor;
        break;
      case 'formato':
        if (!FORMATOS.includes(valor)) throw new ErroDeValidacao('formato inválido');
        saida.formato = valor;
        break;
      case 'ritmo':
        if (!valor || !ehNumero(valor.fps) || !ehNumero(valor.transicao)) throw new ErroDeValidacao('ritmo inválido');
        saida.ritmo = { fps: valor.fps, transicao: valor.transicao };
        break;
      case 'ajustes':
        if (!valor || typeof valor !== 'object') throw new ErroDeValidacao('ajustes inválidos');
        saida.ajustes = {};
        for (const [k, v] of Object.entries(valor)) {
          if (!CHAVES_DE_AJUSTE.includes(k) || !ehNumero(v)) throw new ErroDeValidacao(`ajuste inválido: ${k}`);
          saida.ajustes[k] = v;
        }
        break;
      default:
        throw new ErroDeValidacao(`configuração desconhecida: ${chave}`);
    }
  }
  return saida;
}

export function validarListaDeQuadros(lista) {
  if (!Array.isArray(lista) || lista.length > 9999) throw new ErroDeValidacao('lista de quadros inválida');
  return lista.map((q) => {
    if (!q || !Number.isInteger(q.indice) || q.indice < 0 || q.indice > 9999) throw new ErroDeValidacao('quadro inválido');
    return { indice: q.indice, cena: textoCurto(q.cena ?? '', 'cena', 80), fora: q.fora === true };
  });
}

/** Mudanças que a página pode pedir num PATCH: nome, configuração e estado dos quadros. */
export function validarMudancas(corpo) {
  if (!corpo || typeof corpo !== 'object') throw new ErroDeValidacao('corpo do pedido ausente');
  const permitidas = ['nome', 'configuracao', 'quadros'];
  const extras = Object.keys(corpo).filter((k) => !permitidas.includes(k));
  if (extras.length) throw new ErroDeValidacao(`campos não permitidos: ${extras.join(', ')}`);
  const m = {};
  if (corpo.nome !== undefined) m.nome = validarNome(corpo.nome);
  if (corpo.configuracao !== undefined) m.configuracao = validarConfiguracao(corpo.configuracao);
  if (corpo.quadros !== undefined) m.quadros = validarListaDeQuadros(corpo.quadros);
  return m;
}

/** Pasta legível e única: "Praia à noite" → "praia-a-noite-3f9c1a". */
export function criarIdDoProjeto(nome, sufixo) {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'projeto';
  return `${base}-${sufixo}`;
}

export const ID_DE_PROJETO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validarIdDoProjeto(v) {
  if (typeof v !== 'string' || v.length > 60 || !ID_DE_PROJETO.test(v)) throw new ErroDeValidacao('id de projeto inválido');
  return v;
}
