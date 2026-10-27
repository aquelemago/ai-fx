import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  criarIdDoProjeto, migrarManifesto, validarConfiguracao, validarIdDoProjeto, validarMudancas,
} from '../../src/projetos/manifesto.js';
import { ErroProjetoInexistente, RepositorioDeProjetos } from '../../src/projetos/repositorio.js';

const pastaTemporaria = () => fs.mkdtempSync(path.join(os.tmpdir(), 'timelapse-projetos-'));

// relógio que anda um segundo a cada leitura, para a ordem por data ser previsível
function relogioDeTeste() {
  let t = Date.parse('2026-10-27T12:00:00Z');
  return () => new Date((t += 1000));
}

test('manifesto: id legível, sem acento e com sufixo', () => {
  assert.equal(criarIdDoProjeto('Praia à Noite!', 'abc123'), 'praia-a-noite-abc123');
  assert.equal(criarIdDoProjeto('***', 'abc123'), 'projeto-abc123');
  assert.equal(criarIdDoProjeto('a'.repeat(100), 'abc123').length, 47);
});

test('manifesto: id de projeto não deixa sair da pasta', () => {
  for (const ruim of ['../x', 'a/b', 'A', '', 'x-', '-x', 'a..b', 'a'.repeat(61)]) {
    assert.throws(() => validarIdDoProjeto(ruim), /id de projeto/, ruim);
  }
  assert.equal(validarIdDoProjeto('praia-abc123'), 'praia-abc123');
});

test('manifesto: configuração aceita só campos e tipos conhecidos', () => {
  const ok = validarConfiguracao({ descricao: 'a man', quadros: 24, formato: '9:16', ritmo: { fps: 8, transicao: 0.6 }, ajustes: { forca: 0.8 } });
  assert.equal(ok.ajustes.forca, 0.8);
  assert.throws(() => validarConfiguracao({ cor: 'azul' }), /desconhecida/);
  assert.throws(() => validarConfiguracao({ ajustes: { turbo: 1 } }), /ajuste inválido/);
  assert.throws(() => validarConfiguracao({ quadros: 0 }), /quadros/);
  assert.throws(() => validarConfiguracao({ descricao: 'x'.repeat(301) }), /descricao/);
});

test('manifesto: mudanças só em nome, configuração e quadros', () => {
  assert.deepEqual(validarMudancas({ nome: '  Meu   projeto ' }), { nome: 'Meu projeto' });
  assert.throws(() => validarMudancas({ id: 'outro' }), /não permitidos/);
  assert.throws(() => validarMudancas({ quadros: [{ indice: -1 }] }), /quadro/);
  assert.deepEqual(validarMudancas({ quadros: [{ indice: 2 }] }).quadros, [{ indice: 2, cena: '', fora: false }]);
});

test('manifesto: recusa versões que não sabe ler', () => {
  assert.throws(() => migrarManifesto({ versao: 99 }), /versão/);
});

test('repositório: cria a pasta do projeto com manifesto e lista o mais recente primeiro', async () => {
  const dir = pastaTemporaria();
  const repo = new RepositorioDeProjetos(dir, { relogio: relogioDeTeste() });
  const a = await repo.criar('Primeiro');
  const b = await repo.criar('Segundo');
  assert.ok(fs.existsSync(path.join(dir, a.id, 'projeto.json')));
  assert.ok(fs.existsSync(path.join(dir, a.id, 'quadros')));
  assert.deepEqual((await repo.listar()).map((p) => p.id), [b.id, a.id]);
  await repo.atualizar(a.id, { nome: 'Primeiro, editado' });
  assert.deepEqual((await repo.listar()).map((p) => p.id), [a.id, b.id]);
});

test('repositório: ignora pastas que não são projetos e funciona sem a pasta raiz', async () => {
  const dir = pastaTemporaria();
  fs.mkdirSync(path.join(dir, 'lixo'));
  fs.writeFileSync(path.join(dir, 'solto.txt'), 'x');
  const repo = new RepositorioDeProjetos(dir);
  await repo.criar('Válido');
  assert.equal((await repo.listar()).length, 1);
  assert.deepEqual(await new RepositorioDeProjetos(path.join(dir, 'nao-existe')).listar(), []);
});

test('repositório: configuração é mesclada e o manifesto nunca fica pela metade', async () => {
  const dir = pastaTemporaria();
  const repo = new RepositorioDeProjetos(dir);
  const p = await repo.criar('Mescla');
  // muitas gravações ao mesmo tempo: a fila aplica todas, em ordem, sem perder nenhuma
  await Promise.all(Array.from({ length: 20 }, (_, i) => repo.atualizar(p.id, { configuracao: { [`campo${i % 2 ? 'Impar' : 'Par'}`]: i } })));
  await repo.atualizar(p.id, { configuracao: { descricao: 'a man' } });
  const m = await repo.ler(p.id);
  assert.equal(m.configuracao.campoPar, 18);
  assert.equal(m.configuracao.campoImpar, 19);
  assert.equal(m.configuracao.descricao, 'a man');
  assert.deepEqual(fs.readdirSync(path.join(dir, p.id)).filter((f) => f.endsWith('.tmp')), []);
});

test('repositório: limpar quadros apaga os arquivos e a lista; excluir apaga a pasta', async () => {
  const dir = pastaTemporaria();
  const repo = new RepositorioDeProjetos(dir);
  const p = await repo.criar('Limpeza');
  await repo.salvarFoto(p.id, Buffer.from('foto'));
  await repo.salvarQuadro(p.id, 'final', 13, Buffer.from('q'));
  await repo.atualizar(p.id, { quadros: [{ indice: 13, cena: 'noite', fora: false }] });
  await repo.salvarVideo(p.id, 'mp4', Buffer.from('v'));

  const limpo = await repo.limparQuadros(p.id);
  assert.deepEqual(limpo.quadros, []);
  assert.deepEqual(fs.readdirSync(path.join(dir, p.id, 'quadros')), []);
  assert.ok(fs.existsSync(path.join(dir, p.id, 'foto.png'))); // foto e vídeos ficam
  assert.equal(limpo.videos.length, 1);

  await repo.excluir(p.id);
  assert.equal(fs.existsSync(path.join(dir, p.id)), false);
  await assert.rejects(repo.ler(p.id), ErroProjetoInexistente);
  await assert.rejects(repo.excluir(p.id), ErroProjetoInexistente);
});

test('repositório: não escreve fora da pasta do projeto', async () => {
  const repo = new RepositorioDeProjetos(pastaTemporaria());
  const p = await repo.criar('Seguro');
  assert.throws(() => repo.pasta('../fora'));
  assert.throws(() => repo.arquivoDeQuadro(p.id, '../ia', 1));
  assert.throws(() => repo.arquivoDeQuadro(p.id, 'ia', -1));
  await assert.rejects(repo.salvarVideo(p.id, 'exe', Buffer.from('x')));
});
