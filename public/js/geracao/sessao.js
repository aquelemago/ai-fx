// Orquestra uma geração: pede cada quadro ao servidor, alinha, cola o rosto e avisa por eventos.
// Não mexe no DOM; a interface escuta os eventos:
//   proximo   { indice, cena, segundos }       quadro que começou a ser gerado e tempo estimado
//   quadro    { canvas, indice, cena }         quadro pronto
//   progresso { feitos, total, segPorQuadro }
//   fim       { motivo: 'completo' | 'cancelado' | 'erro', feitos, total, segundos, erro? }
import { nomeDaCena, parametrosDoQuadro } from '../dominio/plano.js';
import { alinhar, colarRosto } from '../rosto/composicao.js';

export class SessaoDeGeracao extends EventTarget {
  constructor({ cliente, detector }) {
    super();
    this.cliente = cliente;
    this.detector = detector;
    this.ativa = false;
    this.cancelada = false;
  }

  cancelar() {
    this.cancelada = true;
  }

  /**
   * pedido: { base, prompts, nomes, total, ajustes: { forca, passos, semente, suavidade, rosto, harmonia } }
   * segPorQuadro: estimativa inicial, usada na contagem regressiva do primeiro quadro
   */
  async executar({ base, prompts, nomes, total, ajustes }, segPorQuadro) {
    this.ativa = true;
    this.cancelada = false;
    const t0 = performance.now();
    let feitos = 0;
    let erro;

    try {
      for (let i = 0; i < total && !this.cancelada; i++) {
        const cena = nomeDaCena(i, total, nomes, prompts.length);
        this.emitir('proximo', { indice: i, cena, segundos: segPorQuadro });

        const blob = await this.cliente.gerarQuadro({
          baseId: base.id,
          quadro: i,
          forca: ajustes.forca,
          passos: ajustes.passos,
          ...parametrosDoQuadro(i, total, prompts, ajustes.semente, ajustes.suavidade),
        });
        const img = await createImageBitmap(blob);
        const alinhado = alinhar(img, this.detector.pontos(img, base.lado, base.lado), base);
        const canvas = colarRosto(alinhado, base, ajustes.rosto, ajustes.harmonia);

        feitos = i + 1;
        segPorQuadro = (performance.now() - t0) / 1000 / feitos;
        this.emitir('quadro', { canvas, indice: i, cena });
        this.emitir('progresso', { feitos, total, segPorQuadro });
        canvas.convertToBlob({ type: 'image/png' }).then((png) => this.cliente.salvarQuadro(base.id, i, png));
      }
    } catch (e) {
      erro = e;
    }

    this.ativa = false;
    const motivo = erro ? 'erro' : feitos === total ? 'completo' : 'cancelado';
    this.emitir('fim', { motivo, feitos, total, segundos: (performance.now() - t0) / 1000, segPorQuadro, erro });
  }

  emitir(tipo, detail) {
    this.dispatchEvent(new CustomEvent(tipo, { detail }));
  }
}
