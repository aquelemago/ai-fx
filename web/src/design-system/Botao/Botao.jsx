// Botão da cabine em quatro variantes:
//   linha      contorno, o botão comum (tom "perigo" para ações destrutivas)
//   principal  placa amarela de largura total; `emAndamento` a deixa vazada (ex.: Parar)
//   icone      quadrado 40×40 só com ícone (exige `aria-label`)
//   discreto   sem borda, meio apagado, na cor do texto em volta (exige `aria-label`)
// `como="a"` desenha um link com a mesma aparência (ex.: Baixar).
import estilos from './Botao.module.css';

/** Classes de um botão, para elementos que só se parecem com um (ex.: o rótulo de EscolherArquivo). */
export function classesDoBotao({ variante = 'linha', tom, emAndamento = false, className } = {}) {
  return [estilos[variante], tom && estilos[tom], emAndamento && estilos.emAndamento, className]
    .filter(Boolean).join(' ');
}

export function Botao({ variante, tom, emAndamento, className, como: Elemento = 'button', ...resto }) {
  const props = Elemento === 'button' ? { type: 'button', ...resto } : resto;
  return <Elemento className={classesDoBotao({ variante, tom, emAndamento, className })} {...props} />;
}
