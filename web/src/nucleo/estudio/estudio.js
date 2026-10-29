// O estúdio: o estado da tela e as ações do usuário (abrir projeto, escolher foto, gerar, gravar).
// Liga as peças do núcleo (cliente, detector, sessão, quadros, projetos) umas às outras, como o
// antigo main.js, mas sem DOM nem React: a interface lê `estado`, assina "mudou" e chama as ações.
// `estado` é trocado a cada mudança (nunca alterado no lugar), então serve de snapshot para o React.
import { ErroDaApi } from '../api/cliente.js';
import {
  CONFIGURACAO_PADRAO, comCenas, comRoteiro, completarConfiguracao, parteDaMontagem, parteDoPalco, pedidoDeGeracao,
} from '../dominio/configuracao.js';
import { arquivoDoQuadroFinal } from '../dominio/projeto.js';
import { ROTEIROS } from '../dominio/roteiros.js';
import { DURACAO_MAXIMA, QUADROS_POR_SEGUNDO } from '../dominio/video.js';
import { descricaoAleatoria, sementeAleatoria } from '../dominio/rostos.js';
import { ErroDeRosto } from '../rosto/erros.js';
import { lerPreferencia, salvarPreferencia } from '../util/preferencias.js';
import { formatarTempo } from '../util/tempo.js';

export const TEXTO_DA_FOTO = 'De frente, com o rosto bem iluminado.';
const TEXTO_DO_PROJETO_DE_VIDEO = 'Este projeto foi gerado de um vídeo. Escolha o vídeo de novo para gerar mais.';
const TENTATIVAS_DE_ROSTO = 3; // se o detector não achar um rosto bom, tenta outra semente
const INTERVALO_DO_STATUS_MS = 2000;

export class Estudio extends EventTarget {
  /**
   * cliente: ClienteApi          detector: DetectorDeRosto     quadros: ColecaoDeQuadros
   * sessao: SessaoDeGeracao      gerente: GerenteDeProjetos
   * prepararFoto(arquivo) → { canvas, pontos, mascara, lado }   (lança ErroDeRosto)
   * prepararVideo(arquivo) → { canvas, duracao, total, cortado, quadro(i), fechar() }
   * lerImagem(url) → canvas | null                               (quadros salvos do projeto)
   * gravar(canvas, duracao, desenhar, aoProgresso) → { blob, extensao }
   */
  constructor({ cliente, detector, quadros, sessao, gerente, prepararFoto, prepararVideo, lerImagem, gravar, buscar = (url) => fetch(url) }) {
    super();
    Object.assign(this, { cliente, detector, quadros, sessao, gerente, prepararFoto, prepararVideo, lerImagem, gravar, buscar });
    this.previa = null; // { player, canvas }, ligada pelo palco
    this.aberturaAtual = 0; // descarta o carregamento de um projeto se outro foi aberto no meio
    this.urlDoVideo = null;
    this.modeloPronto = new Promise((r) => (this.avisarModeloPronto = r));
    this.estado = {
      servidor: { texto: 'conectando…', tom: '', detalhe: '' },
      pronto: false,
      projetos: [],
      projeto: null,
      carregandoProjeto: false,
      configuracao: CONFIGURACAO_PADRAO,
      foto: null, // { id, canvas, pontos, mascara, lado }
      videoFonte: null, // vídeo escolhido como base; quando existe, vale no lugar da foto
      fotoPronta: false,
      infoFoto: TEXTO_DA_FOTO,
      gerandoRosto: false,
      gerando: false,
      parando: false,
      progresso: 0,
      infoGeracao: '',
      // velocidade da máquina, não do projeto: fica no navegador
      segPorQuadro: Number(lerPreferencia('segPorQuadro', 12)) || 12,
      segPorQuadroVideo: Number(lerPreferencia('segPorQuadroVideo', 12)) || 12, // o vídeo faz uma passada só por quadro
      quadros: [], // cópia da lista da coleção, trocada a cada mudança
      quadrosAtivos: 0,
      quadroAtual: null,
      proximo: null, // { indice, cena, fim } vaga do quadro sendo gerado, com o fim estimado
      tocando: true,
      gravando: false,
      gravacao: null, // fração gravada enquanto grava
      jaGravou: false,
      video: null, // { url, nome } do último vídeo gravado
    };
  }

