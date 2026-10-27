// Ponto de entrada da página: cria as peças e liga os eventos de uma às outras.
// Nenhum outro módulo conhece todos; se precisar trocar uma peça, é aqui.
import { ClienteApi, ErroDaApi } from '../nucleo/api/cliente.js';
import { arquivoDoQuadroFinal } from '../nucleo/dominio/projeto.js';
import { ColecaoDeQuadros } from '../nucleo/dominio/quadros.js';
import { descricaoAleatoria, sementeAleatoria } from '../nucleo/dominio/rostos.js';
import { SessaoDeGeracao } from '../nucleo/geracao/sessao.js';
import { GerenteDeProjetos } from '../nucleo/projetos/gerente.js';
import { DetectorDeRosto } from '../nucleo/rosto/detector.js';
import { centroDosOlhos } from '../nucleo/rosto/geometria.js';
import { ErroDeRosto, prepararFotoBase } from '../nucleo/rosto/recorte.js';
import { PainelDeMontagem } from './ui/montagem.js';
import { Palco, ligarSaidas } from './ui/palco.js';
import { BarraDeProjetos } from './ui/projetos.js';
import { acompanharServidor } from './ui/status.js';
import { Tira } from './ui/tira.js';
import { $ } from './dom.js';
import { formatarTempo } from '../nucleo/util/tempo.js';
import { gravarCanvas } from '../nucleo/video/gravador.js';
import { Player } from '../nucleo/video/player.js';
import { Renderizador } from '../nucleo/video/renderizador.js';

const cliente = new ClienteApi();
const detector = new DetectorDeRosto();
const quadros = new ColecaoDeQuadros();
const sessao = new SessaoDeGeracao({ cliente, detector });
const gerente = new GerenteDeProjetos({ cliente });
const renderizador = new Renderizador($('player'));

let base = null; // foto base: { id, canvas, pontos, mascara, lado }
let servidorPronto = false;
let gravando = false;
let gerandoRosto = false;
let carregandoProjeto = false;

// a foto de um projeto só pode ser preparada depois que o modelo carregou
let avisarModeloPronto;
const modeloPronto = new Promise((r) => (avisarModeloPronto = r));

// ---------- peças da tela ----------
ligarSaidas({ fps: (v) => `${v} q/s`, transicao: (v) => `${Math.round(v * 100)}%` });

const palco = new Palco({
  aoTocar: () => palco.mostrarTocando(player.alternar()),
  aoMudarFormato: (formato) => renderizador.definirFormato(formato),
  aoGravar: gravarVideo,
  aoMudarConfiguracao: (cfg) => gerente.salvarConfiguracao(cfg),
});

const tira = new Tira({ quadros, aoEscolher: (q) => player.irPara(q) });

const player = new Player({
  renderizador,
  quadros,
  ritmo: () => palco.ritmo(),
  fotoBase: () => base?.canvas ?? null,
  aoMudarQuadro: (q) => tira.marcarAtual(q),
});

const montagem = new PainelDeMontagem({
  aoEscolherFoto: escolherFoto,
  aoGerarRosto: gerarRostoAleatorio,
  aoGerar: gerar,
  aoParar: () => {
    sessao.cancelar();
    montagem.avisarParando();
  },
  aoMudarConfiguracao: (cfg) => gerente.salvarConfiguracao(cfg),
});

const barra = new BarraDeProjetos({
  aoAbrir: (id) => trocarDeProjeto(() => gerente.abrir(id)),
  aoNovo: () => trocarDeProjeto(() => gerente.criar()),
  aoRenomear: renomearProjeto,
  aoExcluir: () => trocarDeProjeto(() => gerente.excluirAtual()),
});

function atualizarControles() {
  const ocupado = sessao.ativa || gravando || gerandoRosto || carregandoProjeto;
  montagem.habilitarGerar(servidorPronto && Boolean(base) && Boolean(gerente.atual) && !gerandoRosto && !carregandoProjeto);
  montagem.habilitarRosto(servidorPronto && Boolean(gerente.atual) && !ocupado);
  palco.habilitar(quadros.ativos().length, gravando);
  barra.habilitar(!ocupado);
}

quadros.addEventListener('mudou', () => {
  if (!carregandoProjeto) gerente.salvarQuadros(quadros.lista);
  atualizarControles();
});
gerente.addEventListener('lista', ({ detail }) => barra.mostrarLista(detail.projetos, gerente.atual?.id));
gerente.addEventListener('erro', ({ detail }) => montagem.infoGeracao(detail.mensagem));

