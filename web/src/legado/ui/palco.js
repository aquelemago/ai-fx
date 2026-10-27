// Palco: a prévia e a barra de reprodução (tocar, ritmo, transição, formato, gravar, baixar).
// Formato e ritmo pertencem ao projeto aberto, como a configuração da montagem.
import { FORMATOS, FORMATO_PADRAO } from '../../nucleo/dominio/formatos.js';
import { $, marcarOpcao, opcaoMarcada, valorNumerico } from '../dom.js';

export class Palco {
  /** aoTocar(), aoMudarFormato(formato), aoGravar(), aoMudarConfiguracao({ formato, ritmo }) */
  constructor({ aoTocar, aoMudarFormato, aoGravar, aoMudarConfiguracao }) {
    this.aoMudarFormato = aoMudarFormato;
    marcarOpcao('formato', FORMATO_PADRAO);
    this.padrao = this.lerConfiguracao();
    this.aplicando = false;
    const mudou = () => {
      if (!this.aplicando) aoMudarConfiguracao(this.lerConfiguracao());
    };

    $('tocar').addEventListener('click', aoTocar);
    $('exportar').addEventListener('click', aoGravar);
    $('fps').addEventListener('input', mudou);
    $('transicao').addEventListener('input', mudou);
    document.querySelector('.formato').addEventListener('change', () => {
      this.aplicarFormato();
      mudou();
    });
    this.aplicarFormato();
  }

  lerConfiguracao() {
    return { formato: this.formato(), ritmo: this.ritmo() };
  }

  aplicarConfiguracao({ formato, ritmo } = {}) {
    this.aplicando = true;
    marcarOpcao('formato', FORMATOS[formato] ? formato : this.padrao.formato);
    const r = { ...this.padrao.ritmo, ...ritmo };
    for (const [id, valor] of [['fps', r.fps], ['transicao', r.transicao]]) {
      $(id).value = valor;
      $(id).dispatchEvent(new Event('input'));
    }
    this.aplicando = false;
    this.aplicarFormato();
  }

  formato() {
    return opcaoMarcada('formato');
  }

  aplicarFormato() {
    $('moldura').dataset.formato = this.formato();
    this.aoMudarFormato(this.formato());
  }

  ritmo() {
    return { fps: valorNumerico('fps'), transicao: valorNumerico('transicao') };
  }

  mostrarTocando(tocando) {
    $('tocar').setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar');
    $('tocar').querySelector('use').setAttribute('href', tocando ? '#i-pausar' : '#i-tocar');
  }

  mostrarVazio() {
    $('vazio').hidden = false;
  }

  esconderVazio() {
    $('vazio').hidden = true;
  }

  /** Habilita os controles conforme a quantidade de quadros que entram no vídeo. */
  habilitar(quadrosAtivos, gravando) {
    $('exportar').disabled = quadrosAtivos < 2 || gravando;
    $('tocar').disabled = quadrosAtivos < 2;
  }

  mostrarGravacao(fracao) {
    $('exportar').textContent = `Gravando ${Math.round(fracao * 100)}%`;
  }

  iniciarGravacao() {
    $('baixar').hidden = true;
  }

  terminarGravacao({ blob, extensao }) {
    $('exportar').textContent = 'Gravar de novo';
    const link = $('baixar');
    URL.revokeObjectURL(link.href);
    link.href = URL.createObjectURL(blob);
    link.download = `timelapse-${this.formato().replace(':', 'x')}.${extensao}`;
    link.hidden = false;
    link.focus();
  }

  esconderDownload() {
    $('baixar').hidden = true;
  }
}

/** Mostra o valor de cada slider no <output> ligado a ele. */
export function ligarSaidas(formatadores = {}) {
  for (const o of document.querySelectorAll('output')) {
    const entrada = $(o.htmlFor.value);
    const formatar = formatadores[entrada.id] ?? ((v) => v);
    const atualizar = () => (o.textContent = formatar(entrada.value));
    entrada.addEventListener('input', atualizar);
    atualizar();
  }
}
