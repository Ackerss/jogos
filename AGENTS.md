# Projeto: jogos multiplayer para TV LG (ACKER PLAY)

Leia primeiro `LEIA-ME-PRIMEIRO.md`, `documentacao/ESTADO_ATUAL.md` e `documentacao/CONTINUIDADE_GEMINI.md`.

## Decisões do usuário
- Comunicação em português e instruções de uso curtas.
- O usuário alterna entre **Antigravity (Gemini)**, **Claude** e **Codex (ChatGPT)** conforme a necessidade e a disponibilidade de tokens.
- O repositório centralizado no GitHub é o ponto de encontro de todas as IAs: `https://github.com/Ackerss/jogos`.
- A publicação oficial é feita automaticamente pelo **GitHub Pages**: `https://ackerss.github.io/jogos/`.
- A raiz do site (`index.html`) é um **Portal de Jogos** para a família, onde novos jogos criados serão adicionados em lista para serem escolhidos na TV.
- TV LG (modelo 65UA8550PSA) comanda as partidas como autoridade; celulares conectam via QR Code como controles leves.
- Priorizar acesso ONLINE GRATUITO, sem PC ligado para jogar.
- O link antigo do ChatGPT Sites (`jogar.ackers.chatgpt.site`) foi mantido como redundância.

## Arquitetura e Regras de Trabalho
- **Uma IA por vez em cada tarefa:** Sempre dar `git pull` antes de mexer e `git commit` / `git push` ao concluir.
- `index.html` e `portal.css`: Página inicial do catálogo de jogos.
- `jogo-corrida/`: Jogo próprio independente que usa o motor Doot isolado (`vendor/doot-engine/src`).
- Usar APIs públicas de `RoomRuntime` / `createClaspRelay`. Não criar uma implementação paralela de conexão.
- TV é autoridade de tempo e placar. Celulares publicam contadores cumulativos. Estado efêmero no relay público CLASP (`wss://relay.clasp.to`).
- Nenhum conteúdo de `evidencias/`, anexos ou fotos de testes físicos deve ser comitado ou publicado para o GitHub público.
- Ao modificar: sempre rodar `npm.cmd run check`, `npm.cmd run build` e `npm.cmd test` em `jogo-corrida`.
- Atualizar a documentação após trabalhos relevantes.

## Ao modificar
- Não atualizar dependências/plataforma por rotina. Leia o código instalado e preserve os locks.
- Testar lógica relevante, verificar tipos e gerar: em `jogo-corrida`, `npm.cmd run check`, `npm.cmd run build`, `npm.cmd test`.
- Conferir a partida real no navegador após mudanças no fluxo: TV + dois controles, resultado, revanche e reconexão. Isso NÃO comprova teste físico na LG.
- Não inventar taxa de quadros, latência, jogadores físicos ou resultados. Distinguir o que o usuário relatou do que a IA verificou em navegador.
- Preservar `.openai/hosting.json` e seu `project_id`. Não criar outro site para a mesma cópia.
- Não salvar credenciais de publicação em arquivos, linhas de comando, Git ou documentação. Obter credencial temporária pela ferramenta adequada e enviá-la somente por stdin ao helper oficial.
- Atualizar `documentacao/ESTADO_ATUAL.md` e o registro de alterações após trabalho material. Não alterar memórias globais sem pedido explícito.

## Fora de escopo por enquanto
Jogo definitivo pessoal, gráficos avançados, pagamentos, contas de jogadores, dados persistentes e migração de relay. O usuário escolherá o jogo definitivo depois.
