# Histórico de Pedidos e Contexto Completo para IAs — KART ACKER TV

> Este arquivo registra todos os pedidos feitos pelo criador (Jacson) desde o início do projeto, além das decisões técnicas, arquitetura e cuidados críticos para que qualquer outra IA possa continuar evoluindo o jogo sem quebrar o que já foi validado.

---

## 1. Pedidos Originais do Usuário (Ordem Cronológica)

### Pedido 1 — Criação Inicial do Jogo com Subagentes Especializados
> *"Distribua subagentes especializados para construir e refinar cada parte separadamente:*
> - *Um subagente para a pista, curvas inclinadas, rampas e cenário (arquibancadas, árvores e texturas).*
> - *Um subagente para a modelagem 3D e física dos karts (suspensão, drift, rodas e escapamento).*
> - *Um subagente para o sistema de itens (caixas com interrogação, banana, tartaruga e turbo) e IA competitiva dos adversários.*
> - *Um subagente verificador rigoroso que inspeciona visualmente o jogo rodando no navegador, verifica se o texto da linha de chegada não está espelhado, testa a física da rampa e itera em loop corrigindo qualquer falha visual ou de jogabilidade até que o resultado esteja impecável."*

### Pedido 2 — Realismo Gráfico, Cubos Sólidos, Bots Contrastantes, Correção de Coleta e Salvamento
> *"deixe o mais realista possivel, reflexos, iluminacao, arvores etc, arvores etc nao pode deixar o jogo pesado, a parte interna os cubos tem que ser mais legais ano precisa ser transparentes os cubos OS OPONENTES BOTS TAMBEM SEJAM BEM LEGAIS E CORES BEM FACEIS DE SEPARAR. MELHORE MUITO O GRAFICO, ANALISE A JOGABILIDADE, TENTEI PEGAR OS CUBOS NAO FUNCIONOU. REVISE TUDO. DEPOIS QUE FINALIZAR SALVE O JOGO COMPLETO EM (`C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG\KART ACKER TV`)"*

### Pedido 3 — Registro para Outras IAs
> *"DEIXE NA PASTA O QUE EU PEDI DESDE O INICIO PARA OUTRAS IAS ENTENDEREM TAMBEM O QUE EU TINHA PEDIDO"*

### Pedido 4 — Avaliação e melhoria pelo Claude (21/11/2026)
> *"GEMINI FEZ UM JOGO NAO TESTEI AINDA, AVALIE BEM ESTE JOGO E VEJA O QUE PODE MELHORAR EM JOGABILIDADE VISUAL ETC"* e depois: *"QUERO QUE PRIMEIRO MELHORE A QUALIDADE GRAFICA ETC JOGABILIDADE, AI EM OUTRA THREAD VC ADAPTE PARA A TV ETC."*

O que o Claude mudou (versão 1.1):
- **Largada 3-2-1-VAI** com o semáforo do pórtico acendendo (vermelho → verde). Karts parados até o "VAI". **Largada turbo**: acelerar logo depois do "1". Acelerar cedo demais "afoga o motor".
- **3 níveis**: 🐣 Fácil (para crianças: acelera e segue a pista sozinho, bots mais lentos e sem cascos/bananas, itens melhores, rodada mais curta, larga na frente), 🏎️ Normal, 🔥 Difícil. Escolha fica salva no navegador. Opção "Acelerar sozinho".
- **Dificuldade dos bots agora funciona de verdade**: antes ela só mexia no acelerador (todos chegavam na mesma velocidade máxima). Agora cada kart tem `topSpeedScale` (velocidade máxima) e o "elástico" (rubber-banding) mexe nela.
- **Voltas**: aviso "VOLTA 2/3" e "ÚLTIMA VOLTA!", tempo da volta e melhor volta.
- **Contramão**: aviso piscando; tecla **T** (ou botão Select do controle) devolve o kart à pista; volta automática se ficar preso ou muito tempo na contramão.
- **Pausa** (Esc / P / Start do controle) com Continuar, Reiniciar e Menu.
- **Roleta do item** (~0,85 s sorteando antes de mostrar o item).
- **Chegada**: banner, confete no pódio, câmera girando no kart, tabela com medalhas que se atualiza enquanto os bots terminam, botão "Trocar dificuldade".
- **Visual**: marcas de pneu no asfalto (drift, freada e rodada), poeira ao sair da pista, fumaça do escapamento mais suave (antes eram bolas cinza grandes), chamas do turbo brilhantes, linhas de velocidade no turbo, tremida de câmera em batidas/quedas/cascos, flash vermelho ao rodar, câmera de vitrine no menu, asfalto menos granulado.
- **Sons novos** (sintetizados): bipes da largada, volta, última volta, chegada, batida no guard-rail, roleta, contramão.
- Sombras: `PCFSoftShadowMap` não existe mais no Three.js 0.187 → trocado por `PCFShadowMap` (o navegador avisava no console).

