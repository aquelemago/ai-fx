// A tira de cópias: uma por quadro, a mais nova no topo, logo abaixo da fenda.
// Escuta a coleção de quadros; quem gera não precisa saber que a tira existe.
import { $ } from '../util/dom.js';

const doisDigitos = (n) => String(n).padStart(2, '0');

export class Tira {
  /** quadros: ColecaoDeQuadros; aoEscolher(quadro) ao clicar numa cópia */
  constructor({ quadros, aoEscolher }) {
    this.quadros = quadros;
    this.aoEscolher = aoEscolher;
    this.elementos = new Map(); // quadro -> <li>
    this.contagemRegressiva = null;

    quadros.addEventListener('mudou', ({ detail: { tipo, quadro } }) => {
      if (tipo === 'adicionado') this.adicionar(quadro);
      if (tipo === 'alterado') this.atualizarRisco(quadro);
      if (tipo === 'limpo') this.limpar();
    });
  }

  adicionar(q) {
    const li = document.createElement('li');
    li.innerHTML = `<canvas width="224" height="224"></canvas>
      <svg class="risco" aria-hidden="true"><use href="#i-risco"/></svg>
      <div class="rodape"><span>${doisDigitos(q.indice + 1)} · ${q.cena}</span>
      <button class="riscar"><svg><use href="#i-riscar"/></svg></button></div>`;
    li.querySelector('canvas').getContext('2d').drawImage(q.canvas, 0, 0, 224, 224);
    li.addEventListener('animationend', () => (li.style.animation = 'none'), { once: true });
    li.querySelector('canvas').addEventListener('click', () => this.aoEscolher(q));
    li.querySelector('.riscar').addEventListener('click', () => this.quadros.alternarFora(q));
    this.elementos.set(q, li);
    this.atualizarRisco(q);

    // a mais nova cai logo abaixo da vaga do próximo
    const prox = $('tira').querySelector('.proximo');
    prox ? prox.after(li) : $('tira').prepend(li);
  }

  atualizarRisco(q) {
    const li = this.elementos.get(q);
    li.classList.toggle('fora', q.fora);
    const n = q.indice + 1;
    const botao = li.querySelector('.riscar');
    botao.setAttribute('aria-label', q.fora ? `Voltar o quadro ${n} para o vídeo` : `Tirar o quadro ${n} do vídeo`);
    botao.querySelector('use').setAttribute('href', q.fora ? '#i-voltar' : '#i-riscar');
  }

  /** Vaga do próximo quadro no topo, com a contagem regressiva do tempo estimado. */
  mostrarProximo(indice, cena, segundos) {
    this.pararContagem();
    let li = $('tira').querySelector('.proximo');
    if (!li) {
      li = document.createElement('li');
      li.className = 'proximo';
      li.innerHTML = '<div class="digito"></div><div class="rodape"><span></span></div>';
    }
    $('tira').prepend(li);
    li.querySelector('.rodape span').textContent = `${doisDigitos(indice + 1)} · ${cena}`;
    const fim = performance.now() + segundos * 1000;
    const digito = li.querySelector('.digito');
    const tick = () => (digito.textContent = Math.max(0, Math.ceil((fim - performance.now()) / 1000)));
    tick();
    this.contagemRegressiva = setInterval(tick, 250);
  }

  removerProximo() {
    this.pararContagem();
    $('tira').querySelector('.proximo')?.remove();
  }

  pararContagem() {
    clearInterval(this.contagemRegressiva);
  }

  marcarAtual(q) {
    this.atual?.classList.remove('atual');
    this.atual = this.elementos.get(q);
    this.atual?.classList.add('atual');
  }

  contagem(feitos, total) {
    $('contagem').textContent = `${feitos} de ${total}`;
  }

  limpar() {
    this.removerProximo();
    this.elementos.clear();
    this.atual = null;
    $('tira').innerHTML = '';
    $('contagem').textContent = '';
  }
}
