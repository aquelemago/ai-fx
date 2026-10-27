// Imagem ↔ espaço latente. O codificador é sempre o VAE completo (roda uma vez por foto);
// o decodificador pode ser o TAESD, que é ~15x mais rápido no processador.
import { ort } from '../onnx.js';
import { imagemParaTensor, tensorParaPng } from '../imagem.js';

const ESCALA_VAE = 0.18215;

export class Vae {
  constructor({ codificador, decodificador, decodificadorRapido, lado }) {
    this.codificador = codificador;
    this.decodificador = decodificador;
    this.decodificadorRapido = decodificadorRapido;
    this.lado = lado;
    this.lat = lado / 8;
  }

  async codificar(buffer) {
    const chw = await imagemParaTensor(buffer, this.lado);
    const s = this.codificador;
    const r = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', chw, [1, 3, this.lado, this.lado]) });
    const saida = r[s.outputNames[0]];
    // Alguns exports devolvem média+logvar (8 canais): usamos só a média
    const n = 4 * this.lat * this.lat;
    const lat = new Float32Array(n);
    for (let i = 0; i < n; i++) lat[i] = saida.data[i] * ESCALA_VAE;
    return lat;
  }

  async decodificar(latentes) {
    const lat = Float32Array.from(latentes);
    // o TAESD já recebe os latentes na escala da UNet
    if (!this.decodificadorRapido) for (let i = 0; i < lat.length; i++) lat[i] /= ESCALA_VAE;
    const s = this.decodificador;
    const r = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', lat, [1, 4, this.lat, this.lat]) });
    return tensorParaPng(r[s.outputNames[0]].data, this.lado);
  }
}
