# A Noite dos Lobos — TV + celulares (v0.3.0)

Jogo de blefe e dedução para 3 a 6 jogadores. A TV é a mesa e o narrador. Cada pessoa joga pelo próprio celular, onde só ela vê a sua carta.

- Online: https://ackerss.github.io/jogos/lobisomem/
- Origem: protótipo `JOGO LOBISOMEN ACKER/index.html` (04/11/2026), revisado e reorganizado pelo Claude em 05/11/2026. Celulares de verdade desde 06/11/2026.

## Três modos da mesma página

| Endereço | Modo | Para quê |
|---|---|---|
| `lobisomem/` (na TV ou no PC) | **TV oficial** | QR Code e código. Os celulares entram e jogam. |
| `lobisomem/?sala=ABCD` (o QR) ou o mesmo link aberto num celular | **Celular** | Entrar com o nome e jogar. |
| `lobisomem/?modo=pc` | **Simulador** | TV e celulares simulados na mesma tela, com bots (testar sozinho). |

`?modo=tv` força o modo TV num aparelho que pareça celular.

### Na TV (controle remoto: setas + OK)
- **Ajustes** (cada OK passa para a próxima opção, e eles ficam guardados na TV): 🤖 bots (0–5), 🌙 segundos por papel à noite, 💬 minutos de conversa, 🎙️ narração.
- **🏆 Ranking:** vitórias e partidas por nome (guardado na TV, `localStorage`), sem bots. Zerar exige apertar duas vezes.
- **Botões escondidos** no canto de cima, à direita:
  - **teste tv** completa a mesa com bots: você + 3 bots, jogando com o seu celular;
  - **teste pc** abre o simulador;
  - **⛶** liga a tela cheia.
- Começar exige 3 na mesa (pessoas + bots). Mais de 6 pessoas: as que sobram veem "Mesa cheia".

### Conexão (`rede/rede.ts` → `js/rede.js`)
- **Motor e relay:** motor Doot (`../jogo-corrida/vendor/doot-engine`, sem alterações) e relay público `wss://relay.clasp.to`, como a Corrida dos Toques.
- **A TV manda:** ela roda o jogo inteiro e publica para cada celular a tela pronta (`lobos/tela/<id>`) e o relógio (`lobos/tempo/<id>`).
- **O celular só devolve toques:** manda `lobos/acao/<id>` com a mesma mensagem dos celulares simulados (`entrada(id, {tipo, ...})`). O HTML recebido passa por uma limpeza (sem scripts nem eventos).
- **Sessão:** cada abertura da TV tem uma sessão (`lobos/sessao`), e mensagens de sessões antigas são ignoradas. O celular que recarrega pede a tela de novo (`lobos/oi/<id>`).
- **Segredo "leve":** como na Corrida, alguém com conhecimento técnico poderia ler o relay. Isso serve para jogar em família, não para apostas.
- **Gerar `js/rede.js`** (só quando mudar `rede/rede.ts`): `cd ../jogo-corrida && npm ci`, depois aqui `npm run rede`.

### Testar sem internet (relay local)
`npm run relay-local` e abra `http://localhost:PORTA/jogo-lobisomem/?relay=ws://localhost:8790` (a TV). O QR já inclui o relay local. Só é usado com `?relay=ws://localhost…`.

## Como a partida flui (e quanto tempo cada parte leva)

| Fase | O que acontece | Tempo |
|---|---|---|
| Distribuir | Baralho aparece, cada carta voa para um lugar; 3 vão ao centro | ~2,5 s |
| Olhar a carta | Cada um vira a carta no celular e toca em Pronto | até todos prontos (máx. 90 s) |
| Anoitecer | A vila escurece | 2,8 s |
| Noite (4 etapas) | Carta grande do papel vira na TV; quem tem a carta age no celular | ajuste (8/12/20/30 s) **igual para todas as etapas** |
| Amanhecer | “Amanheceu! Cartas podem ter trocado de dono” | 3,4 s |
| Conversa | Chat, relógio, bots comentam; “Votar agora” | ajuste (1–5 min) |
| Votação | Selos “Pensando…/Votou”; aviso aos 30 s | até todos votarem (máx. 60 s) |
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
| `js/celular.js` | Telas dos celulares (as mesmas no simulador e no celular de verdade). |
| `js/controle.js` | O celular de verdade: entrar com nome, mostrar a tela que vem da TV, devolver os toques. |
| `rede/rede.ts`, `js/rede.js` | Conexão TV ↔ celulares (Doot). `js/rede.js` é gerado: não edite à mão. |
| `scripts/relay-local.mjs` | Relay de teste local para testes automáticos. |
| `js/cena.js`, `css/cena.css` | Vila animada (luzes, chafariz, névoa, partículas) — preservada do protótipo. |
| `js/narracao.js` | Roteiro do narrador: frases de cada momento (1 a 3 versões). |
| `js/som.js` | Toca os MP3 do narrador (sem o MP3, usa a voz do navegador) e gera os efeitos curtos. |
| `audio/narracao/` | 61 MP3 do narrador ("Narrador Lobos"), `FRASES.md` (lista), `prontos.js` (gerado), `VOZ.txt` (voz e ajustes) e `PROMPT_ANTIGRAVITY.md`. |
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
O jogo não tem dependências para rodar. Só gerar `js/rede.js` usa o esbuild já instalado na Corrida.
