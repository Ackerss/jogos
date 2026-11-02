# Estado atual — 02/11/2026

## Entrega principal

**Jogo ONLINE publicado:** https://jogar.ackers.chatgpt.site

Nome: ACKER — Corrida dos Toques. Versão do jogo: 0.1.0. Versão publicada no Sites: 1.

O PC NÃO precisa permanecer ligado para jogar essa versão. TV e celulares carregam arquivos estáticos da hospedagem e usam o relay público Doot/CLASP. Não foi contratado serviço pago nem fornecido cartão/chave de API nesta configuração. A manutenção depende das condições e disponibilidade dos serviços terceiros; não prometer gratuidade ou disponibilidade imutável no futuro.

## Para jogar ao voltar para casa
1. Na TV LG, abra `jogar.ackers.chatgpt.site` e escolha **CRIAR SALA NA TV**.
2. Cada pessoa escaneia o QR Code com o próprio celular e escolhe um nome diferente.
3. O primeiro jogador inicia pelo celular. Toquem no botão por 20 segundos após a contagem regressiva.
4. Vejam o vencedor na TV. Para repetir, usem **JOGAR DE NOVO** no celular que tiver esse botão.

Se o jogador que iniciou sair/recarregar, o comando de iniciar pode passar para o outro participante presente. A TV também tem botão. Se QR não for reconhecido, abrir o mesmo link no celular e entrar com o código da TV.

## Código e publicação verificados
- Plataforma Doot original: commit `0f78d6d11e7a7863cc9aa575ab2cfa39c5f6bd9b`.
- Fonte do jogo publicado: commit `1a2c9de8081f28be98571df49b28b071b3f1d684` em `jogo-corrida/`.
- Site project_id: `appgprj_6ae8af205f0c819198e36ecfd5883a4e`.
- Site version_id: `appgprj_6ae8af205f0c819198e36ecfd5883a4e~appgver_f49d1285f88c81919547e971150ec009`.
- Deployment: `appgdep_6ae8b483c98c8191bf80f3b11d5de10d`, status **succeeded**, informado pelo serviço em 02/11/2026.
- Acesso do novo jogo configurado como público, sem login, para uso por TV e celulares. A pasta de evidências não foi publicada.
- Artefato de publicação preservado em `publicacao-v001.tar.gz` nesta pasta. O serviço confirmou 5 arquivos/133120 bytes no artefato, incluindo manifesto e arquivos gerados.
- Requisição HTTP sem credencial recebeu 200, título do jogo presente e sem formulário de login.
- Servidor local da verificação foi encerrado antes de abrir a versão online.

## Verificações concluídas até agora
- `npm.cmd run check`: passou.
- `npm.cmd run build`: passou.
- `npm.cmd test`: 5 testes passaram (corte de tempo, entradas duplicadas/fora de ordem/inválidas, empate, identificação da revanche e validação de snapshot).
- Navegador com relay real: sala principal + dois controles em abas, placares independentes, partida completa de 7 a 4 e vencedor na tela.
- Recarregar controle: identidade e placar recuperados; transferência de comando ao participante presente observada.
- Recarregar tela principal: sala e resultado recuperados na mesma sessão.
- Layout da tela principal medido em 1280×720 com altura de página de 720, sem rolagem vertical após ajuste.
- Revanche: mesma sala, participantes preservados, pontos zerados; atualização dos dois controles repetida após corrigir conexão duplicada na integração.
- Versão ONLINE: partida completa com sala JT73, dois controles em abas e placar final **Online A 9 × Online B 5**, resultado correspondente nas três telas. Servidor local estava encerrado. Esses nomes/código são descartáveis da verificação, não uma sala para o usuário reutilizar.
- Controle online inspecionado em viewport 390×844, sem rolagem horizontal e com botão grande visível.
- Reconexão ONLINE: Online B recarregou, reentrou automaticamente e recuperou seus 5 pontos. Depois Online A iniciou revanche: as duas telas receberam a contagem de 3 segundos e pontos zerados, sem trocar de sala nem escanear QR novamente.
- A cópia local final do jogo foi conferida limpa em relação ao commit publicado. Nenhuma credencial de publicação foi persistida no arquivo de configuração Git.
- Integridade do motor: os 20 arquivos copiados foram comparados por SHA-256 com o clone original; todos iguais. Registro em `INTEGRIDADE_MOTOR_DOOT.json`.

Uma primeira implementação reaproveitava a mesma conexão para sondagem da sala e para `RoomRuntime.connect()`. A biblioteca abre um socket a cada connect, podendo deixar assinaturas em uma conexão anterior. Isso foi corrigido: a sondagem é encerrada e o runtime abre uma conexão própria uma única vez. O motor original não foi modificado.

## Validações pendentes / limites
- O usuário testou ESTE jogo próprio na TV LG com dois celulares: relatou que ambos conectaram e os toques funcionaram. As fotos mostram dois jogadores na sala e resultados de 133–78 e 157–108. O usuário estava operando os dois celulares; não foi confirmado teste com a esposa.
- Durante toques rápidos com vários dedos, um celular saiu do jogo e o usuário não conseguiu voltar como esperava. Ele suspeita de toque/gesto de voltar, mas a causa e a sequência exata não foram confirmadas. Não registrar reconexão física como aprovada; distinguir recarregar a mesma aba, voltar no navegador e apertar “Sair da sala”.
- Não houve medição independente de atraso, FPS, consumo ou sessão longa.
- Não houve teste físico de quatro celulares nem troca de Wi-Fi por dados móveis.
- A versão não funciona sem internet; o relay público é uma dependência real.
- Não é uma aplicação competitiva com autenticação/antifraude nem servidor autoritativo em nuvem: a TV é a autoridade da partida.

## Próximo passo
Investigar o retorno após saída acidental quando houver mais detalhes ou no próximo refinamento; não presumir a causa. Depois o usuário escolherá o jogo pessoal definitivo e a direção gráfica. Não reiniciar pesquisa de plataforma nem exigir novos testes de jogos de terceiros.
