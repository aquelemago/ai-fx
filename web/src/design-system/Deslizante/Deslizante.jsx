// Controle deslizante com rótulo e o valor atual ao lado. O valor é numérico:
// `aoMudar` recebe um Number e `formatar` decide como ele aparece (ex.: 8 → "8 q/s").
// O <label> rotula o primeiro elemento rotulável dentro dele, que é o <output>; por isso a faixa
// recebe o nome também por aria-label.
import rotulo from '../rotulo.module.css';
import estilos from './Deslizante.module.css';

export function Deslizante({ id, rotulo: texto, valor, min, max, passo, formatar = String, aoMudar, className }) {
  return (
    <label className={[rotulo.rotulo, estilos.deslizante, className].filter(Boolean).join(' ')}>
      {texto} <output htmlFor={id} className={estilos.valor}>{formatar(valor)}</output>
      <input
        type="range" id={id} className={estilos.faixa} aria-label={texto}
        min={min} max={max} step={passo} value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
      />
    </label>
  );
}
