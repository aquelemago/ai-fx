// Coluna de montagem: foto, descrição, roteiro, quantidade de quadros, botão Gerar e ajustes finos.
import { PERSONALIZADO, ROTEIROS, montarPrompts } from '../dominio/roteiros.js';
import { $, marcarOpcao, opcaoMarcada, valorNumerico } from '../util/dom.js';
import { lerPreferencia, salvarPreferencia } from '../util/preferencias.js';
import { formatarTempo } from '../util/tempo.js';

export class PainelDeMontagem {
  /** aoEscolherFoto(arquivo), aoGerarRosto(), aoGerar(), aoParar() */
  constructor({ aoEscolherFoto, aoGerarRosto, aoGerar, aoParar }) {
    this.gerando = false;
    this.segPorQuadro = Number(lerPreferencia('segPorQuadro', 12)) || 12;
    this.montarRoteiros();

    $('eu').value = lerPreferencia('eu', $('eu').value);
    $('eu').addEventListener('input', () => salvarPreferencia('eu', $('eu').value));
    $('quantidades').addEventListener('change', () => this.atualizarEstimativa());
    $('arquivo').addEventListener('change', (e) => e.target.files[0] && aoEscolherFoto(e.target.files[0]));
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
    if (!marcarOpcao('roteiro', lerPreferencia('roteiro', 'Um dia inteiro'))) marcarOpcao('roteiro', 'Um dia inteiro');
    const r = ROTEIROS[opcaoMarcada('roteiro')];
    $('prompts').value = r ? r.cenas.join('\n') : lerPreferencia('cenas', '') || ROTEIROS['Um dia inteiro'].cenas.join('\n');

    $('roteiros').addEventListener('change', () => {
      const escolhido = ROTEIROS[opcaoMarcada('roteiro')];
      if (escolhido) $('prompts').value = escolhido.cenas.join('\n');
      else $('roteiros').closest('fieldset').querySelector('details').open = true;
      salvarPreferencia('roteiro', opcaoMarcada('roteiro'));
    });
    $('prompts').addEventListener('input', () => {
      marcarOpcao('roteiro', PERSONALIZADO);
      salvarPreferencia('roteiro', PERSONALIZADO);
      salvarPreferencia('cenas', $('prompts').value);
    });
  }

  /** O que o usuário pediu, pronto para a sessão de geração. Lança erro se faltar cena. */
  lerPedido() {
    const prompts = montarPrompts($('prompts').value, $('eu').value);
    if (!prompts.length) throw new Error('Escreva pelo menos uma cena em Editar cenas.');
    return {
      prompts,
      nomes: ROTEIROS[opcaoMarcada('roteiro')]?.nomes,
      total: this.totalDeQuadros(),
      ajustes: {
        forca: valorNumerico('forca'),
        passos: valorNumerico('passos'),
        suavidade: valorNumerico('suavidade'),
        rosto: valorNumerico('rosto'),
        harmonia: valorNumerico('harmonia'),
        semente: valorNumerico('semente'),
      },
    };
  }

  totalDeQuadros() {
    return Number(opcaoMarcada('quadros'));
  }

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

  /** Troca a descrição da pessoa (campo "Você") e guarda como preferência. */
  definirDescricao(texto) {
    $('eu').value = texto;
    salvarPreferencia('eu', texto);
  }

  avisarParando() {
    $('gerar').textContent = 'Parando…';
  }

  mostrarFotoPronta(nomeDoArquivo) {
    $('base').classList.add('pronta');
    this.infoFoto(`Rosto encontrado em ${nomeDoArquivo}.`);
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
