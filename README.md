# 🎮 ACKER PLAY — Jogos Multiplayer para TV LG & Celular

Plataforma aberta e 100% gratuita de jogos casuais multijogador para a família. A **TV da sala funciona como o tabuleiro/tela principal** e os **smartphones funcionam como os controles**, sem necessidade de baixar aplicativos, sem cadastros e sem custos.

🔗 **Link Oficial Online:** [https://ackerss.github.io/jogos/](https://ackerss.github.io/jogos/)  
⚡ **Atalho Curto para TV:** `is.gd/ackerplay` (digitação rápida no navegador da TV)  
🏁 **Primeiro Jogo (Corrida dos Toques):** [https://ackerss.github.io/jogos/corrida/](https://ackerss.github.io/jogos/corrida/)  

---

## 🕹️ Como Jogar na TV LG

1. Abra o navegador web da TV LG (webOS) e acesse: **`https://ackerss.github.io/jogos/`**
2. Escolha o jogo desejado (ex: **Corrida dos Toques**) e clique em **CRIAR SALA NA TV**.
3. Cada pessoa na sala aponta a câmera do celular para o **QR Code** exibido na tela da TV e digita seu nome.
4. O primeiro jogador toca em **COMEÇAR** no celular e a disputa começa!
5. Para jogar novamente, basta apertar **JOGAR DE NOVO** no celular (sem precisar ler o QR Code de novo).

---

## 🏗️ Arquitetura do Sistema

* **Hospedagem Estática e Gratuita:** Publicado via **GitHub Pages** através do workflow automatizado do GitHub Actions.
* **Comunicação em Tempo Real:** Motor de sincronização baseado no protocolo aberto **CLASP** (`wss://relay.clasp.to`), com WebSockets seguros e sem custos de servidor back-end.
* **Autoridade da Partida:** A TV LG é a autoridade central que comanda o tempo da rodada, calcula pontuações e decreta os vencedores. Os celulares enviam apenas toques/comandos de forma leve e cumulativa.
* **Tolerância a Oscilações de Rede:** Reconexão instantânea caso uma aba do celular seja recarregada ou sofra oscilação momentânea.

---

## 🤖 Guia de Colaboração para as IAs (Antigravity, Claude e Codex)

O proprietário deste projeto (**Jacson Acker**) trabalha em conjunto com três assistentes de IA: **Antigravity (Gemini)**, **Claude** e **Codex (ChatGPT)**, alternando entre elas conforme a necessidade e a disponibilidade de tokens.

### 📌 Regras de Ouro para as IAs:
1. **Uma IA por vez em cada tarefa:** Sempre realize `git pull` antes de iniciar uma alteração e faça um `git commit` claro ao terminar sua entrega.
2. **Deploy Automático:** Qualquer alteração enviada na branch `main` dispara o workflow `.github/workflows/deploy.yml`, que roda os testes e atualiza o GitHub Pages automaticamente em menos de 1 minuto.
3. **Preservar Testes e Tipos:** Em `jogo-corrida/`, sempre garanta que `npm run check`, `npm run build` e `npm test` estejam passando sem falhas.
4. **Privacidade:** NUNCA faça commit de capturas de tela pessoais ou fotos de testes na TV para o repositório público (manter tudo restrito à pasta local `evidencias/`).
5. **Estrutura de Novos Jogos:** Para adicionar novos jogos, crie uma subpasta dentro de `jogos/<nome-do-jogo>` com seu próprio build, adicione um bloco na lista `JOGOS` no começo do script do `index.html` (o cartão e o destaque são montados sozinhos) e mapeie a pasta no `.github/workflows/deploy.yml`.

---

## 📁 Estrutura do Repositório

```text
├── index.html                  # Portal / Launcher principal com o catálogo de jogos
├── portal.css                  # Estilos do portal (otimizado para TV e Mobile)
├── jogo-corrida/               # Jogo 1: Corrida dos Toques (TypeScript + esbuild + Doot engine)
│   ├── src/                    # Lógica da partida e integração
│   ├── public/                 # HTML/CSS da Corrida
│   ├── tests/                  # Testes automatizados de lógica
│   └── vendor/doot-engine/     # Motor real de sincronização em tempo real (licença MIT)
├── .github/workflows/          # Automação de deploy para o GitHub Pages
└── documentacao/               # Relatórios de arquitetura, testes e histórico de evolução
```

---

## 🚀 Catálogo de Jogos em Desenvolvimento

- [x] **Corrida dos Toques (v0.1.0):** Disputa de reflexo e velocidade para 1 a 4 jogadores (20 segundos).
- [ ] **Quiz & Desafio da Família:** Perguntas na TV com votação secreta pelo celular.
- [ ] **Truco & Blefe:** Mesa na TV da sala com cartas ocultas na mão no celular.
