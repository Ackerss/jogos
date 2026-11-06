# Registro de alterações

## 06/11/2026 — Narração gravada e publicada (Claude)
- O Antigravity gravou as 62 frases com a voz "Narrador Lobos" (modelo eleven_multilingual_v2).
- O Claude:
  - cortou os silêncios;
  - igualou o volume em −16 LUFS;
  - gerou `prontos.js`;
  - testou partidas completa e rápida no navegador, com 62/62 áudios e sem erros;
  - publicou.
- Ainda não foi testado na TV LG física.

## 06/11/2026 — Narração: voz "Narrador Lobos" e modo rápido (Claude)

- O Claude criou 3 vozes no Voice Design do ElevenLabs, pelo navegador do Jacson, na conta grátis pessoal dele. O Jacson escolheu a opção 3, salva como **"Narrador Lobos"**. Vozes criadas na própria conta funcionam pela API no plano grátis; as da Voice Library não (erro 402).
- Novo ajuste **Narração**:
  - Automática: a 1ª partida tem narração completa e as seguintes são rápidas.
  - Sempre completa.
  - Sempre rápida: só "A noite caiu.", "Vez do ladrão.", "Hora de votar!", eliminação e vitória.
- 8 frases curtas novas (62 no total) e um teste novo (13 testes).
- Prompt do Antigravity na versão 3: grava as 62 frases com a voz "Narrador Lobos".
- Registro completo em `jogo-lobisomem/NARRACAO.md`.

## 05/11/2026 — Narração v2: frases para TV + celular e nova voz (Claude)

- Jacson pediu para tirar o "fechem os olhos": o jogo é na TV com celular, e cada um age em segredo pela própria tela. As 54 frases foram reescritas com tom de contador de histórias de fantasia.
- Os textos de "dormir" e "olhos fechados" na TV, nos celulares e nas regras viraram "Vez do …", "A noite chegou" e "Aguarde…".
- A primeira gravação (voz americana Adam, feita pelo Antigravity) foi descartada e não foi publicada.
- O prompt do Antigravity foi refeito. Ele agora procura um narrador brasileiro mais velho (Voice Library ou Voice Design) e gera amostras para o Jacson escolher antes de gravar as 54 frases.
- `jogo-lobisomem/audio/amostras/` está no .gitignore.

## 05/11/2026 — A Noite dos Lobos: narração pronta para MP3 (Claude)

- Roteiro do narrador em `jogo-lobisomem/js/narracao.js`: 29 momentos e 54 frases curtas (cerca de 2.600 caracteres), com 1 a 3 versões sorteadas para não repetir.
- O jogo toca `audio/narracao/<momento>_<n>.mp3`. Sem o arquivo, fala a mesma frase com a voz do navegador. Só carrega os MP3 listados em `prontos.js`, então nenhum arquivo inexistente é pedido.
- As transições esperam o narrador terminar a frase. O tempo de cada etapa da noite continua fixo.
- Novas falas: começo da conversa, aviso de 30 segundos, contagem dos votos, trocas no replay e vitórias por motivo.
- `node scripts/frases.js` gera `audio/narracao/FRASES.md` e `prontos.js` e mostra os arquivos que faltam ou estão com nome errado. O prompt para o Antigravity gravar no ElevenLabs está em `audio/narracao/PROMPT_ANTIGRAVITY.md`.
- O deploy agora copia `audio/`. Há 2 testes novos (12 no total).
- Testado no Chromium com MP3 de teste: a partida inteira tocou 22 narrações sem erros. Testado também sem nenhum MP3: zero pedidos de áudio e voz do navegador. Os MP3 reais ainda não existem.

## 05/11/2026 — A Noite dos Lobos v0.2.0 (revisão completa pelo Claude)

- Protótipo local `JOGO LOBISOMEN ACKER/index.html` (arquivo único de 2,4 MB) trazido para o repositório em `jogo-lobisomem/`, separado em regras, bots, diretor de fases, mesa da TV, celulares, cenário e som. Imagens extraídas para `arte/` (WebP).
- Mesa da TV refeita: cartas e lugares agora são elementos que se movem (antes a tela era redesenhada a cada mudança e as animações se repetiam ou sumiam). Distribuição com voo carta a carta, virada 3D com leve elevação, recolher ao jogar de novo.
- Novas etapas visuais: apuração com setas de quem votou em quem e contador; replay da noite que vira as cartas iniciais e mostra cada troca do Ladrão/Encrenqueiro na frente de todos; botão Pular.
- Correção de regra/justiça: no protótipo, a etapa de um papel sem humano passava em 1,6 s e a TV mostrava “Aguardando ação no celular” só quando havia humano — isso entregava quem tinha cada carta. Agora toda etapa dura o mesmo tempo (ajustável) e a TV mostra sempre o mesmo relógio.
- Textos da TV e dos celulares reescritos curtos; regras da página em 6 itens; nomes dos papéis seguem a arte da carta (Ladrão/Ladra etc.).
- Celulares: carta vira em 3D, Vidente/Lobo/Ladrão veem a carta revelada, Encrenqueiro vê a troca, relógio da vez, “Quero votar agora”.
- 10 testes automáticos das regras (inclui 300 partidas com bots). Testado em navegador (Chromium) com 3, 4, 5 e 6 jogadores e 1, 2 e 5 celulares simulados, sem erros no console. **Não** testado na TV LG física.
- Portal: card “A Noite dos Lobos — simulador”; deploy publica em `/lobisomem/`.

