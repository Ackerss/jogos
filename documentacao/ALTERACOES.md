# Registro de alterações

## 06/11/2026 — Novo jogo: Grande Prêmio dos Bichos (Claude)
Pedido do Jacson: corrida de apostas que até a filha de 4 anos consiga jogar.
- **Jogo em `jogo-bichos/`**, publicado em `bichos/` e com cartão na central (primeiro da fila, selo "Novo").
- **Como é:** 5 bichos correm na TV, ninguém tem bicho próprio. Na vez, o celular mostra 3 botões grandes com desenho: Dado (um bicho anda, +1 moeda), Apostar (bilhetes de 5, 3 e 2) e Banana (o bicho escorrega e o dono ganha 1 moeda). Quem cai em cima de outro pega carona. Regras completas em `jogo-bichos/README.md`.
- **2 a 8 jogadores**, com bots opcionais (0 a 7) que simulam a volta para decidir. Tempo da vez ajustável. Campeões guardados na TV.
- **Leve para a TV LG:** desenhos em SVG no código (sem imagens e sem emoji), sem blur, animações só com transform/opacity, MP3 do locutor baixado só na hora de tocar.
- **Conexão:** mesmo motor Doot e relay público. A TV manda dados (não HTML) e o celular desenha. `jogo-bichos/rede/rede.ts` serve de modelo para os próximos jogos.
- **Locutor:** 35 frases prontas para o ElevenLabs (`jogo-bichos/audio/narracao/FRASES.md`) e o pedido para o Antigravity (`PROMPT_ANTIGRAVITY.md`). Até os MP3 chegarem, as frases principais usam a voz do navegador.
- **Testado pela IA em navegador:** 300 corridas só com bots nos testes; partida completa no simulador; partida completa com TV + 3 celulares em páginas separadas pelo relay local, incluindo celular recarregado voltando sozinho. Sem erros. **Não testado na TV LG física nem no relay público** (o relay público não abre a partir do ambiente da IA).
- Pastas vazias `jogo-arena`, `jogo-impostor` e `jogo-mentira` criadas no PC do Jacson para os próximos jogos.

## 06/11/2026 — Conversa limpa, letras maiores e botão de Regras (Claude)
Pedido do Jacson antes do primeiro teste com amigos.
- **Conversa só entre pessoas** (sem bots na mesa):
  - o celular não mostra mais os botões "Eu era…" e "Desconfiar de", que servem só para falar com os bots;
  - fica a carta inicial, as pistas secretas e o "Quero votar";
  - a TV troca o chat por "Conversem em voz alta!".
- **Com bots na mesa:** os botões continuam, agora com o título "Falar com os bots".
- **Letras maiores no celular de verdade:** textos, pistas, notas, opções e botões.
- **📜 Regras:**
  - botão no lobby da TV e no rodapé do celular, disponível a qualquer momento;
  - resumo de 5 itens com o que cada papel faz. A Vidente olha 1 jogador **ou** 2 cartas do centro, como já era no jogo.
- **Testado pela IA em navegador,** com relay local e sem erros:
  - partida com 3 celulares e nenhum bot;
  - partida com 2 celulares e 1 bot.

## 06/11/2026 — Nova central de jogos (Claude)
- **Tela inicial redesenhada** (`index.html` + `portal.css`), no estilo "menu de console": a arte do jogo escolhido ocupa a tela, com nome grande, informações e o botão **JOGAR**. Embaixo, a fileira de jogos em cartões tipo pôster.
- **Feita para a TV:** tudo cabe numa tela 16:9 sem rolar (1280×720 ou 1920×1080), letras grandes para ver do sofá e anel branco grosso no item escolhido. Controle remoto: ◀ ▶ troca o jogo, OK joga, ▲ vai para o botão JOGAR, ▼ volta à lista. O ponteiro do Magic Remote também escolhe ao passar por cima. A TV lembra o último jogo escolhido.
- **Celular:** a mesma página vira uma coluna que rola, com a arte no alto e os cartões deslizando para o lado.
- **Saíram os cartões de exemplo** do Gemini (Quiz da Família, Cartas & Blefe e o cartão do GitHub). Ficou um único cartão "Em breve".
- **Jogo novo = um bloco na lista `JOGOS`** no começo do script do `index.html` (nome, link, fichas, resumo, capa, fundo, cor). A Corrida ganhou uma arte desenhada em código (pista ao pôr do sol); a Noite dos Lobos usa as artes que já existem em `lobisomem/arte/`.
- Verificado pelo Claude em navegador (Chromium) em 1920×1080, 1280×720, 1366×640 e celular 390×844, inclusive setas, OK e ponteiro. **Não testado na TV LG física.**

