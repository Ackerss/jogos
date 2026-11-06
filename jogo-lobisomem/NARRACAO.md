# Narração de A Noite dos Lobos: registro

Histórico e estado da narração. Atualizado em 06/11/2026.

## Estado atual
- **A narração está gravada e publicada (06/11/2026).** São 61 MP3 com a voz "Narrador Lobos", cerca de 3,5 min no total.
- **O roteiro tem 61 frases** em `js/narracao.js`: 54 da narração completa e 7 curtas do modo rápido.
- **06/11, após testes:** saíram 3 frases que afirmavam haver lobo entre os jogadores, ou que podiam ficar falsas:
  - "Bom dia, vila... Tem lobo entre vocês.";
  - "Amanheceu! Quem é o lobo?";
  - "Cada um recebeu um voto só.".
  Os MP3 que sobraram foram renumerados.
- **06/11, Paz na vila:** entrou o voto "Paz na vila" e o momento `paz_na_vila`, com 2 frases neutras que não revelam se havia lobo. O Claude gravou as duas no site do ElevenLabs com a mesma voz e os mesmos ajustes. A lista está em `audio/narracao/FRASES.md`.
- Se algum MP3 faltar, o jogo fala a mesma frase com a voz do navegador. Nada quebra.
- **Voz escolhida pelo Jacson:** "Narrador Lobos".
  - Criada pelo Claude em 05/11/2026 no Voice Design do ElevenLabs.
  - É a opção 3 das três geradas. Descrição usada: senhor brasileiro de uns 70 anos, contador de histórias de fantasia, voz grave, forte, calorosa e um pouco rouca, sotaque brasileiro nativo, narração lenta e teatral.
  - Está salva na **conta gratuita pessoal do Jacson** no ElevenLabs, não na da NatuBrava.
  - Por ser uma voz criada na própria conta, funciona pela API no plano grátis.
- **Gravação:** feita pelo Antigravity em 06/11/2026. Os dados estão em `audio/narracao/VOZ.txt`:
  - Voice ID `MgpcpDwUoGzvd9OeqyBs`, modelo `eleven_multilingual_v2`;
  - Stability 50%, Similarity 75%, Style 30%, Speaker boost ligado;
  - Speed 0,95, e 1,0 nas frases `curto_`.
- **Revisão do Claude (06/11/2026):**
  - cortou o silêncio do começo e do fim e deixou 0,12 s no final;
  - igualou o volume em −16 LUFS, com limitador em −1 dB;
  - converteu para MP3 mono 44,1 kHz 128 kbps.
  - Testou uma partida completa e uma rápida no navegador: os 62 áudios carregaram, todos tocaram e não houve erros.
  - Não dá para conferir o sotaque por máquina. Quem confirma é o Jacson, ouvindo.

## Modos de narração
O modo fica nos ajustes, antes de começar a partida.

| Modo | Quando usar | O que fala |
|---|---|---|
| **Automática** (padrão) | Sempre | 1ª partida completa, as seguintes rápidas |
| Sempre completa | Primeira vez ou visita | A história inteira, com 1 a 3 versões sorteadas para não repetir |
| Sempre rápida | Partidas em sequência | Só o essencial: "A noite caiu.", "Vez do ladrão.", "Hora de votar!", eliminação e vitória |

As transições esperam o narrador terminar a frase. As etapas da noite têm tempo fixo, que não depende da narração nem de quem tem cada papel.

## Regras que o Jacson pediu
- **Nada de "fechem os olhos".** O jogo é na TV com celular, e cada um age em segredo na própria tela.
- **Narrador:** senhor brasileiro, voz forte de contador de histórias de fantasia, sotaque do Brasil.
- **Sem custo:** plano grátis do ElevenLabs, com 10.000 caracteres por mês por conta. O Jacson tem uma segunda conta grátis, a da NatuBrava, como reserva.
- **Equilíbrio:** a narração é boa, mas não pode deixar as partidas repetidas lentas. Por isso existe o modo rápido.

## Histórico
1. **05/11, v1:** o Antigravity gravou com a voz "Adam", uma voz americana. Foi descartada e nunca foi publicada.
2. **05/11, v2:** as frases foram reescritas sem "fechem os olhos". O Antigravity achou 6 vozes brasileiras na Voice Library, mas o plano grátis bloqueia essas vozes na API (erro 402).
3. **05/11, v3:** o Claude criou 3 vozes pelo Voice Design no site e o Jacson escolheu a 3, "Narrador Lobos". Também foi criado o modo rápido.
4. **06/11:** o Antigravity gravou as 62 frases com essa voz. O Claude ajustou, testou e publicou.
5. **06/11:** a abertura parou de ser cortada pelo "olhe a sua carta", porque o jogo agora espera o narrador terminar. Também entrou a Paz na vila, com 2 frases novas.

## Arquivos
| Arquivo | Função |
|---|---|
| `js/narracao.js` | Roteiro: frases de cada momento e mapa do modo rápido (`curto`) |
| `js/som.js` | Toca o MP3; sem o arquivo, usa a voz do navegador |
| `js/main.js` | `narra()` escolhe entre narração completa e curta |
| `scripts/frases.js` | Gera `FRASES.md` e `prontos.js` e confere os arquivos que faltam ou estão com nome errado |
| `audio/narracao/` | 61 MP3, `FRASES.md`, `prontos.js` (gerado), `PROMPT_ANTIGRAVITY.md`, `VOZ.txt` |
| `audio/amostras/` | Amostras de voz antigas. Já apagada; não vai para o GitHub. |

Para trocar uma frase:
1. Mude o texto em `js/narracao.js`.
2. Grave de novo só aquele MP3 com a voz "Narrador Lobos" e os ajustes de `VOZ.txt`.
3. Corte o silêncio e iguale o volume em −16 LUFS, como na revisão acima.
4. Rode `node scripts/frases.js`.
