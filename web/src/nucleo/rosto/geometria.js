// Geometria dos pontos do rosto (478 pontos do MediaPipe Face Landmarker). Funções puras.

export const media = (pts, ids) => ({
  x: ids.reduce((s, i) => s + pts[i].x, 0) / ids.length,
  y: ids.reduce((s, i) => s + pts[i].y, 0) / ids.length,
});

// Centro dos olhos: íris (468/473) com os cantos como apoio
export const olhoEsq = (pts) => media(pts, [468, 33, 133]);
export const olhoDir = (pts) => media(pts, [473, 362, 263]);

export function centroDosOlhos(pts) {
  const a = olhoEsq(pts), b = olhoDir(pts);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function distanciaEntreOlhos(pts) {
  const a = olhoEsq(pts), b = olhoDir(pts);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Semelhança (escala + rotação + translação) que leva os olhos de `pts` aos olhos de `ref`.
 * Devolve [a, b, c, d, e, f] no formato de CanvasRenderingContext2D.setTransform.
 */
export function transformacaoDeAlinhamento(pts, ref) {
  const p1 = olhoEsq(pts), p2 = olhoDir(pts);
  const q1 = olhoEsq(ref), q2 = olhoDir(ref);
  const s = Math.hypot(q2.x - q1.x, q2.y - q1.y) / Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const ang = Math.atan2(q2.y - q1.y, q2.x - q1.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const a = s * Math.cos(ang), b = s * Math.sin(ang);
  const e = q1.x - (a * p1.x - b * p1.y);
  const f = q1.y - (b * p1.x + a * p1.y);
  return [a, b, -b, a, e, f];
}

/** Contorno do rosto em ordem, a partir das conexões {start, end} do MediaPipe. */
export function ordenarContorno(conexoes) {
  const prox = new Map(conexoes.map((c) => [c.start, c.end]));
  const ordem = [];
  let atual = conexoes[0].start;
  while (!ordem.includes(atual) && prox.has(atual)) {
    ordem.push(atual);
    atual = prox.get(atual);
  }
  return ordem;
}

/** Quadrado em volta do rosto numa foto de largura×altura, com folga, sem sair da foto. */
export function quadradoEmVoltaDoRosto(pts, largura, altura, folga = 2.1) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const lado = Math.min(Math.max(x1 - x0, y1 - y0) * folga, largura, altura);
  const cx = Math.min(Math.max((x0 + x1) / 2, lado / 2), largura - lado / 2);
  const cy = Math.min(Math.max((y0 + y1) / 2 - (y1 - y0) * 0.05, lado / 2), altura - lado / 2);
  return { x: cx - lado / 2, y: cy - lado / 2, lado };
}

/** Quadrado de um vídeo: em volta do rosto do 1º quadro, ou no centro se não houver rosto. */
export function quadradoDoVideo(pts, largura, altura) {
  if (pts) return quadradoEmVoltaDoRosto(pts, largura, altura);
  const lado = Math.min(largura, altura);
  return { x: (largura - lado) / 2, y: (altura - lado) / 2, lado };
}
