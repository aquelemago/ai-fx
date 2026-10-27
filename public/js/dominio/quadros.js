// Coleção de quadros gerados. Avisa quem estiver ouvindo quando algo muda
// (evento "mudou"), assim a tira, o player e os botões não precisam se conhecer.
export class ColecaoDeQuadros extends EventTarget {
  constructor() {
    super();
    this.lista = [];
  }

  /** quadro: { canvas, indice, cena } */
  adicionar(quadro) {
    const q = { ...quadro, fora: false };
    this.lista.push(q);
    this.avisar('adicionado', q);
    return q;
  }

  alternarFora(q) {
    q.fora = !q.fora;
    this.avisar('alterado', q);
  }

  limpar() {
    this.lista = [];
    this.avisar('limpo');
  }

  ativos() {
    return this.lista.filter((q) => !q.fora);
  }

  avisar(tipo, quadro) {
    this.dispatchEvent(new CustomEvent('mudou', { detail: { tipo, quadro } }));
  }
}
