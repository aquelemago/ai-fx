// Abertura de sessões ONNX no processador, com as mesmas opções para todo modelo.
import path from 'node:path';
import ort from 'onnxruntime-node';

export { ort };

export function criarAbridor({ threads, log = () => {} }) {
  const opcoes = {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
    intraOpNumThreads: threads,
  };
  return async function abrir(dir, nome) {
    const t0 = Date.now();
    const sessao = await ort.InferenceSession.create(path.join(dir, nome, 'model.onnx'), opcoes);
    log(`  ${nome} carregado em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return sessao;
  };
}

export const tipoDaEntrada = (sessao, nome) =>
  sessao.inputMetadata?.find((m) => m.name === nome)?.type;
