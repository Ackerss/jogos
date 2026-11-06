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
| `js/narracao.js` | Roteiro do narrador: frases de cada momento (1 a 3 versões). |
| `js/som.js` | Toca os MP3 do narrador (sem o MP3, usa a voz do navegador) e gera os efeitos curtos. |
| `audio/narracao/` | 62 MP3 do narrador ("Narrador Lobos"), `FRASES.md` (lista), `prontos.js` (gerado), `VOZ.txt` (voz e ajustes) e `PROMPT_ANTIGRAVITY.md`. |
| `arte/` | Pinturas da vila e cartas (extraídas do protótipo, formato WebP). |

## Narração

As frases ficam em `js/narracao.js`. Cada uma toca `audio/narracao/<momento>_<n>.mp3`. Para trocar uma frase:
1. Mude o texto em `js/narracao.js`.
2. Grave o MP3 de novo.
3. Rode `node scripts/frases.js` para atualizar `FRASES.md` e `prontos.js` e ver o que falta.

As transições esperam o narrador terminar. As etapas da noite continuam com tempo fixo.
No ajuste **Narração**, o modo Automática faz a 1ª partida completa e as seguintes rápidas. Voz, histórico e regras estão em [`NARRACAO.md`](NARRACAO.md).

## Verificar

```
npm run check   # sintaxe de todos os arquivos
npm test        # testes das regras (inclui 300 partidas com bots) e do roteiro de narração
npm run frases  # lista de frases e conferência dos MP3
```
Não há dependências para instalar.
