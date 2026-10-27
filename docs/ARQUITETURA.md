# Arquitetura

O sistema tem duas metades que conversam por HTTP:

- **Servidor (Node):** roda o modelo de IA no processador e gera cada quadro.
- **Página (navegador):** acha o rosto, alinha, cola o rosto original, mostra a prévia e grava o vídeo.

Cada metade é dividida em camadas. Uma camada só conhece as que estão abaixo dela.

```
                PÁGINA (web/src)                               SERVIDOR
  ┌────────────────────────────────────────┐     ┌──────────────────────────────────┐
  │ main.jsx        (monta e liga tudo)    │     │ server.js     (monta e liga tudo)│
  ├────────────────────────────────────────┤     ├──────────────────────────────────┤
  │ app/           App (grade), contexto   │     │ http/      app, pagina, rotas,   │
  │ funcionalidades/ montagem, palco, tira,│     │            rotas-projetos,       │
  │                projetos  (React)       │     │            validacao, tratar     │
  │ design-system/ tokens, componentes     │     ├──────────────────────────────────┤
  ├──────────────── nucleo/ ───────────────┤     │ servicos/  servico-geracao,      │
  │ estudio/   estado da tela e ações      │     │            servico-projetos, fila│
  │ projetos/  gerente  (projeto aberto,   │ ──► ├──────────────────────────────────┤
  │            salvamento automático)      │ API │ projetos/  repositorio (disco),  │
  │ geracao/   sessao, etapas (orquestra)  │     │            manifesto (esquema)   │
  │ video/     player, renderizador,       │     ├──────────────────────────────────┤
  │            gravador                    │     │ ia/        modelos (registro)    │
  │ rosto/     detector, recorte,          │     │            sd-turbo/, agendador, │
  │            composicao, mascara         │     │            ruido, imagem, onnx,  │
  │ api/       cliente  (único fetch)      │     │            clip-tokenizer        │
  ├────────────────────────────────────────┤     ├──────────────────────────────────┤
  │ dominio/   roteiros, plano, formatos,  │     │ util/      cache-lru, erros      │
  │            configuracao, quadros,      │     │ config.js  (única leitura do env)│
  │            projeto, rostos (puras)     │     └──────────────────────────────────┘
  │ util/      tempo, preferencias, adiar, │
  │            imagem                      │
  └────────────────────────────────────────┘
```
## Princípios

1. **Uma responsabilidade por módulo.** Se for difícil dizer o que um arquivo faz em uma
   frase, ele precisa ser dividido.
2. **Dependências injetadas.** `server.js` e `web/src/main.jsx` são os únicos que criam as
   peças e as ligam. O resto recebe o que precisa no construtor. É isso que permite testar o
   serviço e a API com um gerador falso (`test/apoio/gerador-falso.js`) e as telas com um
   estúdio falso (`web/src/teste/estudio-falso.jsx`).
3. **Regras puras separadas de efeitos.** `dominio/`, `estudio/`, `rosto/geometria.js`,
   `ia/agendador-euler.js` e `ia/ruido.js` não tocam DOM, rede nem disco, por isso rodam nos
   testes do Node.
4. **Eventos em vez de chamadas cruzadas.** A `SessaoDeGeracao`, a `ColecaoDeQuadros` e o
   `GerenteDeProjetos` emitem eventos; o `Estudio` escuta todos e junta o resultado num estado
   só. As funcionalidades da tela leem esse estado e não se conhecem.
5. **Configuração num lugar só.** Só `src/config.js` lê `process.env`.

## Projetos

Um projeto é uma pasta em `projetos/<id>/` com `projeto.json`, `foto.png`, `quadros/` e `videos/`.
Nada de um projeto fica fora da pasta dele, então excluir a pasta exclui o projeto inteiro.

- **`src/projetos/repositorio.js`** é o único módulo que lê e escreve nessas pastas:
  - O manifesto é gravado de forma atômica (arquivo temporário + `rename`).
  - As alterações passam por uma fila, então gravações simultâneas não se perdem.
  - Todo caminho é validado contra fuga da pasta de projetos.
- **`src/projetos/manifesto.js`** define o esquema. Ele tem um número de versão (`versao`) e uma
  função `migrarManifesto` para quando o formato mudar. A configuração é da página: o servidor só
  confere a forma dela e não impõe valores padrão.
