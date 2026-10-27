// O estúdio chega aos componentes por contexto. Os hooks das funcionalidades usam estes dois:
//   useEstudio()  as ações (estudio.gerar(), estudio.escolherFoto(arquivo)...)
//   useEstado()   o estado atual; o componente redesenha a cada mudança
import { createContext, useContext, useSyncExternalStore } from 'react';

export const ContextoDoEstudio = createContext(null);

export function useEstudio() {
  const estudio = useContext(ContextoDoEstudio);
  if (!estudio) throw new Error('useEstudio precisa de um <ContextoDoEstudio value={estudio}> em volta');
  return estudio;
}

export function useEstado() {
  const estudio = useEstudio();
  return useSyncExternalStore(estudio.assinar, estudio.lerEstado);
}