  mudar(parcial) {
    this.estado = { ...this.estado, ...parcial };
    this.dispatchEvent(new Event('mudou'));
  }

  /** Para o useSyncExternalStore: assina as mudanças e devolve a função que cancela. */
  assinar = (aoMudar) => {
    this.addEventListener('mudou', aoMudar);
    return () => this.removeEventListener('mudou', aoMudar);
  };

  lerEstado = () => this.estado;

  // ---------- início ----------

  iniciar() {
    this.quadros.addEventListener('mudou', ({ detail: { tipo } }) => {
      if (!this.estado.carregandoProjeto) this.gerente.salvarQuadros(this.quadros.lista);
      const limpo = tipo === 'limpo' ? { proximo: null, quadroAtual: null } : {};
      this.mudar({ quadros: [...this.quadros.lista], quadrosAtivos: this.quadros.ativos().length, ...limpo });
    });
    this.gerente.addEventListener('lista', ({ detail }) => this.mudar({ projetos: detail.projetos }));
    this.gerente.addEventListener('erro', ({ detail }) => this.mudar({ infoGeracao: detail.mensagem }));
    this.ouvirSessao();
    this.detector.pronto.catch((e) => this.mudar({ infoFoto: `O detector de rosto não carregou: ${e.message}` }));
    this.acompanharServidor();
    return this.trocarDeProjeto(() => this.gerente.iniciar());
  }

  async acompanharServidor() {
    const mostrar = (texto, tom = '', detalhe = '') => {
      const pronto = tom === 'ok';
      if (pronto) this.avisarModeloPronto(); // a foto de um projeto só pode ser preparada depois disso
      this.mudar({ servidor: { texto, tom, detalhe }, pronto });
    };
    try {
      const s = await this.cliente.status();
      if (s.pronto) return mostrar('modelo pronto', 'ok');
      if (s.erro) return mostrar('erro no modelo', 'erro', s.erro);
      mostrar('carregando o modelo…');
    } catch {
      mostrar('servidor desligado', 'erro', 'Rode npm start na pasta do projeto.');
    }
    setTimeout(() => this.acompanharServidor(), INTERVALO_DO_STATUS_MS);
  }

  // ---------- projetos ----------

  abrirProjeto(id) {
    return this.trocarDeProjeto(() => this.gerente.abrir(id));
  }

  novoProjeto() {
    return this.trocarDeProjeto(() => this.gerente.criar());
  }

  excluirProjeto() {
    return this.trocarDeProjeto(() => this.gerente.excluirAtual());
  }

  /** Devolve o manifesto que ficou valendo, para a tela mostrar o nome certo mesmo se falhar. */
  async renomearProjeto(nome) {
    try {
      this.mudar({ projeto: await this.gerente.renomear(nome) });
    } catch (e) {
      this.mudar({ projeto: this.gerente.atual, infoGeracao: `Não consegui renomear: ${e.message}` });
    }
    return this.estado.projeto;
  }

  async trocarDeProjeto(acao) {
    this.mudar({ carregandoProjeto: true });
    try {
      await this.mostrarProjeto(await acao());
    } catch (e) {
      this.mudar({ infoGeracao: `Não consegui abrir o projeto: ${e.message}` });
    } finally {
      this.mudar({ carregandoProjeto: false });
    }
  }

