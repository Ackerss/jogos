# Ponte do Desespero — TV + celulares (v1.0)

Corrida maluca numa ponte de 3 pistas sobre a lava (2 a 8 jogadores, ~5 minutos). Todo mundo corre sozinho para a direita; pelo celular cada um **troca de pista (▲▼)**, **PULA** e usa o **PODER**. Ninguém é eliminado.

Nasceu de um protótipo de chat ("JOGO PONTE ACKER/index (1).html", feito por outra IA). O Claude refez como jogo de verdade em 18/11/2026, mantendo a ideia e o visual de lava.

## O que mudou em relação ao protótipo
- **Celulares de verdade** (QR Code, motor Doot, como os outros jogos). O simulador de celulares na mesma tela saiu; para testar sozinho há `?modo=pc` e o botão escondido "teste tv".
- **3 mundos, um por rodada:** Vulcão (onda de lava), Gelo (avalanche; trocar de pista escorrega) e Nuvens (raio; molas que jogam para frente e pulo mais longo).
- **Modo fácil (para crianças)** no celular: a TV pula sozinha nos buracos e foge da pista que vai pegar fogo. A criança só se diverte apertando. Ideia da "direção assistida" dos jogos de kart.
- **Ninguém fica para trás:** quem está longe do líder corre até 28% mais rápido, e a borda da tela empurra quem ficar para trás (todos sempre aparecem na TV).
- **Caixas "?" dão poderes** e quem está atrás ganha poderes melhores (Turbo, Escudo, Ímã, Raio), como nos jogos de kart. Sem caixa, o botão é o **Empurrão** (recarga de 5 s).
- **Bichinhos** desenhados (raposa, sapo, coelho, pinguim, leão, gato, urso, panda) em vez de robôs, com nome em cima e coroa para quem lidera a partida.
- **Pista justa:** sempre sobra uma pista livre; começo calmo; tábuas rachadas avisam (borda tracejada) e caem meio segundo depois.
- **Leve na TV LG:** sem sombras/desfoque do canvas (o protótipo usava muitas), céu pintado uma vez só, modo leve automático no navegador da TV.

## Como se joga
- **Celular:** ▲ SUBIR / ▼ DESCER (pista), PULAR, PODER. Também dá para deslizar o dedo na mensagem do topo (cima/baixo troca, toque pula). Chip **fácil** no topo liga/desliga o modo fácil a qualquer hora.
- **Pontos por corrida:** chegada 12, 9, 7, 5, 4, 3, 2, 1 + 1 por cristal. Quem não chega até 12 s depois do primeiro não ganha pontos de chegada.
- **Partida:** 3 ou 6 rodadas. Quem está atrás no placar larga na frente. Pódio no fim, com o "caçador de cristais".

### Na TV (controle remoto: setas + OK)
- Sala de espera = treino livre (quem entra já corre na TV).
- Ajustes guardados na TV: Bots (Automático completa até 4), Rodadas (3/6), Som.
- Botões escondidos no canto de cima à direita: **teste tv**, **teste pc**, **⛶**.

| Endereço | Modo |
|---|---|
| `ponte/` | TV oficial (QR Code) |
| `ponte/?sala=ABCD` | Celular |
| `ponte/?modo=pc` | Teclado: T1 = W/S + Espaço + E; T2 = ↑/↓ + Enter + Shift |

## Arquivos
| Arquivo | Função |
|---|---|
| `js/mundo.js` | Regras puras da corrida (números em `C`). Testado em `tests/`. |
| `js/bots.js` | Bots e a ajuda do modo fácil. |
| `js/desenho.js` | Desenho da TV (Canvas 2D) e os 8 bichinhos. |
| `js/tv.js` | Diretor da partida, telas da TV, controle remoto, estado de cada celular. |
| `js/controle.js` | O celular. Manda contadores de toques (nada se perde se a internet engasgar). |
| `js/som.js` | Efeitos sonoros gerados na hora. |
| `rede/rede.ts` → `js/rede.js` | Conexão (Doot). Gerar: `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`. |

## Verificar
```
npm run check
npm test        # pista justa, 300 corridas com bots, modo fácil, empurrão, caixas e pontos
```
Teste sem internet: `npm run relay-local` e abra `.../jogo-ponte/?relay=ws://localhost:8792`.

Testado pela IA só em navegador (TV + celular simulados com relay local). **Falta testar na TV LG física.**
