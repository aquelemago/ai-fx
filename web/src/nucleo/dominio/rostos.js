// Sorteio de pessoas para gerar um rosto do zero. A descrição sai em inglês porque vai para o
// modelo e também para o campo "Você": assim as cenas continuam com a mesma pessoa.
// `aleatorio` é injetável para os testes; na página é Math.random.

const IDADES = ['young', 'adult', 'middle-aged', 'elderly'];
const PESSOAS = ['man', 'woman'];
const CABELOS = {
  man: ['short dark hair', 'short curly hair', 'a shaved head', 'wavy brown hair', 'short blond hair', 'gray hair'],
  woman: ['long dark hair', 'curly hair', 'a short bob haircut', 'long blond hair', 'braided hair', 'red hair'],
};
const DETALHES = {
  man: ['', '', 'and a beard', 'and a mustache', 'and glasses', 'and freckles'],
  woman: ['', '', 'and glasses', 'and freckles', 'and earrings'],
};

const sortear = (lista, aleatorio) => lista[Math.floor(aleatorio() * lista.length)];

export function descricaoAleatoria(aleatorio = Math.random) {
  const pessoa = sortear(PESSOAS, aleatorio);
  let idade = sortear(IDADES, aleatorio);
  let cabelo = sortear(CABELOS[pessoa], aleatorio);
  if (cabelo === 'gray hair' && idade === 'young') idade = 'middle-aged';
  if (idade === 'elderly' && !cabelo.includes('gray')) cabelo = pessoa === 'man' ? 'gray hair' : 'short gray hair';
  const detalhe = sortear(DETALHES[pessoa], aleatorio);
  return [`a ${idade} ${pessoa} with ${cabelo}`, detalhe].filter(Boolean).join(' ');
}

export const sementeAleatoria = (aleatorio = Math.random) => Math.floor(aleatorio() * 2 ** 31);
