// Conversões entre imagens (PNG/JPG) e tensores CHW em [-1, 1].
import sharp from 'sharp';

export async function imagemParaTensor(buffer, lado) {
  const { data } = await sharp(buffer)
    .resize(lado, lado, { fit: 'cover' }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const px = lado * lado;
  const chw = new Float32Array(3 * px);
  for (let i = 0; i < px; i++) {
    for (let c = 0; c < 3; c++) chw[c * px + i] = data[i * 3 + c] / 127.5 - 1;
  }
  return chw;
}

export function tensorParaPng(chw, lado) {
  const px = lado * lado;
  const rgb = Buffer.alloc(px * 3);
  for (let i = 0; i < px; i++) {
    for (let c = 0; c < 3; c++) {
      const v = (chw[c * px + i] + 1) * 127.5;
      rgb[i * 3 + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  return sharp(rgb, { raw: { width: lado, height: lado, channels: 3 } }).png().toBuffer();
}
