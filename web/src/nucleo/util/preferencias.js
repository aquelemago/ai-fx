// Preferências do usuário no navegador (localStorage), sem quebrar quando ele não está disponível.
const PREFIXO = 'timelapse:';

export function lerPreferencia(chave, padrao) {
  try {
    return localStorage.getItem(PREFIXO + chave) ?? localStorage.getItem(chave) ?? padrao;
  } catch {
    return padrao;
  }
}

export function salvarPreferencia(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, valor);
  } catch {}
}