## 06/11/2026 — Modo TV oficial com celulares de verdade (Claude)
- **Abrir o jogo na TV agora é o jogo oficial:** a TV mostra um QR Code e um código de 4 letras. Cada pessoa aponta a câmera do celular, coloca o nome e entra. A carta secreta, as ações da noite e o voto aparecem só no celular dela.
- **Conexão:** usa o motor Doot e o relay público `wss://relay.clasp.to`, os mesmos da Corrida dos Toques (o motor não foi alterado). A TV roda o jogo e manda para cada celular a tela pronta; o celular só devolve os toques (`jogo-lobisomem/rede/rede.ts`, gerado em `js/rede.js`).
- **Ajustes na TV, fáceis com o controle remoto:** cada botão passa para a próxima opção: 🤖 bots (0 a 5), 🌙 tempo da noite, 💬 tempo de conversa e 🎙️ narração. Ficam guardados na TV.
- **Controle remoto:** as setas andam entre os botões e o OK aperta. O foco fica no mesmo botão quando a tela atualiza.
- **Botões de teste escondidos** no canto de cima, à direita, quase invisíveis: "teste tv" completa a mesa com bots (você + 3 bots, com o seu celular) e "teste pc" abre o simulador antigo. Também há "⛶" (tela cheia).
- **Simulador:** continua igual em `?modo=pc`.
- **Ranking da casa:** conta vitórias e partidas por nome, guardado na TV. Bots não entram. Aparece no fim de cada rodada (linha curta) e no botão 🏆 Ranking (lobby e fim), com opção de zerar (aperta duas vezes).
- **Proteções:**
  - nome repetido na sala é recusado (com opção "sou eu voltando");
  - o celular que recarrega volta sozinho para a mesma tela;
  - quem entra no meio da partida espera a próxima;
  - mais de 6 pessoas: "Mesa cheia";
  - se um celular sumir na hora de olhar a carta, a mesa segue depois de 90 s;
  - "Jogar de novo" volta para a sala quando alguém entrou ou saiu.
- **Celular que abre o link sem QR** cai direto na tela de entrar (`?modo=tv` força a TV).
- **TV antiga:** tamanho 16:9 sem `aspect-ratio` e CSS sem `inset`. O código de conexão é compilado para navegadores antigos (Chrome 61).
- **Testado pela IA em navegador (Playwright),** com relay de teste local (`scripts/relay-local.mjs`), porque o ambiente da IA não acessa o relay público:
  - partida completa com TV + 2 celulares + 2 bots;
  - controle remoto por setas;
  - "teste tv";
  - celular recarregando no meio da noite;
  - simulador sem mudanças.
- **Ainda não testado:** a TV LG física e o relay público com este jogo.

## 06/11/2026 — Ajustes após testes de partida (Claude)
Foram testadas 15 partidas automáticas, simulando uma família na sala: 8 sobre ritmo e esperas, 7 sobre a clareza das telas.
- **Votação:**
  - aos 30 s aparece um aviso na TV e no celular;
  - aos 60 s a votação fecha, e quem não votou fica sem voto, para ninguém travar a mesa;
  - a votação espera o narrador terminar.
- **Noite:**
  - na narração completa (1ª partida), cada etapa tem no mínimo 12 s, para dar tempo de ler e escolher;
  - o fechamento de cada etapa caiu de 1,7 para 1,3 s;
  - quem espera vê "Agora: vez do Ladrão · 3 de 4" e uma frase própria: papel sem ação ou "você já fez a sua parte".
- **Replay:** um pouco mais rápido (leitura inicial de 1,7 s e 2,3 s por troca).
- **Textos:**
  - a TV explica no início que são 2 lobos e que eles podem estar no centro;
  - a votação na TV cita a Paz na vila;
  - a regra no celular agora diz "2 votos ou mais";
  - o resultado diz por que o time venceu, na TV e no celular;
  - letras maiores no rodapé e nos rastros da noite;
  - a pomba da Paz na vila fica ao lado das cartas do centro.
- **Celular:** "Jogar de novo" aparece no celular de todos os humanos.
- **Narração:** saíram 3 frases que afirmavam haver lobo, ou que podiam ficar falsas. O roteiro ficou com 61 frases.

## 06/11/2026 — Paz na vila e abertura sem corte (Claude)
- **Votação:**
  - novo botão **🕊️ Paz na vila**, para quem acha que não há lobo entre os jogadores;
  - se a Paz empatar com o mais votado ou ganhar, ninguém sai;
  - na TV aparece um alvo com a pomba no centro, e as setas e o contador apontam para ele.
- **Bots:** às vezes pedem paz. A Vidente que viu 2 lobos no centro sempre pede, e um lobo sozinho pede com mais frequência.
- **Narração:**
  - novo momento `paz_na_vila`, com 2 frases neutras que não revelam se havia lobo;
  - a abertura ("Era uma vez…") não é mais cortada, porque o jogo espera o narrador antes do "olhe a sua carta".
- **Testes:** novos testes da regra da Paz (14 no total).

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
