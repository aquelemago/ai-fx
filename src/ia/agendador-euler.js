// Agendador Euler discreto do SD 2.x / SD-Turbo (beta "scaled_linear", 1000 passos de treino).
// Funções puras: não dependem de modelo nem de onnxruntime.

const PASSOS_TREINO = 1000;

// alphas_cumprod: quanto do sinal original sobra em cada passo de ruído
const ALPHAS = (() => {
  const a = new Float64Array(PASSOS_TREINO);
  const ini = Math.sqrt(0.00085), fim = Math.sqrt(0.012);
  let prod = 1;
  for (let i = 0; i < PASSOS_TREINO; i++) {
    const beta = (ini + (fim - ini) * (i / (PASSOS_TREINO - 1))) ** 2;
    prod *= 1 - beta;
    a[i] = prod;
  }
  return a;
})();

export const sigmaDe = (t) => Math.sqrt((1 - ALPHAS[t]) / ALPHAS[t]);

/**
 * Passos "trailing" do img2img a partir de t = 1000 * forca.
 * Devolve os timesteps e os sigmas (com um 0 no fim, o destino do último passo).
 */
export function planejarPassos(forca, passos) {
  const p = Math.max(1, Math.min(4, Math.round(passos)));
  const f = Math.max(0.05, Math.min(1, forca));
  const timesteps = [];
  for (let j = 0; j < p; j++) timesteps.push(Math.max(0, Math.round(PASSOS_TREINO * f * (1 - j / p)) - 1));
  return { timesteps, sigmas: [...timesteps.map(sigmaDe), 0] };
}
