# Portfolio Visual DNA (Blueprint Style)

Este documento descreve o estilo global do portfolio como um sistema de design reutilizavel.
Objetivo: permitir criar um projeto totalmente diferente (novo conteudo, novo layout), mas com a mesma assinatura visual e de interacao.

## 1) Essencia do estilo

### 1.1 Personalidade
- Direcao: retro-digital + editorial tecnico + vibe hacker playful.
- Leitura emocional: minimalista, contrasta forte, geometrico, com pequenos momentos de surpresa.
- Tom visual: serio na estrutura, divertido nas interacoes.

### 1.2 Principios nucleares
- Fundo escuro quase absoluto com texto claro quente.
- Bordas sempre visiveis (quase tudo e enquadrado em linhas de 2px).
- Sem cantos arredondados (linguagem de bloco, rigida, modular).
- Interacoes com feedback imediato (hover invertido, micro-transform, cursor custom).
- Movimento curto e pontual (nunca animacao pesada por defeito, exceto scroller continuo).

## 2) Design tokens

Tokens principais (modo default):

```css
:root {
  --background: #070707;
  --primary: #DED8CB;
  --accent: #FFAB07;
}
```

Cores auxiliares observadas:
- Sucesso/status: `#0bbb98` (status de projeto) e `#4CAF50` (roadmap completo).
- Erro: `#ff4444` / `#cc6666`.

### 2.1 Regra de contraste
- Quase tudo usa `background` vs `primary`.
- `accent` e reservado para destaque pontual: selecao de texto, estado ativo, detalhes de foco, thumbs ativos.

## 3) Tipografia

### 3.1 Font stack
- Body fallback tecnico: `Arial, sans-serif`.
- Titulos: `Special Gothic Expanded One`.
- Texto/captions/UI labels: `Special Gothic Condensed One`.

### 3.2 Hierarquia tipografica
- H1: display forte, tracking visivel, peso 400.
- H2/H3: mesma familia visual, ritmo consistente.
- Paragrafos: line-height ~1.6, word-spacing leve (`1px`) para textura de leitura.
- Microcopy de UI: letter-spacing frequente (`1px` a `2px`) para look tecnico.

### 3.3 Regras de uso
- Titulos em Expanded para impacto.
- Conteudo e labels em Condensed para densidade.
- Evitar serifas, scripts ou pesos ultraleves.

## 4) Linguagem de forma

### 4.1 Geometria
- Base: retangulos com borda dura.
- Border radius: praticamente inexistente.
- Excecao circular: avatar (`border-radius: 50%`) e particulas.

### 4.2 Bordas
- Espessura dominante: `2px solid var(--primary)`.
- Elementos de enfase lateral: `border-left: 4px solid var(--primary)`.
- Tags pequenas: `1px`.

### 4.3 Iconografia e simbolos
- Estrela repetida no scroller.
- Checkmarks (`✓`) e bullets simples para listas.
- Separadores lineares horizontais para estruturar secoes.

## 5) Layout e composicao

### 5.1 Estrutura principal
- Desktop:
  - Sidebar fixa esquerda (`310px`, `100vh`, borda direita 2px).
  - Conteudo principal deslocado com `margin-left: 310px`.
- Mobile (`<=768px`):
  - Sidebar vira bloco no topo (flow normal).
  - Main perde offset lateral.

### 5.2 Ritmo espacial
- Padding base de blocos: `20px`, `30px`, `40px` conforme importancia.
- Gaps de grids: tipicamente `20px` (ou `15px`/`25px` em contextos especificos).
- Vertical rhythm simples, sem escala complexa de spacing tokens.

### 5.3 Grid system
- Cards principais: `repeat(auto-fill, minmax(300px, 1fr))`.
- Grids de detalhe: `auto-fit` com `minmax(250px-300px, 1fr)`.
- Mobile: converte quase tudo para `1fr`.

## 6) Componentes (assinatura)

### 6.1 Sidebar profile block
- Avatar circular com borda 2px e acao interativa.
- Nome + alias + idade dinamica.
- Lista de links sociais em botoes outline.
- CTA secundario escondido/revelado no mobile (`Show More`).
- Scroller tecnico no rodape da sidebar (ticker continuo).

### 6.2 Botoes e links
- Estilo base:
  - Fundo transparente + borda 2px + texto `primary`.
  - Hover: inversao (`background: primary`, `color: background`).
- Estados especiais:
  - `copied`: usa `accent`.
  - `disabled`: baixa opacidade, sem interacao.

### 6.3 Project cards
- Moldura dura (`2px`).
- Imagem em grayscale por defeito; hover revela cor.
- Logo em overlay absoluto no canto.
- Badge de estado (in-progress) com caixa pequena contrastante.
- Hover desktop: lift/tilt aleatorio suave.

### 6.4 Project detail modules
- Hero e secoes todas em caixas com borda.
- Cartoes internos com hover `translateY(-5px)` + leve fade (`opacity: 0.8`).
- Conteudo textual processado com suportes markdown (strong/em/code/link/del/u).

### 6.5 Gallery + zoom
- Viewer dedicado com barra superior, navegacao lateral, thumbs, contador.
- Zoom overlay fullscreen com pan + wheel + pinch + atalhos teclado.
- Thumb ativo usa `accent` para sinalizacao.

