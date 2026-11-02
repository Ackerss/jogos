# Arquitetura da Corrida dos Toques v0.1

## Separação das partes

`plataforma-doot/` é o clone original fixado no commit `0f78d6d11e7a7863cc9aa575ab2cfa39c5f6bd9b`, origem https://github.com/virgilvox/doot-games. O clone não foi alterado para hospedar o jogo.

`jogo-corrida/vendor/doot-engine/` contém uma cópia identificada do motor real daquele mesmo commit, com a licença MIT preservada. `src/main.ts` importa `RoomRuntime`, `createClaspRelay`, identidades e endereços dessa cópia. Não é uma implementação alternativa “parecida com Doot”. Também não é a instalação do catálogo Nuxt completo. É uma aplicação pequena que reutiliza o motor público, sem precisar de contas, banco ou uploads.

## Execução online

```text
Hospedagem estática HTTPS → entrega HTML/CSS/JS à TV e aos celulares
TV (autoridade de tempo, corrida e placar)
  ↕ motor Doot / WebSocket seguro
Relay público wss://relay.clasp.to
  ↕ motor Doot / WebSocket seguro
Celulares (controles)
```

Não existe servidor de jogo Node pago para esta versão. O PC é usado para editar, gerar e publicar os arquivos; depois pode ser desligado. A TV deve manter a aba aberta. TV e celulares precisam de internet, mas não da mesma rede na versão online.

## O que o motor original faz
Identidade derivada de sala + nome, criação/colisão de códigos, roster, heartbeats, snapshots, reconexão supervisionada e delegação ao primeiro jogador. O protocolo normal usa CLASP sobre WebSocket. Não usamos WebRTC, PeerJS, câmera, microfone ou streaming de vídeo nesta versão.

## O que pertence ao nosso jogo
- Corrida de 20 s, precedida de 3 s de contagem regressiva.
- 1 a 4 corredores humanos; não há bots.
- Autoridade da TV para iniciar, encerrar, apurar e publicar resultado.
- Primeiro participante presente inicia/reinicia pelo celular. A TV também tem botão.
- Participantes da corrida são fixados na largada; quem entrar depois aguarda a próxima. Mais de 4 pessoas podem aparecer no roster, mas apenas as primeiras 4 presentes na largada correm.
- Cada partida tem identificador único; comandos atrasados da partida anterior não pontuam na revanche.
- Contadores cumulativos tornam mensagens repetidas ou fora de ordem inofensivas.
- Limite de plausibilidade de 20 toques/s + tolerância inicial. É uma proteção simples de protótipo, não um sistema competitivo contra fraude.

## Canais extras públicos do motor

Sob o namespace Doot da sala:
- `x/acker/state`: snapshot da corrida escrito pela TV, incluindo estado, participantes, placar e tempo restante.
- `x/acker/tap/<pid>`: último contador cumulativo do jogador, com `raceId` e `count`.
- Os comandos começar/revanche usam `sendControl('start')`, com driver e nonce validados pelo motor.

Não escrevemos WebSocket cru. Canais são acessados por `RoomRuntime.publishExtra/onExtra`, uma extensão documentada do motor para jogos customizados. Usamos esses canais para os toques porque a elegibilidade por rodada do motor foi concebida para perguntas; nossa partida possui seu próprio identificador e precisa aceitar reconexão e revanche de quem entrou tardiamente.

A TV publica o relógio/placar em torno de 4 vezes/s; alterações de pontuação podem antecipar publicação para até 10 vezes/s. Celular agrupa toques por 65 ms em vez de abrir um pacote por evento. A resposta visual local é imediata. Celulares calculam a animação do tempo a partir da chegada do snapshot e de relógio monotônico, sem exigir que seu relógio de calendário seja igual ao da TV.

## Reconexão

O motor recupera assinaturas após queda do relay. O controle guarda nome/código e último contador em sessionStorage quando disponível; um reload na mesma aba reentra automaticamente. Sem armazenamento, é possível reentrar pelo mesmo nome e recuperar o placar confirmado na TV. Nome em uso exige confirmação explícita de reconexão.

Se o estado da TV não é atualizado por 3,5 s durante a corrida, o botão do celular é desabilitado enquanto aguarda a conexão. Recarregar a TV com a mesma sessão pode recuperar o estado efêmero; fechar totalmente o navegador pode perder o token de host. Isso não é armazenamento persistente nem recuperação garantida após reiniciar TV/relay.

## Privacidade e limites

Somente apelidos e estado efêmero do jogo são necessários. O relay público é dependência de terceiro, sem disponibilidade garantida por este projeto. Não inserir dados pessoais sensíveis nos nomes. Acesso por código não é autenticação forte; esta é uma sala casual familiar, não um sistema de competição com prêmios. O código preserva a política de TTL do Doot, padrão de 8 h. Fechar a aba não significa apagar imediatamente tudo do relay.

Fotos de testes e históricos ficam FORA da pasta publicada. Não existe telemetria própria, conta de jogador ou banco nesta aplicação. Fontes do Google têm fallback para Arial quando indisponíveis.

## Arquivos de manutenção
- `src/logic.ts`: regras puras, validação de entradas e empates.
- `src/main.ts`: integração Doot e interfaces TV/celular.
- `public/style.css`: estilos responsivos e redução de movimento.
- `scripts/build.mjs`: bundle esbuild + ativos em dist.
- `scripts/serve.mjs`: servidor local opcional, somente arquivos permitidos.
- `tests/logic.test.mjs`: corte temporal, mensagens inválidas/repetidas, empate e revanche.
- `.openai/hosting.json`: identificação persistente da hospedagem.
- `package-lock.json`: dependências realmente resolvidas. Usar `npm ci` para reconstrução.

Configuração de build: alvo Chrome 108 / Safari 15. A LG informada foi especificada com webOS 25/Chromium 120. Isso é compatibilidade de alvo, não uma medição de desempenho no aparelho.
