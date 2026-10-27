// A tira de cópias: uma por quadro, a mais nova no topo, logo abaixo da fenda. Clicar numa
// cópia leva a prévia até ela; riscar tira o quadro do vídeo (e voltar devolve).
import { useEffect, useRef, useState } from 'react';
import { Botao, Icone, Nota, tipografia } from '../../design-system/index.js';
import { useContagemRegressiva, useTira } from './useTira.js';
import estilos from './Tira.module.css';

const LADO_DA_MINIATURA = 224;
const doisDigitos = (n) => String(n).padStart(2, '0');
const juntar = (...classes) => classes.filter(Boolean).join(' ');

// cada quadro é um objeto novo a cada geração, mesmo com o mesmo índice: a chave segue o objeto
const chaves = new WeakMap();
let proximaChave = 0;
const chaveDe = (quadro) => {
  if (!chaves.has(quadro)) chaves.set(quadro, ++proximaChave);
  return chaves.get(quadro);
};

export function Tira() {
  const t = useTira();
  return (
    <aside className={estilos.tira} aria-labelledby="titulo-tira">
      <header className={estilos.cabecalho}>
        <h2 id="titulo-tira" className={tipografia.rotulo}>Tira</h2>
        <Nota como="span" id="contagem" className={estilos.contagem}>{t.contagem}</Nota>
      </header>
      <div className={estilos.fenda} aria-hidden="true" />
      <ol id="tira" className={estilos.lista}>
        {t.proximo && <Proximo {...t.proximo} />}
        {t.quadros.map((q) => (
          <Copia
            key={chaveDe(q)} quadro={q} atual={q === t.atual}
            aoEscolher={() => t.escolher(q)} aoRiscar={() => t.alternarFora(q)}
          />
        ))}
      </ol>
    </aside>
  );
}

function Copia({ quadro, atual, aoEscolher, aoRiscar }) {
  const miniatura = useRef(null);
  const [caiu, setCaiu] = useState(false); // a queda toca uma vez só, mesmo se a cópia mudar de lugar
  useEffect(() => {
    miniatura.current.getContext('2d').drawImage(quadro.canvas, 0, 0, LADO_DA_MINIATURA, LADO_DA_MINIATURA);
  }, [quadro]);
  const n = quadro.indice + 1;
  return (
    <li
      className={juntar(estilos.copia, quadro.fora && estilos.fora, atual && estilos.atual)}
      style={caiu ? { animation: 'none' } : undefined}
      onAnimationEnd={() => setCaiu(true)}
    >
      <canvas ref={miniatura} width={LADO_DA_MINIATURA} height={LADO_DA_MINIATURA} className={estilos.miniatura} onClick={aoEscolher} />
      <Icone nome="risco" className={estilos.risco} />
      <div className={estilos.rodape}>
        <span>{`${doisDigitos(n)} · ${quadro.cena}`}</span>
        <Botao
          variante="discreto" className={estilos.riscar} onClick={aoRiscar}
          aria-label={quadro.fora ? `Voltar o quadro ${n} para o vídeo` : `Tirar o quadro ${n} do vídeo`}
        >
          <Icone nome={quadro.fora ? 'voltar' : 'riscar'} />
        </Botao>
      </div>
    </li>
  );
}

/** Vaga do quadro que está sendo gerado, com a contagem regressiva do tempo estimado. */
function Proximo({ indice, cena, fim }) {
  const segundos = useContagemRegressiva(fim);
  return (
    <li className={juntar(estilos.copia, estilos.proximo)}>
      <div className={estilos.digito}>{segundos}</div>
      <div className={estilos.rodape}><span>{`${doisDigitos(indice + 1)} · ${cena}`}</span></div>
    </li>
  );
}
