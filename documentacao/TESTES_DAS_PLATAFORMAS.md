# Histórico de pesquisa e testes — 02/11/2026

## Objetivo original
Jogar na TV LG com celulares como controles, parecido com jogos de festa, usando uma base existente confiável para criar jogos próprios. Evitar uma sequência longa de tentativas de plataforma. TV informada pelo usuário: LG UHD 65UA8550PSA, especificada pela LG com webOS 25. Versão efetivamente instalada NÃO foi lida pela IA.

## HexStacker — evidência física fornecida pelo usuário

1. Foto do lobby na TV, com QR e espaços dos participantes. Isso demonstrou a renderização do lobby, sem comprovar uma partida naquele primeiro momento.
2. Depois, foto da TV com o jogo em andamento e captura do celular com o touchpad; ambas com o nome `Teste 1 Sem Baix`.
3. O usuário afirmou que os comandos funcionaram.

Arquivos originais copiados para `evidencias/`:
- `codex-clipboard-ae1cd99b-275a-44db-b027-5d5e012a143a.png`: lobby da TV.
- `codex-clipboard-778dca47-24ad-4ccc-a59e-a70529d27091.png`: partida na TV.
- `codex-clipboard-b246842e-0169-4943-8e84-2bcbf8d9051c.png`: controle no celular, com indicador de 17 ms.

**Confirmado pelo relato e pelas imagens:** uma TV + um celular, entrada em partida e comandos. **Não confirmado:** dois celulares simultâneos, sessão longa, bloqueio/desbloqueio, troca de rede, medição independente de latência ou conclusão da partida. O número de 17 ms é mostrado pelo próprio jogo; não inferir latência completa toque→imagem nem qual transporte foi usado.

HexStacker é um jogo específico, não um catálogo. Seu PartyPlug é uma base reutilizável de salas/transporte, sem as regras dos novos jogos. O código documenta WebSocket para relay e WebRTC opcional para comandos; há fallback. Não deduzir que WebRTC está liberado em geral na LG porque os comandos funcionaram.

Na consulta desta sessão, o repositório principal e `partyplug/package.json` não apresentaram licença geral explícita do código. Licenças de dependências não licenciam automaticamente o projeto principal. Não copiamos essa base para desenvolver nosso jogo. Reavaliar a situação se houver nova licença ou autorização do autor.

Fontes: https://github.com/tim4724/HexStacker-Party e https://github.com/tim4724/HexStacker-Party/blob/main/partyplug/README.md

## Doot — evidência física fornecida pelo usuário

O usuário abriu **Pit Party**, a corrida do Doot. Enviou foto da corrida na TV e captura do celular em `doot.games/play/...`, com joystick, ITEM e DRIFT. Declarou: **“TESTEI ESSE E FUNCIONOU OS COMANDOS TAMBEM”**.

Arquivos em `evidencias/`:
- `codex-clipboard-c3139bd7-fd08-4a9a-923d-25ea16f90d0a.png`: corrida na TV, jogador TESTEDOT2.
- `codex-clipboard-613e7549-1a46-408c-8c02-274e60efc674.png`: controle do celular.

**Confirmado:** Doot/Pit Party renderizou na LG e os comandos de um celular responderam, conforme relato. **Não confirmar oito celulares:** os outros corredores da imagem estão marcados CPU e são bots. Não houve confirmação física de segundo celular, partida inteira ou reconexão.

O quiz/votação do Doot foi sugerido, mas o usuário NÃO confirmou tê-lo jogado. Não registrar esse teste como realizado por ele.

## Verificações anteriores da IA no Doot público

Na mesma conversa, a IA operou abas de navegador no computador, representando uma tela principal e dois controles no jogo Would You Rather:
- gerou sala e QR;
- conectou primeiro jogador;
- enviou voto e confirmou contabilização;
- recarregou o controle, confirmou reconexão pelo mesmo nome;
- conectou segundo participante;
- confirmou dois votos distintos na mesma rodada.

Isso foi uma verificação em abas de computador com relay real. NÃO foram dois celulares físicos nem a TV LG. Não foi documentada conclusão de toda a partida.

## Comparação e decisão

Doot foi escolhido para desenvolver porque existe licença MIT clara, motor de conexão/salas/presença/reconexão e suporte a jogos customizados. O teste físico do Pit Party ampliou a evidência além de perguntas e votação. Isso não prova que qualquer jogo futuro terá desempenho adequado.

Outras sugestões analisadas:
- **AirConsole:** API e Pong oficiais reais, mas o suporte da própria plataforma desaconselha o navegador de TVs LG e não garante a experiência. https://airconsole.zendesk.com/hc/en-us/articles/4405279964946-Play-on-TV
- **Playroom Kit:** Stream Mode real. Na documentação consultada: plano grátis de 10 usuários únicos/dia, projeto e gameId necessários. Não usar alegações de gratuidade ilimitada ou geração automática de qualquer controle. https://docs.joinplayroom.com/billing
- **SmartControllerJS:** depende de PeerJS/WebRTC. “Sem servidor” significa não configurar um próprio, pois PeerJS usa sinalização. Não foi escolhido para LG. https://peerjs.com/client/faq
- **Open Party Lab:** projeto real, mas os autores reconhecem alpha/beta e limitações de produção/validação. Não foi escolhido para evitar mais experimentação.
- **LanPlay:** catálogo pronto encontrado; não foi confirmada base aberta apropriada para adaptar.

LG: https://www.lg.com/br/tvs-e-soundbars/tv-uhd-4k/65ua8550psa/
Restrição documentada de WebRTC: https://forum.webostv.developer.lge.com/t/webrtc-getusermedia-webos-24/27587 (discussão originada em getUserMedia; não é teste de todos os DataChannels em todos os modelos).

## Última decisão do usuário

O usuário pediu para parar os testes de plataformas, criar um jogo próprio, manter documentação completa e permitir continuidade no Antigravity/Gemini. Depois corrigiu a direção: prefere tudo ONLINE e GRATUITO, podendo jogar sem PC ligado. Portanto a entrega principal é um jogo estático online; servidor local apenas como alternativa de desenvolvimento.
