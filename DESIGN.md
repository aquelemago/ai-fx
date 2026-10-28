---
name: Time Lapse IA
description: Cabine de fotos noturna que transforma uma foto num time lapse gerado por IA.
colors:
  cortina: "#2b0d12"
  cortina-funda: "#1c070b"
  vinho: "#4a1720"
  vinho-claro: "#6e2a35"
  papel: "#e4ded2"
  texto: "#e4ded2"
  texto-2: "#bca8a1"
  tinta: "#160a0c"
  fenda: "#000000"
  flash: "#f2c230"
  flash-claro: "#ffd34a"
  erro: "#ff9b8c"
typography:
  corpo:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.35
    fontFeature: "tnum"
  rotulo:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.12em"
  digito:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
  digito-compacto:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
rounded:
  nenhum: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
components:
  botao-principal:
    backgroundColor: "{colors.flash}"
    textColor: "{colors.tinta}"
    typography: "{typography.rotulo}"
    rounded: "{rounded.nenhum}"
    padding: "14px"
  botao-principal-hover:
    backgroundColor: "{colors.flash-claro}"
  botao-principal-em-andamento:
    backgroundColor: "transparent"
    textColor: "{colors.papel}"
  botao-linha:
    backgroundColor: "transparent"
    textColor: "{colors.papel}"
    typography: "{typography.rotulo}"
    rounded: "{rounded.nenhum}"
    padding: "8px 14px"
  botao-linha-perigo:
    textColor: "{colors.erro}"
  botao-icone:
    backgroundColor: "transparent"
    textColor: "{colors.papel}"
    rounded: "{rounded.nenhum}"
    size: "40px"
  campo:
    backgroundColor: "{colors.cortina}"
    textColor: "{colors.texto}"
    typography: "{typography.corpo}"
    rounded: "{rounded.nenhum}"
    padding: "9px 10px"
  segmento:
    backgroundColor: "transparent"
    textColor: "{colors.texto-2}"
    rounded: "{rounded.nenhum}"
    padding: "7px 0"
  segmento-marcado:
    textColor: "{colors.papel}"
  copia-da-tira:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.nenhum}"
    padding: "7px 7px 0"
---

# Design System: Time Lapse IA

## Overview

**Creative North Star: "A Cabine de Fotos"**

A tela é uma cabine de fotos à noite. A coluna da esquerda é o painel de moedas e botões, o
palco é a janela onde a foto aparece emoldurada em papel, e a tira da direita é a fenda por onde
as cópias caem, uma a uma, enquanto a IA trabalha. Tudo é escuro e quente como uma cortina de
veludo vinho; o claro é sempre papel fotográfico, e só uma coisa acende de verdade: o amarelo do
flash, no botão de gerar e na contagem do próximo quadro.

A densidade é de ferramenta: rótulos curtos em caixa alta, controles próximos, nada de texto de
marketing. A personalidade está nos materiais (papel, cortina, fenda) e na queda das cópias,
não em ornamentos. Cor chapada, sem gradiente, sem sombra, sem canto arredondado.

**Key Characteristics:**
- Fundo escuro em três tons de cortina; o claro é sempre papel.
- Um único acento aceso (flash), usado em pouquíssimos lugares.
- Bordas de 2px em vinho no lugar de sombras e cartões.
- Uma só família tipográfica, condensada, com números tabulares.
- Cantos sempre retos.

## Colors

Paleta quente e noturna: vinhos quase pretos, um papel creme e um amarelo de flash.

### Primary
- **Flash** (flash): a placa invertida do botão Gerar, a barra de progresso e o dígito da contagem regressiva na tira. O contorno de foco usa a mesma cor.
- **Flash Claro** (flash-claro): só o hover do botão Gerar.

