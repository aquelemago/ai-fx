// Liga os painéis que ainda não viraram React (tira e barra de projetos) ao estado do estúdio.
// Cada painel migrado some daqui; quando não sobrar nenhum, este arquivo sai junto.
import { controles } from '../nucleo/estudio/estudio.js';
import { BarraDeProjetos } from './ui/projetos.js';
import { Tira } from './ui/tira.js';
import { $ } from './dom.js';

let ligado = false; // o StrictMode roda o efeito duas vezes; os painéis antigos não sabem se desligar

export function ligarLegado(estudio) {
  if (ligado) return;
  ligado = true;
  const { quadros } = estudio;

  // ---------- painéis antigos: avisam o estúdio ----------
  const tira = new Tira({ quadros, aoEscolher: (q) => estudio.irPara(q) });
  const barra = new BarraDeProjetos({
    aoAbrir: (id) => estudio.abrirProjeto(id),
    aoNovo: () => estudio.novoProjeto(),
    aoRenomear: (nome) => estudio.renomearProjeto(nome),
    aoExcluir: () => estudio.excluirProjeto(),
  });

  // ---------- estado do estúdio → painéis antigos ----------
  let antes = {};
  for (const q of quadros.lista) tira.adicionar(q); // quadros que chegaram antes da tira existir

  function mostrar() {
    const e = estudio.estado;
    const mudou = (chave) => e[chave] !== antes[chave];

    if (mudou('projetos') || mudou('projeto')) barra.mostrarLista(e.projetos, e.projeto?.id);
    if (mudou('projeto') && e.projeto) barra.mostrarAtual(e.projeto);
    if (mudou('proximo')) {
      if (e.proximo) tira.mostrarProximo(e.proximo.indice, e.proximo.cena, (e.proximo.fim - performance.now()) / 1000);
      else tira.removerProximo();
    }
    if (mudou('quadroAtual')) tira.marcarAtual(e.quadroAtual);
    if (mudou('contagem')) $('contagem').textContent = e.contagem;
    barra.habilitar(controles(e).projetos);
    antes = e;
  }

  estudio.addEventListener('mudou', mostrar);
  mostrar();
}
