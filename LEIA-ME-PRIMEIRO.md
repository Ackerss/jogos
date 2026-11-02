# ACKER — Jogos multiplayer para TV LG

Decisão atual: Doot como base de comunicação. Plataforma unificada de jogos para a família: **ACKER PLAY**.
Primeiro jogo próprio: **Corrida dos Toques**, em português, para 1 a 4 pessoas.

## Links Oficiais

* **Portal de Jogos (Página Principal):** **https://ackerss.github.io/jogos/**
* **Jogo Direto (Corrida dos Toques):** **https://ackerss.github.io/jogos/corrida/**
* **Repositório de Código:** **https://github.com/Ackerss/jogos**
* *(O link alternativo do ChatGPT Sites `https://jogar.ackers.chatgpt.site` continua ativo para redundância).*

## Como jogar

1. Abra **https://ackerss.github.io/jogos/** no navegador da TV LG (salve nos Favoritos!).
2. Clique no jogo **Corrida dos Toques** e selecione **CRIAR SALA NA TV**.
3. Cada pessoa escaneia o QR Code com o próprio celular e escolhe um nome diferente.
4. O primeiro jogador toca em **COMEÇAR CORRIDA** no celular.
5. Depois da contagem regressiva, toque no botão por 20 segundos. Quem fizer mais toques vence; empates são possíveis.
6. O primeiro jogador pode selecionar **JOGAR DE NOVO**, sem precisar escanear novamente.

Se a câmera não reconhecer o QR: abra o mesmo endereço do jogo no celular, selecione entrar com código e digite as quatro letras/números mostrados na TV.

TV e celulares precisam de internet. Na versão online, não precisam estar na mesma rede e o PC pode estar desligado. O navegador da TV deve ficar aberto durante a partida: a TV executa o jogo e apura o placar.

## Onde está cada coisa

| Pasta/arquivo | Conteúdo |
|---|---|
| `index.html` e `portal.css` | Portal inicial dos jogos da família para TV e celular |
| `jogo-corrida/` | Fonte da Corrida dos Toques, dependências, testes e motor Doot isolado |
| `.github/workflows/deploy.yml` | Automação de deploy para o GitHub Pages a cada commit |
| `documentacao/` | Histórico, testes físicos, arquitetura e continuidade entre Antigravity, Claude e Codex |
| `plataforma-doot/` | Base original completa do Doot para consulta e evolução futura |
| `evidencias/` | Capturas fornecidas pelo usuário e fotos de testes físicos (mantidas estritamente locais) |
| `INICIAR_LOCAL.bat` | Alternativa local para desenvolvimento; não é necessária para jogar online |


Esta é a primeira versão de teste do nosso próprio jogo. Os testes físicos dos dois jogos de terceiros não equivalem a validar automaticamente este novo jogo na LG. Não foi prometido funcionamento perfeito em qualquer navegador ou rede.