## 02/11/2026 — rascunho de estilos e possíveis jogos

- Criado RASCUNHO_IDEIAS_JOGOS.md com a seleção fornecida pelo usuário, perfil desejado, sete conceitos, ordem sugerida e hipóteses de bots.
- Registrado explicitamente que nada está decidido em definitivo e que a lista não autoriza iniciar desenvolvimento.
- Adicionadas referências no leia-me, estado atual e continuidade entre IAs. Nenhum jogo, bot ou alteração no portal foi implementado nesta tarefa.
- O anexo original e suas imagens não foram adicionados ao repositório; o registro é uma síntese das ideias, sem nova verificação de regras comerciais.

## 02/11/2026 — ícones profissionais para webOS (TV LG) e Web App Manifest

- **Ícones em Alta Resolução:** Criados `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180x180), `favicon-32x32.png` e `favicon.ico` com fundo sólido Deep Space (#0e101f) e emblema 3D neon do ACKER PLAY.
- **Web App Manifest:** Criado `site.webmanifest` para registrar o app como aplicativo instalável/fixável com orientação horizontal e cores de destaque.
- **Integração no Build:** Atualizado `scripts/build.mjs` e workflow de deploy para empacotar os ícones na raiz e na pasta `/corrida/`.
- **Evidência Preservada:** Foto do atalho do usuário no webOS da TV LG arquivada localmente em `evidencias/ATALHO_TELA_INICIAL_LG_WEBOS.png`.

## 02/11/2026 — publicação no GitHub Pages e criação do Portal de Jogos (ACKER PLAY)

- **Repositório Centralizado:** Criado o repositório público `https://github.com/Ackerss/jogos` para colaboração contínua entre Antigravity, Claude e Codex.
- **Portal de Jogos:** Criado `index.html` e `portal.css` na raiz para servir como launcher na TV LG, listando os jogos criados e futuros em cards/lista navegável.
- **Deploy Automatizado (GitHub Actions):** Criado `.github/workflows/deploy.yml` que compila os jogos, roda testes automatizados e publica no GitHub Pages (`https://ackerss.github.io/jogos/`).
- **Navegação Integrada:** Adicionado atalho `‹ Jogos` no cabeçalho da Corrida dos Toques para permitir retornar ao portal a qualquer momento.
- **Proteção contra Saída Acidental no Celular:** Adicionado `overscroll-behavior: none` e `touch-action: manipulation` para prevenir disparos acidentais de pull-to-refresh e gestos de retorno de página nos navegadores mobile durante toques rápidos.
- **Preservação de Evidências:** Pasta `evidencias/` mantida estritamente local via `.gitignore`.
- **Compatibilidade Redundante:** Configuração do ChatGPT Sites (`.openai/hosting.json`) mantida intacta caso o Codex deseje usar para testes específicos.

## 02/11/2026 — retorno do teste físico

- Usuário confirmou comandos funcionando na TV LG com dois celulares; fotos mostram jogadores distintos, sala e resultados.
- Relatou saída acidental durante toques com vários dedos e dificuldade para voltar. Gesto/botão exato e causa não confirmados; reconexão física permanece pendente. Nenhuma alteração do jogo ou republicação nesta anotação.

## 02/11/2026 — primeira entrega

- Decisão por Doot após pesquisa e comandos confirmados pelo usuário na LG em HexStacker e Pit Party.
- Clone integral do Doot fixado em commit; motor real copiado com proveniência e licença para uma aplicação leve separada.
- Corrida dos Toques, 1–4 participantes, 20 s de disputa, 3 s de contagem, resultado e empate.
- Entrada por QR ou código, nomes separados, primeiro participante inicia, revanche na mesma sala.
- Autoridade de tempo/placar da TV, contadores cumulativos e identificador por partida para rejeitar mensagens antigas.
- Correção de conexão duplicada na integração de entrada para manter assinaturas atualizadas em revanche.
- Correção do layout da TV para caber em 1280×720.
- Verificação de tipos, bundle e 5 testes de lógica passaram.
- Mudança de prioridade solicitada pelo usuário durante o trabalho: acesso online gratuito em vez de depender do PC ligado. Servidor local mantido apenas como alternativa técnica.
- Publicação Sites v1 confirmada no endereço registrado em ESTADO_ATUAL.md; arquivos de evidência/histórico ficaram locais.
- Preparados AGENTS.md e orientações de continuidade no Antigravity/Gemini.
