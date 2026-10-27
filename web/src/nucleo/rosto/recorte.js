// Prepara a foto base: acha o rosto, recorta um quadrado em volta e monta a máscara.
import { CONTORNO_DO_ROSTO } from './detector.js';
import { quadradoEmVoltaDoRosto } from './geometria.js';
import { ErroDeRosto } from './erros.js';
import { criarMascara } from './mascara.js';

export { ErroDeRosto };

/**
 * Desenha o recorte em `canvas` (lado×lado) e devolve a foto base:
 * { canvas (cópia), pontos, mascara, lado }.
 */
export async function prepararFotoBase(arquivo, detector, canvas) {
  const lado = canvas.width;
  const img = await createImageBitmap(arquivo);
  await detector.pronto;

  const pts = detector.pontos(img, img.width, img.height);
  if (!pts) throw new ErroDeRosto('Não achei um rosto nessa foto. Tente uma de frente.');

  const q = quadradoEmVoltaDoRosto(pts, img.width, img.height);
  canvas.getContext('2d').drawImage(img, q.x, q.y, q.lado, q.lado, 0, 0, lado, lado);
  const pontos = detector.pontos(canvas, lado, lado);
  if (!pontos) throw new ErroDeRosto('O rosto ficou pequeno no recorte. Tente uma foto mais de perto.');

  const copia = new OffscreenCanvas(lado, lado);
  copia.getContext('2d').drawImage(canvas, 0, 0);
  return { canvas: copia, pontos, mascara: criarMascara(pontos, CONTORNO_DO_ROSTO, lado), lado };
}
