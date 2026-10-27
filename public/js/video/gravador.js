// Grava o canvas em vídeo com MediaRecorder (MP4 no Chromium, WebM como alternativa).
const TIPOS = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'];
const FPS_DO_VIDEO = 30;

/**
 * Chama desenhar(t) a 30 quadros por segundo durante `duracao` segundos e grava o resultado.
 * captureStream(0) + requestFrame: cada quadro é enviado na hora certa,
 * mesmo com a aba em segundo plano (onde o requestAnimationFrame para).
 */
export async function gravarCanvas(canvas, duracao, desenhar, aoProgresso = () => {}) {
  const tipo = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
  const stream = canvas.captureStream(0);
  const trilha = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 8_000_000 });
  const partes = [];
  rec.ondataavailable = (e) => partes.push(e.data);

  rec.start(1000);
  const inicio = performance.now();
  await new Promise((fim) => {
    const passo = () => {
      const t = (performance.now() - inicio) / 1000;
      desenhar(Math.min(t, duracao - 1e-3));
      trilha.requestFrame();
      aoProgresso(Math.min(1, t / duracao));
      if (t >= duracao) fim();
      else setTimeout(passo, 1000 / FPS_DO_VIDEO);
    };
    passo();
  });
  rec.stop();
  await new Promise((r) => (rec.onstop = r));

  return {
    blob: new Blob(partes, { type: tipo }),
    extensao: tipo.startsWith('video/mp4') ? 'mp4' : 'webm',
  };
}
