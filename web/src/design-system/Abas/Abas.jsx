// Navegação por abas (tablist acessível): uma visível por vez, foco de teclado com setas.
//   opcoes: [{ valor, rotulo }]   valor identifica a aba (e liga o painel), rotulo é o texto
//   valor:  a aba ativa (o valor de uma opção)
//   aoMudar(valor): chamado ao escolher uma aba (clique ou seta)
// A aba ativa fica com tabIndex 0 e as outras com -1 (roving tabindex); setas ←/→ percorrem.
import { useRef } from 'react';
import estilos from './Abas.module.css';

export function Abas({ opcoes, valor, aoMudar, rotuloAcessivel, className }) {
  const refs = useRef([]);

  const ir = (i) => {
    const alvo = opcoes[(i + opcoes.length) % opcoes.length];
    aoMudar(alvo.valor);
    refs.current[opcoes.indexOf(alvo)]?.focus();
  };
  const aoTeclar = (e, i) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(i - 1); }
  };

  return (
    <div
      className={[estilos.abas, className].filter(Boolean).join(' ')}
      role="tablist" aria-label={rotuloAcessivel}
    >
      {opcoes.map((o, i) => (
        <button
          key={o.valor}
          ref={(el) => { refs.current[i] = el; }}
          type="button" role="tab"
          id={`aba-${o.valor}`}
          aria-selected={o.valor === valor}
          aria-controls={`painel-${o.valor}`}
          tabIndex={o.valor === valor ? 0 : -1}
          className={estilos.aba}
          onClick={() => aoMudar(o.valor)}
          onKeyDown={(e) => aoTeclar(e, i)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