  async mostrarProjeto(manifesto) {
    const minhaAbertura = ++this.aberturaAtual;
    const valendo = () => minhaAbertura === this.aberturaAtual;

    this.quadros.limpar();
    this.trocarVideoFonte(null);
    this.mudar({
      projetos: this.gerente.projetos,
      projeto: manifesto,
      foto: null,
      fotoPronta: false,
      infoFoto: TEXTO_DA_FOTO,
      infoGeracao: '',
      progresso: 0,
      video: null,
      configuracao: completarConfiguracao(manifesto.configuracao),
    });

    if (manifesto.temFoto) {
      this.mudar({ infoFoto: 'Abrindo a foto do projeto…' });
      await this.modeloPronto;
      const resp = await this.buscar(this.cliente.urlDoArquivo(manifesto.id, 'foto.png'));
      if (!valendo()) return;
      if (resp.ok) {
        await this.usarFoto(new File([await resp.blob()], 'foto.png', { type: 'image/png' }), { salvarNoProjeto: false });
        if (!valendo()) return;
        this.mudar({ fotoPronta: true, infoFoto: 'Foto do projeto.' });
      } else {
        this.mudar({ infoFoto: 'A foto deste projeto sumiu da pasta. Escolha outra.' });
      }
    } else if (manifesto.quadros.length) {
      this.mudar({ infoFoto: TEXTO_DO_PROJETO_DE_VIDEO });
    }

    const lista = [...manifesto.quadros].sort((a, b) => a.indice - b.indice);
    for (const q of lista) {
      const canvas = await this.lerImagem(this.cliente.urlDoArquivo(manifesto.id, arquivoDoQuadroFinal(q.indice)));
      if (!valendo()) return;
      if (!canvas) continue;
      const novo = this.quadros.adicionar({ canvas, indice: q.indice, cena: q.cena });
      if (q.fora) this.quadros.alternarFora(novo);
    }
  }

  // ---------- configuração (montagem e palco) ----------

  configurar(nova, parte) {
    this.mudar({ configuracao: nova });
    this.gerente.salvarConfiguracao(parte(nova));
  }

  definirDescricao(descricao) {
    this.configurar({ ...this.estado.configuracao, descricao }, parteDaMontagem);
  }

  escolherRoteiro(nome) {
    this.configurar(comRoteiro(this.estado.configuracao, nome), parteDaMontagem);
  }

  editarCenas(cenas) {
    this.configurar(comCenas(this.estado.configuracao, cenas), parteDaMontagem);
  }

  definirQuadros(quadros) {
    this.configurar({ ...this.estado.configuracao, quadros: Number(quadros) }, parteDaMontagem);
  }

  definirAjuste(nome, valor) {
    const c = this.estado.configuracao;
    this.configurar({ ...c, ajustes: { ...c.ajustes, [nome]: valor } }, parteDaMontagem);
  }

  definirFormato(formato) {
    this.configurar({ ...this.estado.configuracao, formato }, parteDoPalco);
  }

  definirRitmo(parte) {
    const c = this.estado.configuracao;
    this.configurar({ ...c, ritmo: { ...c.ritmo, ...parte } }, parteDoPalco);
  }

  // ---------- foto ----------

  /** Recorta o rosto, prepara no servidor e passa a usar a foto como base. Lança erro se não der. */
  async usarFoto(arquivo, { salvarNoProjeto = true } = {}) {
    const foto = await this.prepararFoto(arquivo);
    const png = await foto.canvas.convertToBlob({ type: 'image/png' });
    const id = salvarNoProjeto
      ? (await this.cliente.definirFotoDoProjeto(this.gerente.atual.id, png)).baseId
      : await this.cliente.enviarBase(png);
    this.trocarVideoFonte(null);
    this.mudar({ foto: { ...foto, id } });
  }

  async escolherFoto(arquivo) {
    this.mudar({ infoFoto: 'Procurando o rosto…' });
    try {
      await this.usarFoto(arquivo);
      this.mudar({ fotoPronta: true, infoFoto: `Rosto encontrado em ${arquivo.name}.` });
    } catch (e) {
      this.mudar({
        infoFoto: e instanceof ErroDeRosto ? e.message
          : e instanceof ErroDaApi ? `O servidor recusou a foto: ${e.message}`
            : `Não consegui abrir essa foto: ${e.message}`,
      });
    }
  }

