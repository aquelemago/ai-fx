// Ruído gaussiano com semente (reprodutível) e interpolação esférica entre ruídos.

// Gerador pseudoaleatório com semente + Box-Muller para ruído gaussiano
export function ruido(semente, n) {
  let s = semente >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 2) {
    const u = Math.max(rand(), 1e-12), v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    out[i] = r * Math.cos(2 * Math.PI * v);
    if (i + 1 < n) out[i + 1] = r * Math.sin(2 * Math.PI * v);
  }
  return out;
}

// Interpolação esférica entre dois ruídos: mantém a "energia" do ruído na transição
export function slerp(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const cos = dot / Math.sqrt(na * nb);
  const out = new Float32Array(a.length);
  if (Math.abs(cos) > 0.9995) {
    for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
    return out;
  }
  const th = Math.acos(cos), s = Math.sin(th);
  const ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
  for (let i = 0; i < a.length; i++) out[i] = ka * a[i] + kb * b[i];
  return out;
}

// Mistura linear (usada para os embeddings de texto entre duas cenas)
export function misturar(a, b, t) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}
