// Campos de formulário com a borda vinho da cabine.
import { useEffect, useRef } from 'react';
import { classesDoBotao } from '../Botao/Botao.jsx';
import estilos from './Campos.module.css';

const juntar = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Texto ou número. `aoConfirmar(valor)` dispara no evento nativo "change" (ao sair do campo ou
 * apertar Enter), para ações que não devem rodar a cada tecla, como renomear.
 */
export function CampoDeTexto({ type = 'text', aoConfirmar, className, ...resto }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!aoConfirmar) return undefined;
    const campo = ref.current;
    const confirmar = () => aoConfirmar(campo.value, campo);
    campo.addEventListener('change', confirmar);
    return () => campo.removeEventListener('change', confirmar);
  }, [aoConfirmar]);
  return <input ref={ref} type={type} className={juntar(estilos.campo, className)} {...resto} />;
}

export function AreaDeTexto({ className, ...resto }) {
  return <textarea className={juntar(estilos.campo, estilos.area, className)} {...resto} />;
}

/** opcoes: [{ valor, rotulo }] */
export function Selecao({ opcoes, className, ...resto }) {
  return (
    <select className={juntar(estilos.campo, estilos.selecao, className)} {...resto}>
      {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
    </select>
  );
}

/** Botão de contorno que abre o seletor de arquivos. Pode escolher o mesmo arquivo de novo. */
export function EscolherArquivo({ id, rotulo, accept, aoEscolher, disabled, className }) {
  return (
    <label className={classesDoBotao({ className: juntar(estilos.arquivo, className) })}>
      <input
        type="file" id={id} accept={accept} disabled={disabled}
        onChange={(e) => {
          if (e.target.files[0]) aoEscolher(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <span>{rotulo}</span>
    </label>
  );
}
