# Tarefa para o Antigravity: gravar a narração de "A Noite dos Lobos" no ElevenLabs

Você vai gerar **54 frases curtas** de narração em **português do Brasil** no site do ElevenLabs e salvar os MP3 na pasta do jogo. O jogo já está pronto para tocar os arquivos. **Não mexa em nenhum código.**

## 0. Antes de começar
1. Na pasta `C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG`, rode `git pull` (regra do projeto: sempre puxar antes).
2. Abra a lista das frases: `jogo-lobisomem\audio\narracao\FRASES.md`. Ela tem o **nome do arquivo**, a **frase exata**, **quando toca** e o **tom**.
3. Abra https://elevenlabs.io/app/speech-synthesis no navegador, na conta do Jacson. Se pedir login, peça para o Jacson entrar. **Nunca salve senha nem chave de API em arquivo, commit ou documentação.**

## 1. Escolher o narrador (uma voz só para o jogo todo)
- Vá em **Voices → Voice Library** e use os filtros **Language: Portuguese** e **Accent: Brazilian**. Prefira as categorias "Narrative & Story" ou "Characters".
- Procure um **narrador masculino, grave e expressivo**, com jeito de contador de histórias de suspense e sotaque **brasileiro** (não de Portugal).
- Teste **3 candidatas** com as frases `anoitecer_1` e `vitoria_lobos_1`. Fique com a que soar mais natural e brasileira. Adicione-a às suas vozes (**Add to my voices**).
- Use **a mesma voz e os mesmos ajustes** em todas as frases:
  - Modelo: **Eleven Multilingual v2**
  - Stability: **45–50%**
  - Similarity: **75%**
  - Style exaggeration: **20–30%**
  - Speaker boost: **ligado**
  - Speed: **0,95** (um pouco mais lento, para dar suspense)

## 2. Gerar e baixar
- Gere **uma frase por vez**, copiando o texto **exatamente** como está na coluna "Frase". As reticências `...` e a pontuação fazem as pausas, então não as tire.
- Ouça cada uma antes de baixar. Gere de novo (no máximo 3 tentativas) quando:
  - a voz pronunciar algo errado ou soar portuguesa;
  - o final for cortado;
  - o tom não combinar com a coluna "Tom".
- Baixe em **MP3** (o padrão do site serve).
- Salve cada arquivo em `jogo-lobisomem\audio\narracao\` com o **nome exato** da coluna Arquivo, por exemplo `anoitecer_1.mp3`: tudo minúsculo, sem acento e sem espaço. Os downloads costumam cair em `Downloads`; mova e renomeie cada um.
- Não precisa cortar silêncio nem ajustar volume. O Claude faz isso na revisão.
- Orçamento: o roteiro todo tem cerca de 2.600 caracteres. Com testes e algumas tentativas extras, isso cabe folgado nos 10.000 caracteres por mês do plano grátis.

## 3. Conferir
1. Na pasta do projeto, rode `node jogo-lobisomem/scripts/frases.js`. Ele mostra o que falta e os nomes errados, e atualiza a lista de áudios que o jogo carrega (`prontos.js`).
2. Repita até aparecer **"Tudo certo! Todos os áudios estão na pasta."**
3. Crie o arquivo `jogo-lobisomem\audio\narracao\VOZ.txt` com o nome da voz escolhida, o Voice ID, o modelo e os ajustes usados. Ele serve para regravar frases no futuro com a mesma voz. Não coloque senha nem chave nele.
4. Para ouvir no jogo, abra `jogo-lobisomem\index.html` direto no navegador e jogue uma partida com o som ligado.

## 4. Terminar
- **Não faça commit nem push.** Deixe os arquivos na pasta do PC.
- Avise o Jacson: **"Narração pronta. Pode pedir para o Claude revisar."** O Claude vai:
  - pegar os arquivos no PC;
  - cortar os silêncios e igualar o volume;
  - testar no jogo;
  - publicar no GitHub.
