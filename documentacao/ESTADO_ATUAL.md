# Estado atual — 02/11/2026

## Entrega principal e plataforma unificada

**Portal de Jogos Online (GitHub Pages):** https://ackerss.github.io/jogos/  
**Atalho Rápido para Digitar na TV:** https://is.gd/ackerplay (ou apenas `is.gd/ackerplay`)  
**Corrida dos Toques Online:** https://ackerss.github.io/jogos/corrida/  
**Repositório Oficial:** https://github.com/Ackerss/jogos  
**Link redundante (ChatGPT Sites):** https://jogar.ackers.chatgpt.site (preservado)

**Jogos novos (18/11/2026, aguardando aprovação do PR):** Ponte do Desespero (`ponte/`), O Impostor (`impostor/`) e Mentira Convincente (`mentira/`). Cada um tem `README.md` na sua pasta, modo `?modo=pc` para testar no computador e ainda precisa de teste na TV LG física.

Nome da plataforma: **ACKER PLAY — Jogos em Família (TV & Celular)**.
Versão do jogo Corrida dos Toques: 0.2.0 (18/11/2026: pilotos bichinhos, modos Clássica e Sinal Verde, ajuda para crianças, sons, locutor e pódio; ver ALTERACOES.md). Falta testar a v0.2 na TV LG física.

O PC NÃO precisa permanecer ligado para jogar nenhuma dessas versões. TV e celulares carregam arquivos estáticos da hospedagem e usam o relay público Doot/CLASP (`wss://relay.clasp.to`).

---

## Colaboração entre IAs (Antigravity, Claude e Codex)

O projeto foi migrado para o repositório GitHub centralizado por solicitação do usuário para viabilizar o trabalho compartilhado entre **Antigravity (Gemini)**, **Claude** e **Codex (ChatGPT)**, alternando as IAs de acordo com o consumo/esgotamento de tokens.

### Regras de Operação:
1. **Uma IA por vez:** Sempre rodar `git pull` antes de alterar e `git commit` / `git push` ao finalizar a tarefa.
2. **Deploy 100% Automático:** Cada push na branch `main` executa `.github/workflows/deploy.yml` no GitHub Actions, rodando testes, compilação e deploy no GitHub Pages em ~30 segundos.
3. **Página Inicial (Portal de Jogos):** O arquivo `index.html` na raiz é a central de jogos (redesenhada em 06/11/2026, pensada para controle remoto). Cada jogo é um bloco na lista `JOGOS` no começo do script.
4. **Economia de Tokens / Prototipagem Externa:** O usuário prototipa novos jogos no Gemini Canvas ou ChatGPT Canvas usando o modelo de prompt de `PROMPT_CRIAR_JOGOS_NO_CHAT.md` (simulação de TV + celulares na mesma tela). Ao colar o código HTML resultante em uma das IAs, a missão da IA é transformar o protótipo em jogo real conectado ao motor CLASP/Doot, criar a subpasta do jogo, atualizar o card no portal e publicar.
5. **Privacidade Preservada:** Fotos e vídeos de testes reais na pasta `evidencias/` estão no `.gitignore` e permanecem estritamente locais no computador do usuário.

---

## Verificações concluídas até agora
- `npm.cmd run check`: passou.
- `npm.cmd run build`: passou.
- `npm.cmd test`: 5 testes passaram (corte de tempo, entradas duplicadas/fora de ordem/inválidas, empate, identificação da revanche e validação de snapshot).
- **GitHub Actions Workflow:** Executado com sucesso (ID `41533589163`, 32s de build e deploy).
- **HTTP 200 Confirmado:**
  - `https://ackerss.github.io/jogos/` (Portal principal)
  - `https://ackerss.github.io/jogos/corrida/` (Corrida dos toques)