- **`web/src/nucleo/projetos/gerente.js`** guarda o projeto aberto e salva sozinho, com um atraso de
  600 ms depois da última mudança. Mudanças da montagem e do palco chegando juntas viram um
  único `PATCH`.
- **Gerar de novo** chama `DELETE /api/projetos/:id/quadros` antes do primeiro quadro, então
  não sobra nada de uma geração mais longa.

Para adicionar um campo ao projeto: inclua-o em `validarConfiguracao` (servidor) e em
`lerConfiguracao`/`aplicarConfiguracao` do painel que é dono dele (página). Se o formato do
manifesto mudar de um jeito incompatível, suba `VERSAO_DO_MANIFESTO` e trate a versão antiga em
`migrarManifesto`.

## Página

A página é React (Vite), dividida em três partes que só conhecem as de baixo:

1. **`nucleo/`**: JavaScript puro, sem React. Tudo que a página sabe fazer: falar com a API,
   achar o rosto, gerar e compor quadros, tocar e gravar o vídeo, guardar o projeto aberto.
   O **`estudio/estudio.js`** junta essas peças, como o antigo `main.js`, e expõe:
   - `estado`: um objeto trocado (nunca alterado) a cada mudança, com o evento `mudou`;
   - as ações do usuário (`abrirProjeto`, `escolherFoto`, `gerar`, `parar`, `gravarVideo`...);
   - `controles(estado)`: o que pode ser usado em cada momento.
   O estúdio é testado no Node (`test/unidade/estudio.test.js`).
2. **`design-system/`**: a aparência. `tokens.css` (cores, tipos, fonte), `base.css` (página,
   foco, rolagem) e os componentes `Botao`, `Icone`, `Deslizante`, `Segmentos`, `Grupo`, `Nota`,
   `Recolhivel` e `Campos`. Não sabem nada do app. As regras visuais estão em
   [DESIGN.md](../DESIGN.md).
3. **`app/` e `funcionalidades/`**: a tela. `main.jsx` cria o estúdio e o entrega por contexto;
   `app/contexto.js` dá `useEstudio()` (ações) e `useEstado()` (estado, via
   `useSyncExternalStore`); `App.jsx` monta a grade da cabine.

### Formato de uma funcionalidade

Toda pasta de `funcionalidades/` (montagem, palco, tira, projetos) tem o mesmo formato:

```
funcionalidades/<nome>/
  <Nome>.jsx          só desenha, com componentes do design system
  use<Nome>.js        lê o estado do estúdio e devolve o que mostrar e as ações
  <Nome>.module.css   layout em volta dos componentes
  <Nome>.test.jsx     testes com o estúdio falso
  index.js            exporta só o componente
```

- O componente não chama o estúdio direto; tudo passa pelo hook.
- Uma funcionalidade não importa outra. Quando uma precisa aparecer dentro de outra (a barra de
  projetos na coluna de montagem), o `App` passa como propriedade.
- Partes maiores podem virar arquivos irmãos (`montagem/Ajustes.jsx`, `palco/usePrevia.js`).
- Desenho em canvas fica fora do ciclo do React: o componente cria a classe do núcleo num
  `useEffect` sobre um `ref` e a destrói ao sair (veja `palco/usePrevia.js`).

### CSS

- O estilo de cada componente do design system fica num CSS Module dentro de `@layer ds`.
- O CSS das funcionalidades fica fora de camada, então um ajuste de layout sempre vence o
  componente, sem depender da ordem em que os arquivos carregam.
- `tokens.css` declara a ordem das camadas (`@layer base, ds`) e por isso é o primeiro import
  de `main.jsx`: a primeira declaração define a ordem.
- Use as variáveis de `tokens.css`; valores soltos só para medidas de layout.

### Desenvolvimento e produção

- `npm start`: o Express monta o Vite como middleware (`src/http/pagina.js`). Uma porta só, e a
  página recarrega sozinha quando um arquivo muda.
- `npm run build` gera `web/dist`; com `NODE_ENV=production` (ou `npm run producao`) o Express
  serve esses arquivos e não carrega o Vite.

