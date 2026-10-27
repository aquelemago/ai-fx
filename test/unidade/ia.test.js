import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planejarPassos, sigmaDe } from '../../src/ia/agendador-euler.js';
import { misturar, ruido, slerp } from '../../src/ia/ruido.js';
import { ClipTokenizer } from '../../src/ia/clip-tokenizer.js';
import { lerConfig } from '../../src/config.js';

test('agendador: força 0,5 com 1 passo começa em t=499 e termina em sigma 0', () => {
  const { timesteps, sigmas } = planejarPassos(0.5, 1);
  assert.deepEqual(timesteps, [499]);
  assert.equal(sigmas.length, 2);
  assert.equal(sigmas.at(-1), 0);
});

test('agendador: passos "trailing" igualmente espaçados', () => {
  assert.deepEqual(planejarPassos(1, 4).timesteps, [999, 749, 499, 249]);
  assert.deepEqual(planejarPassos(0.5, 2).timesteps, [499, 249]);
});

test('agendador: limita força e passos', () => {
  assert.equal(planejarPassos(2, 9).timesteps.length, 4);
  assert.deepEqual(planejarPassos(0, 0).timesteps, [49]);
});

test('agendador: sigma cresce com o ruído', () => {
  assert.ok(sigmaDe(999) > sigmaDe(499));
  assert.ok(sigmaDe(499) > sigmaDe(0));
});

test('ruído: mesma semente dá o mesmo ruído; sementes diferentes, ruídos diferentes', () => {
  assert.deepEqual(ruido(42, 1000), ruido(42, 1000));
  assert.notDeepEqual(ruido(42, 1000), ruido(43, 1000));
});

test('ruído: média perto de 0 e desvio perto de 1', () => {
  const r = ruido(7, 100_000);
  const media = r.reduce((s, v) => s + v, 0) / r.length;
  const dp = Math.sqrt(r.reduce((s, v) => s + (v - media) ** 2, 0) / r.length);
  assert.ok(Math.abs(media) < 0.02, `média ${media}`);
  assert.ok(Math.abs(dp - 1) < 0.02, `desvio ${dp}`);
});

test('slerp: extremos devolvem as entradas e o meio mantém a energia', () => {
  const a = ruido(1, 50_000), b = ruido(2, 50_000);
  assert.equal(slerp(a, b, 0), a);
  assert.equal(slerp(a, b, 1), b);
  const norma = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const meio = slerp(a, b, 0.5);
  assert.ok(Math.abs(norma(meio) / norma(a) - 1) < 0.02);
});

test('misturar: interpola linearmente', () => {
  assert.deepEqual([...misturar([0, 10], [10, 20], 0.5)], [5, 15]);
});

const dirTokenizer = path.join(lerConfig().dirModelos, 'sd-turbo', 'tokenizer');
test('tokenizador CLIP: mesmos ids do tokenizador oficial', { skip: !fs.existsSync(dirTokenizer) && 'modelos não baixados' }, () => {
  const t = new ClipTokenizer(dirTokenizer);
  const ids = t.encode('a photo of a cat');
  assert.equal(ids.length, 77);
  assert.deepEqual(ids.slice(0, 8), [49406, 320, 1125, 539, 320, 2368, 49407, 0]);
});

test('tokenizador CLIP: corta textos longos mantendo início e fim', { skip: !fs.existsSync(dirTokenizer) && 'modelos não baixados' }, () => {
  const t = new ClipTokenizer(dirTokenizer);
  const ids = t.encode('cat '.repeat(200));
  assert.equal(ids.length, 77);
  assert.equal(ids[0], 49406);
  assert.equal(ids[76], 49407);
});
