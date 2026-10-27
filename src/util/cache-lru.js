// Cache com limite de itens: ao estourar, descarta o usado há mais tempo.
export class CacheLru {
  constructor(limite) {
    this.limite = limite;
    this.mapa = new Map();
  }

  get(chave) {
    if (!this.mapa.has(chave)) return undefined;
    const valor = this.mapa.get(chave);
    this.mapa.delete(chave);
    this.mapa.set(chave, valor);
    return valor;
  }

  has(chave) {
    return this.mapa.has(chave);
  }

  set(chave, valor) {
    this.mapa.delete(chave);
    this.mapa.set(chave, valor);
    if (this.mapa.size > this.limite) this.mapa.delete(this.mapa.keys().next().value);
    return this;
  }

  get size() {
    return this.mapa.size;
  }
}
