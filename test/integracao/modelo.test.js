// Teste de integração com o modelo de verdade (~40 s). Gera um quadro com parâmetros fixos e
// compara com test/fixtures/quadro-referencia.png. O resultado não é bit a bit igual entre
// execuções (somas em várias threads mudam a ordem do ponto flutuante), então a comparação é
// por PSNR: duas execuções do mesmo código dão ~80 dB; abaixo de 60 dB algo mudou de verdade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { lerConfig } from '../../src/config.js';
import { criarGerador } from '../../src/ia/modelos.js';

const config = lerConfig();
const fixtures = path.resolve('test/fixtures');
const temModelo = fs.existsSync(path.join(config.dirModelos, 'sd-turbo', 'unet', 'weights.pb'));

async function psnr(pngA, pngB) {
  const [a, b] = await Promise.all([pngA, pngB].map((p) => sharp(p).removeAlpha().raw().toBuffer()));
  assert.equal(a.length, b.length);
  let soma = 0;
  for (let i = 0; i < a.length; i++) soma += (a[i] - b[i]) ** 2;
  const mse = soma / a.length;
  return mse === 0 ? Infinity : 10 * Math.log10(255 ** 2 / mse);
}

test('SD-Turbo gera o mesmo quadro de referência', { skip: !temModelo && 'modelos não baixados', timeout: 300_000 }, async () => {
  const gerador = criarGerador('sd-turbo', config);
  await gerador.carregar(() => {});
  await gerador.definirBase('ref', fs.readFileSync(path.join(fixtures, 'rosto.png')));
  const png = await gerador.gerar({
    baseId: 'ref',
    promptA: 'portrait photo of a man at sunset',
    promptB: 'portrait photo of a man at night',
    mixPrompt: 0.3, sementeA: 7, sementeB: 8, mixSemente: 0.4, forca: 0.82, passos: 2,
  });
  const db = await psnr(png, fs.readFileSync(path.join(fixtures, 'quadro-referencia.png')));
  assert.ok(db > 60, `PSNR ${db.toFixed(1)} dB contra a referência`);
});