### Neutral
- **Cortina** (cortina): fundo da página e dos campos.
- **Cortina Funda** (cortina-funda): fundo da coluna de montagem, do fundo da prévia e do convite "Escolha uma foto".
- **Tinta** (tinta): fundo da tira e o texto sobre papel (rodapé das cópias, texto do botão Gerar).
- **Fenda** (fenda): o preto puro da fenda da tira, por onde as cópias saem. Só ali.
- **Vinho** (vinho): bordas em repouso, divisórias, trilho da barra de progresso, contorno de controles desabilitados.
- **Vinho Claro** (vinho-claro): bordas de botões ativos, hover de campos e opções, trilho dos controles deslizantes.
- **Papel** (papel): moldura da prévia, cópias da tira, opção marcada, foto pronta, polegar dos deslizantes.
- **Texto** (texto): texto principal; é o mesmo creme do papel, separado para poder mudar sem mexer nas superfícies.
- **Texto 2** (texto-2): rótulos, notas, opções não marcadas, controles desabilitados.
- **Erro** (erro): estado do servidor com erro e o botão Excluir projeto.

### Named Rules
**A Regra do Flash Único.** O amarelo aparece só no que está acontecendo agora: o botão Gerar, a barra de progresso e a contagem do próximo quadro. A única exceção é o contorno de foco do teclado. Nenhum outro elemento ganha flash, nem em hover.

**A Regra do Papel.** O claro da tela é sempre papel fotográfico: moldura, cópias e o que está escolhido. Não há fundo branco nem cinza.

## Typography

**Body Font:** Barlow Condensed (com sans-serif)
**Label Font:** Barlow Condensed, peso 700, em caixa alta

**Character:** Uma família só, condensada, com cara de etiqueta de máquina. Números tabulares
na página toda, para contagens e tempos não dançarem.

### Hierarchy
- **Display** (700, 64px, line-height 1): só o dígito da contagem regressiva na vaga do próximo quadro; `digito-compacto` (40px) quando a tira fica embaixo.
- **Body** (500, 17px, 1.35): notas, mensagens de andamento, campos e opções.
- **Label** (700, 13px, letter-spacing 0.12em, caixa alta): títulos de grupo, nome do app, resumos que abrem e fecham, rótulos dos deslizantes e texto dos botões (0.14em no botão Gerar).
- **Rodapé da cópia** (700, 13px, letter-spacing 0.06em): número e nome da cena embaixo de cada cópia.

### Named Rules
**A Regra da Etiqueta.** Todo título é rótulo: 13px, negrito, espaçado, em caixa alta. Não existe título grande na tela.

## Layout

Grade de três colunas sob uma barra de topo, ocupando a altura da janela. A barra de topo traz a
marca com o estado do servidor, as abas de seção e o seletor de projeto. Embaixo dela, a montagem
(340px), o palco (o resto) e a tira (232px). Cada coluna rola sozinha; na montagem, só os painéis
rolam e o rodapé (Gerar + progresso) fica fixo. A montagem tem respiro de 28px e grupos separados
por 28px; dentro de um grupo, o título fica a 10px do conteúdo e as notas a 6px.

- **Até 1100px:** a montagem estreita para 300px e ocupa a altura toda; a tira desce para baixo do palco e vira uma faixa horizontal de cópias de 112px.
- **Até 720px:** tudo empilha numa coluna só, com respiro lateral de 16px; os deslizantes do palco ficam dois por linha; as abas viram uma faixa rolável e o seletor de projeto ocupa a linha de baixo da barra.
- O palco centraliza a moldura e mantém a proporção do formato do vídeo (9:16 ou 1:1).

## Navigation

A montagem é dividida em três seções, cada uma numa aba: **Foto** (a foto base e a descrição),
**Cenas** (roteiro, cenas e quantidade de quadros) e **Ajustes** (ajustes finos e o projeto). A
barra de topo hospeda as abas e o seletor de projeto; o palco e a tira ficam fixos, visíveis em
qualquer aba, e o rodapé da montagem (Gerar + progresso) também não muda com a aba.

As abas são um `tablist` acessível: a ativa vai em papel com um traço de 2px encostando na borda
da barra; as outras, em texto 2. Só a aba ativa tem foco de teclado (roving tabindex) e as setas
←/→ percorrem as abas. No mobile a mesma faixa de abas rola na horizontal — não vira hambúrguer.

### Named Rules
**A Regra do Palco Fixo.** Foto, cenas e ajustes são conteúdo que muda; o palco, a tira e o Gerar
não. Nada do que o usuário gere ou assiste pode sumir ao trocar de aba.

