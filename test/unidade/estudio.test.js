import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Estudio, TEXTO_DA_FOTO, controles } from '../../web/src/nucleo/estudio/estudio.js';
import { ColecaoDeQuadros } from '../../web/src/nucleo/dominio/quadros.js';
import { CONFIGURACAO_PADRAO } from '../../web/src/nucleo/dominio/configuracao.js';
import { ErroDeRosto } from '../../web/src/nucleo/rosto/erros.js';

const canvasFalso = (nome) => ({ nome, convertToBlob: async () => new Blob([nome]) });

class GerenteFalso extends EventTarget {
  constructor(manifestos) {
    super();
    this.manifestos = manifestos;
    this.projetos = manifestos.map(({ id, nome }) => ({ id, nome }));
    this.atual = null;
    this.configuracoes = [];
    this.quadrosSalvos = [];
  }
  async iniciar() { return this.abrir(this.manifestos[0].id); }
  async abrir(id) { return (this.atual = this.manifestos.find((m) => m.id === id)); }
  salvarConfiguracao(c) { this.configuracoes.push(c); }
  salvarQuadros(lista) { this.quadrosSalvos.push(lista.length); }
}

class SessaoFalsa extends EventTarget {
  executar(pedido) { this.pedido = pedido; }
  cancelar() { this.cancelada = true; }
  emitir(tipo, detail) { this.dispatchEvent(new CustomEvent(tipo, { detail })); }
}

function montar({ manifestos, prepararFoto = async () => ({ canvas: canvasFalso('foto'), pontos: [], lado: 512 }) }) {
  const pedidos = [];
  const cliente = {
    status: async () => ({ pronto: true }),
    urlDoArquivo: (id, caminho) => `/arquivos/${id}/${caminho}`,
    enviarBase: async () => 'base0000aaaa',
    definirFotoDoProjeto: async () => ({ baseId: 'base0000bbbb' }),
  };
  const gerente = new GerenteFalso(manifestos);
  const sessao = new SessaoFalsa();
  const estudio = new Estudio({
    cliente,
    detector: { pronto: Promise.resolve() },
    quadros: new ColecaoDeQuadros(),
    sessao,
    gerente,
    prepararFoto,
    lerImagem: async (url) => (pedidos.push(url), canvasFalso(url)),
    gravar: async () => ({ blob: new Blob(['v']), extensao: 'mp4' }),
    buscar: async () => ({ ok: true, blob: async () => new Blob(['png']) }),
  });
  return { estudio, gerente, sessao, pedidos };
}

const manifesto = (extra = {}) => ({ id: 'p1', nome: 'Projeto 1', temFoto: false, quadros: [], configuracao: {}, ...extra });

test('estúdio: abrir um projeto completa a configuração e carrega os quadros salvos em ordem', async () => {
  const { estudio, gerente, pedidos } = montar({
    manifestos: [manifesto({
      configuracao: { quadros: 12, roteiro: 'inexistente', ajustes: { forca: 0.5 }, formato: '1:1' },
      quadros: [{ indice: 1, cena: 'b', fora: true }, { indice: 0, cena: 'a', fora: false }],
    })],
  });
  await estudio.iniciar();
  const e = estudio.estado;
  assert.equal(e.projeto.id, 'p1');
  assert.equal(e.configuracao.quadros, 12);
  assert.equal(e.configuracao.roteiro, CONFIGURACAO_PADRAO.roteiro);
  assert.equal(e.configuracao.ajustes.forca, 0.5);
  assert.equal(e.configuracao.ajustes.semente, 42);
  assert.equal(e.configuracao.formato, '1:1');
  assert.deepEqual(pedidos, ['/arquivos/p1/quadros/final_0000.png', '/arquivos/p1/quadros/final_0001.png']);
  assert.deepEqual(e.quadros.map((q) => [q.indice, q.fora]), [[0, false], [1, true]]);
  assert.equal(e.quadrosAtivos, 1);
  assert.equal(e.contagem, '2 de 2');
  assert.deepEqual(gerente.quadrosSalvos, [], 'carregar não regrava os quadros');
  assert.equal(e.carregandoProjeto, false);
});

test('estúdio: projeto com foto espera o modelo, prepara a foto e a marca como pronta', async () => {
  const { estudio } = montar({ manifestos: [manifesto({ temFoto: true })] });
  await estudio.iniciar();
  assert.equal(estudio.estado.foto.id, 'base0000aaaa');
  assert.equal(estudio.estado.fotoPronta, true);
  assert.equal(estudio.estado.infoFoto, 'Foto do projeto.');
  assert.equal(estudio.estado.servidor.texto, 'modelo pronto');
});

