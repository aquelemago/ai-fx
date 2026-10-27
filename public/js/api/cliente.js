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

  /** Guarda o quadro final em saidas/<id>/final_XXXX.png. Falhas aqui não interrompem nada. */
  salvarQuadro(baseId, indice, png) {
    return this.pedir(`/salvar/${baseId}/${indice}`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png })
      .catch(() => {});
  }
}
