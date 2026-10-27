// Módulos puros da página (public/js/dominio e geometria do rosto), testados no Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeDaCena, parametrosDoQuadro } from '../../public/js/dominio/plano.js';
import { FORMATOS, recorteNoFormato } from '../../public/js/dominio/formatos.js';
import { ROTEIROS, montarPrompts } from '../../public/js/dominio/roteiros.js';
import { ColecaoDeQuadros } from '../../public/js/dominio/quadros.js';
import { ordenarContorno, quadradoEmVoltaDoRosto, transformacaoDeAlinhamento } from '../../public/js/rosto/geometria.js';
import { formatarTempo } from '../../public/js/util/tempo.js';
import { descricaoAleatoria, sementeAleatoria } from '../../public/js/dominio/rostos.js';

test('plano: primeiro e último quadro caem exatamente na primeira e na última cena', () => {
  const prompts = ['a', 'b', 'c'];
  const primeiro = parametrosDoQuadro(0, 9, prompts, 42, 1);
  const ultimo = parametrosDoQuadro(8, 9, prompts, 42, 1);
  assert.equal(primeiro.promptA, 'a');
  assert.equal(primeiro.mixPrompt, 0);
  assert.equal(ultimo.promptA, 'c');
  assert.equal(ultimo.mixPrompt, 0);
});

test('plano: no meio de duas cenas o texto é misturado pela metade', () => {
  const p = parametrosDoQuadro(2, 9, ['a', 'b', 'c'], 42, 1);
  assert.equal(p.promptA, 'a');
  assert.equal(p.promptB, 'b');
  assert.equal(p.mixPrompt, 0.5);
});

test('plano: suavidade troca a semente a cada N quadros, misturando aos poucos', () => {
  const p = [0, 1, 2, 3].map((i) => parametrosDoQuadro(i, 4, ['a'], 10, 2));
  assert.deepEqual(p.map((x) => x.sementeA), [10, 10, 11, 11]);
  assert.deepEqual(p.map((x) => x.mixSemente), [0, 0.5, 0, 0.5]);
  assert.equal(parametrosDoQuadro(3, 4, ['a'], 10, 1).mixSemente, 0);
});

test('plano: rótulo da cena segue o quadro', () => {
  const nomes = ROTEIROS['Um dia inteiro'].nomes;
  assert.equal(nomeDaCena(0, 24, nomes, 5), 'amanhecer');
  assert.equal(nomeDaCena(23, 24, nomes, 5), 'noite');
  assert.equal(nomeDaCena(0, 4, undefined, 2), 'cena 1');
});

test('roteiros: todo roteiro tem um nome por cena e usa {eu}', () => {
  for (const [nome, r] of Object.entries(ROTEIROS)) {
    assert.equal(r.nomes.length, r.cenas.length, nome);
    assert.ok(r.cenas.every((c) => c.includes('{eu}')), nome);
  }
});

test('roteiros: monta prompts trocando {eu} e ignorando linhas vazias', () => {
  assert.deepEqual(montarPrompts('photo of {eu}\n\n  art of {eu} ', 'a man'), ['photo of a man', 'art of a man']);
  assert.deepEqual(montarPrompts('photo of {eu}', '  '), ['photo of a person']);
});

test('formatos: 9:16 cobre a tela e centraliza o rosto sem deixar borda', () => {
  const { largura, altura } = FORMATOS['9:16'];
  const centro = recorteNoFormato('9:16', 512, 256);
  assert.equal(centro.lado, altura);
  assert.equal(centro.x, (largura - altura) / 2);
  assert.equal(recorteNoFormato('9:16', 512, 0).x, 0); // rosto colado à esquerda: não passa da borda
  assert.equal(recorteNoFormato('9:16', 512, 512).x, largura - altura);
  assert.deepEqual(recorteNoFormato('1:1', 512, 100), { x: 0, y: 0, lado: 720 });
});

// rosto sintético: só os pontos usados pelos olhos importam aqui
function rosto(olhoE, olhoD) {
  const pts = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  for (const i of [468, 33, 133]) pts[i] = { ...olhoE };
  for (const i of [473, 362, 263]) pts[i] = { ...olhoD };
  return pts;
}
const aplicar = ([a, b, c, d, e, f], p) => ({ x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f });

test('geometria: o alinhamento leva os olhos do quadro aos olhos da foto', () => {
  const ref = rosto({ x: 200, y: 250 }, { x: 310, y: 250 });
  const quadro = rosto({ x: 180, y: 270 }, { x: 300, y: 300 }); // maior, deslocado e inclinado
  const m = transformacaoDeAlinhamento(quadro, ref);
  for (const [p, q] of [[{ x: 180, y: 270 }, { x: 200, y: 250 }], [{ x: 300, y: 300 }, { x: 310, y: 250 }]]) {
    const r = aplicar(m, p);
    assert.ok(Math.abs(r.x - q.x) < 1e-9 && Math.abs(r.y - q.y) < 1e-9, JSON.stringify(r));
  }
});

test('geometria: contorno ordenado segue as conexões', () => {
  assert.deepEqual(ordenarContorno([{ start: 5, end: 9 }, { start: 1, end: 5 }, { start: 9, end: 1 }]), [5, 9, 1]);
});

test('geometria: recorte em volta do rosto não sai da foto', () => {
  const pts = [{ x: 10, y: 10 }, { x: 90, y: 120 }];
  const q = quadradoEmVoltaDoRosto(pts, 300, 200);
  assert.ok(q.x >= 0 && q.y >= 0 && q.x + q.lado <= 300 && q.y + q.lado <= 200);
});

test('coleção de quadros: avisa mudanças e filtra os riscados', () => {
  const c = new ColecaoDeQuadros();
  const avisos = [];
  c.addEventListener('mudou', (e) => avisos.push(e.detail.tipo));
  const a = c.adicionar({ indice: 0 });
  c.adicionar({ indice: 1 });
  c.alternarFora(a);
  assert.deepEqual(c.ativos().map((q) => q.indice), [1]);
  c.limpar();
  assert.deepEqual(avisos, ['adicionado', 'adicionado', 'alterado', 'limpo']);
});

test('tempo: formata segundos e minutos', () => {
  assert.equal(formatarTempo(0.2), '1 s');
  assert.equal(formatarTempo(42), '42 s');
  assert.equal(formatarTempo(245), '4 min 05 s');
});

// gerador de números com semente, para o sorteio ser reprodutível no teste
function aleatorioFixo(semente) {
  let s = semente;
  return () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

test('rostos: descrição sorteada é coerente e varia', () => {
  const descricoes = new Set();
  for (let i = 0; i < 200; i++) {
    const d = descricaoAleatoria(aleatorioFixo(i));
    assert.match(d, /^a (young|adult|middle-aged|elderly) (man|woman) with /);
    if (d.includes('elderly')) assert.match(d, /gray/);
    if (d.includes('woman')) assert.doesNotMatch(d, /beard|mustache/);
    descricoes.add(d);
  }
  assert.ok(descricoes.size > 30, `só ${descricoes.size} descrições diferentes`);
});

test('rostos: semente é inteiro positivo de 31 bits', () => {
  for (const r of [0, 0.5, 0.999999]) {
    const s = sementeAleatoria(() => r);
    assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 31);
  }
});
