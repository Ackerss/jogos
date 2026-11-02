# Validação do protótipo próprio

Data: 02/11/2026. Versão 0.1.0, publicação Sites v1.

## Lógica e compilação
Verificação TypeScript, build e 5 testes de lógica passaram. Não se trata de certificação de TV ou teste de todas as condições de rede.

## Navegador — relay real
1. Versão local, tela principal + dois controles em abas.
2. Primeira corrida: 7 a 4, vencedor correto na TV e nos controles.
3. Controle recarregado: nome e placar recuperados; comando passou ao participante presente.
4. Tela principal recarregada: sala e resultado recuperados na mesma sessão.
5. Revanche revelou falha de conexão duplicada na primeira integração. Causa verificada no código instalado do CLASP: `connect()` cria novo socket, sem deduplicação. Correção isolou sondagem e conexão do runtime, sem alterar o motor original.
6. Revanche repetida: pontos zerados, mesmo código, ambos controles receberam a nova corrida.
7. Layout 1280×720: altura de página medida em 720 após correção de espaço do QR; sem rolagem vertical.

## Publicação online
- Endpoint público retornou HTTP 200 sem credencial e sem formulário de login.
- Servidor local encerrado antes da verificação online.
- Sala de verificação JT73: Online A e Online B entraram, iniciaram pelo controle, pontuaram 9 e 5 e receberam o resultado correto. Nenhum servidor do PC participou dessa partida.
- Controle inspecionado em 390×844, sem rolagem horizontal.
- Online B recarregado: recuperou nome, sala e os 5 pontos sem digitação adicional. A revanche iniciada por Online A foi recebida pelos dois controles com contagem de 3 s e pontuação zerada na mesma sala.

## Teste físico informado pelo usuário
Em 02/11/2026 o usuário informou ter conectado e operado dois celulares com a TV LG. As imagens mostram jogadores Jacson1 e Ana2 em uma sala e placar de 78 a 133, além de outra imagem com Jacson3 e Ana2 e placar de 108 a 157. O usuário relatou comandos funcionando. Ele próprio operava os dois celulares; não atribuir o teste à esposa.

O usuário relata que um celular saiu durante toques rápidos e que teve dificuldade para voltar. Ele suspeita de ter acionado voltar, sem certeza. O fato de aparecerem nomes Jacson1 e Jacson3 não comprova a causa nem o procedimento usado. As capturas dessa rodada foram preservadas em `../evidencias/` com seus nomes originais.

## Ainda não observado
Reconexão física após saída acidental, esposa como jogadora, quatro celulares simultâneos, sessão longa, retomada após reinício total da TV, alternância de Wi-Fi/dados móveis, métricas de latência e FPS. Nenhum desses itens deve ser registrado como aprovado por inferência.

## Nota sobre evidências
As cinco capturas originais fornecidas pelo usuário foram copiadas para `../evidencias/`. São as evidências físicas de HexStacker e Doot/Pit Party. As telas do protótipo foram inspecionadas pela IA no navegador; o registro textual acima contém o resultado observado e a versão publicada. A hospedagem também gerou uma imagem da página inicial publicada, preservada localmente em `../evidencias/JOGO_PROPRIO_PUBLICADO_v001.png`. Essa prévia não é foto de teste físico na LG.
