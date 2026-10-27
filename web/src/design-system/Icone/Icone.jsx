// Ícones desenhados uma vez no sprite (SpriteDeIcones, no topo do App) e usados por nome.
// O tamanho vem de quem usa o ícone; a cor é a do texto (currentColor).

const SIMBOLOS = {
  tocar: <path d="M6 4.5v11l9-5.5z" fill="currentColor" />,
  pausar: <path d="M6 4.5h2.5v11H6zM11.5 4.5H14v11h-2.5z" fill="currentColor" />,
  baixar: <path d="M10 3.5v9M6 9l4 4 4-4M4 16.5h12" fill="none" stroke="currentColor" strokeWidth="2" />,
  riscar: <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="2" />,
  voltar: <path d="M4 10a6 6 0 1 0 2-4.5M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" />,
};

// o risco atravessa a cópia inteira da tira, então estica com ela
const RISCO = <path d="M0 100L100 0" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />;

export const NOMES_DE_ICONES = [...Object.keys(SIMBOLOS), 'risco'];

export function SpriteDeIcones() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      {Object.entries(SIMBOLOS).map(([nome, desenho]) => (
        <symbol key={nome} id={`i-${nome}`} viewBox="0 0 20 20">{desenho}</symbol>
      ))}
      <symbol id="i-risco" viewBox="0 0 100 100" preserveAspectRatio="none">{RISCO}</symbol>
    </svg>
  );
}

export function Icone({ nome, ...resto }) {
  return <svg aria-hidden="true" {...resto}><use href={`#i-${nome}`} /></svg>;
}