## Elevation & Depth

Não há sombras. A profundidade vem da camada de tons (cortina, cortina funda e tinta), de bordas
de 2px em vinho e da fenda da tira, uma faixa preta de 6px por onde as cópias parecem sair.

### Named Rules
**A Regra da Borda, Não da Sombra.** Para separar ou destacar, use borda de 2px (vinho em repouso, papel quando escolhido). Nunca box-shadow.

## Shapes

Cantos retos em tudo (0px): botões, campos, opções, moldura e cópias. A única forma além do
retângulo é a seta triangular dos blocos que abrem e fecham, que gira 90° ao abrir.

## Components

Os componentes vivem em `web/src/design-system` (React + CSS Modules em `@layer ds`). As
funcionalidades só ajustam o layout em volta deles.

### Buttons (Botao)
- **Shape:** cantos retos (0px), borda de 2px.
- **Principal:** placa de flash com texto em tinta, largura total, 14px de respiro. Em andamento (Parar) fica vazada, com borda e texto em papel.
- **Linha:** transparente, texto em papel e borda em vinho claro, 8px 14px. Tom perigo troca o texto para erro e a borda para vinho.
- **Ícone:** quadrado de 40px com ícone de 18px.
- **Discreto:** sem borda, a 55% de opacidade, 100% no hover (riscar uma cópia).
- **Hover / Focus:** a borda vira papel (erro no perigo); o foco é um contorno de 2px em flash, afastado 2px. Desabilitado: texto em texto 2 e borda em vinho.

### Chips (Segmentos)
- **Style:** placas com borda de 2px em vinho e texto em texto 2, lado a lado (quadros, formato) ou em lista com um detalhe à direita (roteiro).
- **State:** hover clareia a borda para vinho claro; a opção marcada ganha borda e texto em papel.

### Tabs (Abas)
- **Style:** rótulo em caixa alta (13px, 700), sem borda nem fundo; a aba ativa vira papel e ganha um traço de 2px em papel na base, encostado na borda da barra.
- **State:** repouso em texto 2, hover em texto; só a aba ativa responde ao foco de teclado (roving tabindex) e as setas ←/→ percorrem.

### Cards / Containers (Grupo, Recolhivel)
- **Corner Style:** retos.
- **Background:** o da coluna; grupos não têm caixa própria.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** só o bloco de ajustes finos tem uma divisória de 2px em vinho no topo.
- **Internal Padding:** grupos separados por 28px.

### Inputs / Fields (Campos)
- **Style:** fundo cortina, borda de 2px em vinho, 9px 10px, fonte do corpo. A seleção tem uma seta própria em texto 2.
- **Focus:** contorno de 2px em flash; hover troca a borda para vinho claro.
- **Deslizante:** trilho de 2px em vinho claro e polegar retangular de 12×18px em papel, com o valor à direita do rótulo.

### Cópia da tira (signature)
Cada quadro gerado vira uma cópia em papel com a miniatura e um rodapé (número · cena). A cópia
nova cai pela fenda (0.9s, cubic-bezier(.16, 1, .3, 1)); riscada, a miniatura fica a 30% com um
traço diagonal; a que está na prévia ganha contorno de 2px em papel. A vaga do próximo quadro é
uma cópia em cortina com o dígito da contagem em flash.

## Do's and Don'ts

### Do:
- **Do** usar os componentes de `web/src/design-system` e ajustar só o layout em volta, no CSS Module da funcionalidade.
- **Do** usar as variáveis de `tokens.css` (`var(--papel)`, `var(--t-rotulo)`) em vez de valores soltos.
- **Do** separar com borda de 2px em vinho e destacar com papel.
- **Do** respeitar `prefers-reduced-motion`: sem queda das cópias, sem transição de moldura, barra ou seta.

### Don't:
- **Don't** usar o flash fora do botão Gerar, da barra de progresso, da contagem do próximo quadro e do contorno de foco.
- **Don't** arredondar cantos, usar sombras ou gradientes.
- **Don't** trazer outra família tipográfica ou títulos maiores que o rótulo.
- **Don't** usar branco ou cinza neutro; o claro é papel e o escuro é cortina.