Testes feitos pelo Claude (navegador Chromium do servidor, NÃO na TV LG): corridas inteiras aceleradas nos 3 níveis com piloto automático. Resultado típico: Fácil = jogador vence com folga; Normal = disputa apertada (chegadas em ~1 s); Difícil = bots vencem por 3–8 s. No Fácil, sem tocar em nada, o kart completa as 3 voltas sozinho.

### Pedido 5 — Cenário mais realista (21/11/2026)
> *"melhore a parte do fundo, as montanhas nuvens principalmente deixe as nuvens etc mais reais ... coisa que nao pese muito no jogo mais fique mais real, grama etc"*

O que o Claude mudou (versão 1.2), sem imagens novas (tudo gerado em código, leve):
- **Céu e nuvens em shader** (`skyDome` em `src/main.js`): degradê atmosférico, brilho do sol e nuvens cúmulos procedurais que andam devagar com o vento, com lado iluminado e lado sombreado. As antigas nuvens de bolas 3D e o céu duplicado de `TrackSystem.js` foram removidos (menos objetos na tela). Ajuste de peso: `SKY_QUALITY.octaves` (5; baixar para 3 se a TV sofrer) e `uCloudCover` (quantidade de nuvens).
- **Montanhas em 2 camadas** (`buildGroundAndMountains`): colinas próximas com relevo natural (ruído fbm + cristas), manchas de mata, campo seco e pedra nas encostas; e uma **serra distante** azulada pela distância, com neve nos picos, que some na névoa do horizonte.
- **Grama**: textura com folhas finas inclinadas e florzinhas, e um truque de shader que mistura a textura em escala grande + manchas de cor pelo mundo, para não aparecer a repetição em quadradinhos.
- Névoa e distância da câmera ajustadas para combinar com o novo horizonte.

Ainda NÃO feito (fica para a próxima conversa): adaptar para TV LG com celulares como controle (QR Code), multiplayer de verdade.

---

## 2. Arquitetura do Projeto

Stack: **Three.js + Vite (JavaScript ES Modules puro)**, sem frameworks pesados.

