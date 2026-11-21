# Kart Acker TV · Turbo Kart 3D (v2.0)

> **Para outras IAs / documentação completa do pedido original e regras técnicas**: leia primeiro [HISTORICO_E_PEDIDOS.md](./HISTORICO_E_PEDIDOS.md).

Jogo de corrida de kart 3D realista feito em Three.js + Vite com reflexos PBR, iluminação ensolarada, curvas inclinadas, rampa de salto, cubos metálicos `?` sólidos com itens (Banana, Tartaruga e Turbo) e 3 bots competitivos.

## Versão 2.0: multiplayer TV + celulares (Claude, 21/11/2026)
Endereço: **https://ackerss.github.io/jogos/kart/** (fica na pasta "Jogos testes" da central).

- **TV** (`./kart/` aberto na TV ou no PC): mostra o QR Code e o código da sala. Durante a corrida vira uma
  **transmissão ao vivo** (câmera que troca sozinha entre os pilotos, placar de posições, avisos de batida)
  ou o **mapa de cima** (botão "TV: Câmera ao vivo / Mapa"). Se a TV ficar lenta, ela troca para o mapa sozinha.
- **Celular** (lê o QR ou abre `./kart/?sala=CÓDIGO`): cada um pilota o próprio kart em 3D na tela do celular,
  deitado. Escolhe nome e cor; "Modo criança 🧸" acelera sozinho e deixa só ◀ ▶ e o botão de item.
- **Robôs** completam até 4 karts (Fácil / Normal / Difícil / Nenhum). Sem ninguém no celular, "Começar" faz uma corrida de demonstração.
- `?modo=solo` = jogo original de 1 jogador. `?modo=tv` força a TV. `&relay=ws://localhost:8790` = teste local.

### Como funciona por dentro (para outras IAs)
- `rede/rede.ts` → compilado em `public/rede.js` (`npm run rede`, precisa de `../jogo-corrida/node_modules`). Motor Doot/CLASP, prefixo `kart`.
- Cada celular é dono da física do próprio kart e publica o estado 10×/s (`kart/k/<pid>`). A TV roda os robôs e publica `kart/bots`.
  Os outros karts são previstos (`preverEstado`) e suavizados. Relógio sincronizado com a TV (`criarRelogio`), largada no mesmo instante.
- Itens: quem joga a banana/casco avisa todos (`kart/ev/<aparelho>`); quem é atingido decide o acerto e avisa.
- A TV é a juíza: monta o grid (`montarGrid`), decide quando acaba (`corridaAcabou`) e manda o resultado.
- Peças sem 3D em `src/net/multi.js` (testes: `npm test`). Telas: `src/ui/tv.js` e `src/ui/celular.js`.

## Controles
- **WASD / Setas / Gamepad**: Acelerar, frear/ré e esterçar
- **Espaço** (ou `X` / `RB` no Gamepad): Drift nas curvas (solte após carregar faíscas para ganhar Mini-Turbo)
- **Shift / E** (ou `Y` / `LB` no Gamepad): Usar item coletado
- **T** (ou `Select` no Gamepad): Voltar à pista
- **Esc / P** (ou `Start`): Pausa
- **R**: Reiniciar a corrida
- **No menu**: ◀ ▶ escolhe Fácil / Normal / Difícil, Enter começa
- **Largada turbo**: comece a acelerar logo depois do "1"
- **Botão 🔊 no HUD**: Ativar/desativar som arcade

## Novidades da versão 1.1 (Claude, 21/11/2026)
Largada 3-2-1 com semáforo, largada turbo, 3 níveis (Fácil para crianças), aviso de volta e última volta, contramão + voltar à pista, pausa, roleta do item, confete e tabela de chegada, marcas de pneu, poeira, linhas de velocidade e câmera que treme. Detalhes em `HISTORICO_E_PEDIDOS.md`.

## Como Executar
- **Modo rápido (sem instalar nada)**: dê duplo clique em `INICIAR_JOGO.bat` (usa Python para servir a pasta `dist/` em `http://127.0.0.1:5173`) ou sirva a pasta `dist/` em qualquer servidor web / portal da TV LG.
- **Modo desenvolvimento**:
  ```bash
  npm install
  npm run dev
  ```
- **Gerar build de produção**:
  ```bash
  npm run build
  ```

## Estrutura do Projeto
- `HISTORICO_E_PEDIDOS.md` — Pedidos originais do usuário, decisões técnicas e guia para outras IAs
- `index.html` — Interface, HUD em PT-BR e telas de largada/chegada
- `src/main.js` — Cena 3D, céu com sol, mapa de reflexos PBR (`PMREMGenerator`), câmera chase, áudio arcade e Gamepad
- `src/track/TrackSystem.js` — Circuito fechado, curvas inclinadas, rampa, guard-rails com colisão, pórtico `LARGADA / CHEGADA`, arquibancadas, torres de refletores e vegetação leve em `InstancedMesh`
- `src/kart/KartSystem.js` — Modelagem PBR automotiva dos karts/bots, suspensão mola-amortecedor, drift com faíscas, faróis/lanternas LED e física de rampa
- `src/items/ItemAndAISystem.js` — Cubos `?` sólidos metálicos com coleta contínua, Banana, Casco de Tartaruga, Turbo e IA competitiva
- `dist/` — Versão compilada pronta para rodar
