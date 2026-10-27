// Regras da aplicação em volta do gerador: estado do modelo, fila e gravação das saídas.
// Não conhece HTTP; recebe o gerador e o repositório de projetos prontos (injeção de dependência).
import crypto from 'node:crypto';
import { FilaSerial } from './fila.js';
import { imagemNeutra } from '../ia/imagem.js';

// Pede um retrato de frente, centralizado e com fundo liso: é o que a detecção e o recorte esperam
export const promptDeRosto = (descricao) =>
  `head and shoulders portrait photo of ${descricao}, front view, looking at camera, face in the center, plain background, soft studio light, sharp focus`;

export class ServicoDeGeracao {
  constructor({ gerador, projetos, log = console.log }) {
    this.gerador = gerador;
    this.projetos = projetos;
    this.log = log;
    this.fila = new FilaSerial();
    this.estado = { pronto: false, erro: null, modelo: gerador.constructor.nome };
  }

  async iniciar() {
    try {
      await this.gerador.carregar(this.log);
      this.estado.pronto = true;
    } catch (e) {
      this.estado.erro = e.message;
      throw e;
    }
  }

  status() {
    return { ...this.estado, fila: this.fila.pendentes };
  }

  // A foto é identificada pelo conteúdo: a mesma foto enviada de novo reaproveita o trabalho
  async prepararBase(buffer) {
    const id = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 12);
    if (!this.gerador.temBase(id)) await this.fila.executar(() => this.gerador.definirBase(id, buffer));
    return id;
  }

  async gerarQuadro(parametros) {
    if (!this.estado.pronto) throw new ErroModeloIndisponivel(this.estado.erro);
    const t0 = Date.now();
    const png = await this.fila.executar(() => this.gerador.gerar(parametros));
    const ms = Date.now() - t0;
    if (parametros.projetoId && parametros.quadro !== undefined) {
      await this.projetos.salvarQuadro(parametros.projetoId, 'ia', parametros.quadro, png);
    }
    this.log(`quadro ${parametros.quadro ?? '-'} gerado em ${(ms / 1000).toFixed(1)}s`);
    return { png, ms };
  }

  /** Gera um rosto novo do zero, para ser usado como foto base. */
  async gerarRosto({ descricao, semente }) {
    if (!this.estado.pronto) throw new ErroModeloIndisponivel(this.estado.erro);
    this.neutra ??= await imagemNeutra(this.gerador.lado);
    const baseId = await this.prepararBase(this.neutra);
    const t0 = Date.now();
    const png = await this.fila.executar(() => this.gerador.gerar({
      baseId, promptA: promptDeRosto(descricao), sementeA: semente, forca: 1, passos: 1,
    }));
    const ms = Date.now() - t0;
    this.log(`rosto gerado em ${(ms / 1000).toFixed(1)}s (semente ${semente})`);
    return { png, ms };
  }
}

export class ErroModeloIndisponivel extends Error {
  constructor(motivo) {
    super(motivo ?? 'modelo ainda carregando');
    this.codigo = 'MODELO_INDISPONIVEL';
  }
}
