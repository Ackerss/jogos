# Tarefa para o Antigravity: gravar a narração de "A Noite dos Lobos" (versão 3, voz já escolhida)

A voz já existe e foi escolhida pelo Jacson: **"Narrador Lobos"**. Ela foi criada no Voice Design e está salva na conta **gratuita pessoal** do Jacson no ElevenLabs, a mesma conta da chave que você já usou (não a da NatuBrava). Por ser uma voz criada na conta (categoria *generated*), ela funciona pela API no plano grátis.

**Não mexa em nenhum código.** Mexa só nos arquivos de áudio.

## 0. Antes de começar
1. Na pasta `C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG`, rode `git pull`.
2. Sobre a chave do ElevenLabs:
   - Use só a que já existe no PC do Jacson.
   - **Nunca copie a chave para um arquivo novo, commit, log ou documentação.**
   - Apague no final os scripts temporários que você criar.
3. Confira os créditos. Esta rodada usa cerca de **3.000 caracteres**: são **62 frases**, 54 normais mais 8 curtas do modo rápido.
4. Pela API, liste as vozes da conta e pegue o **Voice ID** da voz de nome **"Narrador Lobos"**.

## 1. Escolher o modelo (teste rápido)
1. Gere `anoitecer_1` duas vezes, uma com **Eleven v3** e outra com **Eleven Multilingual v2**, ambas com a voz "Narrador Lobos".
2. Ouça as duas e fique com a que tiver **sotaque brasileiro mais natural e voz mais grave de narrador**.
3. Use esse mesmo modelo em todas as frases.

## 2. Gravar as 62 frases
- A lista completa está em `jogo-lobisomem\audio\narracao\FRASES.md`, com nome do arquivo, frase, quando toca e tom.
- Ajustes iguais em todas:
  - Stability **45–55%**
  - Similarity **75–80%**
  - Style **25–35%**
  - Speaker boost **ligado**
  - Speed **0,95**
- Nas frases que começam com `curto_`, use Speed **1,0**: são as falas rápidas para partidas repetidas.
- Copie cada frase **exatamente**. As reticências fazem as pausas.
- Gere de novo (no máximo 2 tentativas extras) quando:
  - a pronúncia sair errada;
  - aparecer sotaque estrangeiro ou de Portugal;
  - o final for cortado.
- Salve cada MP3 em `jogo-lobisomem\audio\narracao\` com o **nome exato** da coluna Arquivo.
- Não precisa cortar silêncio nem ajustar volume. O Claude faz isso na revisão.

## 3. Conferir e terminar
1. Rode `node jogo-lobisomem/scripts/frases.js` até aparecer **"Tudo certo! Todos os áudios estão na pasta."**
2. Crie `jogo-lobisomem\audio\narracao\VOZ.txt` com a voz, o Voice ID, o modelo e os ajustes usados. Não coloque a chave nele.
3. Apague a pasta `jogo-lobisomem\audio\amostras\`, que não é mais necessária.
4. **Não faça commit nem push.**
5. Avise o Jacson: **"Narração pronta. Pode pedir para o Claude revisar."**
