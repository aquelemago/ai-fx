// Regras de projeto: o que acontece quando a página cria, abre, altera ou exclui um projeto.
// Junta o repositório (disco) com o serviço de geração (a foto precisa ser preparada pelo modelo).
export class ServicoDeProjetos {
  constructor({ repositorio, geracao }) {
    this.repositorio = repositorio;
    this.geracao = geracao;
  }

  async listar() {
    const projetos = await this.repositorio.listar();
    return projetos.map((m) => ({
      id: m.id,
      nome: m.nome,
      criadoEm: m.criadoEm,
      atualizadoEm: m.atualizadoEm,
      temFoto: m.temFoto,
      quadros: m.quadros.length,
      videos: m.videos.length,
    }));
  }

  criar(nome) {
    return this.repositorio.criar(nome);
  }

  ler(id) {
    return this.repositorio.ler(id);
  }

  atualizar(id, mudancas) {
    return this.repositorio.atualizar(id, mudancas);
  }

  excluir(id) {
    return this.repositorio.excluir(id);
  }

  /** Guarda a foto no projeto e já a prepara no modelo. Devolve o id da foto para gerar quadros. */
  async definirFoto(id, png) {
    const manifesto = await this.repositorio.salvarFoto(id, png);
    const baseId = await this.geracao.prepararBase(png);
    return { baseId, manifesto };
  }

  limparQuadros(id) {
    return this.repositorio.limparQuadros(id);
  }

  salvarFinal(id, indice, png) {
    return this.repositorio.salvarQuadro(id, 'final', indice, png);
  }

  salvarVideo(id, extensao, buffer) {
    return this.repositorio.salvarVideo(id, extensao, buffer);
  }
}
