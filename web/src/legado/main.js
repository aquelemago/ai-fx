// Liga o último painel que ainda não virou React (a barra de projetos) ao estado do estúdio.
// Quando ele for migrado, este arquivo sai junto.
import { controles } from '../nucleo/estudio/estudio.js';
import { BarraDeProjetos } from './ui/projetos.js';

let ligado = false; // o StrictMode roda o efeito duas vezes; o painel antigo não sabe se desligar

export function ligarLegado(estudio) {
  if (ligado) return;
  ligado = true;

  const barra = new BarraDeProjetos({
    aoAbrir: (id) => estudio.abrirProjeto(id),
    aoNovo: () => estudio.novoProjeto(),
    aoRenomear: (nome) => estudio.renomearProjeto(nome),
    aoExcluir: () => estudio.excluirProjeto(),
  });

  let antes = {};
  function mostrar() {
    const e = estudio.estado;
    if (e.projetos !== antes.projetos || e.projeto !== antes.projeto) barra.mostrarLista(e.projetos, e.projeto?.id);
    if (e.projeto !== antes.projeto && e.projeto) barra.mostrarAtual(e.projeto);
    barra.habilitar(controles(e).projetos);
    antes = e;
  }

  estudio.addEventListener('mudou', mostrar);
  mostrar();
}
