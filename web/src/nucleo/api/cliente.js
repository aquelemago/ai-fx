// Único ponto de contato com o servidor. Erros viram ErroDaApi com a mensagem do servidor.
export class ErroDaApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

export class ClienteApi {
  constructor(base = '/api') {
    this.base = base;
  }

  async pedir(caminho, opcoes) {
    let resp;
    try {
      resp = await fetch(this.base + caminho, opcoes);
    } catch {
      throw new ErroDaApi('O servidor parou de responder. Confira o terminal e rode npm start de novo.', 0);
    }
    if (!resp.ok) {
      const { erro } = await resp.json().catch(() => ({}));
      throw new ErroDaApi(erro ?? `erro ${resp.status}`, resp.status);
    }
    return resp;
  }

  async status() {
    return (await this.pedir('/status')).json();
  }

  /** Envia a foto recortada e devolve o id dela no servidor. */
  async enviarBase(png) {
    const resp = await this.pedir('/base', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
    return (await resp.json()).id;
  }

  /** Gera um quadro e devolve a imagem (Blob PNG). */
  async gerarQuadro(parametros) {
    const resp = await this.pedir('/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parametros),
    });
    return resp.blob();
  }

  /** Gera um rosto novo do zero e devolve a imagem (Blob PNG). */
  async gerarRosto({ descricao, semente }) {
    const resp = await this.pedir('/rosto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao, semente }),
    });
    return resp.blob();
  }

  // ---------- projetos ----------

  async json(caminho, metodo = 'GET', corpo) {
    const opcoes = { method: metodo };
    if (corpo !== undefined) {
      opcoes.headers = { 'Content-Type': 'application/json' };
      opcoes.body = JSON.stringify(corpo);
    }
    const resp = await this.pedir(caminho, opcoes);
    return resp.status === 204 ? null : resp.json();
  }

  listarProjetos() {
    return this.json('/projetos');
  }

  criarProjeto(nome) {
    return this.json('/projetos', 'POST', { nome });
  }

  lerProjeto(id) {
    return this.json(`/projetos/${id}`);
  }

  /** mudancas: { nome?, configuracao?, quadros? } */
  atualizarProjeto(id, mudancas) {
    return this.json(`/projetos/${id}`, 'PATCH', mudancas);
  }

  excluirProjeto(id) {
    return this.json(`/projetos/${id}`, 'DELETE');
  }

  /** Grava a foto no projeto e devolve { baseId, manifesto }. */
  async definirFotoDoProjeto(id, png) {
    const resp = await this.pedir(`/projetos/${id}/foto`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png });
    return resp.json();
  }

  limparQuadros(id) {
    return this.json(`/projetos/${id}/quadros`, 'DELETE');
  }

  salvarQuadroFinal(id, indice, png) {
    return this.pedir(`/projetos/${id}/quadros/${indice}`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: png });
  }

  async salvarVideo(id, blob) {
    const resp = await this.pedir(`/projetos/${id}/videos`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
    return (await resp.json()).arquivo;
  }

  /** Endereço de um arquivo do projeto (foto.png, quadros/final_0000.png...). */
  urlDoArquivo(id, caminho) {
    return `/arquivos/${id}/${caminho}`;
  }
}
