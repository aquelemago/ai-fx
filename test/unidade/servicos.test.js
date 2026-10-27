import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CacheLru } from '../../src/util/cache-lru.js';
import { FilaSerial } from '../../src/servicos/fila.js';
import { ArmazenamentoDeQuadros } from '../../src/servicos/armazenamento.js';
import { ErroModeloIndisponivel, ServicoDeGeracao } from '../../src/servicos/servico-geracao.js';
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

test('armazenamento: grava em saidas/<id>/<tipo>_NNNN.png', async () => {
  const dir = pastaTemporaria();
  const arq = await new ArmazenamentoDeQuadros(dir).salvar('0123456789ab', 'final', 7, Buffer.from('png'));
  assert.equal(arq, path.join(dir, '0123456789ab', 'final_0007.png'));
  assert.equal(fs.readFileSync(arq, 'utf8'), 'png');
});

test('armazenamento: recusa id, tipo e número que poderiam escapar da pasta', () => {
  const a = new ArmazenamentoDeQuadros(pastaTemporaria());
  assert.throws(() => a.caminho('../../etc', 'ia', 1));
  assert.throws(() => a.caminho('0123456789ab', '../x', 1));
  assert.throws(() => a.caminho('0123456789ab', 'ia', -1));
});

test('registro de modelos: cria o SD-Turbo e recusa nome desconhecido', () => {
  assert.ok(modelosDisponiveis().includes('sd-turbo'));
  assert.equal(criarGerador('sd-turbo', { dirModelos: '/x', threads: 1 }).constructor.nome, 'sd-turbo');
  assert.throws(() => criarGerador('nao-existe', {}), /não existe/);
});

test('serviço: recusa gerar antes do modelo carregar', async () => {
  const s = new ServicoDeGeracao({ gerador: new GeradorFalso(), armazenamento: null, log: () => {} });
  await assert.rejects(s.gerarQuadro({ baseId: 'x' }), ErroModeloIndisponivel);
});

test('serviço: a mesma foto vira o mesmo id e só é preparada uma vez', async () => {
  const gerador = new GeradorFalso();
  const s = new ServicoDeGeracao({ gerador, armazenamento: null, log: () => {} });
  await s.iniciar();
  const id1 = await s.prepararBase(Buffer.from('foto'));
  const id2 = await s.prepararBase(Buffer.from('foto'));
  assert.equal(id1, id2);
  assert.match(id1, /^[0-9a-f]{12}$/);
  assert.equal(gerador.basesDefinidas, 1);
});

test('serviço: gera e grava a saída crua quando o quadro tem número', async () => {
  const dir = pastaTemporaria();
  const s = new ServicoDeGeracao({ gerador: new GeradorFalso(), armazenamento: new ArmazenamentoDeQuadros(dir), log: () => {} });
  await s.iniciar();
  const baseId = await s.prepararBase(Buffer.from('foto'));
  const { png } = await s.gerarQuadro({ baseId, quadro: 3, promptA: 'x' });
  assert.deepEqual(fs.readFileSync(path.join(dir, baseId, 'ia_0003.png')), png);
});

test('serviço: status informa modelo e erro de carga', async () => {
  const gerador = new GeradorFalso({ falharAoCarregar: true });
  const s = new ServicoDeGeracao({ gerador, armazenamento: null, log: () => {} });
  await assert.rejects(s.iniciar());
  assert.deepEqual(s.status(), { pronto: false, erro: 'arquivos ausentes', modelo: 'falso', fila: 0 });
});
