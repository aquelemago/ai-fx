// Liga os painéis que ainda não viraram React (palco, tira, barra de projetos) ao estado do
// estúdio. Cada painel migrado some daqui; quando não sobrar nenhum, este arquivo sai junto.
import { parteDoPalco } from '../nucleo/dominio/configuracao.js';
import { controles } from '../nucleo/estudio/estudio.js';
import { centroDosOlhos } from '../nucleo/rosto/geometria.js';
import { Player } from '../nucleo/video/player.js';
import { Renderizador } from '../nucleo/video/renderizador.js';
import { Palco, ligarSaidas } from './ui/palco.js';
import { BarraDeProjetos } from './ui/projetos.js';
import { Tira } from './ui/tira.js';
import { $ } from './dom.js';

let ligado = false; // o StrictMode roda o efeito duas vezes; os painéis antigos não sabem se desligar

export function ligarLegado(estudio) {
  if (ligado) return;
  ligado = true;
  const { quadros } = estudio;

  let palcoNaTela = null; // formato e ritmo que vieram do próprio palco não precisam voltar para ele
  let antes = {};

  // ---------- painéis antigos: avisam o estúdio ----------
  ligarSaidas({ fps: (v) => `${v} q/s`, transicao: (v) => `${Math.round(v * 100)}%` });

  const renderizador = new Renderizador($('player'));
  const palco = new Palco({
    aoTocar: () => estudio.tocar(),
    aoMudarFormato: (formato) => renderizador.definirFormato(formato),
    aoGravar: () => estudio.gravarVideo(),
    aoMudarConfiguracao: (cfg) => {
      estudio.configurar({ ...estudio.estado.configuracao, ...cfg }, parteDoPalco);
      palcoNaTela = estudio.estado.configuracao;
    },
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

  // ---------- estado do estúdio → painéis antigos ----------
  for (const q of quadros.lista) tira.adicionar(q); // quadros que chegaram antes da tira existir

  function mostrar() {
    const e = estudio.estado;
    const mudou = (chave) => e[chave] !== antes[chave];
    const c = e.configuracao;

    if (mudou('projetos') || mudou('projeto')) barra.mostrarLista(e.projetos, e.projeto?.id);
    if (mudou('projeto') && e.projeto) barra.mostrarAtual(e.projeto);
    if (!palcoNaTela || c.formato !== palcoNaTela.formato || c.ritmo !== palcoNaTela.ritmo) {
      palco.aplicarConfiguracao(c);
      palcoNaTela = c;
    }
    if (mudou('foto')) {
      if (e.foto) renderizador.rostoX = centroDosOlhos(e.foto.pontos).x;
      $('vazio').hidden = Boolean(e.foto);
    }
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
    $('exportar').disabled = !pode.gravar;
    $('tocar').disabled = !pode.tocar;
    barra.habilitar(pode.projetos);
    antes = e;
  }

  estudio.addEventListener('mudou', mostrar);
  mostrar();
}