// ---------- projetos ----------
let aberturaAtual = 0; // descarta o carregamento de um projeto se outro foi aberto no meio

async function trocarDeProjeto(acao) {
  carregandoProjeto = true;
  atualizarControles();
  try {
    await mostrarProjeto(await acao());
  } catch (e) {
    montagem.infoGeracao(`Não consegui abrir o projeto: ${e.message}`);
  } finally {
    carregandoProjeto = false;
    atualizarControles();
  }
}

async function mostrarProjeto(manifesto) {
  const minhaAbertura = ++aberturaAtual;
  const valendo = () => minhaAbertura === aberturaAtual;

  barra.mostrarLista(gerente.projetos, manifesto.id);
  barra.mostrarAtual(manifesto);
  quadros.limpar();
  base = null;
  montagem.limparFoto();
  montagem.infoGeracao('');
  montagem.progresso(0);
  palco.esconderDownload();
  palco.mostrarVazio();
  montagem.aplicarConfiguracao(manifesto.configuracao);
  palco.aplicarConfiguracao(manifesto.configuracao);

  if (manifesto.temFoto) {
    montagem.infoFoto('Abrindo a foto do projeto…');
    await modeloPronto;
    const resp = await fetch(cliente.urlDoArquivo(manifesto.id, 'foto.png'));
    if (!valendo()) return;
    if (resp.ok) {
      await usarFoto(new File([await resp.blob()], 'foto.png', { type: 'image/png' }), { salvarNoProjeto: false });
      if (!valendo()) return;
      montagem.mostrarFotoPronta('Foto do projeto.');
    } else {
      montagem.infoFoto('A foto deste projeto sumiu da pasta. Escolha outra.');
    }
  }

  const lista = [...manifesto.quadros].sort((a, b) => a.indice - b.indice);
  for (const q of lista) {
    const canvas = await carregarQuadro(manifesto.id, q.indice);
    if (!valendo()) return;
    if (!canvas) continue;
    const novo = quadros.adicionar({ canvas, indice: q.indice, cena: q.cena });
    if (q.fora) quadros.alternarFora(novo);
  }
  if (quadros.lista.length) tira.contagem(quadros.lista.length, quadros.lista.length);
}

async function carregarQuadro(projetoId, indice) {
  const resp = await fetch(cliente.urlDoArquivo(projetoId, arquivoDoQuadroFinal(indice)));
  if (!resp.ok) return null;
  const img = await createImageBitmap(await resp.blob());
  const canvas = new OffscreenCanvas(img.width, img.height);
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}

async function renomearProjeto(nome) {
  try {
    barra.mostrarAtual(await gerente.renomear(nome));
  } catch (e) {
    barra.mostrarAtual(gerente.atual);
    montagem.infoGeracao(`Não consegui renomear: ${e.message}`);
  }
}

// ---------- foto ----------
// Recorta o rosto, prepara no servidor e passa a usar a foto como base. Lança erro se não der.
async function usarFoto(arquivo, { salvarNoProjeto = true } = {}) {
  const foto = await prepararFotoBase(arquivo, detector, $('base'));
  const png = await new Promise((r) => $('base').toBlob(r, 'image/png'));
  const id = salvarNoProjeto
    ? (await cliente.definirFotoDoProjeto(gerente.atual.id, png)).baseId
    : await cliente.enviarBase(png);
  base = { ...foto, id };
  renderizador.rostoX = centroDosOlhos(base.pontos).x;
  palco.esconderVazio();
}

async function escolherFoto(arquivo) {
  montagem.infoFoto('Procurando o rosto…');
  try {
    await usarFoto(arquivo);
    montagem.mostrarFotoPronta(`Rosto encontrado em ${arquivo.name}.`);
  } catch (e) {
    montagem.infoFoto(e instanceof ErroDeRosto ? e.message
      : e instanceof ErroDaApi ? `O servidor recusou a foto: ${e.message}`
        : `Não consegui abrir essa foto: ${e.message}`);
  }
  atualizarControles();
}

