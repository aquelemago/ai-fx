// Orquestra uma geração: pede cada quadro ao servidor, alinha, cola o rosto e avisa por eventos.
// Não mexe no DOM; a interface escuta os eventos:
//   proximo   { indice, cena, segundos }       quadro que começou a ser gerado e tempo estimado
//   quadro    { canvas, indice, cena }         quadro pronto
//   progresso { feitos, total, segPorQuadro }
//   fim       { motivo: 'completo' | 'cancelado' | 'erro', feitos, total, segundos, erro? }
//   aviso     { mensagem }                     algo falhou sem interromper a geração
import { nomeDaCena, parametrosDoQuadro } from '../dominio/plano.js';
import { produzirQuadro, produzirQuadroDoVideo } from './etapas.js';

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
   * pedido: { projetoId, base, video, prompts, nomes, total,
   *           ajustes: { forca, passos, semente, suavidade, rosto, harmonia, naturalidade, continuidade } }
   * video: vídeo escolhido como base (quadro(i) → quadro-fonte) ou null para usar a foto
   * segPorQuadro: estimativa inicial, usada na contagem regressiva do primeiro quadro
   */
  async executar({ projetoId, base, video, prompts, nomes, total, ajustes }, segPorQuadro) {
    this.ativa = true;
    this.cancelada = false;
    const t0 = performance.now();
    let feitos = 0;
    let erro;
    let anterior = null; // último quadro pronto, ponto de partida do próximo

    try {
      await this.cliente.limparQuadros(projetoId); // nada de sobras de uma geração anterior
      for (let i = 0; i < total && !this.cancelada; i++) {
        const cena = nomeDaCena(i, total, nomes, prompts.length);
        this.emitir('proximo', { indice: i, cena, segundos: segPorQuadro });

        const parametros = parametrosDoQuadro(i, total, prompts, ajustes.semente, ajustes.suavidade);
        const canvas = video
          ? await produzirQuadroDoVideo({ cliente: this.cliente, fonte: await video.quadro(i), projetoId, parametros, ajustes, indice: i })
          : await produzirQuadro({
            cliente: this.cliente,
            detector: this.detector,
            base,
            projetoId,
            anterior,
            ajustes,
            indice: i,
            parametros,
          });
        anterior = canvas;

        feitos = i + 1;
        segPorQuadro = (performance.now() - t0) / 1000 / feitos;
        this.emitir('quadro', { canvas, indice: i, cena });
        this.emitir('progresso', { feitos, total, segPorQuadro });
        canvas.convertToBlob({ type: 'image/png' })
          .then((png) => this.cliente.salvarQuadroFinal(projetoId, i, png))
          .catch((e) => this.emitir('aviso', { mensagem: `O quadro ${i + 1} não foi salvo no projeto: ${e.message}` }));
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