  /** O vídeo passa a ser a base; a foto fica guardada para quando outra base for escolhida. */
  async escolherVideo(arquivo) {
    this.mudar({ infoFoto: 'Abrindo o vídeo…' });
    try {
      const video = await this.prepararVideo(arquivo);
      const segundos = Math.round(video.duracao);
      this.trocarVideoFonte(video);
      this.definirRitmo({ fps: QUADROS_POR_SEGUNDO });
      this.mudar({
        fotoPronta: true,
        infoFoto: video.cortado
          ? `Vídeo de ${segundos} s: vou usar os primeiros ${DURACAO_MAXIMA} s (${video.total} quadros).`
          : `Vídeo de ${segundos} s: ${video.total} quadros.`,
      });
    } catch (e) {
      this.mudar({ infoFoto: `Não consegui abrir esse vídeo: ${e.message}` });
    }
  }

  trocarVideoFonte(video) {
    // durante a geração a sessão ainda tira quadros do vídeo antigo: fechá-lo quebraria a extração
    if (!this.estado.gerando) this.estado.videoFonte?.fechar();
    this.mudar({ videoFonte: video });
  }

  /** A IA cria uma pessoa nova e a descrição sorteada vai para o campo "Você". */
  async gerarRosto() {
    this.mudar({ gerandoRosto: true });
    try {
      for (let tentativa = 1; tentativa <= TENTATIVAS_DE_ROSTO; tentativa++) {
        const descricao = descricaoAleatoria();
        const semente = sementeAleatoria();
        this.mudar({ infoFoto: tentativa === 1 ? 'A IA está criando um rosto…' : 'Esse não ficou bom, tentando outro…' });
        const imagem = await this.cliente.gerarRosto({ descricao, semente });
        try {
          await this.usarFoto(new File([imagem], `rosto-ia-${semente}.png`, { type: 'image/png' }));
        } catch (e) {
          if (e instanceof ErroDeRosto && tentativa < TENTATIVAS_DE_ROSTO) continue;
          throw e;
        }
        this.definirDescricao(descricao);
        this.mudar({ fotoPronta: true, infoFoto: `Rosto criado pela IA: ${descricao}.` });
        return;
      }
    } catch (e) {
      this.mudar({ infoFoto: `Não consegui criar um rosto: ${e.message}` });
    } finally {
      this.mudar({ gerandoRosto: false });
    }
  }

  // ---------- geração ----------

  gerar() {
    let pedido;
    try {
      pedido = pedidoDeGeracao(this.estado.configuracao, this.estado.videoFonte);
    } catch (e) {
      this.mudar({ infoGeracao: e.message });
      return;
    }
    this.quadros.limpar();
    this.mudar({ video: null, gerando: true, parando: false, progresso: 0, infoGeracao: '' });
    const { foto, videoFonte } = this.estado;
    this.chaveDoTempo = chaveDoSegPorQuadro(this.estado); // um vídeo que termina de abrir no meio não muda a medida
    this.sessao.executar({ projetoId: this.gerente.atual.id, base: foto, video: videoFonte, ...pedido }, segPorQuadroDaBase(this.estado));
  }

  parar() {
    this.sessao.cancelar();
    this.mudar({ parando: true });
  }

