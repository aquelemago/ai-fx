import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CacheLru } from '../../src/util/cache-lru.js';
import { FilaSerial } from '../../src/servicos/fila.js';
import { RepositorioDeProjetos } from '../../src/projetos/repositorio.js';
import { ErroModeloIndisponivel, ServicoDeGeracao, promptDeRosto } from '../../src/servicos/servico-geracao.js';
import { criarGerador, modelosDisponiveis } from '../../src/ia/modelos.js';
import { GeradorFalso } from '../apoio/gerador-falso.js';

const pastaTemporaria = () => fs.mkdtempSync(path.join(os.tmpdir(), 'timelapse-'));

test('cache LRU: descarta o usado há mais tempo', () => {
  const c = new CacheLru(2);
  c.set('a', 1).set('b', 2);
  c.get('a');
  c.set('c', 3);
  assert.equal(c.has('b'), false);
  assert.equal(c.get('a'), 1);
  assert.equal(c.size, 2);
});

test('fila: executa uma tarefa por vez, na ordem', async () => {
  const fila = new FilaSerial();
  const ordem = [];
  let rodando = 0, maximo = 0;
  const tarefa = (n) => async () => {
    rodando++;
    maximo = Math.max(maximo, rodando);
    await new Promise((r) => setTimeout(r, 5));
    ordem.push(n);
    rodando--;
  };
  await Promise.all([1, 2, 3].map((n) => fila.executar(tarefa(n))));
  assert.deepEqual(ordem, [1, 2, 3]);
  assert.equal(maximo, 1);
});

test('fila: um erro não trava as próximas tarefas', async () => {
  const fila = new FilaSerial();
  await assert.rejects(fila.executar(async () => { throw new Error('x'); }));
  assert.equal(await fila.executar(async () => 'ok'), 'ok');
  assert.equal(fila.pendentes, 0);
});

test('registro de modelos: cria o SD-Turbo e recusa nome desconhecido', () => {
  assert.ok(modelosDisponiveis().includes('sd-turbo'));
  assert.equal(criarGerador('sd-turbo', { dirModelos: '/x', threads: 1 }).constructor.nome, 'sd-turbo');
  assert.throws(() => criarGerador('nao-existe', {}), /não existe/);
});

test('serviço: recusa gerar antes do modelo carregar', async () => {
  const s = new ServicoDeGeracao({ gerador: new GeradorFalso(), projetos: null, log: () => {} });
  await assert.rejects(s.gerarQuadro({ baseId: 'x' }), ErroModeloIndisponivel);
});

test('serviço: a mesma foto vira o mesmo id e só é preparada uma vez', async () => {
  const gerador = new GeradorFalso();
  const s = new ServicoDeGeracao({ gerador, projetos: null, log: () => {} });
  await s.iniciar();
  const id1 = await s.prepararBase(Buffer.from('foto'));
  const id2 = await s.prepararBase(Buffer.from('foto'));
  assert.equal(id1, id2);
  assert.match(id1, /^[0-9a-f]{12}$/);
  assert.equal(gerador.basesDefinidas, 1);
});

test('serviço: grava a saída crua no projeto quando o pedido traz projeto e quadro', async () => {
  const repo = new RepositorioDeProjetos(pastaTemporaria());
  const projeto = await repo.criar('Teste');
  const s = new ServicoDeGeracao({ gerador: new GeradorFalso(), projetos: repo, log: () => {} });
  await s.iniciar();
  const baseId = await s.prepararBase(Buffer.from('foto'));
  const { png } = await s.gerarQuadro({ baseId, projetoId: projeto.id, quadro: 3, promptA: 'x' });
  assert.deepEqual(fs.readFileSync(repo.arquivoDeQuadro(projeto.id, 'ia', 3)), png);
  await s.gerarQuadro({ baseId, promptA: 'x' }); // sem projeto: só devolve a imagem
});

test('serviço: gera rosto do zero com força máxima a partir de uma imagem neutra', async () => {
  const gerador = new GeradorFalso();
  const s = new ServicoDeGeracao({ gerador, projetos: null, log: () => {} });
  await assert.rejects(s.gerarRosto({ descricao: 'a man', semente: 1 }), ErroModeloIndisponivel);
  await s.iniciar();
  await s.gerarRosto({ descricao: 'a man with glasses', semente: 5 });
  await s.gerarRosto({ descricao: 'a woman', semente: 6 });
  const [p1, p2] = gerador.pedidos;
  assert.equal(p1.forca, 1);
  assert.equal(p1.sementeA, 5);
  assert.equal(p1.promptA, promptDeRosto('a man with glasses'));
  assert.equal(p1.baseId, p2.baseId); // a imagem neutra é preparada uma vez só
  assert.equal(gerador.basesDefinidas, 1);
});

test('serviço: status informa modelo e erro de carga', async () => {
  const gerador = new GeradorFalso({ falharAoCarregar: true });
  const s = new ServicoDeGeracao({ gerador, projetos: null, log: () => {} });
  await assert.rejects(s.iniciar());
  assert.deepEqual(s.status(), { pronto: false, erro: 'arquivos ausentes', modelo: 'falso', fila: 0 });
});
