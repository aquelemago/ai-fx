// Máscara do rosto (0..1 por pixel) com borda bem suave.
import { distanciaEntreOlhos, media } from './geometria.js';

export function criarMascara(pts, contorno, lado) {
  const c = new OffscreenCanvas(lado, lado);
  const ctx = c.getContext('2d');
  // encolhe o contorno para a borda suave ficar dentro do rosto, longe do cabelo e das orelhas
  const centro = media(pts, contorno);
  ctx.beginPath();
  contorno.forEach((i, k) => {
    const x = centro.x + (pts[i].x - centro.x) * 0.84;
    const y = centro.y + (pts[i].y - centro.y) * 0.86;
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  const px = ctx.getImageData(0, 0, lado, lado).data;
  const alfa = new Float32Array(lado * lado);
  for (let i = 0; i < alfa.length; i++) alfa[i] = px[i * 4] / 255;

  // 3 passadas de box blur ≈ desfoque gaussiano (ctx.filter nem sempre funciona em OffscreenCanvas)
  const raio = Math.max(3, Math.round(distanciaEntreOlhos(pts) * 0.12));
  for (let k = 0; k < 3; k++) {
    desfocarLinhas(alfa, lado, 1, lado, raio);
    desfocarLinhas(alfa, lado, lado, 1, raio);
  }
  return alfa;
}

// Box blur 1D em todas as linhas (ou colunas): "passo" anda dentro da linha, "salto" troca de linha
export function desfocarLinhas(a, lado, passo, salto, r) {
  const linha = new Float32Array(lado);
  for (let l = 0; l < lado; l++) {
    const ini = l * salto;
    for (let i = 0; i < lado; i++) linha[i] = a[ini + i * passo];
    let soma = 0;
    for (let i = -r; i <= r; i++) soma += linha[Math.min(lado - 1, Math.max(0, i))];
    for (let i = 0; i < lado; i++) {
      a[ini + i * passo] = soma / (2 * r + 1);
      soma += linha[Math.min(lado - 1, i + r + 1)] - linha[Math.max(0, i - r)];
    }
  }
}
