# Arena Escorregadia — TV + celulares (v0.1.0)

Sumô no gelo para 2 a 8 jogadores. A TV mostra um lago de gelo redondo com bolinhas. Cada pessoa controla a sua bolinha pelo celular e tenta empurrar as outras para a água. A borda do gelo quebra a cada 15 segundos. Quem cai vira **fantasminha** e pode **soprar** os outros para fora. Bots completam a arena.

- Online: https://ackerss.github.io/jogos/arena/
- Criado pelo Claude em 06/11/2026. Visual, nomes e personagens originais.

## Três modos da mesma página

| Endereço | Modo | Para quê |
|---|---|---|
| `arena/` (na TV ou no PC) | **TV oficial** | QR Code e código. Os celulares entram e jogam. |
| `arena/?sala=ABCD` (o QR) ou o mesmo link aberto num celular | **Celular** | Entrar com o nome e virar controle. |
| `arena/?modo=pc` | **Teclado** | Testar sozinho no computador: Teclado 1 = W A S D + Espaço, Teclado 2 = setas + Enter, o resto são bots. |

`?modo=tv` força o modo TV. `?efeitos=leve` ou `?efeitos=alta` força a qualidade do desenho.

## Como se joga
- **Celular:** joystick (aparece onde o dedo encosta) para deslizar e o botão **TRANCO** para um empurrão forte. O tranco recarrega em 2,2 s; durante o tranco a bolinha fica "pesada" e empurra mais.
- **Gelo:** escorrega (atrito baixo). A borda pisca em vermelho 3 s antes de quebrar (aos 15 s e aos 30 s). Aos 45 s começa a **morte súbita**: o gelo vai derretendo até sobrar um.
- **Caiu?** Vira fantasma: voa livre sobre o lago e o botão vira **SOPRO**, que empurra quem estiver perto (recarga 3,5 s).
- **Pontos:** quem sobra no gelo leva **+3**. Cada bolinha que você derrubar (encostou nela nos últimos 3 s, inclusive com sopro) vale **+1**. Escorregar sozinho não dá ponto para ninguém. Se os últimos caem juntos, todos eles levam a vitória.
- **Partida:** 3, 5 ou 7 rodadas. No fim, pódio com os 3 primeiros. Empate: vence quem ganhou mais rodadas, depois quem derrubou mais.

### Na TV (controle remoto: setas + OK)
- **Sala de espera = treino livre:** quem entra já vê a sua bolinha na TV e pode testar o joystick (quem cai volta em 1,4 s). Sem ninguém, três bots deslizam para a tela não ficar parada.
- **Ajustes** (guardados na TV): 🤖 Bots (Automático = completa até 4 na arena, ou 0 a 7), 🏁 Rodadas (3/5/7), 🔊 Som.
- **Botões escondidos** no canto de cima, à direita: **teste tv** (começa já, com bots), **teste pc** (modo teclado) e **⛶** (tela cheia).
- Mais de 8 pessoas: as que sobram veem "Arena cheia". Quem entra no meio da partida joga a partir da rodada seguinte.

## Desempenho na TV LG
- Canvas 2D sem desfoque e sem sombras do canvas. Água, gelo e bolinhas são pintados uma vez numa tela escondida e só copiados a cada quadro.
- No navegador de Smart TV (webOS etc.) começa no modo **leve**: desenha em até 1280×720, menos partículas, sem rastro nem tremor. Em outro aparelho, se ficar abaixo de ~40 quadros por segundo por 4 s, passa sozinho para o leve.
- Física em passos fixos de 1/60 s (igual em qualquer TV).

## Conexão (`rede/rede.ts` → `js/rede.js`)
- **Motor e relay:** motor Doot (`../jogo-corrida/vendor/doot-engine`, sem alterações) e relay público `wss://relay.clasp.to`, como a Corrida e os Lobos.
- **Celular → TV:** `arena/ctl/<id>` com o joystick (x, y) e um contador de trancos que só cresce, até ~20 vezes por segundo (só quando muda, e a cada 0,6 s para a TV saber que ele continua ali). Se o celular parar de mandar por 2,5 s, a TV solta o joystick dele.
- **TV → celular:** `arena/tela/<id>` com um estado pequeno (fase, cor, no gelo/fantasma, pontos, colocação), só quando muda.
- **Sessão:** cada abertura da TV tem uma sessão (`arena/sessao`); mensagens de sessões antigas são ignoradas. O celular que recarrega volta sozinho com o mesmo nome.
- **Gerar `js/rede.js`** (só quando mudar `rede/rede.ts`): `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`.

### Testar sem internet (relay local)
`npm run relay-local`, sirva a pasta do repositório e abra `http://localhost:PORTA/jogo-arena/?relay=ws://localhost:8791` (a TV). O QR já inclui o relay local.

## Arquivos

| Arquivo | Função |
|---|---|
| `js/fisica.js` | Física e regras puras (gelo que encolhe, batidas, tranco, sopro, quedas, pontos). Todos os números ficam em `C`, no topo. Testado em `tests/`. |
| `js/bots.js` | Bots: usam o mesmo joystick e botão de um celular. Fogem da borda e tentam empurrar pelo lado de dentro. |
| `js/desenho.js` | Desenho da arena na TV (Canvas 2D) e as 8 cores das bolinhas. |
| `js/tv.js` | Diretor da partida: sala de espera, rodadas, placar, pódio, controle remoto e estado de cada celular. |
| `js/controle.js` | O celular: entrar com nome, joystick, TRANCO/SOPRO, vibração e mensagens. |
| `js/som.js` | Efeitos sonoros gerados na hora (sem arquivos). |
| `rede/rede.ts`, `js/rede.js` | Conexão TV ↔ celulares (Doot). `js/rede.js` é gerado: não edite à mão. |
| `arte/capa.svg`, `arte/fundo.svg` | Artes da central de jogos. |

## Verificar
```
npm run check   # sintaxe de todos os arquivos
npm test        # física, regras e 300 rodadas só com bots
```
O jogo não tem dependências para rodar. Só gerar `js/rede.js` usa o esbuild já instalado na Corrida.
