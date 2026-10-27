export const $ = (id) => document.getElementById(id);

export const valorNumerico = (id) => Number($(id).value);

export const opcaoMarcada = (nome) => document.querySelector(`input[name="${nome}"]:checked`)?.value;

export function marcarOpcao(nome, valor) {
  const alvo = document.querySelector(`input[name="${nome}"][value="${valor}"]`);
  if (alvo) alvo.checked = true;
  return Boolean(alvo);
}
