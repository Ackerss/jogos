# Mentira Convincente — TV + celulares (v1.0)

A TV mostra uma **curiosidade verdadeira com uma lacuna**. No celular, cada um inventa uma **resposta falsa** que pareça verdade. Todas as mentiras se misturam com a verdade e cada um tenta achar a certa. 3 a 8 jogadores (bots completam), cerca de 15 minutos.

Começado pelo Claude em 06/11 (banco de curiosidades + correção de respostas) e terminado em 18/11/2026.

## Ideias de jogos que deram certo (sem copiar nenhum)
- **Blefe escrito + votação** (como nos jogos de "inventar a definição" de festa): rir das mentiras dos outros é metade da diversão.
- **Quem escolhe o tema reveza** a cada rodada (3 temas no celular dele): todo mundo participa da decisão.
- **Revelação uma por uma**, das mentiras menos escolhidas para as mais escolhidas, e a verdade por último, com carimbo "MENTIRA!" ou "É A VERDADE!".
- **Última rodada vale dobro**: o placar pode virar até o fim.
- **Curtir (♥) uma mentira engraçada** dá +100 ao autor, e o pódio dá prêmios: Melhor mentiroso, Detetive e Mais engraçado.
- Opções sempre em MAIÚSCULAS na TV: ninguém descobre quem escreveu pelo jeito de digitar.

## Fluxo
Sala (QR) → **tema** (um jogador escolhe entre 3) → **escrever** a mentira (com prévia "vai aparecer assim" e botão 🎲 "Me dá uma ideia"; se escrever a verdade sem querer, o celular avisa) → **escolher** a verdade (a sua mentira não aparece para você; ♥ curte) → **revelação** → **placar** → … → pódio.

**Pontos:** achou a verdade +1000 · cada pessoa que cai na sua mentira +500 · cada curtida +100 · a última rodada vale dobro. Se faltar opção, entram "mentiras da casa" (quem cai nelas não dá ponto a ninguém).

## Na TV (controle remoto: setas + OK)
Ajustes guardados na TV: Rodadas (5/7/10), Tempo para mentir (45/60/90 s), Bots (0–5), Sons, Ler perguntas (voz do navegador, se a TV tiver). Botão **Regras**. **Ranking desta TV** por nome. As perguntas já usadas não se repetem nas próximas partidas (guardadas na TV). Botões escondidos no canto de cima: **teste tv**, **teste pc**, **⛶**.

| Endereço | Modo |
|---|---|
| `mentira/` | TV oficial (QR Code) |
| `mentira/?sala=ABCD` | Celular |
| `mentira/?modo=pc` | Computador: TV + celular simulado à direita + bots, sem internet |

## Arquivos
| Arquivo | Função |
|---|---|
| `js/banco.js` | 278 curiosidades verdadeiras em 11 categorias, com mentiras prontas. Achou uma errada? Corrija a linha e rode `npm test`. |
| `js/auditoria.js` | Corrige o texto digitado (acentos, abreviações, "kkk", artigo repetido), recusa palavrão, a verdade e mentira repetida. Sem internet. |
| `js/partida.js` | Regras puras da rodada (mentir, opções, escolha, curtidas, pontos, ordem da revelação) e os bots. |
| `js/tv.js` | Diretor da partida, telas da TV, controle remoto, simulador do modo pc. |
| `js/celular.js` | O celular (também usado no simulador). |
| `js/som.js` | Efeitos gerados na hora e leitura da pergunta em voz alta. |
| `rede/rede.ts` → `js/rede.js` | Conexão Doot. Gerar: `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`. |

## Testes
`npm run check` (sintaxe) e `npm test` (6 testes: formato do banco, correção das mentiras, opções, pontos e dobro, 60 partidas inteiras com bots, sorteio sem repetir). Teste com celular: `npm run relay-local` e abra `?relay=ws://localhost:8794` na TV e `?sala=CODIGO&relay=ws://localhost:8794` no celular.

**Testado pela IA em navegador (Chromium)**: partida no modo pc e partida com relay local + página de celular de verdade, sem erros. **Ainda não testado na TV LG física.**
