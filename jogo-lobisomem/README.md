# A Noite dos Lobos — simulador (v0.2.0)

Jogo de blefe e dedução para 3 a 6 jogadores. Nesta versão a TV e os celulares aparecem **juntos na mesma página** (simulador com bots). A versão com celulares de verdade pela internet (motor Doot) é a próxima etapa.

- Online: https://ackerss.github.io/jogos/lobisomem/
- Local: abra `index.html` direto no navegador (não precisa de servidor).
- Origem: protótipo `JOGO LOBISOMEN ACKER/index.html` (04/11/2026), revisado e reorganizado pelo Claude em 05/11/2026.

## Como a partida flui (e quanto tempo cada parte leva)

| Fase | O que acontece | Tempo |
|---|---|---|
| Distribuir | Baralho aparece, cada carta voa para um lugar; 3 vão ao centro | ~2,5 s |
| Olhar a carta | Cada um vira a carta no celular e toca em Pronto | até todos prontos |
| Anoitecer | A vila escurece | 2,8 s |
| Noite (4 etapas) | Carta grande do papel vira na TV; quem tem a carta age no celular | ajuste (8/12/20/30 s) **igual para todas as etapas** |
| Amanhecer | “Amanheceu! Cartas podem ter trocado de dono” | 3,4 s |
| Conversa | Chat, relógio, bots comentam; “Votar agora” | ajuste (1–5 min) |
| Votação | Selos “Pensando…/Votou” | até todos votarem |
| Apuração | Setas de quem votou em quem, contagem, eliminado | ~5 s |
| Replay da noite | Cartas viram mostrando o início; cada troca acontece na frente de todos | ~3 s + 2,6 s por troca (botão Pular) |
| Resultado | Vencedores, rastros da noite, Jogar de novo | — |

Todos os tempos ficam em `TEMPO`, no topo de `js/main.js`.
Cada etapa da noite dura sempre o mesmo tempo, mesmo quando o papel está no centro: assim ninguém descobre pela demora quem tem cada carta.

## Arquivos

| Arquivo | Função |
|---|---|
| `js/regras.js` | Regras puras (baralho, ações da noite, votação, vencedor). Testado em `tests/`. |
| `js/bots.js` | Comportamento dos bots (só usam o que o personagem saberia). |
| `js/main.js` | Diretor da partida: fases, tempos, entrada única dos celulares `entrada(id, mensagem)`. |
| `js/mesa.js` | Mesa da TV: cartas e lugares fixos que se movem (distribuir, virar, trocar, setas dos votos). |
| `js/tv.js` | Textos e indicadores da TV por fase. |
| `js/celular.js` | Telas dos celulares. |
| `js/cena.js`, `css/cena.css` | Vila animada (luzes, chafariz, névoa, partículas) — preservada do protótipo. |
| `js/som.js` | Narração do navegador e efeitos curtos (sem arquivos de áudio). |
| `arte/` | Pinturas da vila e cartas (extraídas do protótipo, formato WebP). |

## Verificar

```
npm run check   # sintaxe de todos os arquivos
npm test        # 10 testes das regras e 300 partidas automáticas com bots
```
Não há dependências para instalar.
