# ACKER — Corrida dos Toques

Primeiro jogo próprio para TV LG e celulares. Versão 0.2: pilotos bichinhos, modos *Corrida Clássica* e *Sinal Verde*, ajuda para crianças, sons/música sintetizados, locutor, pódio e placar da família.

Arquivos: `src/logic.ts` (regras puras, testadas), `src/main.ts` (telas da TV e do celular), `src/art.ts` (desenhos SVG), `src/audio.ts` (sons e locutor), `src/relay.ts` (relay de teste local com `?relay=ws://localhost:8790`, use `node ../jogo-lobisomem/scripts/relay-local.mjs`). Usa o motor Doot preservado em `vendor/doot-engine/`; aplicação estática e pequena, sem o catálogo Nuxt.

Instruções de uso, decisão das plataformas e continuidade: veja a pasta principal e `../documentacao/`.

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run build
npm.cmd test
```

`dist/` é a versão de publicação. `npm.cmd start` serve uma alternativa local na porta 8787. Essa alternativa não é necessária para a versão online.

API real utilizada: `RoomRuntime`, `createClaspRelay`, `onExtra`, `publishExtra`, `sendControl`, `start`, `nextGame`, `finish`, `tick`, `setDriver`. Dependência CLASP fixada em 4.3.2 como no Doot de origem. Nenhuma chave de API necessária.

O jogo requer internet para o relay CLASP, mesmo quando os arquivos HTML são servidos localmente. Não se apresenta como jogo offline nem como anticheat competitivo.
