# Grande Prêmio dos Bichos — TV + celulares (v1.0.0)

Corrida maluca de apostas para 2 a 8 jogadores (pessoas + bots). Cinco bichos correm na TV: tartaruga, porco, pato, coelho e gato. Ninguém tem bicho próprio: todo mundo aposta.

- Online: https://ackerss.github.io/jogos/bichos/
- Criado pelo Claude em 06/11/2026. Mecânica inspirada em jogos de corrida com apostas. Nome, regras simplificadas, desenhos e textos são próprios.
- Feito para dar para uma criança de 4 anos jogar: no celular são **3 botões enormes com desenho** e quase nada para ler.

## Como se joga (1 minuto)
Na sua vez, você faz **uma** coisa no celular:

| Botão | O que faz |
|---|---|
| 🎲 **Dado** | Sai um dado do copo. O bicho da cor do dado anda 1, 2 ou 3 casas. Você ganha 1 moeda. |
| 🎟️ **Apostar** | Pega o melhor bilhete que sobrou de um bicho: 5, depois 3, depois 2. |
| 🍌 **Banana** | Põe a sua casca de banana na frente de um bicho. Quem pisar escorrega 1 casa para trás e você ganha 1 moeda. Cada um tem 1 banana. Pôr de novo muda ela de lugar. |

- **Carona:** quem cai numa casa ocupada sobe nas costas de quem está lá. Quem anda leva junto todo mundo que está em cima dele. Na mesma casa, quem está em cima está na frente.
- **Fim da volta:** quando os 5 dados saem do copo, os bilhetes são pagos. O bilhete do 1º lugar vale o número dele, o do 2º vale 1 moeda e os outros perdem 1 moeda (ninguém fica negativo). Depois os dados voltam para o copo, os bilhetes voltam e as bananas saem da pista.
- **Fim da corrida:** quando um bicho cruza a chegada (casa 16), a volta é paga e vence quem tiver **mais moedas**. Todo mundo começa com 3.
- **Tempo da vez:** ajustável (30, 45, 60, 90 s ou sem limite). Se acabar, o dado é jogado sozinho. Quem fechou o celular tem a vez passada sozinha em 4 s.

## Três modos da mesma página

| Endereço | Modo | Para quê |
|---|---|---|
| `bichos/` (na TV ou no PC) | **TV oficial** | QR Code e código. Os celulares entram e jogam. |
| `bichos/?sala=ABCD` (o QR) ou o link aberto num celular | **Celular** | Entrar com o nome e jogar. |
| `bichos/?modo=pc` | **Simulador** | TV e 1 a 4 celulares na mesma tela, com bots (testar sozinho). |

- **Na TV (controle remoto: setas + OK):** Bots (0 a 7), Tempo da vez, Som e **Começar corrida**. Os ajustes ficam guardados na TV.
- **Começar pelo celular:** o primeiro que entrou também tem o botão "Começar corrida". No fim, todos têm "Jogar de novo".
- **Campeões:** vitórias por nome ficam guardadas na TV e aparecem na sala (bots não contam).
- **Cantinho escondido** (canto de cima, à direita): `teste pc` (simulador), `central` e ⛶ (tela cheia).

## Conexão (`rede/rede.ts` → `js/rede.js`)
- Motor Doot (`../jogo-corrida/vendor/doot-engine`, sem alterações) e relay público `wss://relay.clasp.to`, como a Corrida e os Lobos.
- **A TV manda:** roda o jogo inteiro e publica para cada celular os **dados** da tela (`bichos/tela/<id>`), não HTML. O celular desenha a tela com `js/celular.js`.
- **O celular só devolve toques:** `bichos/acao/<id>` com `{tipo: 'rolar' | 'apostar' | 'banana' | 'comecar' | 'denovo', bicho}`. A TV confere se é a vez da pessoa.
- Sessão por abertura da TV (`bichos/sessao`). O celular que recarrega entra sozinho e pede a tela de novo (`bichos/oi/<id>`).
- `rede/rede.ts` foi escrito para servir de modelo a outros jogos: `Rede.criarSala({plugin, prefixo, titulo, cap})` e `Rede.entrar({plugin, prefixo})`.
- **Gerar `js/rede.js`** (só quando mudar `rede/rede.ts`): `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`.
- **Testar sem internet:** `npm run relay-local` e abra `http://localhost:PORTA/jogo-bichos/?relay=ws://localhost:8790`.

## Leve para a TV LG
Sem blur, sem filtros nem sombras pesadas. As animações usam só `transform` e `opacity`. Os bichos, dados, bilhetes e bananas são desenhados em SVG no código (`js/arte.js`), sem imagens para baixar e sem emoji. Cada MP3 do locutor só é baixado na primeira vez que toca.

## Arquivos

| Arquivo | Função |
|---|---|
| `js/regras.js` | Regras puras (pista, pilhas, dado, apostas, banana, pagamento). Testado em `tests/`. |
| `js/bots.js` | Bots: simulam o resto da volta e decidem entre apostar, banana ou dado. 3 jeitos (ousado, esperto, cauteloso). |
| `js/main.js` | Diretor na TV: sala, vezes, animações, telas dos celulares, simulador. Tempos em `TEMPO`. |
| `js/tv.js` | Desenho da TV (pista, bichos, copo, bilhetes, jogadores, avisos, quadros). |
| `js/celular.js` | Tela do celular (a mesma no celular de verdade e no simulador). |
| `js/controle.js` | O celular de verdade: entrar com nome, receber a tela, devolver os toques. |
| `js/arte.js` | Bichos, dado, bilhete, banana, moeda, troféu e copo em SVG. |
| `js/narracao.js`, `js/som.js` | Frases do locutor e efeitos sonoros (gerados na hora). |
| `audio/narracao/` | MP3 do locutor, `FRASES.md` (lista), `prontos.js` (gerado) e `PROMPT_ANTIGRAVITY.md`. |
| `arte/capa.svg`, `arte/fundo.svg` | Imagens do jogo na central (`npm run capas` gera de novo). |

## Verificar
```
npm run check   # sintaxe de todos os arquivos
npm test        # regras + 300 corridas só com bots
npm run frases  # lista de frases e conferência dos MP3
```
