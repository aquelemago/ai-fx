// A tira mostra as cópias da mais nova (no topo) para a mais velha, e a vaga do próximo quadro.
import { useEffect, useState } from 'react';
import { useEstado, useEstudio } from '../../app/contexto.js';

export function useTira() {
  const estudio = useEstudio();
  const e = useEstado();
  return {
    quadros: [...e.quadros].reverse(),
    atual: e.quadroAtual,
    proximo: e.proximo,
    contagem: e.contagem,
    escolher: (quadro) => estudio.irPara(quadro),
    alternarFora: (quadro) => estudio.alternarFora(quadro),
  };
}

const restante = (fim) => Math.max(0, Math.ceil((fim - performance.now()) / 1000));

/** Segundos que faltam até `fim` (relógio do performance.now), atualizados quatro vezes por segundo. */
export function useContagemRegressiva(fim) {
  const [segundos, setSegundos] = useState(() => restante(fim));
  useEffect(() => {
    const atualizar = () => setSegundos(restante(fim));
    atualizar();
    const relogio = setInterval(atualizar, 250);
    return () => clearInterval(relogio);
  }, [fim]);
  return segundos;
}
