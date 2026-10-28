// O que a coluna de montagem mostra e o que ela pode fazer, a partir do estado do estúdio.
import { useEstado, useEstudio } from '../../app/contexto.js';
import { controles } from '../../nucleo/estudio/estudio.js';
import { formatarTempo } from '../../nucleo/util/tempo.js';

export function useMontagem() {
  const estudio = useEstudio();
  const e = useEstado();
  const c = e.configuracao;
  const pode = controles(e);

  return {
    servidor: e.servidor,
    configuracao: c,
    foto: { canvas: e.foto?.canvas ?? null, pronta: e.fotoPronta, info: e.infoFoto },
    estimativa: `Cerca de ${formatarTempo(c.quadros * e.segPorQuadro)} no seu processador.`,
    gerar: {
      rotulo: e.gerando ? (e.parando ? 'Parando…' : 'Parar') : `Gerar ${c.quadros} quadros`,
      habilitado: pode.gerar,
      emAndamento: e.gerando,
      aoClicar: () => (e.gerando ? estudio.parar() : estudio.gerar()),
    },
    progresso: e.progresso,
    infoGeracao: e.infoGeracao,
    podeGerarRosto: pode.gerarRosto,

    escolherFoto: (arquivo) => estudio.escolherFoto(arquivo),
    gerarRosto: () => estudio.gerarRosto(),
    definirDescricao: (texto) => estudio.definirDescricao(texto),
    escolherRoteiro: (nome) => estudio.escolherRoteiro(nome),
    editarCenas: (texto) => estudio.editarCenas(texto),
    definirQuadros: (n) => estudio.definirQuadros(n),
    definirAjuste: (nome, valor) => estudio.definirAjuste(nome, valor),
  };
}
