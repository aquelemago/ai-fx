// Regras da aplicação em volta do gerador: estado do modelo, fila e gravação das saídas.
// Não conhece HTTP; recebe o gerador e o armazenamento prontos (injeção de dependência).
import crypto from 'node:crypto';
import { FilaSerial } from './fila.js';

export class ServicoDeGeracao {
  constructor({ gerador, armazenamento, log = console.log }) {
    this.gerador = gerador;
    this.armazenamento = armazenamento;
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
    if (parametros.quadro !== undefined) {
      await this.armazenamento.salvar(parametros.baseId, 'ia', parametros.quadro, png);
    }
    this.log(`quadro ${parametros.quadro ?? '-'} gerado em ${(ms / 1000).toFixed(1)}s`);
    return { png, ms };
  }

  salvarFinal(baseId, quadro, png) {
    return this.armazenamento.salvar(baseId, 'final', quadro, png);
  }
}

export class ErroModeloIndisponivel extends Error {
  constructor(motivo) {
    super(motivo ?? 'modelo ainda carregando');
    this.codigo = 'MODELO_INDISPONIVEL';
  }
}
