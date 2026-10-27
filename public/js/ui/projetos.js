// Barra de projeto no topo da coluna de montagem: escolher, criar, renomear e excluir.
import { $ } from '../util/dom.js';

export class BarraDeProjetos {
  /** aoAbrir(id), aoNovo(), aoRenomear(nome), aoExcluir() */
  constructor({ aoAbrir, aoNovo, aoRenomear, aoExcluir }) {
    this.nomeAtual = '';
    $('projeto').addEventListener('change', (e) => aoAbrir(e.target.value));
    $('novoProjeto').addEventListener('click', aoNovo);
    $('nomeProjeto').addEventListener('change', (e) => {
      const nome = e.target.value.trim();
      if (nome && nome !== this.nomeAtual) aoRenomear(nome);
      else e.target.value = this.nomeAtual;
    });
    $('excluirProjeto').addEventListener('click', () => {
      const ok = confirm(`Excluir o projeto "${this.nomeAtual}"?\n\nA pasta do projeto, com a foto, os quadros e os vídeos, será apagada.`);
      if (ok) aoExcluir();
    });
  }

  mostrarLista(projetos, idAtual) {
    const select = $('projeto');
    select.replaceChildren(...projetos.map((p) => new Option(p.nome, p.id)));
    if (idAtual) select.value = idAtual;
  }

  mostrarAtual(manifesto) {
    this.nomeAtual = manifesto.nome;
    $('projeto').value = manifesto.id;
    $('nomeProjeto').value = manifesto.nome;
    $('pastaProjeto').textContent = `Tudo deste projeto fica em projetos/${manifesto.id}/`;
  }

  /** Trocar de projeto no meio de uma geração ou gravação deixaria o trabalho pela metade. */
  habilitar(habilitado) {
    for (const id of ['projeto', 'novoProjeto', 'nomeProjeto', 'excluirProjeto']) $(id).disabled = !habilitado;
  }
}
