// Ponto de entrada da página: cria as peças e liga os eventos de uma às outras.
// Nenhum outro módulo conhece todos; se precisar trocar uma peça, é aqui.
import { ClienteApi, ErroDaApi } from './api/cliente.js';
import { ColecaoDeQuadros } from './dominio/quadros.js';
import { SessaoDeGeracao } from './geracao/sessao.js';
import { DetectorDeRosto } from './rosto/detector.js';
import { centroDosOlhos } from './rosto/geometria.js';
import { ErroDeRosto, prepararFotoBase } from './rosto/recorte.js';
import { PainelDeMontagem } from './ui/montagem.js';
import { Palco, ligarSaidas } from './ui/palco.js';
import { acompanharServidor } from './ui/status.js';
import { Tira } from './ui/tira.js';
import { $ } from './util/dom.js';
import { formatarTempo } from './util/tempo.js';
import { gravarCanvas } from './video/gravador.js';
import { Player } from './video/player.js';
import { Renderizador } from './video/renderizador.js';

const cliente = new ClienteApi();
const detector = new DetectorDeRosto();
const quadros = new ColecaoDeQuadros();
const sessao = new SessaoDeGeracao({ cliente, detector });
const renderizador = new Renderizador($('player'));

let base = null; // foto base: { id, canvas, pontos, mascara, lado }
let servidorPronto = false;
let gravando = false;

// ---------- peças da tela ----------
ligarSaidas({ fps: (v) => `${v} q/s`, transicao: (v) => `${Math.round(v * 100)}%` });

const palco = new Palco({
  aoTocar: () => palco.mostrarTocando(player.alternar()),
  aoMudarFormato: (formato) => renderizador.definirFormato(formato),
  aoGravar: gravarVideo,
});
renderizador.definirFormato(palco.formato());

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
  aoGerar: gerar,
  aoParar: () => {
    sessao.cancelar();
    montagem.avisarParando();
  },
});

function atualizarControles() {
  montagem.habilitarGerar(servidorPronto && Boolean(base));
  palco.habilitar(quadros.ativos().length, gravando);
}
quadros.addEventListener('mudou', atualizarControles);

// ---------- foto ----------
async function escolherFoto(arquivo) {
  montagem.infoFoto('Procurando o rosto…');
  try {
    const foto = await prepararFotoBase(arquivo, detector, $('base'));
    const png = await new Promise((r) => $('base').toBlob(r, 'image/png'));
    base = { ...foto, id: await cliente.enviarBase(png) };
    renderizador.rostoX = centroDosOlhos(base.pontos).x;
    montagem.mostrarFotoPronta(arquivo.name);
    palco.esconderVazio();
  } catch (e) {
    montagem.infoFoto(e instanceof ErroDeRosto ? e.message
      : e instanceof ErroDaApi ? `O servidor recusou a foto: ${e.message}`
        : `Não consegui abrir essa foto: ${e.message}`);
  }
  atualizarControles();
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
  atualizarControles();
  sessao.executar({ base, ...pedido }, montagem.segPorQuadro);
}

sessao.addEventListener('proximo', ({ detail: d }) => tira.mostrarProximo(d.indice, d.cena, d.segundos));
sessao.addEventListener('quadro', ({ detail: d }) => quadros.adicionar(d));
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
}

// ---------- servidor e detector ----------
acompanharServidor(cliente, (pronto) => {
  servidorPronto = pronto;
  atualizarControles();
});
detector.pronto.catch((e) => montagem.infoFoto(`O detector de rosto não carregou: ${e.message}`));