## Fluxo de um quadro

1. `funcionalidades/montagem` → `estudio.gerar()`: o usuário clica em Gerar. O estúdio monta o
   pedido com `dominio/configuracao.pedidoDeGeracao` e chama a sessão.
2. `geracao/sessao` monta os parâmetros (`dominio/plano`) e chama `api/cliente.gerarQuadro`.
3. `http/rotas` valida (`http/validacao`) e chama `servicos/servico-geracao.gerarQuadro`.
4. O serviço põe o pedido na `fila` e chama `gerador.gerar` (`ia/sd-turbo/gerador`), que usa:
   - `texto` (prompt → embedding)
   - `agendador-euler` (passos)
   - `ruido` (ruído com semente)
   - a UNet
   - `vae` (latentes → PNG)
5. O serviço grava `projetos/<id>/quadros/ia_NNNN.png` e responde com o PNG.
6. Na página, `rosto/composicao` alinha os olhos e cola o rosto original. A sessão emite
   `quadro`, o estúdio guarda na `ColecaoDeQuadros` e troca o estado; a tira e o player se
   atualizam.

## Como estender

### Novo modelo de IA (ex.: SDXL-Turbo, LCM)

1. Crie `src/ia/<modelo>/gerador.js` com uma classe que cumpra o contrato descrito em
   `src/ia/modelos.js`: `static nome`, `lado`, `carregar`, `definirBase`, `temBase` e `gerar`.
   Reaproveite `onnx.js`, `imagem.js`, `ruido.js` e o agendador.
2. Registre a classe no `Map` de `src/ia/modelos.js`.
3. Rode com `MODELO=<nome> npm start`.
4. Copie `test/integracao/modelo.test.js` com uma imagem de referência do modelo novo.

A API e a página não mudam. Se o modelo gerar quadros maiores que 512, a página já usa o
tamanho que vier, mas o recorte da foto (`#base` em `index.html`) deve acompanhar o `lado` do
modelo.

### Novo roteiro

Adicione uma entrada em `web/src/nucleo/dominio/roteiros.js`, com `nomes` e `cenas` do mesmo
tamanho. O teste `roteiros: todo roteiro tem um nome por cena` confere isso.

### Novo formato de vídeo (ex.: 4:5)

1. Adicione o formato em `web/src/nucleo/dominio/formatos.js`. O palco cria a opção sozinho.
2. Se a moldura precisar de outra proporção, adicione uma regra
   `.moldura[data-formato="4:5"]` em `web/src/funcionalidades/palco/Palco.module.css`.

### Novo ajuste de geração

1. Dê o valor padrão em `CONFIGURACAO_PADRAO.ajustes` (`web/src/nucleo/dominio/configuracao.js`).
2. Acrescente o controle na lista `AJUSTES` de `web/src/funcionalidades/montagem/Ajustes.jsx`.
   O valor já vai para o projeto e para o pedido de geração (`ajustes`).
3. Se o ajuste vai para o servidor, valide-o em `src/http/validacao.js` e use-o no gerador.

### Nova parte da tela

1. Crie `web/src/funcionalidades/<nome>/` no formato padrão (veja "Formato de uma
   funcionalidade") e coloque o componente no `App.jsx`.
2. O que ela precisa saber vem do `estado` do estúdio; o que ela faz vira uma ação do estúdio,
   com teste em `test/unidade/estudio.test.js`.
3. Use os componentes do design system. Se faltar um, crie em `web/src/design-system/` com
   CSS Module em `@layer ds`, exporte em `index.js` e teste em `design-system.test.jsx`.

### Nova rota da API

Coloque a regra em `servicos/`, exponha em `http/rotas.js` e acrescente o método em
`web/src/nucleo/api/cliente.js`. Erros com `codigo` viram status HTTP pela tabela em `rotas.js`.

## Testes

```bash
npm test               # testes de unidade no Node e testes de componente no Vitest (~5 s)
npm run test:modelo    # gera um quadro real e compara com a referência (~1 min)
```

O teste de modelo não exige pixels idênticos. Somas em várias threads mudam a ordem do ponto
flutuante, então duas execuções do mesmo código dão cerca de 80 dB de PSNR. O teste exige
mais de 60 dB.
