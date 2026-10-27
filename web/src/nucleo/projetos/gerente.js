// Dono do projeto aberto: cria, abre, renomeia, exclui e salva automaticamente.
// Não mexe no DOM. criar, abrir e excluirAtual devolvem o manifesto do projeto que ficou aberto,
// para quem chamou carregar a tela. Eventos:
//   lista   { projetos }      a lista de projetos mudou
//   erro    { mensagem }      um salvamento falhou
import { nomeDoNovoProjeto, resumoDosQuadros } from '../dominio/projeto.js';
import { adiar } from '../util/adiar.js';

const PAUSA_PARA_SALVAR_MS = 600;

export class GerenteDeProjetos extends EventTarget {
  constructor({ cliente }) {
    super();
    this.cliente = cliente;
    this.atual = null;
    this.projetos = [];
    this.salvarDepois = adiar((id, mudancas) => this.salvar(id, mudancas), PAUSA_PARA_SALVAR_MS);
    this.pendente = {};
  }

  /** Abre o projeto mais recente, ou cria o primeiro. */
  async iniciar() {
    await this.atualizarLista();
    if (this.projetos.length) return this.abrir(this.projetos[0].id);
    return this.criar();
  }

  async atualizarLista() {
    this.projetos = await this.cliente.listarProjetos();
    this.emitir('lista', { projetos: this.projetos });
    return this.projetos;
  }

  async criar(nome = nomeDoNovoProjeto(this.projetos.map((p) => p.nome))) {
    await this.salvarAgora();
    const manifesto = await this.cliente.criarProjeto(nome);
    await this.atualizarLista();
    return this.mostrar(manifesto);
  }

  async abrir(id) {
    await this.salvarAgora();
    return this.mostrar(await this.cliente.lerProjeto(id));
  }

  async renomear(nome) {
    const manifesto = await this.cliente.atualizarProjeto(this.atual.id, { nome });
    this.atual = manifesto;
    await this.atualizarLista();
    return manifesto;
  }

  /** Exclui o projeto aberto (a pasta inteira) e abre o próximo, ou cria um novo. */
  async excluirAtual() {
    const id = this.atual.id;
    this.salvarDepois.cancelar(); // a pasta vai ser apagada; gravar antes só daria erro
    this.pendente = {};
    await this.cliente.excluirProjeto(id);
    this.atual = null;
    await this.atualizarLista();
    return this.projetos.length ? this.abrir(this.projetos[0].id) : this.criar();
  }

  mostrar(manifesto) {
    this.atual = manifesto;
    return manifesto;
  }

  // ---------- salvamento automático ----------

  /** Partes da configuração (montagem, palco) chegando juntas são somadas, não substituídas. */
  salvarConfiguracao(configuracao) {
    this.agendar({ configuracao: { ...this.pendente.configuracao, ...configuracao } });
  }

  salvarQuadros(lista) {
    this.agendar({ quadros: resumoDosQuadros(lista) });
  }

  agendar(mudancas) {
    if (!this.atual) return;
    this.pendente = { ...this.pendente, ...mudancas };
    this.salvarDepois(this.atual.id, this.pendente);
  }

  async salvar(id, mudancas) {
    this.pendente = {};
    try {
      const manifesto = await this.cliente.atualizarProjeto(id, mudancas);
      if (this.atual?.id === id) this.atual = manifesto;
    } catch (e) {
      this.emitir('erro', { mensagem: `Não consegui salvar o projeto: ${e.message}` });
    }
  }

  /** Grava na hora o que estiver esperando a pausa (antes de trocar ou fechar o projeto). */
  salvarAgora() {
    return this.salvarDepois.agora() ?? Promise.resolve();
  }

  emitir(tipo, detail) {
    this.dispatchEvent(new CustomEvent(tipo, { detail }));
  }
}
