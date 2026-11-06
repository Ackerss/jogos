# Tarefa para o Antigravity: gravar o locutor do "Grande Prêmio dos Bichos"

O jogo já funciona sem os áudios: sem MP3, as frases mais importantes saem pela voz do navegador e o resto fica só com os efeitos. Esta tarefa troca isso por um **locutor de corrida brasileiro de verdade**.

**Não mexa em nenhum código.** Mexa só nos arquivos de áudio desta pasta.

## 0. Antes de começar
1. Na pasta `C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG`, rode `git pull` (a pasta `jogo-bichos` precisa existir com os arquivos do jogo).
2. Sobre a chave do ElevenLabs:
   - use só a que já existe no PC do Jacson (a mesma da narração dos Lobos, conta **grátis pessoal**, não a da NatuBrava);
   - **nunca copie a chave para arquivo novo, commit, log ou documentação**;
   - apague no final os scripts temporários que criar.
3. Esta rodada usa cerca de **1.300 caracteres**: são **35 frases** curtas. Confira se a conta tem crédito.

## 1. Criar a voz "Locutor Bichos" (Voice Design)
A voz "Narrador Lobos" é grave e lenta, não serve para corrida. Crie uma nova, do mesmo jeito que a dos Lobos foi criada (voz criada na conta funciona pela API no plano grátis):

- **Onde:** Voice Design do ElevenLabs (site: *Voices → Add a new voice → Voice Design*, ou API `POST /v1/text-to-voice/design` e depois `POST /v1/text-to-voice` para salvar).
- **Descrição:**
  > Brazilian Portuguese male sports announcer in his 40s, energetic horse-race and football commentator from Brazil, bright and warm voice, fast and enthusiastic delivery, big smile in the voice, funny and family-friendly, native Brazilian accent (not Portugal).
- **Texto de teste:** `Atenção... preparados... e foi dada a largada! Olha o porco! Que disparada!`
- Gere as opções e fique com a de **sotaque brasileiro mais natural e mais empolgada**. Se der, deixe o Jacson escolher ouvindo.
- Salve com o nome **"Locutor Bichos"**.

## 2. Gravar as 35 frases
- A lista está em `jogo-bichos\audio\narracao\FRASES.md`, com o nome do arquivo, a frase, quando toca e o tom.
- Modelo: **Eleven Multilingual v2** (o mesmo dos Lobos). Se o v3 soar mais brasileiro num teste rápido com `largada_1`, pode usar o v3 em todas.
- Ajustes iguais em todas:
  - Stability **35–45%** (mais solto que o dos Lobos, para ter emoção)
  - Similarity **75%**
  - Style **45–55%**
  - Speaker boost **ligado**
  - Speed **1,05**
- Copie cada frase **exatamente**. As reticências fazem as pausas.
- As frases curtas precisam soar **rápidas e animadas**: elas tocam no meio da corrida.
- Gere de novo (no máximo 2 tentativas extras) quando a pronúncia sair errada, aparecer sotaque estrangeiro ou de Portugal, ou o final for cortado.
- Salve cada MP3 em `jogo-bichos\audio\narracao\` com o **nome exato** da coluna Arquivo.
- Não precisa cortar silêncio nem ajustar volume. O Claude faz isso na revisão.

## 3. Conferir e terminar
1. Na pasta `jogo-bichos`, rode `node scripts/frases.js` até aparecer **"Tudo certo! Todos os áudios estão na pasta."**
2. Crie `jogo-bichos\audio\narracao\VOZ.txt` com o nome da voz, o Voice ID, o modelo e os ajustes usados. Não coloque a chave nele.
3. **Não faça commit nem push.**
4. Avise o Jacson: **"Locutor dos Bichos pronto. Pode pedir para o Claude revisar."**
