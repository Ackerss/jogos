# Projeto: jogos multiplayer para TV LG

Leia primeiro `LEIA-ME-PRIMEIRO.md`, `documentacao/ESTADO_ATUAL.md` e `documentacao/CONTINUIDADE_GEMINI.md`.

## Decisões do usuário
- Comunicação em português e instruções de uso curtas.
- O usuário não quer continuar testando plataformas prontas neste momento. Quer um jogo próprio utilizável e refinamentos depois.
- Priorizar acesso ONLINE GRATUITO, sem PC ligado para jogar. O PC guarda/edita o código e gera/publica versões.
- Usuário pretende continuar também no Antigravity com Gemini. Registrar mudanças, comandos, resultados e limites de forma suficiente para outra IA continuar.
- TV: LG 65UA8550PSA. O usuário confirmou comandos de celular funcionando no HexStacker e no Pit Party do Doot; imagens locais em `evidencias/`.

## Arquitetura escolhida
- `plataforma-doot/`: clone original de referência; manter intacto, commit fixo em documentação.
- `jogo-corrida/`: jogo próprio independente que usa uma cópia identificada do motor real do Doot (`vendor/doot-engine/src`). Não é o catálogo Nuxt completo.
- Usar APIs públicas de `RoomRuntime` / `createClaspRelay`. Não criar uma implementação paralela de conexão, presença ou reconexão.
- TV é autoridade de tempo e placar. Celulares publicam contadores cumulativos com identificador da partida. Estado efêmero no relay público CLASP.
- Hospedagem: arquivos estáticos. Não exige banco, chave de API, Docker ou assinatura de infraestrutura para esta versão.
- Nenhum conteúdo de `evidencias/`, anexos ou documentação pessoal deve ser publicado junto com o jogo.

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
