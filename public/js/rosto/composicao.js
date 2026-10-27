// Composição de cada quadro: trava o rosto na posição da foto e cola o rosto original de volta.
import { transformacaoDeAlinhamento } from './geometria.js';

/** Alinha o quadro gerado para os olhos ficarem onde estão na foto base. */
export function alinhar(img, pts, base) {
  const out = new OffscreenCanvas(base.lado, base.lado);
  const ctx = out.getContext('2d');
  ctx.drawImage(img, 0, 0); // fundo para as bordas que sobrarem depois do alinhamento
  if (!pts) return out;
  ctx.setTransform(...transformacaoDeAlinhamento(pts, base.pontos));
  ctx.drawImage(img, 0, 0);
  return out;
}

/** Cola o rosto original por cima, ajustando a cor dele para a luz do quadro gerado. */
export function colarRosto(quadro, base, preservar, harmonia) {
  if (preservar <= 0) return quadro;
  const { lado, mascara: m } = base;
  const g = quadro.getContext('2d').getImageData(0, 0, lado, lado);
  const o = base.canvas.getContext('2d').getImageData(0, 0, lado, lado);
  const eo = estatisticaDeCor(o.data, m), eg = estatisticaDeCor(g.data, m);

  const d = g.data;
  for (let i = 0; i < d.length; i += 4) {
    const alfa = m[i / 4] * preservar;
    if (alfa <= 0) continue;
    for (let c = 0; c < 3; c++) {
      const orig = o.data[i + c];
      const ajustada = ((orig - eo.med[c]) / eo.dp[c]) * eg.dp[c] + eg.med[c];
      const rosto = orig + (ajustada - orig) * harmonia;
      d[i + c] = d[i + c] * (1 - alfa) + rosto * alfa;
    }
  }
  quadro.getContext('2d').putImageData(g, 0, 0);
  return quadro;
}

/** Média e desvio de cada canal RGB nos pixels onde a máscara passa de 0,5. */
export function estatisticaDeCor(rgba, mascara) {
  const soma = [0, 0, 0], q = [0, 0, 0];
  let w = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (mascara[i / 4] < 0.5) continue;
    w++;
    for (let c = 0; c < 3; c++) {
      soma[c] += rgba[i + c];
      q[c] += rgba[i + c] ** 2;
    }
  }
  const med = soma.map((v) => v / w);
  return { med, dp: q.map((v, c) => Math.sqrt(Math.max(v / w - med[c] ** 2, 1))) };
}
