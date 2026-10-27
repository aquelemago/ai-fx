// Etapas para produzir um quadro, como uma foto tirada em outro dia:
//
//   1. ponto de partida: a foto original, misturada com o quadro anterior (continuidade)
//   2. cena: a IA gera o quadro com força alta (luz, lugar, estação, estilo mudam)
//   3. foco: o quadro é alinhado para os olhos ficarem no mesmo ponto da foto original
//   4. guia de identidade: o rosto original é colado por cima, com a cor da cena
//   5. naturalidade: a IA repassa o quadro com força baixa e refaz o rosto na luz da cena,
//      com expressão e pele levemente diferentes, sem perder as proporções. O ruído deste passe
//      tem semente própria por quadro (sementeDoRosto), separada da suavidade da cena
//   6. foco de novo: o repasse pode mexer o rosto alguns pixels, então alinha outra vez
//
// Naturalidade 0 pula as etapas 5 e 6 (o rosto colado fica fixo, como uma imagem parada).
// Continuidade 0 parte sempre só da foto original.
import { sementeDoRosto } from '../dominio/plano.js';
import { alinhar, colarRosto, misturarImagens } from '../rosto/composicao.js';
import { criarCronometro } from './cronometro.js';

const paraPng = (canvas) => canvas.convertToBlob({ type: 'image/png' });

/** `cronometro` (opcional) recebe o tempo de cada etapa; veja cronometro.js. */
export async function produzirQuadro({
  cliente, detector, base, projetoId, anterior, parametros, ajustes, indice, cronometro = criarCronometro(),
}) {
  const { lado } = base;
  const medir = cronometro.medir;
  const alinharAoFoco = (img) => alinhar(img, detector.pontos(img, lado, lado), base);

  // 1. ponto de partida
  let baseId = base.id;
  if (anterior && ajustes.continuidade > 0) {
    const partida = misturarImagens(base.canvas, anterior, ajustes.continuidade, lado);
    medir('mistura');
    const png = await paraPng(partida);
    medir('png da partida');
    baseId = await cliente.enviarBase(png);
    medir('envio da partida');
  }

  // 2 e 3. cena e foco
  const respostaDaCena = await cliente.gerarQuadro({
    ...parametros, baseId, projetoId, quadro: indice, forca: ajustes.forca, passos: ajustes.passos,
  });
  medir('cena');
  const cena = await createImageBitmap(respostaDaCena);
  medir('leitura da cena');
  const focada = alinharAoFoco(cena);
  medir('foco');
  const guia = colarRosto(focada, base, ajustes.rosto, ajustes.harmonia); // 4
  medir('rosto');

  if (ajustes.naturalidade <= 0) return guia;

  // 5 e 6. naturalidade e foco de novo
  const pngDoGuia = await paraPng(guia);
  medir('png do guia');
  const idGuia = await cliente.enviarBase(pngDoGuia);
  medir('envio do guia');
  const semente = sementeDoRosto(ajustes.semente, indice);
  const respostaRefeita = await cliente.gerarQuadro({
    ...parametros, sementeA: semente, sementeB: semente, mixSemente: 0,
    baseId: idGuia, forca: ajustes.naturalidade, passos: ajustes.passos,
  });
  medir('naturalidade');
  const refeito = await createImageBitmap(respostaRefeita);
  medir('leitura do refeito');
  const final = alinharAoFoco(refeito);
  medir('foco de novo');
  return final;
}
