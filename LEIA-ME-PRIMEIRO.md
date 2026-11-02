# ACKER — Jogos multiplayer para TV LG

Decisão atual: Doot como base de comunicação. Primeiro jogo próprio: **Corrida dos Toques**, em português, para 1 a 4 pessoas.

## Como jogar

Abra **https://jogar.ackers.chatgpt.site**. Link publicado e confirmado, também registrado em `documentacao/ESTADO_ATUAL.md`. Não é necessário iniciar um servidor no PC para a versão online. O atalho `ABRIR_JOGO_ONLINE.url` abre o mesmo endereço no computador.

1. Abra o link no navegador da TV LG.
2. Escolha **CRIAR SALA NA TV**.
3. Cada pessoa escaneia o QR Code com o próprio celular e escolhe um nome diferente.
4. O primeiro jogador toca em **COMEÇAR CORRIDA** no celular.
5. Depois da contagem regressiva, toque no botão por 20 segundos. Quem fizer mais toques vence; empates são possíveis.
6. O primeiro jogador pode selecionar **JOGAR DE NOVO**, sem escanear novamente.

Se a câmera não reconhecer o QR: abra o MESMO endereço do jogo no celular, selecione entrar com código e digite as quatro letras/números mostrados na TV.

TV e celulares precisam de internet. Na versão online, não precisam estar na mesma rede e o PC pode estar desligado. O navegador da TV deve ficar aberto durante a partida: a TV executa o jogo e apura o placar.

## Onde está cada coisa

| Pasta/arquivo | Conteúdo |
|---|---|
| `jogo-corrida/` | Fonte, dependências fixadas, versão gerada e configuração da hospedagem |
| `plataforma-doot/` | Base original completa do Doot para consulta e evolução futura |
| `documentacao/ESTADO_ATUAL.md` | Link confirmado, validações e pendências atuais |
| `documentacao/TESTES_DAS_PLATAFORMAS.md` | O que foi observado no HexStacker e no Doot, com as imagens correspondentes |
| `documentacao/ARQUITETURA.md` | Comunicação, autoridade da TV, protocolo do jogo e dependências |
| `documentacao/CONTINUIDADE_GEMINI.md` | Orientações para outra IA continuar sem redescobrir o projeto |
| `evidencias/` | Capturas fornecidas pelo usuário e capturas técnicas da versão própria |
| `INICIAR_LOCAL.bat` | Alternativa local para desenvolvimento; não é necessária para jogar online |

Esta é a primeira versão de teste do nosso próprio jogo. Os testes físicos dos dois jogos de terceiros não equivalem a validar automaticamente este novo jogo na LG. Não foi prometido funcionamento perfeito em qualquer navegador ou rede.
