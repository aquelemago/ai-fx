// Seção da coluna de montagem: título em rótulo e o conteúdo logo abaixo.
// `conjunto` usa fieldset/legend (para grupos de rádios); `para` liga o título a um campo.
import rotulo from '../rotulo.module.css';
import estilos from './Grupo.module.css';

export function Grupo({ titulo, para, conjunto = false, className, children }) {
  const classeDoTitulo = `${rotulo.rotulo} ${estilos.titulo}`;
  const classe = [estilos.grupo, className].filter(Boolean).join(' ');
  if (conjunto) {
    return <fieldset className={classe}><legend className={classeDoTitulo}>{titulo}</legend>{children}</fieldset>;
  }
  return (
    <section className={classe}>
      <h2 className={classeDoTitulo}>{para ? <label htmlFor={para}>{titulo}</label> : titulo}</h2>
      {children}
    </section>
  );
}