  ouvirSessao() {
    const ouvir = (tipo, fn) => this.sessao.addEventListener(tipo, ({ detail }) => fn(detail));
    ouvir('proximo', ({ indice, cena, segundos }) =>
      this.mudar({ proximo: { indice, cena, fim: performance.now() + segundos * 1000 } }));
    ouvir('quadro', (d) => this.quadros.adicionar(d));
    ouvir('aviso', (d) => this.mudar({ infoGeracao: d.mensagem }));
    ouvir('progresso', ({ feitos, total, segPorQuadro }) => this.mudar({
      progresso: feitos / total,
      infoGeracao: feitos < total ? `Faltam cerca de ${formatarTempo(segPorQuadro * (total - feitos))}.` : '',
    }));
    ouvir('fim', (d) => {
      const fim = { proximo: null, gerando: false, parando: false };
      if (d.feitos > 0) {
        fim[this.chaveDoTempo] = d.segPorQuadro;
        salvarPreferencia(this.chaveDoTempo, d.segPorQuadro.toFixed(1));
      }
      if (d.motivo === 'completo') {
        fim.infoGeracao = `${d.total} quadros prontos em ${formatarTempo(d.segundos)}. Risque os que não gostar.`;
      } else if (d.motivo === 'cancelado') {
        fim.infoGeracao = `Parado com ${d.feitos} de ${d.total} quadros.`;
      } else {
        fim.infoGeracao = d.erro?.status === 0 ? d.erro.message
          : `O quadro ${d.feitos + 1} falhou: ${d.erro?.message}. Os anteriores continuam na tira.`;
      }
      this.mudar(fim);
    });
  }

  // ---------- tira ----------

  alternarFora(quadro) {
    this.quadros.alternarFora(quadro);
  }

  // ---------- prévia e vídeo ----------

  /** O palco liga aqui o player e o canvas da prévia (e desliga com null ao sair da tela). */
  ligarPrevia(previa) {
    this.previa = previa;
  }

  marcarAtual(quadroAtual) {
    this.mudar({ quadroAtual });
  }

  irPara(quadro) {
    this.previa?.player.irPara(quadro);
  }

  tocar() {
    if (this.previa) this.mudar({ tocando: this.previa.player.alternar() });
  }

  async gravarVideo() {
    const { player, canvas } = this.previa;
    this.mudar({ gravando: true, gravacao: 0, video: null });
    player.suspenso = true;
    const resultado = await this.gravar(canvas, player.duracao(), (t) => {
      player.tempo = t;
      player.desenhar(t);
    }, (gravacao) => this.mudar({ gravacao }));
    player.suspenso = false;

    if (this.urlDoVideo) URL.revokeObjectURL(this.urlDoVideo);
    this.urlDoVideo = URL.createObjectURL(resultado.blob);
    const nome = `timelapse-${this.estado.configuracao.formato.replace(':', 'x')}.${resultado.extensao}`;
    this.mudar({ gravando: false, gravacao: null, jaGravou: true, video: { url: this.urlDoVideo, nome } });

    const id = this.gerente.atual.id;
    try {
      const arquivo = await this.cliente.salvarVideo(id, resultado.blob);
      this.mudar({ infoGeracao: `Vídeo salvo em projetos/${id}/videos/${arquivo}.` });
    } catch (e) {
      this.mudar({ infoGeracao: `O vídeo não foi salvo no projeto (${e.message}), mas dá para baixar.` });
    }
  }
}

/** O que pode ser usado agora, a partir do estado. Trocar de projeto no meio de um trabalho o deixaria pela metade. */
export function controles(e) {
  const ocupado = e.gerando || e.gravando || e.gerandoRosto || e.carregandoProjeto;
  return {
    gerar: e.gerando || (e.pronto && Boolean(e.foto || e.videoFonte) && Boolean(e.projeto) && !e.gerandoRosto && !e.carregandoProjeto),
    gerarRosto: e.pronto && Boolean(e.projeto) && !ocupado,
    tocar: e.quadrosAtivos >= 2,
    gravar: e.quadrosAtivos >= 2 && !e.gravando,
    projetos: Boolean(e.projeto) && !ocupado,
    escolherBase: !ocupado,
  };
}

/** Quantos quadros a geração vai ter: com um vídeo como base, quem diz é ele. */
export const totalDeQuadros = (e) => e.videoFonte?.total ?? e.configuracao.quadros;

/** Tempo medido por quadro para a base atual (foto e vídeo são medidos à parte). */
const chaveDoSegPorQuadro = (e) => (e.videoFonte ? 'segPorQuadroVideo' : 'segPorQuadro');
export const segPorQuadroDaBase = (e) => e[chaveDoSegPorQuadro(e)];