## 7) Motion system

### 7.1 Curva e duracao
- Duracoes curtas: `180ms`, `250ms`, `300ms`, `650-700ms`.
- Easing dominante: `ease`, `ease-in-out`, e cubic-bezier playful (`.2,.9,.3,1`).

### 7.2 Animacoes nomeadas
- `wobble` (avatar).
- `spin` (avatar).
- `bounce` (avatar).
- `ripple` (onda radial no avatar).
- `explode` (particulas).
- `wave` (bandeira no header de projeto).
- `scroll-left` (ticker; em JS vira animacao por `requestAnimationFrame` com loop suave).

### 7.3 Regras de movimento
- Movimento decorativo e triggerado por acao do utilizador.
- Evitar animar layout macro continuamente, exceto ticker.
- Hover motion limitado a pequenas translacoes/escala.

## 8) Interacao e comportamento

### 8.1 Cursor language
- Cursor custom open hand no body.
- Cursor custom pointing hand em links e elementos clicaveis.
- Estado grabbing global quando click esquerdo esta pressionado.

### 8.2 Feedback instantaneo
- Quase toda interacao gera resposta visual clara:
  - Inversao de cor
  - Micro transform
  - Classe ativa/estado textual temporario

### 8.3 Easter eggs e identidade
- Command palette estilo terminal (`Ctrl+K`), overlay blur e tema monospace.
- Comandos fun (`cowsay`, `qotd`, `cache` etc.) reforcam personalidade.
- Efeito `crazyParty` apos hover rapido repetido em cards.

### 8.4 Gestos e acessibilidade funcional
- Teclado em varios pontos (Enter/Space no avatar, setas em carousel, Esc para fechar overlays).
- Swipe em carousel e pinch-to-zoom na galeria.
- `aria-label` e estados `aria-expanded` nos elementos relevantes.

## 9) Sistema de estados

Estados recorrentes:
- default
- hover
- active/selected (ex.: dot/thumb ativo)
- disabled
- copied/success
- in-progress
- offline/error

Padroes visuais de estado:
- Estado principal via inversao background/texto.
- Estado ativo por preenchimento ou `accent`.
- Estado erro com vermelho dedicado.
- Estado disabled por opacidade.

## 10) Responsividade

Breakpoints praticos:
- `768px` (principal mobile cutoff).
- `800px` (ajuste especifico do tech scroller).
- `769px` usado para regras desktop (complementar ao 768).

Estrategia:
- Desktop-first com overrides para mobile.
- Reorganizacao estrutural simples (sem redesign total):
  - Sidebar empilha
  - Grids viram coluna unica
  - Controlo de galeria adapta-se para botoes horizontais

## 11) Atmosfera visual

### 11.1 Sensacao geral
- "Console meets portfolio": tecnico, pessoal, direto.
- Mistura de rigor (linhas/bordas) com energia ludica (animacoes, comandos secretos).

### 11.2 O que evitar para nao quebrar o estilo
- Gradientes suaves dominantes no layout principal.
- Sombras blur modernas como linguagem primaria.
- Cantos muito arredondados.
- Paletas pastel ou baixo contraste.
- Animacoes longas e ambiguas.

## 12) Receita para criar um novo site no mesmo estilo

Use esta checklist para reproduzir o estilo sem copiar layout/conteudo:

1. Definir 3 tokens base (`background`, `primary`, `accent`) com contraste alto.
2. Construir componentes em caixas retangulares com borda `2px`.
3. Aplicar dupla tipografica: display Expanded + texto Condensed.
4. Garantir hover por inversao cromatica em botoes/links.
5. Aplicar micro-motion curto (200-300ms) em componentes interativos.
6. Adicionar pelo menos 1 area de movimento continuo (ticker/faixa).
7. Usar cursor custom para transformar sensacao tactil do site.
8. Incluir 1 camada "secret" de personalidade (atalho, palette, mini-jogo ou terminal).
9. Implementar modo mobile por empilhamento e simplificacao de grids.
10. Manter linguagem visual sem rounded-heavy UI.

## 13) Blueprint tecnico minimo (tokens + classes)

```css
:root {
  --background: #070707;
  --primary: #DED8CB;
  --accent: #FFAB07;
}

body {
  background: var(--background);
  color: var(--primary);
  font-family: Arial, sans-serif;
}

.panel {
  border: 2px solid var(--primary);
  background: var(--background);
}

.btn-outline {
  border: 2px solid var(--primary);
  color: var(--primary);
  background: transparent;
}

.btn-outline:hover {
  background: var(--primary);
  color: var(--background);
}

.card:hover {
  transform: translateY(-5px);
}
```

## 14) Conclusao operacional

O estilo deste portfolio nao depende de um layout especifico.
Depende da combinacao destes fatores:
- contraste binario forte,
- molduras de 2px,
- tipografia condensed/expanded,
- interacao rapida com feedback claro,
- detalhes playful escondidos.

Se estas regras forem mantidas, e possivel criar uma interface totalmente diferente com a mesma "assinatura GabiBrawl".
