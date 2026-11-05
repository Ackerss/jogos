# Tarefa para o Antigravity: regravar a narração de "A Noite dos Lobos" (versão 2)

Na primeira gravação, as frases e a voz não ficaram boas. A voz era o Adam, uma voz americana. Esta versão troca as duas coisas.

- **As frases mudaram.** Elas foram reescritas para o jogo na TV com celular, então não falam mais em "fechar os olhos". A lista nova está em `FRASES.md`.
- **A voz tem que ser outra:** um **senhor brasileiro com voz forte de narrador de histórias de fantasia**, com sotaque do Brasil nativo e sem nenhum sotaque estrangeiro. **Não use o Adam nem as outras vozes prontas em inglês.**

**Não mexa em nenhum código.** Mexa só nos arquivos de áudio.

## 0. Antes de começar
1. Na pasta `C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG`, rode `git pull`.
2. Apague os 54 MP3 antigos de `jogo-lobisomem\audio\narracao\` e o arquivo `VOZ.txt`. Eles não servem mais.
3. Apague os arquivos de teste que você criou na primeira rodada, onde quer que estejam:
   - `test_*.py`, `test_*.mp3`, `check_*.py`, `search_*.py` e `generate_*.py`;
   - principalmente os que tiverem a chave do ElevenLabs escrita dentro.
4. Sobre a chave do ElevenLabs:
   - Use só a que já existe no PC do Jacson.
   - **Nunca copie a chave para um arquivo novo, commit, log ou documentação.**
   - Leia a chave de onde ela já está, ou de uma variável de ambiente.
5. Confira quantos créditos (caracteres) sobram no plano. Esta rodada usa cerca de **3.700**: 2.800 das frases mais umas 900 das amostras. Se sobrar menos que isso, avise o Jacson antes de gerar.

## 1. Encontrar 4 a 6 vozes candidatas
Tente as duas fontes abaixo, nesta ordem.

**A) Voice Library (vozes da comunidade)**
- Filtros:
  - idioma **Portuguese**
  - sotaque **Brazilian**
  - gênero **masculino**
  - idade **old** ou **middle aged**
  - uso **Narrative & Story** ou **Characters**
- Procure palavras como "narrador", "contador de histórias", "storyteller", "épico", "grave".
- Escolha até 3 vozes.
- Observação: no plano grátis, o ElevenLabs pode recusar vozes da biblioteca pela API. Se recusar, não insista e passe para a opção B.

**B) Voice Design (criar uma voz a partir de uma descrição)**
- Gere 3 opções com esta descrição:
  > An elderly Brazilian man, a wise fantasy storyteller with a deep, strong, warm and slightly raspy voice. Native Brazilian Portuguese accent, from Brazil (not Portugal, no foreign accent). Slow, dramatic, theatrical narration, like an old man telling a legend by the fireplace.
- Texto de amostra, em português:
  > Era uma vez uma vila tranquila... até a noite em que os lobos chegaram. Ninguém sabia quem era quem. E quando o dia amanheceu, alguém ali já não era mais o mesmo.
- Salve as opções que soarem brasileiras e fortes como vozes da conta, por exemplo "Narrador Lobos 1".

## 2. Amostras para o Jacson escolher
1. Para cada candidata, gere **a mesma frase**: `Era uma vez uma vila tranquila... até a noite em que os lobos chegaram.`
2. Salve as amostras em `jogo-lobisomem\audio\amostras\` com nomes numerados, como `1_nome-da-voz.mp3` e `2_nome-da-voz.mp3`. Essa pasta não vai para o GitHub.
3. Crie `jogo-lobisomem\audio\amostras\LEIA.txt` listando número, nome da voz, Voice ID e de onde ela veio (biblioteca ou design).
4. **Pare e peça ao Jacson** para ouvir e dizer o número da voz preferida. Não grave as 54 frases antes dessa resposta.

## 3. Gravar as 54 frases com a voz escolhida
- A lista completa está em `jogo-lobisomem\audio\narracao\FRASES.md`, com nome do arquivo, frase, quando toca e tom.
- Use **a mesma voz e os mesmos ajustes** em todas as frases.
  - Modelo: **Eleven Multilingual v2**. Se a voz escolhida veio do Voice Design e soar claramente melhor no **Eleven v3**, use o v3 em todas.
  - Stability: **45–55%**
  - Similarity: **75–80%**
  - Style: **25–35%** (mais teatral)
  - Speaker boost: **ligado**
  - Speed: **0,90–0,95** (narrador pausado)
- Copie cada frase **exatamente** como está. As reticências fazem as pausas.
- Gere de novo (no máximo 2 tentativas extras) quando:
  - a pronúncia sair errada;
  - aparecer sotaque estrangeiro ou de Portugal;
  - o fim da frase for cortado.
- Salve cada MP3 em `jogo-lobisomem\audio\narracao\` com o **nome exato** da coluna Arquivo, por exemplo `anoitecer_1.mp3`.
- Não precisa cortar silêncio nem ajustar volume. O Claude faz isso na revisão.

## 4. Conferir e terminar
1. Rode `node jogo-lobisomem/scripts/frases.js` até aparecer **"Tudo certo! Todos os áudios estão na pasta."**
2. Crie `jogo-lobisomem\audio\narracao\VOZ.txt` com o nome da voz, o Voice ID, o modelo e os ajustes usados. Não coloque a chave nele.
3. **Não faça commit nem push.**
4. Avise o Jacson: **"Narração v2 pronta. Pode pedir para o Claude revisar."**
