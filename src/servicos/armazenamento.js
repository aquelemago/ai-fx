// Grava os quadros em disco: saidas/<id-da-foto>/<tipo>_<NNNN>.png
// tipo "ia" = saída crua do modelo; "final" = alinhado e com o rosto colado (vem do navegador).
import fs from 'node:fs/promises';
import path from 'node:path';

export const TIPOS_DE_QUADRO = ['ia', 'final'];
const ID_VALIDO = /^[0-9a-f]{12}$/;

export class ArmazenamentoDeQuadros {
  constructor(dirSaidas) {
    this.dirSaidas = dirSaidas;
  }

  caminho(baseId, tipo, quadro) {
    if (!ID_VALIDO.test(baseId)) throw new Error('id de foto inválido');
    if (!TIPOS_DE_QUADRO.includes(tipo)) throw new Error('tipo de quadro inválido');
    if (!Number.isInteger(quadro) || quadro < 0) throw new Error('número de quadro inválido');
    return path.join(this.dirSaidas, baseId, `${tipo}_${String(quadro).padStart(4, '0')}.png`);
  }

  async salvar(baseId, tipo, quadro, png) {
    const arquivo = this.caminho(baseId, tipo, quadro);
    await fs.mkdir(path.dirname(arquivo), { recursive: true });
    await fs.writeFile(arquivo, png);
    return arquivo;
  }
}