// A IA cria uma pessoa nova; se o detector não achar um rosto bom, tenta outra semente
const TENTATIVAS_DE_ROSTO = 3;
async function gerarRostoAleatorio() {
  gerandoRosto = true;
  atualizarControles();
  try {
    for (let tentativa = 1; tentativa <= TENTATIVAS_DE_ROSTO; tentativa++) {
      const descricao = descricaoAleatoria();
      const semente = sementeAleatoria();
      montagem.infoFoto(tentativa === 1 ? 'A IA está criando um rosto…' : 'Esse não ficou bom, tentando outro…');
      const imagem = await cliente.gerarRosto({ descricao, semente });
      try {
        await usarFoto(new File([imagem], `rosto-ia-${semente}.png`, { type: 'image/png' }));
      } catch (e) {
        if (e instanceof ErroDeRosto && tentativa < TENTATIVAS_DE_ROSTO) continue;
        throw e;
      }
      montagem.definirDescricao(descricao);
      montagem.mostrarFotoPronta(`Rosto criado pela IA: ${descricao}.`);
      return;
    }
  } catch (e) {
    montagem.infoFoto(`Não consegui criar um rosto: ${e.message}`);
  } finally {
    gerandoRosto = false;
    atualizarControles();
  }
}

// ---------- geração ----------
function gerar() {
  let pedido;
  try {
    pedido = montagem.lerPedido();
  } catch (e) {
    montagem.infoGeracao(e.message);
    return;
  }
  quadros.limpar();
  palco.esconderDownload();
  montagem.definirGerando(true);
  montagem.infoGeracao('');
  sessao.executar({ projetoId: gerente.atual.id, base, ...pedido }, montagem.segPorQuadro);
  atualizarControles();
}

sessao.addEventListener('proximo', ({ detail: d }) => tira.mostrarProximo(d.indice, d.cena, d.segundos));
sessao.addEventListener('quadro', ({ detail: d }) => quadros.adicionar(d));
sessao.addEventListener('aviso', ({ detail: d }) => montagem.infoGeracao(d.mensagem));
sessao.addEventListener('progresso', ({ detail: { feitos, total, segPorQuadro } }) => {
  montagem.progresso(feitos / total);
  tira.contagem(feitos, total);
  montagem.infoGeracao(feitos < total ? `Faltam cerca de ${formatarTempo(segPorQuadro * (total - feitos))}.` : '');
});
sessao.addEventListener('fim', ({ detail: d }) => {
  tira.removerProximo();
  montagem.definirGerando(false);
  if (d.feitos > 0) montagem.atualizarEstimativa(d.segPorQuadro);
  if (d.motivo === 'completo') {
    montagem.infoGeracao(`${d.total} quadros prontos em ${formatarTempo(d.segundos)}. Risque os que não gostar.`);
  } else if (d.motivo === 'cancelado') {
    montagem.infoGeracao(`Parado com ${d.feitos} de ${d.total} quadros.`);
  } else {
    montagem.infoGeracao(d.erro?.status === 0 ? d.erro.message
      : `O quadro ${d.feitos + 1} falhou: ${d.erro?.message}. Os anteriores continuam na tira.`);
  }
  atualizarControles();
});

// ---------- vídeo ----------
async function gravarVideo() {
  gravando = true;
  player.suspenso = true;
  palco.iniciarGravacao();
  atualizarControles();
  const resultado = await gravarCanvas($('player'), player.duracao(), (t) => {
    player.tempo = t;
    player.desenhar(t);
  }, (f) => palco.mostrarGravacao(f));
  player.suspenso = false;
  gravando = false;
  palco.terminarGravacao(resultado);
  atualizarControles();
  try {
    const arquivo = await cliente.salvarVideo(gerente.atual.id, resultado.blob);
    montagem.infoGeracao(`Vídeo salvo em projetos/${gerente.atual.id}/videos/${arquivo}.`);
  } catch (e) {
    montagem.infoGeracao(`O vídeo não foi salvo no projeto (${e.message}), mas dá para baixar.`);
  }
}

// ---------- servidor, detector e primeiro projeto ----------
acompanharServidor(cliente, (pronto) => {
  servidorPronto = pronto;
  if (pronto) avisarModeloPronto();
  atualizarControles();
});
detector.pronto.catch((e) => montagem.infoFoto(`O detector de rosto não carregou: ${e.message}`));
addEventListener('pagehide', () => gerente.salvarAgora());
trocarDeProjeto(() => gerente.iniciar());
