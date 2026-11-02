# Continuidade no Antigravity / Claude / Codex

## Visão Geral da Parceria entre as IAs
O usuário Jacson Acker utiliza três IAs (**Antigravity**, **Claude** e **Codex**) neste repositório. Quando os créditos/tokens de uma terminam, ele transfere o trabalho para outra. Todas as três devem:
1. Trabalhar no mesmo repositório Git: `https://github.com/Ackerss/jogos`.
2. Respeitar o princípio de **uma IA por vez**: antes de começar, dar `git pull`; ao concluir, dar `git commit` e `git push`.
3. O deploy é 100% automático via GitHub Actions a cada commit na branch `main`.

## Links Oficiais
- **Portal de Jogos:** `https://ackerss.github.io/jogos/`
- **Corrida dos Toques:** `https://ackerss.github.io/jogos/corrida/`
- **Repositório GitHub:** `https://github.com/Ackerss/jogos`
- **Link do ChatGPT Sites:** `https://jogar.ackers.chatgpt.site` (mantido como backup)

## Ideias futuras: ler como rascunho, não como tarefa aprovada

Consultar [RASCUNHO_IDEIAS_JOGOS.md](RASCUNHO_IDEIAS_JOGOS.md), registrado a pedido do usuário em 02/11/2026. O documento reúne sete propostas, com Lobisomem de Uma Noite como possível primeiro protótipo, seguido de Caverna e Arena. Todas as prioridades, nomes, regras e propostas de bots são revisáveis. O texto de ideias não é código para integrar e não autoriza começar a desenvolver, mudar cards ou publicar. Aguardar a escolha do usuário.

## Arquitetura e Novos Jogos
- **Portal Principal (`index.html` e `portal.css`):** Serve como menu/launcher de jogos para a TV LG e mobile. Novos jogos criados devem ser adicionados como cards nessa página.
- **Jogos Individuais (`jogo-corrida/`, futuros `jogos/<nome>/`):** Cada jogo é uma aplicação estática leve que roda na TV e nos celulares. A comunicação multiplayer usa o relay gratuito do Doot/CLASP (`wss://relay.clasp.to`), onde a TV é a autoridade central da partida.
- **Workflow de Deploy (`.github/workflows/deploy.yml`):** Compila os jogos com `npm run build` e agrupa tudo na pasta `_site` para o GitHub Pages.

## Quando o Usuário Colar o Código de um Novo Jogo (Criado no Chat)
O usuário utiliza o prompt de `PROMPT_CRIAR_JOGOS_NO_CHAT.md` para testar ideias de jogos gratuitamente no Gemini/ChatGPT Canvas. O código que ele colar virá como um HTML único com um simulador de TV + celulares.
Quando ele colar esse código aqui, sua missão como IA é:
1. Extrair a lógica do jogo (`logic.ts`), a tela da TV e os controles dos celulares (`main.ts` / CSS).
2. Criar a pasta do novo jogo (ex: `jogos/<nome-do-jogo>/`) reutilizando o motor de rede CLASP/Doot (`vendor/doot-engine`).
3. Adicionar o card do novo jogo como "DISPONÍVEL AGORA" na página inicial (`index.html`) e apontar o botão para a pasta do jogo.
4. Adicionar a etapa de build do novo jogo em `.github/workflows/deploy.yml`.
5. Rodar os testes, fazer `git commit`, `git push` e entregar o link atualizado ao usuário!

## Reconstrução Local e Testes
Na pasta `jogo-corrida`:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run build
npm.cmd test
```

Só depois, para conferir localmente:

```powershell
npm.cmd start
```

Abra `http://localhost:8787`. Para celulares na LAN, o servidor imprime o IP local. Esse IP pode mudar; não gravá-lo como URL online definitiva. A versão estática pode ser hospedada em outro provedor gratuito preservando a mesma arquitetura, se for necessário no futuro.

## Publicação
O ID existente do Site está em `../jogo-corrida/.openai/hosting.json`. Preservar; não criar novo site. A credencial de Git do Sites é temporária e NÃO está no projeto. Não inventar token nem pedir ao usuário que exponha senhas. No Codex, usar as ferramentas oficiais do Sites e seu helper de publicação. No Gemini, se essas ferramentas não estiverem disponíveis, editar e gerar localmente e devolver o código ao Codex para publicar; não afirmar que publicou.

Não subir `../evidencias`, `../documentacao` ou dados privados para resolver a publicação. A raiz publicável é SOMENTE `jogo-corrida/`; o artefato servido é `dist/`.

## Validação que importa
- Dois participantes diferentes pontuam separadamente e aparecem na TV.
- Contagem regressiva não aceita toques prematuros.
- Encerra em 20 s e resultado não muda após o corte.
- Revanche inicia pelo primeiro celular, zera os pontos e preserva a sala.
- Nome repetido não cria participante fantasma; reconexão preserva identidade.
- Tela da TV cabe sem rolagem em 1280×720 e funciona em 1920×1080; celular fica legível em 390×844.
- Registrar as validações locais/browser separadas da validação física futura da LG.

Não fazer testes de carga no relay público. Não atualizar o motor copiado sem primeiro ler sua origem e verificar API; ele foi congelado para reduzir mudanças simultâneas.

## Depois do primeiro retorno do usuário
Recolher somente o necessário: entrou no link, QR conectou, os dois jogadores pontuaram, partida terminou, revanche funcionou. Se houver falha, pedir a tela/etapa concreta. Depois disso o usuário escolherá o jogo pessoal definitivo e a direção gráfica. Não presumir agora corrida 3D, franquias, personagens ou compras.