- **Melhoria no Mobile aplicada:** `overscroll-behavior: none` e `touch-action: manipulation` aplicados no CSS do controle para prevenir saídas acidentais por gestos de "puxar para atualizar" ou "voltar" do navegador durante toques rápidos.
- **Botão de navegação:** Adicionado `‹ Jogos` no cabeçalho para retorno fluido ao catálogo.
- **Ícones Oficiais e Web App Manifest criados:** Criados `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180x180), `favicon-32x32.png`, `favicon.ico` e `site.webmanifest` para que o webOS da LG e celulares renderizem o app com ícone 3D estilizado com a marca ACKER PLAY na tela inicial/favoritos (em vez do ícone provisório azul com estrela).
- **Atalho na tela inicial da TV LG confirmado:** Usuário fixou o atalho no carrossel de aplicativos principais do webOS (ao lado de Netflix e YouTube), registrado localmente em `evidencias/ATALHO_TELA_INICIAL_LG_WEBOS.png`.
- **Deploy dos ícones:** Workflow do GitHub Actions ID `41536560048` executado com sucesso e todos os ícones retornando HTTP 200 no GitHub Pages.
- **Teste físico na LG (retorno de 02/11/2026):** Dois celulares conectados à TV LG física na sala pelo usuário com placares de 78×133 e 108×157 confirmados.

---

## Ideias futuras — somente rascunho (02/11/2026)

O usuário pediu registrar, sem decisão definitiva, a seleção em [RASCUNHO_IDEIAS_JOGOS.md](RASCUNHO_IDEIAS_JOGOS.md). São sete propostas: Lobisomem de Uma Noite, Expedição Maldita — A Caverna, Arena dos Monstros, Ponte do Desespero, Desenho Impossível, O Cofre Misterioso e Cidade das Máscaras. A ordem sugerida começa por Lobisomem, Caverna e Arena, mas pode mudar. Citadels fica como possibilidade futura; Coup e Skull sem prioridade por enquanto.

O registro contém mecânicas e hipóteses de bots; não há implementação ou validação desses novos jogos. Não iniciar desenvolvimento nem alterar o portal com base apenas nessa lista. Aguardar escolha do usuário.

## A Noite dos Lobos (05/11/2026)

Jogo em `jogo-lobisomem/`, publicado em https://ackerss.github.io/jogos/lobisomem/. **Desde 06/11 é o jogo oficial TV + celulares de verdade:** a TV mostra QR Code/código, cada pessoa entra pelo celular (motor Doot + relay público, como a Corrida). Tem bots opcionais, ranking por nome guardado na TV, botões de teste escondidos ("teste tv" e "teste pc") e o simulador antigo em `?modo=pc`. Testado pela IA só em navegador com relay local; **falta o teste na TV LG física com celulares reais.** Detalhes em `jogo-lobisomem/README.md`. O protótipo original continua intacto na pasta local `JOGO LOBISOMEN ACKER/`.

**Narração (06/11):** o jogo já toca MP3. Sem o arquivo, usa a voz do navegador. A voz escolhida é "Narrador Lobos", criada no Voice Design e salva na conta grátis pessoal do Jacson no ElevenLabs. Há um modo automático: a 1ª partida tem narração completa e as seguintes são rápidas. As 62 frases foram gravadas pelo Antigravity, ajustadas (volume −16 LUFS) e publicadas pelo Claude. Testado no navegador; falta o Jacson ouvir e testar na TV LG. Registro em `jogo-lobisomem/NARRACAO.md`.

## Arena Escorregadia (06/11/2026)

Jogo de ação em `jogo-arena/`, publicado em https://ackerss.github.io/jogos/arena/ (depois do merge). Sumô no gelo para 2 a 8: joystick + botão TRANCO no celular, a borda quebra a cada 15 s, quem cai vira fantasma e sopra os outros, bots completam a arena. Mesmo motor Doot e relay da Corrida e dos Lobos. Testado pela IA só em navegador (TV + 2 celulares simulados, relay local); **falta o teste na TV LG física com celulares reais.** Detalhes em `jogo-arena/README.md`.

**v0.2 (18/11):** bichinhos com carinhas, 4 arenas (Clássica, Pinball, Ventania, Gelo Fino), itens (Gigante, Turbo, Mola), modo criança com boia, música e muito mais impacto visual. Testado só em navegador.

## Próximos passos
1. Jacson recriar o atalho na tela inicial do webOS da TV LG para substituir o ícone genérico antigo pelo novo ícone de alta definição do ACKER PLAY.
2. Confirmar se a proteção de gestos evitou a saída acidental no celular durante a corrida.
3. Quando o usuário quiser retomar, consultar o rascunho e escolher o próximo jogo e o recorte do protótipo. A seleção e a ordem ainda são provisórias.

## Grande Prêmio dos Bichos (06/11/2026)

Jogo em `jogo-bichos/`, publicado em https://ackerss.github.io/jogos/bichos/ (depois do merge). Corrida de apostas para 2 a 8 jogadores, TV + celulares de verdade (motor Doot + relay público), bots opcionais, simulador em `?modo=pc`. Botões do celular com desenho, pensados para criança pequena. Testado pela IA só em navegador com relay local; **falta o teste na TV LG física com celulares reais** e gravar o locutor no ElevenLabs (`jogo-bichos/audio/narracao/PROMPT_ANTIGRAVITY.md`). Detalhes em `jogo-bichos/README.md`.

## Dino Pula-Pula (20/11/2026)

Jogo de ação em família em `jogo-dino/`, publicado em https://ackerss.github.io/jogos/dino/ (depois do merge), na tela principal da central. 1 a 4 jogadores, celular = botão PULA, modo criança 🧸 que acerta a hora do pulo, controle da TV pode jogar. Testado pela IA só em navegador (TV + 3 celulares, relay local); **falta o teste na TV LG física com celulares reais.** Detalhes em `jogo-dino/README.md`.

## Pinta-Chão dos Bichos (20/11/2026)

Jogo em família em `jogo-pinta/`, publicado em https://ackerss.github.io/jogos/pinta/, na tela principal da central. 1 a 4 jogadores; cada um anda com um bichinho pela TV (para cima, para baixo e para os lados, com 4 setas gigantes no celular) pintando o chão. Modos Cada um por si, Equipes e Todos juntos (com porquinhos de lama), modo criança 🧸, controle da TV pode jogar. Testado pela IA só em navegador (TV + 3 celulares, relay local); **falta o teste na TV LG física com celulares reais.** Detalhes em `jogo-pinta/README.md`.

## Kart Acker TV (21/11/2026)

Corrida de kart 3D (feita pelo Gemini, melhorada pelo Claude) em `jogo-kart/`, publicada em https://ackerss.github.io/jogos/kart/, na pasta "Jogos testes" da central. Cada um pilota o próprio kart em 3D na tela do celular (deitado); a TV mostra a corrida ao vivo (câmera de transmissão ou mapa de cima) com placar. 1 a 4 pilotos, robôs completam as vagas, modo criança 🧸 por jogador, itens entre aparelhos, corrida de demonstração. Única pasta do projeto que usa build (Vite): o GitHub Actions roda `npm ci`, `npm run build` e `npm test`. Testado pela IA só em navegador (TV + 2 celulares, relay local); **falta o teste na TV LG física com celulares reais.** Detalhes em `jogo-kart/README.md`.
