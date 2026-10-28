// A tira mostra as cópias da mais nova (no topo) para a mais velha, e a vaga do próximo quadro.
import { useEffect, useState } from 'react';
import { useEstado, useEstudio } from '../../app/contexto.js';

export function useTira() {
  const estudio = useEstudio();
  const e = useEstado();
  // O contador vem dos quadros que existem e do total pedido: não mente quando o projeto
  // guarda menos quadros do que a configuração pede (ex.: 1 de 12), nem durante a geração.
  const feitos = e.quadros.length;
  const total = e.configuracao.quadros;
  return {
    quadros: [...e.quadros].reverse(),
    atual: e.quadroAtual,
    proximo: e.proximo,
    contagem: feitos ? `${feitos} de ${total}` : '',
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
