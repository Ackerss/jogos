# O Impostor — TV + celulares (v1.0)

Todos recebem a mesma palavra secreta no celular… menos um, o **impostor**, que só vê o tema. Cada um dá uma pista, todos votam, e o impostor pego ainda pode roubar a vitória adivinhando a palavra. 3 a 10 jogadores, ~10 minutos.

Começado pelo Claude em 06/11 (só regras, palavras, bots e narração) e terminado em 18/11/2026.

## Ideias de jogos que deram certo (sem copiar nenhum)
- **Grade de 16 palavras na TV** (como nos jogos de "camaleão"): o impostor tem chance real de blefar e de adivinhar no fim, então a rodada nunca é "perdida".
- **Revelação com suspense** (votos caindo um por um, carta virando), como nos jogos de dedução social de sucesso.
- **Ninguém é eliminado:** todos jogam todas as rodadas; o impostor é revezado (cada um é impostor o mesmo número de vezes).
- **Modo criança:** só temas fáceis (bichos, frutas, transportes, esportes, comidas) e a **figura grande** da palavra no celular, para quem ainda não lê.

## Fluxo
Sala (QR) → sorteio do tema → **segredo** (toque para ver, toque para esconder; o cartão do impostor tem a mesma cor de longe) → **pistas** na vez de cada um (faladas: botão "Já falei"; escritas: aparecem na TV) → **conversa** ("Quero votar" adianta) → **votação** no celular (dá para trocar; empate = nova votação só entre os empatados) → **apuração** voto a voto → **revelação** → **chute** do impostor pego (toca na palavra) → resultado → próxima rodada → pódio com prêmios ("Detetive" e "Mestre do disfarce").

**Pontos:** votou no impostor +1 · pegaram o impostor +1 para cada inocente · impostor escapou +3 · impostor pego que acerta a palavra +2.

## Na TV (controle remoto: setas + OK)
Ajustes guardados na TV: Rodadas (3/5/7/10), Tempo de pista (15–45 s), Conversa (30–120 s), Bots (0–4), Pistas (auto/faladas/escritas — com bots são escritas), Modo criança, Narrador. Botão **Regras**. **Ranking desta TV** por nome. Botões escondidos no canto de cima: **teste tv**, **teste pc**, **⛶**.

| Endereço | Modo |
|---|---|
| `impostor/` | TV oficial (QR Code) |
| `impostor/?sala=ABCD` | Celular |
| `impostor/?modo=pc` | Computador: TV + celular simulado à direita + bots, sem internet |

## Narrador
Roteiro em `js/narracao.js` (19 momentos). Sem MP3, a TV usa a voz do navegador. Para gravar no ElevenLabs (voz "Narrador Lobos", mais animada), salvar em `audio/narracao/<momento>_<n>.mp3` e listar em `audio/narracao/prontos.js`. Na 1ª rodada narra tudo; depois só os momentos essenciais.

## Arquivos
| Arquivo | Função |
|---|---|
| `js/palavras.js` | 18 temas × 16 palavras (com 3 pistas de bot cada). |
| `js/figuras.js` | Figuras (emoji) das palavras e os temas do Modo criança. |
| `js/regras.js` | Regras puras: sorteio, impostor revezado, vez, pistas, votos, desempate, chute, pontos. |
| `js/bots.js` | Bots (pista, voto, chute). |
| `js/tv.js` | Diretor da partida, telas da TV, controle remoto, simulador do modo pc. |
| `js/celular.js` | O celular (também usado no simulador). |
| `js/som.js`, `js/narracao.js` | Narração e efeitos. |
| `rede/rede.ts` → `js/rede.js` | Conexão Doot. Gerar: `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`. |

## Verificar
```
npm run check
npm test     # banco, modo criança, revezamento, pistas, 500 rodadas com bots, narração
```
Testado pela IA no navegador (modo pc com bots, rodada completa). **Falta testar na TV LG física com celulares.**