| Arquivo / Pasta | Responsabilidade |
|---|---|
| `index.html` | Canvas tela cheia, HUD em PT-BR (Posição, Volta, Tempo, Botão de Som, Item Atual + Toast, Minimapa 2D, Carga de Drift, Velocímetro), tela inicial, tela de chegada e painel QA opcional (`?qa=1`). |
| `src/main.js` | Orquestrador da cena 3D, Skydome com disco solar/halo, mapa de reflexos PBR (`THREE.PMREMGenerator`), iluminação + sombras direcionais (`2048×2048`), câmera chase com FOV dinâmico, entrada Teclado + Gamepad/TV, áudio arcade sintetizado (Web Audio API) e `window.__KART_DEBUG__`. |
| `src/track/TrackSystem.js` | Circuito fechado (`CatmullRomCurve3`, `733.32` u, largura `18` u), 3 curvas inclinadas (`bankAngle` até `-21.5°`), rampa de salto (`tStart=0.257`, `tPeak=0.276`, `tEnd=0.286`, altura `3.2` u), asfalto/grama PBR (`map` + `roughnessMap` + `bumpMap`), pórtico `"LARGADA / CHEGADA"`, guard-rails metálicos com colisão (`getLateralBounds`), cordilheira orgânica, 3 arquibancadas com torcida animada, 6 torres de refletores, banners (`KART ACKER`, `TURBO GP`, `NITRO PRO`), 20 nuvens e **197 árvores/arbustos em apenas 5 draw calls (`InstancedMesh`)**. |
| `src/kart/KartSystem.js` | Modelagem 3D automotiva PBR (`MeshPhysicalMaterial` com `clearcoat: 1.0`, cromo, textura procedural de fibra de carbono, faróis LED, lanternas traseiras de freio/drift, molas helicoidais, pinças de freio, faixa F1 nos pneus, placas numéricas na frente e traseira, tags flutuantes nos bots), pools de partículas (fumaça/chamas de boost + faíscas de drift em 3 estágios), suspensão mola-amortecedor, física de rampa/banking, suavização de esterçamento, `prevPosition` e `events`. |
| `src/items/ItemAndAISystem.js` | **17 cubos `?` sólidos** metálicos em 5 fileiras (1ª logo na reta inicial em `t=0.055`), moldura 3D metálica, textura HD 512×512 nas 6 faces e anel luminoso no asfalto; coleta contínua por segmento XZ (`raio 3.0` u); 3 itens (**Banana**, **Casco de Tartaruga** com até 3 ricochetes, **Turbo**); `createAIController` competitivo com desvio de bananas, busca por caixas, drift, uso estratégico de itens, recovery anti-travamento e rubber-banding suave. |
| `vite.config.js` | Configurado com `base: './'` para o `dist/` rodar em qualquer subpasta/servidor estático ou portal da TV LG. |
| `dist/` | Bundle de produção pronto para rodar sem `node_modules`. |
| `INICIAR_JOGO.bat` | Atalho rápido no Windows que serve `dist/` via Python em `http://127.0.0.1:5173/`. |

---

## 3. Paleta de Pilotos (Alto Contraste)

Projetada para máxima separação visual entre si, contra o asfalto escuro e contra a grama verde:
- **Você `#1`**: Vermelho Ferrari (`#dc2626`) + Branco Pérola (`#ffffff`)
- **Trovão Azul `#7`**: Azul Elétrico Ciano (`#0284c7`) + Amarelo Neon (`#fde047`) · tag `AZUL #7`
- **Sol Dourado `#22`**: Amarelo/Laranja Solar (`#f59e0b`) + Preto Carbono (`#18181b`) · tag `OURO #22`
- **Fúria Rosa `#88`**: Magenta Neon (`#e11d98`) + Branco (`#f8fafc`) · tag `ROSA #88`

---

## 4. Regras Críticas e Problemas Já Resolvidos (NÃO REGREDIR!)

Se outra IA for modificar este projeto no futuro, preserve rigorosamente estas decisões:

1. **Texto do Pórtico `"LARGADA / CHEGADA"` NÃO Espelhado**:
   - Usa **duas** `PlaneGeometry` separadas com `side: THREE.FrontSide` orientadas com `Matrix4.makeBasis(xAxis, yAxis, zAxis)` (frente voltada para `-tangent`, verso voltado para `+tangent`). Nunca trocar para uma única placa `DoubleSide`.
2. **Coleta Contínua dos Cubos `?` (Bug Corrigido)**:
   - Antes falhava porque usava distância esférica 3D pequena (`2.1` u) e pontual por frame.
   - Hoje usa distância **ponto-segmento no plano XZ** (`prevPosition -> position`) com raio `3.0` u e tolerância vertical `2.6` u; a caixa **sempre estoura** ao contato (mesmo quando o jogador já segura um item), dando feedback visual e sonoro.
   - Os cubos devem permanecer **SÓLIDOS** (`transparent: false`, metálicos e chamativos), conforme pedido do usuário.
