// Formatos de vídeo. Para adicionar um (ex.: 4:5 do feed), basta uma entrada nova aqui
// e um botão com o mesmo valor em index.html.
export const FORMATOS = {
  '9:16': { largura: 720, altura: 1280, rotulo: 'Stories, Reels, TikTok' },
  '1:1': { largura: 720, altura: 720, rotulo: 'Feed' },
};

export const FORMATO_PADRAO = '9:16';

/**
 * Onde desenhar o quadro quadrado (lado `ladoQuadro`) num formato, cobrindo a tela inteira
 * e mantendo o rosto (x = `rostoX` no quadro) o mais centralizado possível.
 */
export function recorteNoFormato(formato, ladoQuadro, rostoX = ladoQuadro / 2) {
  const { largura: W, altura: H } = FORMATOS[formato];
  const escala = Math.max(W, H) / ladoQuadro;
  const lado = ladoQuadro * escala;
  const xCentralizado = W / 2 - rostoX * escala;
  const x = Math.min(0, Math.max(W - lado, xCentralizado));
  const y = Math.min(0, (H - lado) / 2);
  return { x, y, lado };
}
