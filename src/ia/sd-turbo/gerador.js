// Gerador img2img do SD-Turbo no processador.
// Implementa o contrato de gerador descrito em src/ia/modelos.js.
// Sem guidance (o Turbo não precisa), então cada passo é uma única chamada da UNet.
import fs from 'node:fs';
import path from 'node:path';
import { criarAbridor, ort, tipoDaEntrada } from '../onnx.js';
import { planejarPassos } from '../agendador-euler.js';
import { misturar, ruido, slerp } from '../ruido.js';
import { CacheLru } from '../../util/cache-lru.js';
import { CodificadorDeTexto } from './texto.js';
import { Vae } from './vae.js';
import { ErroBaseAusente } from '../erros.js';

const LADO = 512;
const LAT = LADO / 8;

export class GeradorSdTurbo {
  static nome = 'sd-turbo';

  constructor({ dirModelos, threads, vaeCompleto }) {
    this.dir = path.join(dirModelos, 'sd-turbo');
    this.dirTaesd = path.join(dirModelos, 'taesd');
    this.threads = threads;
    this.vaeCompleto = vaeCompleto;
    this.lado = LADO;
    this.latentes = new CacheLru(8); // id da foto base -> latentes codificados
  }

  async carregar(log = console.log) {
    const abrir = criarAbridor({ threads: this.threads, log });
    this.texto = new CodificadorDeTexto(await abrir(this.dir, 'text_encoder'), this.dir);

    const rapido = !this.vaeCompleto && fs.existsSync(path.join(this.dirTaesd, 'vae_decoder'));
    this.vae = new Vae({
      codificador: await abrir(this.dir, 'vae_encoder'),
      decodificador: await abrir(rapido ? this.dirTaesd : this.dir, 'vae_decoder'),
      decodificadorRapido: rapido,
      lado: LADO,
    });

    this.unet = await abrir(this.dir, 'unet');
    this.tipoTimestep = tipoDaEntrada(this.unet, 'timestep') ?? 'int64';

    // A primeira execução da UNet é bem mais lenta (aloca memória e prepara o grafo)
    const t0 = Date.now();
    await this.passoUnet(new Float32Array(4 * LAT * LAT), 500,
      new ort.Tensor('float32', new Float32Array(77 * 1024), [1, 77, 1024]));
    log(`  aquecimento da unet em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  async definirBase(id, buffer) {
    this.latentes.set(id, await this.vae.codificar(buffer));
  }

  temBase(id) {
    return this.latentes.has(id);
  }

  /**
   * Gera um quadro a partir da foto base.
   * promptA/promptB + mixPrompt: mistura os dois textos (transição suave)
   * sementeA/sementeB + mixSemente: mistura os dois ruídos
   * forca: 0..1, quanto a IA pode se afastar da foto; passos: 1..4
   */
  async gerar({ baseId, promptA, promptB = promptA, mixPrompt = 0, sementeA, sementeB = sementeA,
    mixSemente = 0, forca = 0.5, passos = 1 }) {
    const base = this.latentes.get(baseId);
    if (!base) throw new ErroBaseAusente();

    const [ea, eb] = await Promise.all([this.texto.codificar(promptA), this.texto.codificar(promptB)]);
    const emb = new ort.Tensor('float32', misturar(ea.data, eb.data, mixPrompt), ea.dims);

    const { timesteps, sigmas } = planejarPassos(forca, passos);
    const r = slerp(ruido(sementeA, base.length), ruido(sementeB, base.length), mixSemente);
    const lat = new Float32Array(base.length);
    for (let i = 0; i < lat.length; i++) lat[i] = base[i] + r[i] * sigmas[0];

    for (let j = 0; j < timesteps.length; j++) {
      const sig = sigmas[j];
      const k = 1 / Math.sqrt(sig * sig + 1);
      const entrada = new Float32Array(lat.length);
      for (let i = 0; i < lat.length; i++) entrada[i] = lat[i] * k;
      const eps = await this.passoUnet(entrada, timesteps[j], emb);
      const dt = sigmas[j + 1] - sig;
      for (let i = 0; i < lat.length; i++) lat[i] += eps[i] * dt; // passo de Euler
    }
    return this.vae.decodificar(lat);
  }

  async passoUnet(amostra, timestep, embedding) {
    const t = this.tipoTimestep === 'int64'
      ? new ort.Tensor('int64', BigInt64Array.from([BigInt(timestep)]), [1])
      : new ort.Tensor('float32', Float32Array.from([timestep]), [1]);
    const out = await this.unet.run({
      sample: new ort.Tensor('float32', amostra, [1, 4, LAT, LAT]),
      timestep: t,
      encoder_hidden_states: embedding,
    });
    return out[this.unet.outputNames[0]].data;
  }
}

