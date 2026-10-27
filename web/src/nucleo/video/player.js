// Reprodução contínua da prévia. Lê os quadros ativos da coleção e o ritmo a cada desenho,
// então mudanças nos controles ou na tira aparecem na hora.
export class Player {
  /**
   * renderizador: Renderizador
   * quadros: ColecaoDeQuadros
   * ritmo: () => ({ fps, transicao })
   * fotoBase: () => canvas | null   (mostrada enquanto não há quadros)
   * aoMudarQuadro: (quadro) => void
   */
  constructor({ renderizador, quadros, ritmo, fotoBase, aoMudarQuadro = () => {} }) {
    Object.assign(this, { renderizador, quadros, ritmo, fotoBase, aoMudarQuadro });
    this.tempo = 0;
    this.tocando = true;
    this.suspenso = false; // durante a gravação quem desenha é o gravador
    this.atual = null;
    let ultimo = performance.now();
    const loop = (agora) => {
      const dt = (agora - ultimo) / 1000;
      ultimo = agora;
      if (!this.suspenso) {
        if (this.tocando) this.tempo += dt;
        this.desenhar(this.tempo);
      }
      this.pedido = requestAnimationFrame(loop);
    };
    this.pedido = requestAnimationFrame(loop);
  }

  /** Para o laço de desenho (quando a prévia sai da tela). */
  parar() {
    cancelAnimationFrame(this.pedido);
  }

  desenhar(t) {
    const ativos = this.quadros.ativos();
    if (!ativos.length) {
      this.renderizador.limpar();
      const base = this.fotoBase();
      if (base) this.renderizador.pintar(base);
      return;
    }
    const { fps, transicao } = this.ritmo();
    const i = this.renderizador.desenharSequencia(ativos.map((q) => q.canvas), t, fps, transicao);
    if (this.atual !== ativos[i]) {
      this.atual = ativos[i];
      this.aoMudarQuadro(this.atual);
    }
  }

  alternar() {
    this.tocando = !this.tocando;
    return this.tocando;
  }

  irPara(quadro) {
    const k = this.quadros.ativos().indexOf(quadro);
    if (k >= 0) this.tempo = k / this.ritmo().fps;
  }

  duracao() {
    return this.quadros.ativos().length / this.ritmo().fps;
  }
}
