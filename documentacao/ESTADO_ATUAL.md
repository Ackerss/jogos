# Estado atual — 02/11/2026

## Entrega principal e plataforma unificada

**Portal de Jogos Online (GitHub Pages):** https://ackerss.github.io/jogos/  
**Atalho Rápido para Digitar na TV:** https://is.gd/ackerplay (ou apenas `is.gd/ackerplay`)  
**Corrida dos Toques Online:** https://ackerss.github.io/jogos/corrida/  
**Repositório Oficial:** https://github.com/Ackerss/jogos  
**Link redundante (ChatGPT Sites):** https://jogar.ackers.chatgpt.site (preservado)

Nome da plataforma: **ACKER PLAY — Jogos em Família (TV & Celular)**.
Versão do jogo Corrida dos Toques: 0.1.0.

O PC NÃO precisa permanecer ligado para jogar nenhuma dessas versões. TV e celulares carregam arquivos estáticos da hospedagem e usam o relay público Doot/CLASP (`wss://relay.clasp.to`).

---

## Colaboração entre IAs (Antigravity, Claude e Codex)

O projeto foi migrado para o repositório GitHub centralizado por solicitação do usuário para viabilizar o trabalho compartilhado entre **Antigravity (Gemini)**, **Claude** e **Codex (ChatGPT)**, alternando as IAs de acordo com o consumo/esgotamento de tokens.

### Regras de Operação:
1. **Uma IA por vez:** Sempre rodar `git pull` antes de alterar e `git commit` / `git push` ao finalizar a tarefa.
2. **Deploy 100% Automático:** Cada push na branch `main` executa `.github/workflows/deploy.yml` no GitHub Actions, rodando testes, compilação e deploy no GitHub Pages em ~30 segundos.
3. **Página Inicial (Portal de Jogos):** O arquivo `index.html` na raiz é o catálogo principal onde todos os novos jogos criados serão adicionados em lista/grid para seleção na TV.
4. **Privacidade Preservada:** Fotos e vídeos de testes reais na pasta `evidencias/` estão no `.gitignore` e permanecem estritamente locais no computador do usuário.

---

## Verificações concluídas até agora
- `npm.cmd run check`: passou.
- `npm.cmd run build`: passou.
- `npm.cmd test`: 5 testes passaram (corte de tempo, entradas duplicadas/fora de ordem/inválidas, empate, identificação da revanche e validação de snapshot).
- **GitHub Actions Workflow:** Executado com sucesso (ID `41533589163`, 32s de build e deploy).
- **HTTP 200 Confirmado:**
  - `https://ackerss.github.io/jogos/` (Portal principal)
  - `https://ackerss.github.io/jogos/corrida/` (Corrida dos toques)
- **Melhoria no Mobile aplicada:** `overscroll-behavior: none` e `touch-action: manipulation` aplicados no CSS do controle para prevenir saídas acidentais por gestos de "puxar para atualizar" ou "voltar" do navegador durante toques rápidos.
- **Botão de navegação:** Adicionado `‹ Jogos` no cabeçalho para retorno fluido ao catálogo.
- **Teste físico na LG (retorno de 02/11/2026):** Dois celulares conectados à TV LG física na sala pelo usuário com placares de 78×133 e 108×157 confirmados.

---

## Próximos passos
1. Jacson testar a nova experiência pelo link `https://ackerss.github.io/jogos/` na TV LG e celulares.
2. Confirmar se a proteção de gestos evitou a saída acidental no celular durante a corrida.
3. Decidir o próximo jogo a ser adicionado ao portal (Quiz em grupo, jogo de cartas, ou evolução gráfica da Corrida).
