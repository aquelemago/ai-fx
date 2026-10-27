import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarApp } from '../../src/http/app.js';
import { validarPedidoDeQuadro } from '../../src/http/validacao.js';
import { ArmazenamentoDeQuadros } from '../../src/servicos/armazenamento.js';
import { ServicoDeGeracao } from '../../src/servicos/servico-geracao.js';
import { GeradorFalso, PNG_FALSO } from '../apoio/gerador-falso.js';

test('validação: aplica padrões e limites', () => {
  const p = validarPedidoDeQuadro({ baseId: '0123456789ab', promptA: 'x', forca: 3, passos: 2.6, mixPrompt: -1 });
  assert.equal(p.promptB, 'x');
  assert.equal(p.forca, 1);
  assert.equal(p.passos, 3);
  assert.equal(p.mixPrompt, 0);
  assert.equal(p.sementeB, p.sementeA);
});

test('validação: recusa entradas erradas', () => {
  const ok = { baseId: '0123456789ab', promptA: 'x' };
  assert.throws(() => validarPedidoDeQuadro({ ...ok, baseId: '../x' }), /id de foto/);
  assert.throws(() => validarPedidoDeQuadro({ ...ok, promptA: '' }), /promptA/);
  assert.throws(() => validarPedidoDeQuadro({ ...ok, forca: 'muita' }), /forca/);
  assert.throws(() => validarPedidoDeQuadro({ ...ok, sementeA: 1.5 }), /sementeA/);
  assert.throws(() => validarPedidoDeQuadro({ ...ok, promptA: 'a'.repeat(1001) }), /1000/);
});

let servidor, url, servico, dirSaidas;

before(async () => {
  dirSaidas = fs.mkdtempSync(path.join(os.tmpdir(), 'timelapse-api-'));
  servico = new ServicoDeGeracao({
    gerador: new GeradorFalso(),
    armazenamento: new ArmazenamentoDeQuadros(dirSaidas),
    log: () => {},
  });
  const app = criarApp({ servico, dirPublico: path.resolve('public'), log: () => {} });
  await new Promise((r) => (servidor = app.listen(0, r)));
  url = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const postJson = (caminho, corpo) => fetch(url + caminho, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
});

test('API: 503 enquanto o modelo não carregou', async () => {
  const r = await postJson('/api/gerar', { baseId: '0123456789ab', promptA: 'x' });
  assert.equal(r.status, 503);
  assert.ok((await r.json()).erro);
});

test('API: fluxo completo de foto, quadro e salvamento', async () => {
  await servico.iniciar();
  assert.equal((await (await fetch(url + '/api/status')).json()).pronto, true);

  const rBase = await fetch(url + '/api/base', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: Buffer.from('foto') });
  const { id } = await rBase.json();
  assert.match(id, /^[0-9a-f]{12}$/);

  const rQuadro = await postJson('/api/gerar', { baseId: id, quadro: 0, promptA: 'x' });
  assert.equal(rQuadro.status, 200);
  assert.equal(rQuadro.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await rQuadro.arrayBuffer()), PNG_FALSO);

  const rSalvar = await fetch(`${url}/api/salvar/${id}/0`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: PNG_FALSO });
  assert.equal(rSalvar.status, 204);
  assert.ok(fs.existsSync(path.join(dirSaidas, id, 'final_0000.png')));
});

test('API: 400 para pedido inválido e 409 para foto que o servidor não tem', async () => {
  assert.equal((await postJson('/api/gerar', { baseId: 'nada', promptA: 'x' })).status, 400);
  assert.equal((await postJson('/api/gerar', { baseId: 'ffffffffffff', promptA: 'x' })).status, 409);
  const semCorpo = await fetch(`${url}/api/salvar/ffffffffffff/0`, { method: 'POST' });
  assert.equal(semCorpo.status, 400);
});

test('API: serve a página', async () => {
  const r = await fetch(url + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /js\/main\.js/);
});
