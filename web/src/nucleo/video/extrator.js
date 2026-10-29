// Abre um vídeo escolhido pelo usuário e entrega os quadros-fonte, um por vez, já recortados
// num quadrado do lado do modelo (fixo, em volta do rosto do 1º quadro, ou no centro).
// Cada quadro-fonte tem o formato da foto base ({ canvas, pontos, mascara, lado }), com o rosto
// achado no próprio recorte; sem rosto, pontos e máscara ficam null. O <video> fica vivo enquanto
// o vídeo for a base: cada quadro é tirado na hora em que a geração precisa dele, em vez de
// guardar todos antes.
import { amostragem } from '../dominio/video.js';
import { CONTORNO_DO_ROSTO } from '../rosto/detector.js';
import { quadradoDoVideo } from '../rosto/geometria.js';
import { criarMascara } from '../rosto/mascara.js';

const esperar = (video, evento) => new Promise((ok, falhou) => {
  const aoErrar = () => falhou(new Error('o navegador não abre esse formato de vídeo'));
  video.addEventListener(evento, () => {
    video.removeEventListener('error', aoErrar);
    ok();
  }, { once: true });
  video.addEventListener('error', aoErrar, { once: true });
});

/** Devolve o 1º quadro-fonte com { duracao, total, cortado, quadro(i), fechar() }. */
export async function abrirVideo(arquivo, lado, detector) {
  const url = URL.createObjectURL(arquivo);
  try {
    return await abrir(url, lado, detector);
  } catch (e) {
    URL.revokeObjectURL(url); // qualquer falha ao abrir solta o arquivo
    throw e;
  }
}

async function abrir(url, lado, detector) {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = url;
  await Promise.all([esperar(video, 'loadeddata'), detector.pronto]);

  const { instantes, total, cortado } = amostragem(video.duration);
  if (!total) throw new Error('o vídeo não tem duração');
  const irPara = async (instante) => {
    const posicionado = esperar(video, 'seeked');
    video.currentTime = instante;
    await posicionado;
  };

  // o quadrado sai do rosto do 1º quadro, achado no vídeo inteiro
  const { videoWidth: largura, videoHeight: altura } = video;
  await irPara(instantes[0]);
  const inteiro = new OffscreenCanvas(largura, altura);
  inteiro.getContext('2d').drawImage(video, 0, 0);
  const { x, y, lado: q } = quadradoDoVideo(detector.pontos(inteiro, largura, altura), largura, altura);

  const quadro = async (i) => {
    await irPara(instantes[i]);
    const canvas = new OffscreenCanvas(lado, lado);
    canvas.getContext('2d').drawImage(video, x, y, q, q, 0, 0, lado, lado);
    const pontos = detector.pontos(canvas, lado, lado);
    const mascara = pontos && criarMascara(pontos, CONTORNO_DO_ROSTO, lado);
    return { canvas, pontos, mascara, lado };
  };

  return {
    ...await quadro(0),
    duracao: video.duration,
    total,
    cortado,
    quadro,
    fechar: () => URL.revokeObjectURL(url),
  };
}
