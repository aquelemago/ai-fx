// Coluna de montagem: foto, descrição, roteiro, quantidade de quadros, botão Gerar e ajustes finos.
// A configuração pertence ao projeto aberto: a tela avisa cada mudança (aoMudarConfiguracao) e
// aplica a configuração de um projeto quando ele é aberto (aplicarConfiguracao).
import { PERSONALIZADO, ROTEIROS, montarPrompts } from '../dominio/roteiros.js';
import { $, marcarOpcao, opcaoMarcada, valorNumerico } from '../util/dom.js';
import { lerPreferencia, salvarPreferencia } from '../util/preferencias.js';
import { formatarTempo } from '../util/tempo.js';

const ROTEIRO_PADRAO = 'Um dia inteiro';
const AJUSTES = ['forca', 'passos', 'suavidade', 'rosto', 'harmonia', 'naturalidade', 'continuidade', 'semente'];
const TEXTO_DA_FOTO = 'De frente, com o rosto bem iluminado.';

export class PainelDeMontagem {
  /** aoEscolherFoto(arquivo), aoGerarRosto(), aoGerar(), aoParar(), aoMudarConfiguracao(configuracao) */
  constructor({ aoEscolherFoto, aoGerarRosto, aoGerar, aoParar, aoMudarConfiguracao }) {
    this.gerando = false;
    this.aplicando = false;
    // velocidade da máquina, não do projeto: fica no navegador
    this.segPorQuadro = Number(lerPreferencia('segPorQuadro', 12)) || 12;
    this.montarRoteiros();
    this.padrao = this.lerConfiguracao(); // valores do HTML: base para projetos sem configuração

    const mudou = () => {
      if (!this.aplicando) aoMudarConfiguracao(this.lerConfiguracao());
    };
    for (const id of ['eu', 'prompts', ...AJUSTES]) $(id).addEventListener('input', mudou);
    $('roteiros').addEventListener('change', mudou);
    $('quantidades').addEventListener('change', () => {
      this.atualizarEstimativa();
      mudou();
    });

    $('arquivo').addEventListener('change', (e) => {
      if (e.target.files[0]) aoEscolherFoto(e.target.files[0]);
      e.target.value = ''; // permite escolher a mesma foto de novo
    });
    $('gerar').addEventListener('click', () => (this.gerando ? aoParar() : aoGerar()));
    $('gerarRosto').addEventListener('click', aoGerarRosto);
    this.atualizarEstimativa();
  }

  montarRoteiros() {
    for (const nome of [...Object.keys(ROTEIROS), PERSONALIZADO]) {
      const n = ROTEIROS[nome]?.cenas.length;
      const rotulo = document.createElement('label');
      rotulo.innerHTML = `<input type="radio" name="roteiro" value="${nome}"><span>${nome}<small>${n ? `${n} cenas` : 'suas cenas'}</small></span>`;
      $('roteiros').append(rotulo);
    }
    this.escolherRoteiro(ROTEIRO_PADRAO);

    $('roteiros').addEventListener('change', () => {
      const escolhido = ROTEIROS[opcaoMarcada('roteiro')];
      if (escolhido) $('prompts').value = escolhido.cenas.join('\n');
      else $('prompts').focus(); // cenas personalizadas: o textarea já está visível na aba Cenas
    });
    $('prompts').addEventListener('input', () => marcarOpcao('roteiro', PERSONALIZADO));
  }

  escolherRoteiro(nome, cenas) {
    if (!marcarOpcao('roteiro', nome)) marcarOpcao('roteiro', ROTEIRO_PADRAO);
    const r = ROTEIROS[opcaoMarcada('roteiro')];
    $('prompts').value = r ? r.cenas.join('\n') : cenas ?? '';
  }

  // ---------- configuração do projeto ----------

  lerConfiguracao() {
    const roteiro = opcaoMarcada('roteiro');
    const cfg = {
      descricao: $('eu').value,
      roteiro,
      quadros: this.totalDeQuadros(),
      ajustes: Object.fromEntries(AJUSTES.map((id) => [id, valorNumerico(id)])),
    };
    if (roteiro === PERSONALIZADO) cfg.cenas = $('prompts').value;
    return cfg;
  }

  aplicarConfiguracao(configuracao = {}) {
    const c = { ...this.padrao, ...configuracao, ajustes: { ...this.padrao.ajustes, ...configuracao.ajustes } };
    this.aplicando = true;
    $('eu').value = c.descricao;
    this.escolherRoteiro(c.roteiro, c.cenas);
    if (!marcarOpcao('quadros', c.quadros)) marcarOpcao('quadros', this.padrao.quadros);
    for (const id of AJUSTES) {
      $(id).value = c.ajustes[id];
      $(id).dispatchEvent(new Event('input')); // atualiza o número mostrado ao lado do controle
    }
    this.aplicando = false;
    this.atualizarEstimativa();
  }

  /** O que o usuário pediu, pronto para a sessão de geração. Lança erro se faltar cena. */
  lerPedido() {
    const prompts = montarPrompts($('prompts').value, $('eu').value);
    if (!prompts.length) throw new Error('Escreva pelo menos uma cena em Editar cenas.');
    const { ajustes, quadros } = this.lerConfiguracao();
    return { prompts, nomes: ROTEIROS[opcaoMarcada('roteiro')]?.nomes, total: quadros, ajustes };
  }

  totalDeQuadros() {
    return Number(opcaoMarcada('quadros'));
  }

  /** Troca a descrição da pessoa (campo "Você") e avisa como qualquer outra mudança. */
  definirDescricao(texto) {
    $('eu').value = texto;
    $('eu').dispatchEvent(new Event('input'));
  }

  // ---------- estado da geração ----------

  atualizarEstimativa(segPorQuadro) {
    if (segPorQuadro) {
      this.segPorQuadro = segPorQuadro;
      salvarPreferencia('segPorQuadro', segPorQuadro.toFixed(1));
    }
    const total = this.totalDeQuadros();
    $('estimativa').textContent = `Cerca de ${formatarTempo(total * this.segPorQuadro)} no seu processador.`;
    if (!this.gerando) $('gerar').textContent = `Gerar ${total} quadros`;
  }

  definirGerando(gerando) {
    this.gerando = gerando;
    $('gerar').classList.toggle('parar', gerando);
    if (gerando) {
      $('gerar').textContent = 'Parar';
      $('progresso').style.width = '0';
    } else {
      this.atualizarEstimativa();
    }
  }

  habilitarGerar(habilitado) {
    $('gerar').disabled = !this.gerando && !habilitado;
  }

  habilitarRosto(habilitado) {
    $('gerarRosto').disabled = !habilitado;
  }

  avisarParando() {
    $('gerar').textContent = 'Parando…';
  }

  // ---------- foto ----------

  mostrarFotoPronta(texto) {
    $('base').classList.add('pronta');
    this.infoFoto(texto);
  }

  limparFoto() {
    const c = $('base');
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    c.classList.remove('pronta');
    this.infoFoto(TEXTO_DA_FOTO);
  }

  infoFoto(texto) {
    $('infoBase').textContent = texto;
  }

  infoGeracao(texto) {
    $('infoGeracao').textContent = texto;
  }

  progresso(fracao) {
    $('progresso').style.width = `${fracao * 100}%`;
  }
}
