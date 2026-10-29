# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Time Lapse IA: a partir de uma foto de rosto, gera quadros com SD-Turbo (img2img, ONNX no
processador) mudando cena/luz/estilo com o rosto travado no lugar, e grava um vídeo curto. Tudo
local, sem GPU. Código, comentários, nomes e commits em **português**.

## Comandos

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm install   # sem isso, o npm < 11 tenta baixar o CUDA e falha
npm run modelos        # baixa ~5 GB de modelos para models/ (só precisa para gerar de verdade)
npm start              # http://localhost:3000 — Express com o Vite como middleware (recarga na hora)
npm run build          # vite build → web/dist
npm run producao       # build + NODE_ENV=production node server.js
npm test               # node --test test/unidade/*.test.js e depois vitest run (~5 s)
npm run test:modelo    # gera um quadro com o modelo real e compara com a referência (~1 min, PSNR > 60 dB)
```

Um teste só:

```bash
node --test test/unidade/estudio.test.js          # Node (núcleo, servidor)
npx vitest run src/funcionalidades/tira           # Vitest: root é web/, o filtro é relativo a ele
node --test --test-name-pattern="contador" test/unidade/estudio.test.js
```

Não há lint configurado. Variáveis de ambiente (`PORT`, `HOST`, `MODELO`, `PROJETOS`, `VAE`,
`THREADS`) só são lidas em `src/config.js`.

## Arquitetura

Detalhes e o passo a passo para estender (modelo, roteiro, formato, ajuste, rota, parte da tela)
estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md); leia antes de mudanças estruturais. O essencial:

- **Duas metades por HTTP.** O servidor (`server.js`, `src/`) só roda a IA e guarda projetos em
  disco. A página (`web/src/`) faz o resto: detecta o rosto (MediaPipe), alinha e cola o rosto
  original em cada quadro, toca a prévia e grava o vídeo (`MediaRecorder`). A IA fica no servidor
  porque a UNet fp32 não cabe no WebAssembly.
- **Camadas que só conhecem as de baixo.** Servidor: `http/` → `servicos/` (com `fila`) →
  `projetos/` (único que toca o disco) e `ia/`. Página: `app/` + `funcionalidades/` (React) →
  `design-system/` → `nucleo/` (JS puro, sem React) → `nucleo/dominio/` e `nucleo/util/` (puras).
- **Injeção de dependências.** Só `server.js` e `web/src/main.jsx` criam e ligam as peças. Por isso
  os testes usam `test/apoio/gerador-falso.js` (servidor) e `web/src/teste/estudio-falso.jsx` (telas).
- **Estúdio como fonte única do estado da tela.** `nucleo/estudio/estudio.js` escuta os eventos da
  `SessaoDeGeracao`, da `ColecaoDeQuadros` e do `GerenteDeProjetos` e expõe um `estado` imutável
  (evento `mudou`), as ações e `controles(estado)`. Os componentes leem por `useEstado()` /
  `useEstudio()` (`app/contexto.js`) e nunca se importam entre si. O estúdio é testado no Node em
  `test/unidade/estudio.test.js`.
- **Formato de funcionalidade** (`web/src/funcionalidades/<nome>/`): `<Nome>.jsx` só desenha,
  `use<Nome>.js` lê o estado e devolve ações, `<Nome>.module.css`, `<Nome>.test.jsx`, `index.js`.
  O componente não chama o estúdio direto. Desenho em canvas fica fora do React (classe do núcleo
  criada num `useEffect` sobre um `ref`, como `palco/usePrevia.js`).
- **Pipeline de um quadro**: `geracao/sessao.js` + `geracao/etapas.js` (partida misturada com o
  quadro anterior → IA → alinhar olhos → colar rosto → repasse de "naturalidade" → alinhar de novo)
  → `api/cliente.js` (único `fetch`) → `http/rotas.js` → `servico-geracao` → `ia/sd-turbo/gerador`.
- **Projetos** são pastas `projetos/<id>/` (`projeto.json`, `foto.png`, `quadros/`, `videos/`).
  Esquema e migração em `src/projetos/manifesto.js` (`VERSAO_DO_MANIFESTO`, `migrarManifesto`);
  a página salva sozinha com atraso de 600 ms (`nucleo/projetos/gerente.js`). Campo novo de
  configuração: `validarConfiguracao` no servidor + `lerConfiguracao`/`aplicarConfiguracao` na página.

## Interface

Regras visuais em [DESIGN.md](DESIGN.md) e contexto de produto em [PRODUCT.md](PRODUCT.md). Use as
variáveis de `web/src/design-system/tokens.css`; cantos retos, bordas de 2px, sem sombra nem
gradiente; o amarelo `--flash` só no botão Gerar, na barra de progresso, na vaga do próximo quadro e
no foco; respeitar `prefers-reduced-motion`. CSS do design system fica em `@layer ds`; o das
funcionalidades fica fora de camada para sempre vencer. Nos testes, CSS Modules usam
`classNameStrategy: 'non-scoped'`, então dá para checar classes pelo nome (`toContain('proximo')`).

## Fluxo de trabalho

Branch a partir de `main` (`feat/<slug>`), commits pequenos por etapa, PR e merge.
