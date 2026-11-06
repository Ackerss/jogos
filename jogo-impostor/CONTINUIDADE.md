# O Impostor: continuidade (pausado em 06/11/2026)

O Jacson pausou este jogo. A parte pesada fica com o ChatGPT/Codex. O Claude volta só no fim, para refinar.
Branch com o que já existe: `claude/project-thread-ijbfju`. Nada foi para a `main` e o jogo ainda não está na central.

## O que já está pronto (só lógica, sem tela)
| Arquivo | Conteúdo |
|---|---|
| `js/palavras.js` | 18 temas × 16 palavras = 288 palavras em PT-BR. Cada palavra tem 3 pistas que os bots usam. |
| `js/regras.js` | Regras puras: sorteio sem repetir, impostor equilibrado, ordem de fala, pistas, votos, desempate, chute e pontos. |
| `js/bots.js` | Bots: pista, voto e chute. Cada bot só usa o que saberia. |
| `js/narracao.js` | Roteiro do narrador: 19 momentos e cerca de 30 frases, mais a lista de "essenciais". |
| `js/som.js` | Toca os MP3 da narração. Sem MP3, usa a voz do navegador. Tem efeitos curtos gerados na hora. |

Esses arquivos ainda não têm testes nem foram rodados no navegador.

## Decisões tomadas
- **Padrão da casa.** A TV LG é a autoridade e os celulares entram pelo QR. Usar o mesmo motor Doot e o relay da Corrida e dos Lobos. Copiar `jogo-lobisomem/rede/rede.ts` com o prefixo `imp/`, o plugin `acker-impostor` e `playerCap` 12. Gerar o arquivo com esbuild, como faz `jogo-lobisomem/scripts/rede.mjs`.
- **Mesa e rodada.** Cabem de 3 a 10 pessoas e há um impostor por rodada. Ninguém é eliminado. A partida tem 3, 5, 7 ou 10 rodadas (padrão 5).
- **Grade de 16 palavras na TV.** É o estilo Chameleon: todos veem o tema e as 16 palavras. Os inocentes também veem no celular qual é a secreta. O impostor vê só o tema e a grade. Assim o chute final é justo, porque ele toca numa das 16.
- **Tela do segredo igual para todos.** O cartão do impostor tem a mesma cor e o mesmo tamanho do cartão dos inocentes, para não vazar o papel de longe. O jogador toca para ver e toca para esconder. O botão "👁 ver minha palavra" fica nas fases seguintes.
- **Pistas faladas (padrão).** Na sua vez, o celular mostra "SUA VEZ" e o botão "✓ Já falei". O celular não tem botões de conversa (lição do Lobos). O tempo por pista é 15, 20, 30 ou 45 s; quando acaba, a vez passa sozinha.
- **Pistas escritas.** São obrigatórias quando há bots na mesa e opcionais nos ajustes. Valem uma ou duas palavras, com até 20 letras, e aparecem na TV. O inocente não pode escrever a palavra secreta. O impostor pode escrever qualquer coisa, porque recusar entregaria que ele acertou.
- **Voltas de pistas.** O padrão "auto" dá 2 voltas com até 4 jogadores e 1 volta com 5 ou mais.
- **Quem começa.** Quase nunca é o impostor: quando o sorteio cai nele, há 80% de chance de passar para o próximo.
- **Conversa.** Dura 30, 60, 90 ou 120 s (padrão 60). Se todas as pessoas tocarem "Quero votar", a votação começa antes.
- **Votação.** É feita no celular, com 45 s, e dá para trocar o voto até todos votarem. Em caso de empate, há uma nova votação só entre os empatados (30 s). Se empatar de novo, ou se ninguém votar, o impostor escapa.
- **Chute final.** O impostor pego tem 30 s para tocar na palavra entre as 16.
- **Pontos.**
  - Votar no impostor: +1.
  - Impostor escapa: +3 para ele.
  - Impostor pego que erra a palavra: +1 para cada inocente.
  - Impostor pego que acerta a palavra: +2 para ele.
- **Ranking na TV.** Fica no `localStorage` `impostor-ranking-v1`, por nome. Guarda partidas vencidas, jogadas e fugas como impostor. Bots não entram.
- **Quem chega no meio.** Entra na rodada seguinte, com 0 pontos. Quem cai continua na mesa até o fim da partida. Mais de 10 pessoas: as que sobram veem "Mesa cheia".
- **Ajustes no lobby da TV** (cada OK passa para a próxima opção; ficam salvos em `impostor-config`): rodadas, tempo por pista, conversa, voltas, bots (0 a 4), pistas (faladas ou escritas), tema (sorteado ou fixo) e narração (Automática, Sempre completa ou Desligada).
- **Narração Automática.** Completa na 1ª rodada. Depois, só os momentos "essenciais".
- **Como no Lobos.** Navegação por setas e OK no controle remoto. Botões 📜 Regras e 🏆 Ranking. Botões escondidos "teste tv", "teste pc" e ⛶. Simulador em `?modo=pc`.
- **TV leve** (lição do PR #11): nada de blur, backdrop-filter ou mix-blend, e nenhuma animação infinita em tela cheia.

## O que falta fazer
1. `index.html` com os modos tv, celular e pc, `css/jogo.css` e a tela da TV (`js/tv.js`): tema, grade 4×4, lista de jogadores com status e pontos, e palco para a revelação e o pódio.
2. O diretor da partida (`js/main.js`). As fases são: lobby → sorteio → revelar → pistas → conversa → votação (→ desempate) → apuração → revelação → chute (se pego) → resultado → próxima rodada ou final. Os tempos ficam juntos em `TEMPO`.
3. As telas dos celulares, o controle real (`js/controle.js`, a partir do Lobos) e o simulador.
4. A conexão: `rede/rede.ts`, `js/rede.js` e os scripts `rede.mjs`, `relay-local.mjs`, `verificar.js` e `frases.js` (copiar do Lobos), mais o `package.json`.
5. Os testes (`tests/`): banco de palavras, centenas de rodadas com bots e roteiro da narração.
6. A central e a publicação:
   - adicionar o bloco na lista `JOGOS` do `index.html` da raiz (capa 3:4, fundo 16:9 e cor);
   - colocar check, test e a cópia para `_site/impostor/` em `.github/workflows/deploy.yml`.
7. A narração em MP3 (opcional): gerar `audio/narracao/FRASES.md` e um `PROMPT_ANTIGRAVITY.md` como os do Lobos. Pode usar a voz "Narrador Lobos" com um estilo mais animado.
8. Testar TV + celulares simulados com o relay local, e depois na TV LG de verdade.
