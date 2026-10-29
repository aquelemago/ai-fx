// O que o palco mostra (formato, ritmo, gravação, download) e o que ele pode fazer.
import { useEstado, useEstudio } from '../../app/contexto.js';
import { controles } from '../../nucleo/estudio/estudio.js';

export function usePalco() {
  const estudio = useEstudio();
  const e = useEstado();
  const pode = controles(e);

  let rotuloDeGravar = e.jaGravou ? 'Gravar de novo' : 'Gravar vídeo';
  if (e.gravacao !== null) rotuloDeGravar = `Gravando ${Math.round(e.gravacao * 100)}%`;

  return {
    formato: e.configuracao.formato,
    ritmo: e.configuracao.ritmo,
    vazio: !e.foto && !e.videoFonte,
    tocando: e.tocando,
    podeTocar: pode.tocar,
    podeGravar: pode.gravar,
    rotuloDeGravar,
    video: e.video,

    tocar: () => estudio.tocar(),
    gravar: () => estudio.gravarVideo(),
    definirFormato: (formato) => estudio.definirFormato(formato),
    definirRitmo: (parte) => estudio.definirRitmo(parte),
  };
}
