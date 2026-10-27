// Etapas para produzir um quadro, como uma foto tirada em outro dia:
//
//   1. ponto de partida: a foto original, misturada com o quadro anterior (continuidade)
//   2. cena: a IA gera o quadro com força alta (luz, lugar, estação, estilo mudam)
//   3. foco: o quadro é alinhado para os olhos ficarem no mesmo ponto da foto original
//   4. guia de identidade: o rosto original é colado por cima, com a cor da cena
//   5. naturalidade: a IA repassa o quadro com força baixa e refaz o rosto na luz da cena,
//      com expressão e pele levemente diferentes, sem perder as proporções
//   6. foco de novo: o repasse pode mexer o rosto alguns pixels, então alinha outra vez
//
// Naturalidade 0 pula as etapas 5 e 6 (o rosto colado fica fixo, como uma imagem parada).
// Continuidade 0 parte sempre só da foto original.
import { alinhar, colarRosto, misturarImagens } from '../rosto/composicao.js';

const paraPng = (canvas) => canvas.convertToBlob({ type: 'image/png' });

export async function produzirQuadro({ cliente, detector, base, projetoId, anterior, parametros, ajustes, indice }) {
  const { lado } = base;
  const alinharAoFoco = (img) => alinhar(img, detector.pontos(img, lado, lado), base);

  // 1. ponto de partida
  let baseId = base.id;
  if (anterior && ajustes.continuidade > 0) {
    const partida = misturarImagens(base.canvas, anterior, ajustes.continuidade, lado);
    baseId = await cliente.enviarBase(await paraPng(partida));
  }

  // 2 e 3. cena e foco
  const cena = await createImageBitmap(await cliente.gerarQuadro({
    ...parametros, baseId, projetoId, quadro: indice, forca: ajustes.forca, passos: ajustes.passos,
  }));
  const guia = colarRosto(alinharAoFoco(cena), base, ajustes.rosto, ajustes.harmonia); // 4

  if (ajustes.naturalidade <= 0) return guia;

  // 5 e 6. naturalidade e foco de novo
  const idGuia = await cliente.enviarBase(await paraPng(guia));
  const refeito = await createImageBitmap(await cliente.gerarQuadro({
    ...parametros, baseId: idGuia, forca: ajustes.naturalidade, passos: ajustes.passos,
  }));
  return alinharAoFoco(refeito);
}
