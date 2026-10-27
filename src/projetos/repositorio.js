// Projetos no disco. Cada projeto é uma pasta autocontida; excluir a pasta exclui o projeto:
//
//   projetos/<id>/
//     projeto.json        manifesto (src/projetos/manifesto.js)
//     foto.png            foto base recortada
//     quadros/            ia_NNNN.png (saída crua) e final_NNNN.png (alinhado, com o rosto)
//     videos/             vídeos gravados
//
// O manifesto é gravado de forma atômica (arquivo temporário + rename) e as gravações passam
// por uma fila, então duas mudanças ao mesmo tempo não se atropelam nem corrompem o arquivo.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FilaSerial } from '../servicos/fila.js';
import { criarIdDoProjeto, migrarManifesto, novoManifesto, validarIdDoProjeto } from './manifesto.js';

export const TIPOS_DE_QUADRO = ['ia', 'final'];
const EXTENSOES_DE_VIDEO = ['mp4', 'webm'];
const MANIFESTO = 'projeto.json';

export class ErroProjetoInexistente extends Error {
  constructor(id) {
    super(`projeto "${id}" não existe`);
    this.codigo = 'PROJETO_INEXISTENTE';
  }
}

export class RepositorioDeProjetos {
  constructor(dirRaiz, { relogio = () => new Date() } = {}) {
    this.dirRaiz = path.resolve(dirRaiz);
    this.relogio = relogio;
    this.fila = new FilaSerial();
  }

  // ---------- caminhos (sempre dentro da raiz) ----------

  pasta(id) {
    const dir = path.join(this.dirRaiz, validarIdDoProjeto(id));
    if (path.dirname(dir) !== this.dirRaiz) throw new Error('caminho fora da pasta de projetos');
    return dir;
  }

  arquivoDeQuadro(id, tipo, indice) {
    if (!TIPOS_DE_QUADRO.includes(tipo)) throw new Error('tipo de quadro inválido');
    if (!Number.isInteger(indice) || indice < 0 || indice > 9999) throw new Error('número de quadro inválido');
    return path.join(this.pasta(id), 'quadros', `${tipo}_${String(indice).padStart(4, '0')}.png`);
  }

  // ---------- leitura ----------

  async ler(id) {
    let texto;
    try {
      texto = await fs.readFile(path.join(this.pasta(id), MANIFESTO), 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') throw new ErroProjetoInexistente(id);
      throw e;
    }
    return migrarManifesto(JSON.parse(texto));
  }

  /** Todos os projetos, o mais recente primeiro. Pastas sem manifesto válido são ignoradas. */
  async listar() {
    let nomes;
    try {
      nomes = await fs.readdir(this.dirRaiz);
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
    const lidos = await Promise.all(nomes.map((n) => this.ler(n).catch(() => null)));
    return lidos.filter(Boolean).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  // ---------- escrita ----------

  async criar(nome) {
    const id = criarIdDoProjeto(nome, crypto.randomBytes(3).toString('hex'));
    const manifesto = novoManifesto({ id, nome, agora: this.relogio() });
    await fs.mkdir(path.join(this.pasta(id), 'quadros'), { recursive: true });
    await this.gravarManifesto(manifesto);
    return manifesto;
  }

  /** Aplica `alterar(manifesto)` e grava, um de cada vez. */
  alterar(id, alterar) {
    return this.fila.executar(async () => {
      const m = await this.ler(id);
      await alterar(m);
      m.atualizadoEm = this.relogio().toISOString();
      await this.gravarManifesto(m);
      return m;
    });
  }

  atualizar(id, { nome, configuracao, quadros }) {
    return this.alterar(id, (m) => {
      if (nome !== undefined) m.nome = nome;
      if (configuracao !== undefined) m.configuracao = { ...m.configuracao, ...configuracao };
      if (quadros !== undefined) m.quadros = quadros;
    });
  }

  async excluir(id) {
    await this.ler(id); // confirma que é mesmo um projeto antes de apagar a pasta
    await fs.rm(this.pasta(id), { recursive: true, force: true });
  }

  async salvarFoto(id, png) {
    await this.ler(id);
    await gravarAtomico(path.join(this.pasta(id), 'foto.png'), png);
    return this.alterar(id, (m) => {
      m.temFoto = true;
    });
  }

  async salvarQuadro(id, tipo, indice, png) {
    await this.ler(id);
    const arquivo = this.arquivoDeQuadro(id, tipo, indice);
    await fs.mkdir(path.dirname(arquivo), { recursive: true });
    await fs.writeFile(arquivo, png);
    return arquivo;
  }

  /** Apaga os quadros de uma geração anterior, para não sobrar lixo de gerações mais longas. */
  async limparQuadros(id) {
    await this.ler(id);
    const dir = path.join(this.pasta(id), 'quadros');
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    return this.alterar(id, (m) => {
      m.quadros = [];
    });
  }

  async salvarVideo(id, extensao, buffer) {
    if (!EXTENSOES_DE_VIDEO.includes(extensao)) throw new Error('formato de vídeo inválido');
    await this.ler(id);
    const carimbo = this.relogio().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
    const arquivo = `timelapse-${carimbo}.${extensao}`;
    const dir = path.join(this.pasta(id), 'videos');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), buffer);
    await this.alterar(id, (m) => {
      m.videos.push({ arquivo, criadoEm: this.relogio().toISOString() });
    });
    return arquivo;
  }

  gravarManifesto(m) {
    return gravarAtomico(path.join(this.pasta(m.id), MANIFESTO), JSON.stringify(m, null, 2) + '\n');
  }
}

// Grava num temporário e renomeia: quem lê nunca vê o arquivo pela metade
async function gravarAtomico(arquivo, conteudo) {
  const temporario = `${arquivo}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  await fs.writeFile(temporario, conteudo);
  await fs.rename(temporario, arquivo);
}