3. **Performance das Árvores e Cenário (60 FPS)**:
   - Toda a vegetação (pinheiros, árvores frondosas e arbustos) deve permanecer em `InstancedMesh` compartilhado (atualmente **5 draw calls** para 197 instâncias). Evite criar dezenas/centenas de `THREE.Mesh` individuais para árvores ou partículas.
4. **Colisão Real nos Guard-Rails e Zero Clipping nas Curvas Inclinadas**:
   - `TrackSystem.js` expõe `getLateralBounds(t)` alinhado aos `RAIL_RANGES` e consumido por `KartSystem.js`, impedindo que os karts atravessem os guard-rails metálicos.
   - O acostamento verde é coplanar com o banking da pista até `±(HALF_WIDTH + 3.2)` e as curvas inclinadas ficam acima de `GROUND_Y = -0.65`, impedindo clipping de rodas na grama interna.
5. **Convenção de Coordenadas Compartilhada**:
   - Frente local do kart = `+Z`, cima = `+Y`, esquerda = `+X`, direita = `-X`.
   - `heading = Math.atan2(forward.x, forward.z)` (`forward = (sin(heading), 0, cos(heading))`).
   - `controls.steer`: `-1` = esquerda (aumenta `heading`), `+1` = direita (diminui `heading`).
   - `track.right` = `tangentXZ × (0, 1, 0)`.
6. **Layout do HUD e Modo QA**:
   - O minimapa fica no canto **inferior esquerdo** para nunca cobrir o pórtico `"LARGADA / CHEGADA"` em telas menores.
   - Adicionar `?qa=1` na URL (`http://127.0.0.1:5173/?qa=1`) ativa um painel de QA oculto no modo normal, com botões clicáveis para testar largada, rampa, curva inclinada, cubos `?`, itens e telemetria/FPS em tempo real.
7. **Dificuldade e testes automáticos (v1.1)**:
   - `DIFFICULTIES` em `src/main.js` define cada nível. Bots: `createAIController(..., tuning)` com `baseSpeed`, `aheadSlow`, `behindBoost`, `useItems`; o controlador ajusta `kart.topSpeedScale`.
   - `window.__KART_DEBUG__.setAutopilot(true)` + `fastForward(segundos)` simulam uma corrida inteira sem desenhar (teste rápido de equilíbrio). `setDifficulty('facil'|'normal'|'dificil')`, `startWithCountdown()`, `respawnPlayer()`.
   - A simulação fica em `stepSimulation(dt)`; o desenho fica só em `animate()`.
8. **Objetivo Final (TV LG / Multiplayer Futuro)**:
   - O projeto está salvo dentro da pasta `JOGOS MULTIPLAYER TV LG\KART ACKER TV`. Já possui suporte básico a **Gamepad API** além de teclado (`WASD / Setas / Espaço / Shift / E / R`) e build com `base: './'`. Caso seja expandido futuramente para multiplayer na TV LG (tela dividida ou controle via celular/WebSocket), toda a arquitetura já está modularizada em `TrackSystem`, `KartSystem` e `ItemAndAISystem`.

## Pedido 6 — Multiplayer TV + celulares (21/11/2026, Claude) — v2.0
- Pedido do Jacson: "modificar este jogo para jogar e que a TV seja alguma coisa legal no jogo… não sei se tela dividida é ruim… analise, faça e publique". E guardar o kart no projeto dos jogos (repo `Ackerss/jogos`, pasta `jogo-kart/`).
- Decisão: **sem tela dividida** (4 câmeras 3D travariam a TV LG). Cada celular roda o 3D do próprio kart; a TV mostra a transmissão ao vivo (ou mapa de cima) com placar.
- Publicado em `https://ackerss.github.io/jogos/kart/`, na pasta "Jogos testes" da central. Build e testes no GitHub Actions (`deploy.yml`).
- Mantido: modo Fácil/criança (agora "Modo criança 🧸" por jogador), itens, robôs, largada turbo, jogo solo (`?modo=solo`).
- Falta: teste na TV LG física com celulares reais.
