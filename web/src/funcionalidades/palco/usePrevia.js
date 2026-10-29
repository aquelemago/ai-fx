// Prévia do vídeo: cria o renderizador e o player sobre o canvas e os entrega ao estúdio, que os
// usa para tocar, pular para um quadro e gravar. O desenho fica fora do ciclo do React: o player
// redesenha sozinho a cada quadro da tela, lendo o ritmo e a foto direto do estúdio.
import { useEffect, useRef } from 'react';
import { useEstado, useEstudio } from '../../app/contexto.js';
import { centroDosOlhos } from '../../nucleo/rosto/geometria.js';
import { Player } from '../../nucleo/video/player.js';
import { Renderizador } from '../../nucleo/video/renderizador.js';

export function usePrevia() {
  const estudio = useEstudio();
  const { configuracao: { formato }, foto, videoFonte } = useEstado();
  const canvas = useRef(null);
  const renderizador = useRef(null);

  useEffect(() => {
    const r = new Renderizador(canvas.current);
    r.definirFormato(estudio.estado.configuracao.formato);
    const player = new Player({
      renderizador: r,
      quadros: estudio.quadros,
      ritmo: () => estudio.estado.configuracao.ritmo,
      fotoBase: () => estudio.estado.videoFonte?.canvas ?? estudio.estado.foto?.canvas ?? null,
      aoMudarQuadro: (q) => estudio.marcarAtual(q),
    });
    renderizador.current = r;
    estudio.ligarPrevia({ player, canvas: canvas.current });
    return () => {
      player.parar();
      estudio.ligarPrevia(null);
    };
  }, [estudio]);

  useEffect(() => {
    renderizador.current.definirFormato(formato);
  }, [formato]);

  // o recorte vertical (9:16) acompanha o rosto da base (no vídeo, o do 1º quadro-fonte)
  useEffect(() => {
    const pontos = (videoFonte ?? foto)?.pontos;
    renderizador.current.rostoX = pontos ? centroDosOlhos(pontos).x : undefined;
  }, [foto, videoFonte]);

  return canvas;
}
