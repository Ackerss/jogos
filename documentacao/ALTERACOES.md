# Registro de alterações

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
