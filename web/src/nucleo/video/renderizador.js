// Desenha quadros no canvas do vídeo, no formato escolhido, com crossfade entre eles.
import { FORMATOS, recorteNoFormato } from '../dominio/formatos.js';

export class Renderizador {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rostoX = undefined; // x do rosto no quadro, para centralizar o recorte vertical
  }

  definirFormato(formato) {
    const { largura, altura } = FORMATOS[formato];
    this.formato = formato;
    this.canvas.width = largura;
    this.canvas.height = altura;
  }

  pintar(img, alfa = 1) {
    const { x, y, lado } = recorteNoFormato(this.formato, img.width, this.rostoX);
    this.ctx.globalAlpha = alfa;
    this.ctx.drawImage(img, x, y, lado, lado);
    this.ctx.globalAlpha = 1;
  }

  limpar() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Desenha o instante t (segundos) de uma sequência de quadros.
   * fps: quadros por segundo; transicao: fração de cada quadro gasta no crossfade (0..1).
   * Devolve o índice do quadro principal no instante.
   */
  desenharSequencia(lista, t, fps, transicao) {
    const n = lista.length;
    const pos = t * fps;
    const i = Math.floor(pos) % n;
    const frac = pos - Math.floor(pos);
    this.pintar(lista[i]);
    if (transicao > 0 && n > 1 && frac > 1 - transicao) {
      const a = (frac - (1 - transicao)) / transicao;
      this.pintar(lista[(i + 1) % n], a * a * (3 - 2 * a)); // crossfade suave no início e no fim
    }
    return i;
  }
}
