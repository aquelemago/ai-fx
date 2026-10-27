// Roteiros prontos. Para criar um novo, adicione uma entrada: "nomes" rotulam os quadros
// na tira e "cenas" são os prompts em inglês, na ordem do tempo. {eu} vira a descrição da pessoa.
export const PERSONALIZADO = 'Personalizado';

export const ROTEIROS = {
  'Um dia inteiro': {
    nomes: ['amanhecer', 'manhã', 'meio-dia', 'pôr do sol', 'noite'],
    cenas: [
      'portrait photo of {eu} at dawn, soft blue light, mist',
      'portrait photo of {eu} in the morning, warm golden sunlight',
      'portrait photo of {eu} at midday, bright daylight, clear sky',
      'portrait photo of {eu} at sunset, orange and pink light',
      'portrait photo of {eu} at night, neon city lights, bokeh',
    ],
  },
  'Estações do ano': {
    nomes: ['primavera', 'verão', 'outono', 'inverno'],
    cenas: [
      'portrait photo of {eu} in spring, blooming flowers, fresh green',
      'portrait photo of {eu} in summer, beach, strong sunlight',
      'portrait photo of {eu} in autumn, falling orange leaves',
      'portrait photo of {eu} in winter, snow falling, cold blue light',
    ],
  },
  'Passagem dos anos': {
    nomes: ['jovem', 'adulto', 'meia-idade', 'idoso'],
    cenas: [
      'portrait photo of {eu}, young, smooth skin',
      'portrait photo of {eu}, adult',
      'portrait photo of {eu}, middle-aged, some gray hair',
      'portrait photo of {eu}, elderly, white hair, wrinkles',
    ],
  },
  'Estilos de arte': {
    nomes: ['foto', 'óleo', 'aquarela', 'quadrinho', 'cyberpunk'],
    cenas: [
      'portrait photo of {eu}, realistic, studio lighting',
      'oil painting portrait of {eu}, thick brush strokes',
      'watercolor portrait of {eu}, soft pastel colors',
      'comic book portrait of {eu}, bold ink lines',
      'cyberpunk portrait of {eu}, glowing neon, futuristic',
    ],
  },
};

/** Transforma o texto das cenas (uma por linha) em prompts prontos. */
export function montarPrompts(textoDasCenas, descricao) {
  const eu = descricao.trim() || 'a person';
  return textoDasCenas.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => s.replaceAll('{eu}', eu));
}
