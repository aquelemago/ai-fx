// O que a coluna de montagem mostra e o que ela pode fazer, a partir do estado do estúdio.
import { useEstado, useEstudio } from '../../app/contexto.js';
import { SO_A_IMAGEM } from '../../nucleo/dominio/roteiros.js';
import { baseAtual, controles, segPorQuadroDaBase, totalDeQuadros } from '../../nucleo/estudio/estudio.js';
import { formatarTempo } from '../../nucleo/util/tempo.js';

export function useMontagem() {
  const estudio = useEstudio();
  const e = useEstado();
  const c = e.configuracao;
  const pode = controles(e);
  const total = totalDeQuadros(e);

  return {
    servidor: e.servidor,
    configuracao: c,
    foto: { canvas: baseAtual(e)?.canvas ?? null, pronta: e.fotoPronta, info: e.infoFoto },
    estimativa: `Cerca de ${formatarTempo(total * segPorQuadroDaBase(e))} no seu processador.`,
    // com um vídeo como base, a quantidade vem dele e os ajustes de foto parada não valem
    quadrosDoVideo: e.videoFonte?.total ?? null,
    podeEscolherQuadros: !e.videoFonte,
    podeAjustarFoto: !e.videoFonte,
    podeEditarCenas: c.roteiro !== SO_A_IMAGEM,
    gerar: {
      rotulo: e.gerando ? (e.parando ? 'Parando…' : 'Parar') : `Gerar ${total} quadros`,
      habilitado: pode.gerar,
      emAndamento: e.gerando,
      aoClicar: () => (e.gerando ? estudio.parar() : estudio.gerar()),
    },
    progresso: e.progresso,
    infoGeracao: e.infoGeracao,
    podeGerarRosto: pode.gerarRosto,
    podeEscolherBase: pode.escolherBase,

    escolherFoto: (arquivo) => estudio.escolherFoto(arquivo),
    escolherVideo: (arquivo) => estudio.escolherVideo(arquivo),
    gerarRosto: () => estudio.gerarRosto(),
    definirDescricao: (texto) => estudio.definirDescricao(texto),
    escolherRoteiro: (nome) => estudio.escolherRoteiro(nome),
    editarCenas: (texto) => estudio.editarCenas(texto),
    definirQuadros: (n) => estudio.definirQuadros(n),
    definirAjuste: (nome, valor) => estudio.definirAjuste(nome, valor),
  };
}
