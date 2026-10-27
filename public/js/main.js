// Ponto de entrada da página: cria as peças e liga os eventos de uma às outras.
// Nenhum outro módulo conhece todos; se precisar trocar uma peça, é aqui.
import { ClienteApi, ErroDaApi } from './api/cliente.js';
import { ColecaoDeQuadros } from './dominio/quadros.js';
import { SessaoDeGeracao } from './geracao/sessao.js';
import { descricaoAleatoria, sementeAleatoria } from './dominio/rostos.js';
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
let gerandoRosto = false;

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
  aoGerarRosto: gerarRostoAleatorio,
  aoGerar: gerar,
  aoParar: () => {
    sessao.cancelar();
    montagem.avisarParando();
  },
});

function atualizarControles() {
  montagem.habilitarGerar(servidorPronto && Boolean(base) && !gerandoRosto);
  montagem.habilitarRosto(servidorPronto && !sessao.ativa && !gerandoRosto);
  palco.habilitar(quadros.ativos().length, gravando);
}
quadros.addEventListener('mudou', atualizarControles);

// ---------- foto ----------
// Recorta o rosto, envia ao servidor e passa a usar a foto como base. Lança erro se não der.
async function usarFoto(arquivo) {
  const foto = await prepararFotoBase(arquivo, detector, $('base'));
  const png = await new Promise((r) => $('base').toBlob(r, 'image/png'));
  base = { ...foto, id: await cliente.enviarBase(png) };
  renderizador.rostoX = centroDosOlhos(base.pontos).x;
  palco.esconderVazio();
}

async function escolherFoto(arquivo) {
  montagem.infoFoto('Procurando o rosto…');
  try {
    await usarFoto(arquivo);
    montagem.mostrarFotoPronta(arquivo.name);
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
      montagem.mostrarFotoPronta(`rosto-ia-${semente}.png`);
      montagem.infoFoto(`Rosto criado pela IA: ${descricao}.`);
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
  sessao.executar({ base, ...pedido }, montagem.segPorQuadro);
  atualizarControles();
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
