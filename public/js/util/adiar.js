// Junta chamadas seguidas numa só, feita `ms` depois da última. Útil para salvar enquanto a
// pessoa digita ou arrasta um controle. `agora()` executa o que estiver pendente na hora;
// `cancelar()` descarta o pendente.
export function adiar(fn, ms) {
  let timer = null;
  let ultimosArgs = null;
  const executar = () => {
    clearTimeout(timer);
    timer = null;
    if (!ultimosArgs) return undefined;
    const args = ultimosArgs;
    ultimosArgs = null;
    return fn(...args);
  };
  const adiada = (...args) => {
    ultimosArgs = args;
    clearTimeout(timer);
    timer = setTimeout(executar, ms);
  };
  adiada.agora = executar;
  adiada.cancelar = () => {
    clearTimeout(timer);
    timer = null;
    ultimosArgs = null;
  };
  return adiada;
}
