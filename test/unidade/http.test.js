import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarApp } from '../../src/http/app.js';
import { validarPedidoDeQuadro, validarPedidoDeRosto } from '../../src/http/validacao.js';
import { RepositorioDeProjetos } from '../../src/projetos/repositorio.js';
import { ServicoDeProjetos } from '../../src/servicos/servico-projetos.js';
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

test('validação: pedido de rosto com padrões e limites', () => {
  assert.deepEqual(validarPedidoDeRosto({}), { descricao: 'a person', semente: 0 });
  assert.deepEqual(validarPedidoDeRosto({ descricao: 'a man', semente: 9 }), { descricao: 'a man', semente: 9 });
  assert.throws(() => validarPedidoDeRosto({ descricao: 'a'.repeat(301) }), /300/);
  assert.throws(() => validarPedidoDeRosto({ semente: 'x' }), /semente/);
});

let servidor, url, servico, dirProjetos;

before(async () => {
  dirProjetos = fs.mkdtempSync(path.join(os.tmpdir(), 'timelapse-api-'));
  const repositorio = new RepositorioDeProjetos(dirProjetos);
  servico = new ServicoDeGeracao({ gerador: new GeradorFalso(), projetos: repositorio, log: () => {} });
  const projetos = new ServicoDeProjetos({ repositorio, geracao: servico });
  const app = criarApp({ servico, projetos, dirPublico: path.resolve('public'), dirProjetos, log: () => {} });
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

test('API: fluxo completo de foto e quadro', async () => {
  await servico.iniciar();
  assert.equal((await (await fetch(url + '/api/status')).json()).pronto, true);

  const rBase = await fetch(url + '/api/base', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: Buffer.from('foto') });
  const { id } = await rBase.json();
  assert.match(id, /^[0-9a-f]{12}$/);

  const rQuadro = await postJson('/api/gerar', { baseId: id, quadro: 0, promptA: 'x' });
  assert.equal(rQuadro.status, 200);
  assert.equal(rQuadro.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await rQuadro.arrayBuffer()), PNG_FALSO);
});

test('API: 400 para pedido inválido e 409 para foto que o servidor não tem', async () => {
  assert.equal((await postJson('/api/gerar', { baseId: 'nada', promptA: 'x' })).status, 400);
  assert.equal((await postJson('/api/gerar', { baseId: 'ffffffffffff', promptA: 'x' })).status, 409);
  assert.equal((await postJson('/api/gerar', { baseId: 'ffffffffffff', projetoId: '../x', promptA: 'x' })).status, 400);
});

test('API: gera um rosto novo', async () => {
  const r = await postJson('/api/rosto', { descricao: 'a woman with red hair', semente: 3 });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.equal((await postJson('/api/rosto', { semente: 1.5 })).status, 400);
});

test('API: serve a página', async () => {
  const r = await fetch(url + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /js\/main\.js/);
});

// ---------- projetos ----------

const pedir = async (metodo, caminho, corpo, tipo) => {
  const opcoes = { method: metodo };
  if (corpo !== undefined) {
    opcoes.headers = { 'Content-Type': tipo ?? 'application/json' };
    opcoes.body = tipo ? corpo : JSON.stringify(corpo);
  }
  return fetch(url + caminho, opcoes);
};

test('API de projetos: ciclo completo dentro de uma pasta só', async () => {
  await servico.iniciar();
  const rCriar = await pedir('POST', '/api/projetos', { nome: 'Praia à noite' });
  assert.equal(rCriar.status, 201);
  const projeto = await rCriar.json();
  assert.match(projeto.id, /^praia-a-noite-[0-9a-f]{6}$/);
  const pasta = path.join(dirProjetos, projeto.id);

  const rFoto = await pedir('PUT', `/api/projetos/${projeto.id}/foto`, PNG_FALSO, 'image/png');
  const { baseId, manifesto } = await rFoto.json();
  assert.match(baseId, /^[0-9a-f]{12}$/);
  assert.equal(manifesto.temFoto, true);
  assert.deepEqual(fs.readFileSync(path.join(pasta, 'foto.png')), PNG_FALSO);

  // a página reabre a foto pelos arquivos estáticos
  const rArquivo = await fetch(`${url}/arquivos/${projeto.id}/foto.png`);
  assert.equal(rArquivo.status, 200);

  assert.equal((await postJson('/api/gerar', { baseId, projetoId: projeto.id, quadro: 4, promptA: 'x' })).status, 200);
  assert.ok(fs.existsSync(path.join(pasta, 'quadros', 'ia_0004.png')));
  assert.equal((await pedir('PUT', `/api/projetos/${projeto.id}/quadros/4`, PNG_FALSO, 'image/png')).status, 204);
  assert.ok(fs.existsSync(path.join(pasta, 'quadros', 'final_0004.png')));

  const rPatch = await pedir('PATCH', `/api/projetos/${projeto.id}`, {
    configuracao: { descricao: 'a man', ajustes: { forca: 0.8 } },
    quadros: [{ indice: 4, cena: 'noite', fora: true }],
  });
  const atualizado = await rPatch.json();
  assert.equal(atualizado.configuracao.ajustes.forca, 0.8);
  assert.deepEqual(atualizado.quadros, [{ indice: 4, cena: 'noite', fora: true }]);

  const rVideo = await pedir('POST', `/api/projetos/${projeto.id}/videos`, Buffer.from('mp4'), 'video/mp4');
  assert.equal(rVideo.status, 201);
  const { arquivo } = await rVideo.json();
  assert.ok(fs.existsSync(path.join(pasta, 'videos', arquivo)));

  // gerar de novo começa limpo: nada de quadros antigos sobrando
  const limpo = await (await pedir('DELETE', `/api/projetos/${projeto.id}/quadros`)).json();
  assert.deepEqual(limpo.quadros, []);
  assert.deepEqual(fs.readdirSync(path.join(pasta, 'quadros')), []);

  const lista = await (await pedir('GET', '/api/projetos')).json();
  assert.ok(lista.some((p) => p.id === projeto.id && p.videos === 1));

  assert.equal((await pedir('DELETE', `/api/projetos/${projeto.id}`)).status, 204);
  assert.equal(fs.existsSync(pasta), false);
  assert.equal((await pedir('GET', `/api/projetos/${projeto.id}`)).status, 404);
});

test('API de projetos: recusa entradas inválidas', async () => {
  assert.equal((await pedir('POST', '/api/projetos', { nome: '  ' })).status, 400);
  assert.equal((await pedir('GET', '/api/projetos/..%2F..%2Fetc')).status, 400);
  assert.equal((await pedir('GET', '/api/projetos/nao-existe-123456')).status, 404);
  const { id } = await (await pedir('POST', '/api/projetos', { nome: 'x' })).json();
  assert.equal((await pedir('PATCH', `/api/projetos/${id}`, { temFoto: true })).status, 400);
  assert.equal((await pedir('PATCH', `/api/projetos/${id}`, { configuracao: { formato: '4:3' } })).status, 400);
  assert.equal((await pedir('PUT', `/api/projetos/${id}/quadros/1`)).status, 400);
  assert.equal((await pedir('POST', `/api/projetos/${id}/videos`, Buffer.from('x'), 'video/ogg')).status, 400);
  assert.equal((await fetch(`${url}/arquivos/${id}/projeto.json/..%2F..%2F..%2Fpackage.json`)).status, 404);
});
