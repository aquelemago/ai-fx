// Detector de rosto (MediaPipe Face Landmarker, rodando local no navegador).
import { FaceLandmarker, FilesetResolver } from '/mediapipe/vision_bundle.mjs';
import { ordenarContorno } from './geometria.js';

export const CONTORNO_DO_ROSTO = ordenarContorno(FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);

export class DetectorDeRosto {
  constructor() {
    this.pronto = (async () => {
      const arquivos = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      this.landmarker = await FaceLandmarker.createFromOptions(arquivos, {
        baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    })();
  }

  /** Pontos do rosto em pixels da imagem, ou null se não houver rosto. */
  pontos(imagem, largura, altura) {
    const lm = this.landmarker.detect(imagem).faceLandmarks?.[0];
    return lm ? lm.map((p) => ({ x: p.x * largura, y: p.y * altura })) : null;
  }
}
