// Bloco que abre e fecha (details/summary) com a seta da cabine.
// Sem `aberto` ele se controla sozinho; com `aberto` + `aoAlternar` quem usa decide.
import rotulo from '../rotulo.module.css';
import estilos from './Recolhivel.module.css';

export function Recolhivel({ resumo, aberto, aoAlternar, className, children }) {
  return (
    <details
      className={[estilos.recolhivel, className].filter(Boolean).join(' ')}
      open={aberto}
      onToggle={aoAlternar && ((e) => aoAlternar(e.currentTarget.open))}
    >
      <summary className={`${rotulo.rotulo} ${estilos.resumo}`}>{resumo}</summary>
      {children}
    </details>
  );
}
