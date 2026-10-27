// Gerador de mentira com o mesmo contrato dos geradores reais (src/ia/modelos.js),
// para testar serviço e API sem carregar o modelo de 5 GB.
import { ErroBaseAusente } from '../../src/ia/erros.js';

export const PNG_FALSO = Buffer.from('89504e470d0a1a0a', 'hex');

export class GeradorFalso {
  static nome = 'falso';

  constructor({ falharAoCarregar = false } = {}) {
    this.falharAoCarregar = falharAoCarregar;
    this.lado = 512;
    this.bases = new Set();
    this.basesDefinidas = 0;
    this.pedidos = [];
  }

  async carregar() {
    if (this.falharAoCarregar) throw new Error('arquivos ausentes');
  }

  async definirBase(id) {
    this.basesDefinidas++;
    this.bases.add(id);
  }

  temBase(id) {
    return this.bases.has(id);
  }

  async gerar(parametros) {
    if (!this.bases.has(parametros.baseId)) throw new ErroBaseAusente();
    this.pedidos.push(parametros);
    return PNG_FALSO;
  }
}
