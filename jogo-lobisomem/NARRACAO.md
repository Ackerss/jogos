# Narração de A Noite dos Lobos: registro

Histórico e estado da narração. Atualizado em 06/11/2026.

## Estado atual
- **O jogo já está pronto para tocar os MP3.** Enquanto um arquivo não existir, fala a mesma frase com a voz do navegador.
- **O roteiro tem 62 frases** em `js/narracao.js`: 54 da narração completa e 8 curtas do modo rápido, cerca de 2.900 caracteres no total. A lista para gravar está em `audio/narracao/FRASES.md`.
- **Voz escolhida pelo Jacson:** "Narrador Lobos".
  - Criada pelo Claude em 05/11/2026 no Voice Design do ElevenLabs.
  - É a opção 3 das três geradas. Descrição usada: senhor brasileiro de uns 70 anos, contador de histórias de fantasia, voz grave, forte, calorosa e um pouco rouca, sotaque brasileiro nativo, narração lenta e teatral.
  - Está salva na **conta gratuita pessoal do Jacson** no ElevenLabs, não na da NatuBrava.
  - Por ser uma voz criada na própria conta, funciona pela API no plano grátis.
- **Falta gravar.** O Antigravity grava os 62 MP3 seguindo `audio/narracao/PROMPT_ANTIGRAVITY.md` (versão 3) e salva no PC sem commit. Depois o Claude:
  - corta os silêncios;
  - iguala o volume em −16 LUFS;
  - roda `node scripts/frases.js`;
  - testa uma partida;
  - publica.

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

## Arquivos
| Arquivo | Função |
|---|---|
| `js/narracao.js` | Roteiro: frases de cada momento e mapa do modo rápido (`curto`) |
| `js/som.js` | Toca o MP3; sem o arquivo, usa a voz do navegador |
| `js/main.js` | `narra()` escolhe entre narração completa e curta |
| `scripts/frases.js` | Gera `FRASES.md` e `prontos.js` e confere os arquivos que faltam ou estão com nome errado |
| `audio/narracao/` | MP3, `FRASES.md`, `prontos.js` (gerado), `PROMPT_ANTIGRAVITY.md`, `VOZ.txt` |
| `audio/amostras/` | Amostras de voz para escolher. Não vai para o GitHub. |

Para trocar uma frase:
1. Mude o texto em `js/narracao.js`.
2. Grave de novo só aquele MP3 com a voz "Narrador Lobos".
3. Rode `node scripts/frases.js`.
