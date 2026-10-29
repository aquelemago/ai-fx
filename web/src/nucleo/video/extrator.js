// Abre um vídeo escolhido pelo usuário e entrega os quadros-fonte, um por vez, já recortados
// num quadrado do lado do modelo. O <video> fica vivo enquanto o vídeo for a base: cada quadro
// é tirado na hora em que a geração precisa dele, em vez de guardar todos antes.
import { amostragem } from '../dominio/video.js';

const esperar = (video, evento) => new Promise((ok, falhou) => {
  const aoErrar = () => falhou(new Error('o navegador não abre esse formato de vídeo'));
  video.addEventListener(evento, () => {
    video.removeEventListener('error', aoErrar);
    ok();
  }, { once: true });
  video.addEventListener('error', aoErrar, { once: true });
});

/** Devolve { canvas (1º quadro-fonte), duracao, total, cortado, quadro(i), fechar() }. */
export async function abrirVideo(arquivo, lado) {
  const url = URL.createObjectURL(arquivo);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await esperar(video, 'loadeddata');
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }

  const { instantes, total, cortado } = amostragem(video.duration);
  if (!total) {
    URL.revokeObjectURL(url);
    throw new Error('o vídeo não tem duração');
  }
  // quadrado no centro do vídeo
  const q = Math.min(video.videoWidth, video.videoHeight);
  const x = (video.videoWidth - q) / 2;
  const y = (video.videoHeight - q) / 2;

  const quadro = async (i) => {
    const posicionado = esperar(video, 'seeked');
    video.currentTime = instantes[i];
    await posicionado;
    const canvas = new OffscreenCanvas(lado, lado);
    canvas.getContext('2d').drawImage(video, x, y, q, q, 0, 0, lado, lado);
    return canvas;
  };

  return {
    canvas: await quadro(0),
    duracao: video.duration,
    total,
    cortado,
    quadro,
    fechar: () => URL.revokeObjectURL(url),
  };
}
