// Ponto de entrada da página: cria as peças do núcleo e o estúdio, e liga os painéis antigos
// (montagem, palco, tira, barra de projetos) ao estado do estúdio. Cada painel que vira React
// some daqui; quando não sobrar nenhum, este arquivo sai junto.
import { ClienteApi } from '../nucleo/api/cliente.js';
import { ColecaoDeQuadros } from '../nucleo/dominio/quadros.js';
import { parteDaMontagem, parteDoPalco } from '../nucleo/dominio/configuracao.js';
import { Estudio, controles } from '../nucleo/estudio/estudio.js';
import { SessaoDeGeracao } from '../nucleo/geracao/sessao.js';
import { GerenteDeProjetos } from '../nucleo/projetos/gerente.js';
import { DetectorDeRosto } from '../nucleo/rosto/detector.js';
import { centroDosOlhos } from '../nucleo/rosto/geometria.js';
import { prepararFotoBase } from '../nucleo/rosto/recorte.js';
import { lerImagem } from '../nucleo/util/imagem.js';
import { gravarCanvas } from '../nucleo/video/gravador.js';
import { Player } from '../nucleo/video/player.js';
import { Renderizador } from '../nucleo/video/renderizador.js';
import { PainelDeMontagem } from './ui/montagem.js';
import { Palco, ligarSaidas } from './ui/palco.js';
import { BarraDeProjetos } from './ui/projetos.js';
import { Tira } from './ui/tira.js';
import { $ } from './dom.js';

const LADO_DA_FOTO = 512; // lado do modelo (src/ia/sd-turbo/gerador.js)

const cliente = new ClienteApi();
const detector = new DetectorDeRosto();
const quadros = new ColecaoDeQuadros();
const estudio = new Estudio({
  cliente,
  detector,
  quadros,
  sessao: new SessaoDeGeracao({ cliente, detector }),
  gerente: new GerenteDeProjetos({ cliente }),
  prepararFoto: (arquivo) => prepararFotoBase(arquivo, detector, new OffscreenCanvas(LADO_DA_FOTO, LADO_DA_FOTO)),
  lerImagem,
  gravar: gravarCanvas,
});

// ---------- painéis antigos: avisam o estúdio ----------
ligarSaidas({ fps: (v) => `${v} q/s`, transicao: (v) => `${Math.round(v * 100)}%` });

const renderizador = new Renderizador($('player'));
const palco = new Palco({
  aoTocar: () => estudio.tocar(),
  aoMudarFormato: (formato) => renderizador.definirFormato(formato),
  aoGravar: () => estudio.gravarVideo(),
  aoMudarConfiguracao: (cfg) => configurarPeloPainel(cfg, parteDoPalco),
});
const montagem = new PainelDeMontagem({
  aoEscolherFoto: (arquivo) => estudio.escolherFoto(arquivo),
  aoGerarRosto: () => estudio.gerarRosto(),
  aoGerar: () => estudio.gerar(),
  aoParar: () => estudio.parar(),
  aoMudarConfiguracao: (cfg) => configurarPeloPainel({ ...cfg, cenas: $('prompts').value }, parteDaMontagem),
});
const tira = new Tira({ quadros, aoEscolher: (q) => estudio.irPara(q) });
const barra = new BarraDeProjetos({
  aoAbrir: (id) => estudio.abrirProjeto(id),
  aoNovo: () => estudio.novoProjeto(),
  aoRenomear: (nome) => estudio.renomearProjeto(nome),
  aoExcluir: () => estudio.excluirProjeto(),
});
const player = new Player({
  renderizador,
  quadros,
  ritmo: () => estudio.estado.configuracao.ritmo,
  fotoBase: () => estudio.estado.foto?.canvas ?? null,
  aoMudarQuadro: (q) => estudio.marcarAtual(q),
});
estudio.ligarPrevia({ player, canvas: $('player') });

// configuração que veio dos painéis: já está na tela, não precisa ser aplicada de volta
let configuracaoNaTela = null;
function configurarPeloPainel(cfg, parte) {
  estudio.configurar({ ...estudio.estado.configuracao, ...cfg }, parte);
  configuracaoNaTela = estudio.estado.configuracao;
}

// ---------- estado do estúdio → painéis antigos ----------
let antes = {};
function mostrar() {
  const e = estudio.estado;
  const mudou = (chave) => e[chave] !== antes[chave];

  if (mudou('servidor')) {
    $('status').textContent = e.servidor.texto;
    $('status').title = e.servidor.detalhe;
    $('status').className = `estado ${e.servidor.tom}`;
  }
  if (mudou('projetos') || mudou('projeto')) barra.mostrarLista(e.projetos, e.projeto?.id);
  if (mudou('projeto') && e.projeto) barra.mostrarAtual(e.projeto);
  if (e.configuracao !== configuracaoNaTela) {
    montagem.aplicarConfiguracao(e.configuracao);
    palco.aplicarConfiguracao(e.configuracao);
    configuracaoNaTela = e.configuracao;
  }
  if (mudou('cenasAbertas') && e.cenasAbertas) $('roteiros').closest('fieldset').querySelector('details').open = true;

  if (mudou('foto')) {
    const c = $('base');
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    if (e.foto) c.getContext('2d').drawImage(e.foto.canvas, 0, 0);
    if (e.foto) renderizador.rostoX = centroDosOlhos(e.foto.pontos).x;
    $('vazio').hidden = Boolean(e.foto);
  }
  if (mudou('fotoPronta')) $('base').classList.toggle('pronta', e.fotoPronta);
  if (mudou('infoFoto')) montagem.infoFoto(e.infoFoto);
  if (mudou('infoGeracao')) montagem.infoGeracao(e.infoGeracao);
  if (mudou('segPorQuadro')) montagem.atualizarEstimativa(e.segPorQuadro);
  if (mudou('gerando')) montagem.definirGerando(e.gerando);
  if (mudou('parando') && e.parando) montagem.avisarParando();
  if (mudou('progresso')) montagem.progresso(e.progresso);

  if (mudou('proximo')) {
    if (e.proximo) tira.mostrarProximo(e.proximo.indice, e.proximo.cena, (e.proximo.fim - performance.now()) / 1000);
    else tira.removerProximo();
  }
  if (mudou('quadroAtual')) tira.marcarAtual(e.quadroAtual);
  if (mudou('contagem')) $('contagem').textContent = e.contagem;

  if (mudou('tocando')) palco.mostrarTocando(e.tocando);
  if (mudou('gravacao') && e.gravacao !== null) palco.mostrarGravacao(e.gravacao);
  if (mudou('video')) {
    if (e.video) {
      $('exportar').textContent = 'Gravar de novo';
      $('baixar').href = e.video.url;
      $('baixar').download = e.video.nome;
      $('baixar').hidden = false;
      $('baixar').focus();
    } else {
      palco.esconderDownload();
    }
  }

  const pode = controles(e);
  montagem.habilitarGerar(pode.gerar);
  montagem.habilitarRosto(pode.gerarRosto);
  $('exportar').disabled = !pode.gravar;
  $('tocar').disabled = !pode.tocar;
  barra.habilitar(pode.projetos);
  antes = e;
}

estudio.addEventListener('mudou', mostrar);
addEventListener('pagehide', () => estudio.gerente.salvarAgora());
estudio.iniciar();
