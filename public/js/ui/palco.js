// Palco: a prévia e a barra de reprodução (tocar, ritmo, transição, formato, gravar, baixar).
import { FORMATOS, FORMATO_PADRAO } from '../dominio/formatos.js';
import { $, marcarOpcao, opcaoMarcada, valorNumerico } from '../util/dom.js';
import { lerPreferencia, salvarPreferencia } from '../util/preferencias.js';

export class Palco {
  /** aoTocar(), aoMudarFormato(formato), aoGravar() */
  constructor({ aoTocar, aoMudarFormato, aoGravar }) {
    const salvo = lerPreferencia('formato', FORMATO_PADRAO);
    marcarOpcao('formato', FORMATOS[salvo] ? salvo : FORMATO_PADRAO);

    $('tocar').addEventListener('click', aoTocar);
    $('exportar').addEventListener('click', aoGravar);
    document.querySelector('.formato').addEventListener('change', () => {
      salvarPreferencia('formato', this.formato());
      this.aplicarFormato();
      aoMudarFormato(this.formato());
    });
    this.aplicarFormato();
  }

  formato() {
    return opcaoMarcada('formato');
  }

  aplicarFormato() {
    $('moldura').dataset.formato = this.formato();
  }

  ritmo() {
    return { fps: valorNumerico('fps'), transicao: valorNumerico('transicao') };
  }

  mostrarTocando(tocando) {
    $('tocar').setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar');
    $('tocar').querySelector('use').setAttribute('href', tocando ? '#i-pausar' : '#i-tocar');
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
