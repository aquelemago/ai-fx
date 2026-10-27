// Lê uma imagem do servidor para um canvas fora da tela, ou null se ela não existir.
export async function lerImagem(url) {
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const img = await createImageBitmap(await resp.blob());
  const canvas = new OffscreenCanvas(img.width, img.height);
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}