test('estúdio: roteiro personalizado abre as cenas e editar cenas salva o texto', async () => {
  const { estudio, gerente } = montar({ manifestos: [manifesto()] });
  await estudio.iniciar();
  estudio.escolherRoteiro('Estações do ano');
  assert.match(estudio.estado.configuracao.cenas, /spring/);
  assert.equal(estudio.estado.cenasAbertas, false);
  assert.equal(gerente.configuracoes.at(-1).cenas, undefined, 'cenas de roteiro pronto não vão para o manifesto');

  estudio.escolherRoteiro('Personalizado');
  assert.equal(estudio.estado.cenasAbertas, true);
  assert.match(estudio.estado.configuracao.cenas, /spring/, 'o texto continua o mesmo');

  estudio.editarCenas('photo of {eu} on the moon');
  assert.equal(estudio.estado.configuracao.roteiro, 'Personalizado');
  assert.equal(gerente.configuracoes.at(-1).cenas, 'photo of {eu} on the moon');
});

test('estúdio: palco salva só formato e ritmo', async () => {
  const { estudio, gerente } = montar({ manifestos: [manifesto()] });
  await estudio.iniciar();
  estudio.definirRitmo({ fps: 12 });
  assert.deepEqual(gerente.configuracoes.at(-1), { formato: '9:16', ritmo: { fps: 12, transicao: 0.6 } });
});

test('estúdio: foto sem rosto mostra a mensagem do detector', async () => {
  const { estudio } = montar({
    manifestos: [manifesto()],
    prepararFoto: async () => { throw new ErroDeRosto('Não achei um rosto nessa foto.'); },
  });
  await estudio.iniciar();
  await estudio.escolherFoto(new File(['x'], 'a.png'));
  assert.equal(estudio.estado.infoFoto, 'Não achei um rosto nessa foto.');
  assert.equal(estudio.estado.foto, null);
});

test('estúdio: gerar sem cenas avisa e não chama a sessão', async () => {
  const { estudio, sessao } = montar({ manifestos: [manifesto()] });
  await estudio.iniciar();
  estudio.editarCenas('   ');
  estudio.gerar();
  assert.equal(estudio.estado.infoGeracao, 'Escreva pelo menos uma cena em Editar cenas.');
  assert.equal(sessao.pedido, undefined);
});

test('estúdio: gerar acompanha a sessão até o fim', async () => {
  const { estudio, sessao } = montar({ manifestos: [manifesto()] });
  await estudio.iniciar();
  await estudio.escolherFoto(new File(['x'], 'eu.png'));
  assert.equal(estudio.estado.infoFoto, 'Rosto encontrado em eu.png.');
  estudio.definirQuadros('12');
  estudio.gerar();
  assert.equal(sessao.pedido.total, 12);
  assert.equal(sessao.pedido.base.id, 'base0000bbbb');
  assert.equal(sessao.pedido.prompts.length, 5, 'uma por cena do roteiro');
  assert.equal(estudio.estado.gerando, true);

  sessao.emitir('proximo', { indice: 0, cena: 'amanhecer', segundos: 10 });
  assert.equal(estudio.estado.proximo.cena, 'amanhecer');
  sessao.emitir('quadro', { canvas: canvasFalso('q0'), indice: 0, cena: 'amanhecer' });
  sessao.emitir('progresso', { feitos: 1, total: 12, segPorQuadro: 10 });
  assert.equal(estudio.estado.contagem, '1 de 12');
  assert.equal(estudio.estado.infoGeracao, 'Faltam cerca de 1 min 50 s.');

  estudio.parar();
  assert.equal(estudio.estado.parando, true);
  assert.equal(sessao.cancelada, true);
  sessao.emitir('fim', { motivo: 'cancelado', feitos: 1, total: 12, segundos: 10, segPorQuadro: 10 });
  assert.equal(estudio.estado.gerando, false);
  assert.equal(estudio.estado.proximo, null);
  assert.equal(estudio.estado.segPorQuadro, 10);
  assert.equal(estudio.estado.infoGeracao, 'Parado com 1 de 12 quadros.');
});

test('estúdio: o que fica habilitado em cada momento', () => {
  const base = { pronto: true, foto: {}, projeto: {}, quadrosAtivos: 2, infoFoto: TEXTO_DA_FOTO };
  assert.deepEqual(controles(base), { gerar: true, gerarRosto: true, tocar: true, gravar: true, projetos: true });
  assert.equal(controles({ ...base, foto: null }).gerar, false);
  assert.equal(controles({ ...base, pronto: false, gerando: true }).gerar, true, 'Parar continua disponível');
  assert.deepEqual(controles({ ...base, gravando: true }), { gerar: true, gerarRosto: false, tocar: true, gravar: false, projetos: false });
  assert.deepEqual(controles({ ...base, quadrosAtivos: 1 }).tocar, false);
  assert.equal(controles({ ...base, projeto: null }).projetos, false);
});
