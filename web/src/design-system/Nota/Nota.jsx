// Texto de apoio em tom secundário: dicas, estimativas e mensagens de andamento.
import estilos from './Nota.module.css';

export function Nota({ como: Elemento = 'p', className, ...resto }) {
  return <Elemento className={[estilos.nota, className].filter(Boolean).join(' ')} {...resto} />;
}
