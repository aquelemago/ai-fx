// Projeto aberto, lista de projetos e as ações da barra (abrir, criar, renomear, excluir).
import { useEstado, useEstudio } from '../../app/contexto.js';
import { controles } from '../../nucleo/estudio/estudio.js';

export function useProjetos() {
  const estudio = useEstudio();
  const e = useEstado();
  const atual = e.projeto;
  return {
    id: atual?.id,
    nome: atual?.nome ?? '',
    pasta: atual ? `Tudo deste projeto fica em projetos/${atual.id}/` : '',
    opcoes: e.projetos.map((p) => ({ valor: p.id, rotulo: p.nome })),
    // trocar de projeto no meio de uma geração ou gravação deixaria o trabalho pela metade
    habilitado: controles(e).projetos,

    abrir: (id) => estudio.abrirProjeto(id),
    novo: () => estudio.novoProjeto(),
    renomear: (nome) => estudio.renomearProjeto(nome),
    excluir: () => estudio.excluirProjeto(),
  };
}
