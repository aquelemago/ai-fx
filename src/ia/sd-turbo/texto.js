// Texto → embedding (CLIP do SD 2.x), com cache por prompt.
import path from 'node:path';
import { ClipTokenizer } from '../clip-tokenizer.js';
import { ort } from '../onnx.js';
import { CacheLru } from '../../util/cache-lru.js';

export class CodificadorDeTexto {
  constructor(sessao, dirTokenizer) {
    this.sessao = sessao;
    this.tokenizer = new ClipTokenizer(path.join(dirTokenizer, 'tokenizer'));
    this.cache = new CacheLru(64);
  }

  async codificar(prompt) {
    const pronto = this.cache.get(prompt);
    if (pronto) return pronto;
    const ids = this.tokenizer.encode(prompt);
    const nome = this.sessao.inputNames[0];
    const tipo = this.sessao.inputMetadata?.[0]?.type ?? 'int32';
    const dados = tipo === 'int64' ? BigInt64Array.from(ids, BigInt) : Int32Array.from(ids);
    const r = await this.sessao.run({ [nome]: new ort.Tensor(tipo, dados, [1, ids.length]) });
    const emb = r[this.sessao.outputNames[0]];
    this.cache.set(prompt, emb);
    return emb;
  }
}
