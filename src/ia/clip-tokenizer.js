// Tokenizador BPE do CLIP (o mesmo usado pelo SD 2.x / SD-Turbo),
// lido direto de vocab.json e merges.txt.
import fs from 'node:fs';
import path from 'node:path';

const PADRAO = /<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+/gu;

function bytesParaUnicode() {
  const bs = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n++);
    }
  }
  const mapa = new Map();
  bs.forEach((b, i) => mapa.set(b, String.fromCharCode(cs[i])));
  return mapa;
}

export class ClipTokenizer {
  constructor(dir) {
    this.vocab = JSON.parse(fs.readFileSync(path.join(dir, 'vocab.json'), 'utf8'));
    const merges = fs.readFileSync(path.join(dir, 'merges.txt'), 'utf8')
      .split('\n').slice(1).filter(Boolean);
    this.ranks = new Map(merges.map((m, i) => [m, i]));
    this.byteMap = bytesParaUnicode();
    this.cache = new Map();
    this.bos = this.vocab['<|startoftext|>'];
    this.eos = this.vocab['<|endoftext|>'];
    this.pad = 0; // SD 2.x usa "!" (id 0) como padding
    this.maxLen = 77;
  }

  bpe(token) {
    if (this.cache.has(token)) return this.cache.get(token);
    let palavra = [...token];
    palavra[palavra.length - 1] += '</w>';
    while (palavra.length > 1) {
      let melhor = null;
      let melhorRank = Infinity;
      for (let i = 0; i < palavra.length - 1; i++) {
        const r = this.ranks.get(palavra[i] + ' ' + palavra[i + 1]);
        if (r !== undefined && r < melhorRank) {
          melhorRank = r;
          melhor = i;
        }
      }
      if (melhor === null) break;
      const a = palavra[melhor], b = palavra[melhor + 1];
      const nova = [];
      for (let i = 0; i < palavra.length; i++) {
        if (i < palavra.length - 1 && palavra[i] === a && palavra[i + 1] === b) {
          nova.push(a + b);
          i++;
        } else {
          nova.push(palavra[i]);
        }
      }
      palavra = nova;
    }
    this.cache.set(token, palavra);
    return palavra;
  }

  encode(texto) {
    const limpo = texto.replace(/\s+/g, ' ').trim().toLowerCase();
    const ids = [];
    for (const m of limpo.matchAll(PADRAO)) {
      const bytes = [...new TextEncoder().encode(m[0])];
      const t = bytes.map((b) => this.byteMap.get(b)).join('');
      for (const p of this.bpe(t)) {
        const id = this.vocab[p];
        if (id !== undefined) ids.push(id);
      }
    }
    const corpo = ids.slice(0, this.maxLen - 2);
    const saida = [this.bos, ...corpo, this.eos];
    while (saida.length < this.maxLen) saida.push(this.pad);
    return saida;
  }
}
