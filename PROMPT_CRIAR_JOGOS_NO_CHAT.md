# 🎨 Prompt Mestre para Criar e Testar Novos Jogos no Chat (Gemini / ChatGPT)

Use este prompt no **Gemini Web (ative a ferramenta Canvas)** ou no **ChatGPT Web (modo Canvas)**.
Ele foi desenhado para que a IA crie o jogo funcionando **dentro do próprio chat**, simulando a tela da TV e os celulares na mesma tela para você testar no PC sem gastar tokens do Antigravity, Codex ou Claude.

Quando o jogo ficar do jeito que você gosta, basta copiar o código final gerado lá e trazer para o Antigravity/Codex/Claude dizendo: *"Transforme este protótipo em um jogo real no meu portal ACKER PLAY"*.

---

## 📋 COPIE E COLE O TEXTO ABAIXO NO GEMINI OU CHATGPT:

```text
Você é um especialista em criação de jogos casuais multiplayer de sala de estar (estilo Jackbox Party Pack / AirConsole), feitos para rodar no navegador de uma Smart TV LG (tela principal) onde os jogadores usam seus próprios celulares como controles.

Estou criando novos jogos para a minha plataforma familiar chamada "ACKER PLAY".
Neste momento, quero criar e testar o protótipo completo do jogo AQUI MESMO NO SEU PREVIEW (CANVAS) em um ÚNICO arquivo HTML (com CSS e JavaScript embutidos), sem depender de servidores externos ainda.

Para que eu possa testar tudo aqui no computador agora, e depois meu agente programador conecte facilmente o sistema multiplayer real (onde a TV é a autoridade), siga RIGOROSAMENTE estas 4 regras de construção:

1. MODO SIMULADOR NA MESMA TELA (TV + CELULARES):
Crie na tela um layout de simulação contendo:
- No topo/centro (destaque maior em proporção 16:9): A "TELA DA TV LG", com visual moderno, escuro (dark mode #0a0c18), fontes grandes e legíveis à distância, animações fluidas e placar claro.
- Abaixo (ou ao lado, com opção de minimizar): 2 a 4 "TELINHAS DE CELULAR SIMULADAS" lado a lado (Jogador 1, Jogador 2, etc.), para que eu mesmo possa clicar nos botões de cada celular aqui pelo PC e ver a Tela da TV reagindo ao vivo!

2. ARQUITETURA PRONTA PARA MULTIPLAYER (AUTORIDADE DA TV):
Mesmo rodando tudo junto neste arquivo de teste, programe o JavaScript separando claramente duas coisas:
- `tvState`: Um objeto central que guarda toda a verdade do jogo (tempo, rodada, pontos, status). Só a lógica da TV altera esse estado.
- `sendPlayerInput(playerId, payload)`: Uma função única por onde os controles dos celulares enviam suas ações para a TV, e uma função `renderPhones(tvState)` que atualiza o que aparece na tela de cada celular com base no estado da TV. (Isso permitirá plugar nosso motor de rede WebSocket em 5 minutos depois).

3. DESIGN E EXPERIÊNCIA (PADRÃO ACKER PLAY):
- Tudo 100% em Português do Brasil.
- Visual nível console/arcade: fundo escuro (#0a0c18 e #13172c), cores vibrantes de destaque (laranja neon #ff5e3a, amarelo #ffc837, verde #10b981, azul #3b82f6).
- Controles dos celulares extremamente simples e intuitivos: botões grandes, fáceis de tocar sem olhar para o celular, com feedback visual imediato.
- Fluxo completo de partida: Tela inicial/Lobby -> Contagem regressiva ou início -> Rodada ativa com cronômetro -> Tela de Vencedor/Placar -> Botão de "Jogar de Novo" (Revanche).

4. ENTREGA:
Gere todo o código em um único arquivo `index.html` funcional para que eu possa jogar e testar imediatamente na janela de visualização (Canvas).

---
A IDEIA DO JOGO QUE QUERO CRIAR AGORA É:
[ESCREVA AQUI A SUA IDEIA DE JOGO, QUANTOS JOGADORES, COMO FUNCIONA E COMO SE GANHA]
```
