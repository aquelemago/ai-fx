// Escolha única entre poucas opções (rádios com cara de placa).
//   opcoes: [{ valor, rotulo, detalhe? }]   detalhe aparece à direita, só na disposição "lista"
//   disposicao: "segmentos" (lado a lado) ou "lista" (um embaixo do outro)
// Com `rotuloAcessivel`, o grupo vira um radiogroup com esse nome. `disabled` desliga todas as opções.
import estilos from './Segmentos.module.css';

export function Segmentos({ nome, opcoes, valor, aoMudar, disposicao = 'segmentos', rotuloAcessivel, disabled, className, ...resto }) {
  const grupo = rotuloAcessivel ? { role: 'radiogroup', 'aria-label': rotuloAcessivel } : {};
  return (
    <div className={[estilos[disposicao], className].filter(Boolean).join(' ')} {...grupo} {...resto}>
      {opcoes.map((o) => (
        <label key={o.valor} className={estilos.opcao}>
          <input
            type="radio" name={nome} value={o.valor}
            checked={String(valor) === String(o.valor)} disabled={disabled}
            onChange={() => aoMudar(o.valor)}
          />
          <span className={estilos.placa}>
            {o.rotulo ?? o.valor}
            {disposicao === 'lista' && o.detalhe && <small className={estilos.detalhe}>{o.detalhe}</small>}
          </span>
        </label>
      ))}
    </div>
  );
}
