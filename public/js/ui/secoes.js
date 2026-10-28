// Abas da coluna de montagem (Foto, Cenas, Ajustes): uma visível por vez, com foco de teclado.
// As seções são fixas na barra de topo; só o painel da esquerda troca. Palco e tira não mudam.
const SECAO_PADRAO = 'foto';

export function ligarSecoes() {
  const abas = [...document.querySelectorAll('.aba')];
  const paineis = [...document.querySelectorAll('.painel')];

  function mostrar(secao) {
    for (const aba of abas) {
      const ativa = aba.dataset.secao === secao;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    }
    for (const painel of paineis) {
      painel.hidden = painel.dataset.secao !== secao;
    }
  }

  abas.forEach((aba, i) => {
    aba.addEventListener('click', () => mostrar(aba.dataset.secao));
    // navegação por setas no tablist, como manda o padrão de abas acessível
    aba.addEventListener('keydown', (e) => {
      const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (passo === undefined) return;
      e.preventDefault();
      const proximo = abas[(i + passo + abas.length) % abas.length];
      mostrar(proximo.dataset.secao);
      proximo.focus();
    });
  });

  mostrar(SECAO_PADRAO);
}
