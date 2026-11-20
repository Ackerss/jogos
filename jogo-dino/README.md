# Dino Pula-Pula — TV + celulares (v1.1.0)

Corrida de dinossauros para jogar em família, de 1 a 4 jogadores. Pensado para jogar com criança pequena (4 anos): um botão só, nada para ler e ninguém é eliminado.

- Online (depois do merge): https://ackerss.github.io/jogos/dino/
- Criado pelo Claude em 20/11/2026. Arte toda desenhada em código (dinos originais, sem imagens de outros jogos).

## Como se joga
1. Abra o jogo na TV. Cada um aponta a câmera do celular para o QR Code e escolhe o seu dino (Rex, Lili, Tuca, Bolota, Fofo ou Nina).
2. O primeiro que entrou toca **▶ Começar a corrida** (ou OK no controle da TV).
3. Cada dino corre na própria faixa. **Tocou no celular, o dino pula.** No ar, um segundo toque dá um **pulo duplo** (adulto).
4. Pule pedras, troncos, cactos e bonecos de neve. Pegue as frutas (a **maçã de ouro** vale 3). A **estrela** dá 6 s de arco-íris: o dino quebra os obstáculos e puxa as frutas.
5. Bateu? O dino tropeça, fica tonto um pouquinho e deixa cair até 3 frutas. Ninguém sai do jogo.
6. A corrida passa pela floresta, pelo deserto e pela neve até chegar ao **ninho**. No fim, todo mundo ganha um título (Mais frutas, Pulo de ouro, Superestrela, Pula-pula, Dino feliz).

Todas as faixas têm os mesmos obstáculos e frutas, então é justo para todos.

### 🧸 Modo criança (no celular de cada um)
- O jogo **acerta a hora do pulo**: pode tocar bem antes do obstáculo (até ~1,5 s) que o dino espera e pula na hora certa.
- Pulo mais alto e "flutuante" (alcança as frutas altas com um pulo só).
- **Não perde frutas** quando tropeça.
- A TV lembra quem é criança pelo nome (e o dino que cada um escolheu).

## Na TV (controle remoto: setas + OK)
- ⏱️ **Corrida:** curta (45 s), média (60 s) ou longa (90 s).
- 🐢 **Velocidade:** calma (padrão), normal ou rápida. Fica mais rápido aos pouquinhos durante a corrida.
- 🎮 **Controle da TV joga:** um jogador pode usar o **OK do controle remoto** como botão de pulo (adulto ou criança).
- 🎵 **Música** ligada ou desligada.
- No fim: **Correr de novo** (mesmos jogadores) ou **Trocar jogadores**. Voltar do controle = sair.
- Botões escondidos no canto de cima: **teste tv** (põe 2 robôs), **teste pc** (simulador) e **⛶** (tela cheia).

## Três modos da mesma página
| Endereço | Modo |
|---|---|
| `dino/` | TV oficial (QR Code + código) |
| `dino/?sala=ABCD` | Celular |
| `dino/?modo=pc&celulares=3&bots=1` | Simulador: TV e celulares na mesma tela (teclas 1 a 4 também pulam) |

Extra para testes: `?tempo=15` (corrida de 15 s).

## Arquivos
| Arquivo | Função |
|---|---|
| `js/mundo.js` | Regras puras: física do pulo, obstáculos, frutas, estrela, tombos, modo criança, robôs, títulos. Testado. |
| `js/arte.js` | Desenhos (dinos, obstáculos, frutas, ninho, cenários), guardados como figurinhas para ficar leve na TV. |
| `js/tv.js` | Tela da TV: palco 1280×720 escalado, pista em canvas, placas, sala, contagem e fim. |
| `js/main.js` | Diretor da corrida (roda na TV): sala, toques, laço de animação, telas dos celulares. |
| `js/celular.js` | Telas do celular (as mesmas no simulador). O pulo usa `pointerdown` (mais rápido que clique). |
| `js/controle.js` | Celular de verdade: entrar com nome e código, reconectar. |
| `js/simulador.js` | Conexão de mentira para o `?modo=pc`. |
| `js/som.js` | Sons e musiquinha gerados na hora (sem arquivos). |
| `rede/rede.ts`, `js/rede.js` | Conexão TV ↔ celulares (motor Doot, cópia da usada no Rabisco e nos Bichos). |
| `arte/` | Capa e fundo para a central. |

## Imagem na TV
O palco tem 1280×720, mas o desenho é feito com até 1,5× mais pixels quando a tela é Full HD (imagem nítida). Se a TV ficar lenta, o jogo volta sozinho para a resolução normal. Para forçar: `?res=1` ou `?res=1.5`.

## Atraso da internet
O toque vai do celular para a TV pelo relay. Para isso não atrapalhar: o pulo é longo, as caixas de batida são menores que o desenho, quem toca um pouco antes de cair pula assim que encosta no chão, e no modo criança o jogo acerta a hora sozinho. Os testes simulam 0,15 s de atraso.

## Verificar
```
npm run check         # sintaxe
npm test              # regras: pista igual com a mesma semente, robô perfeito nunca tropeça, modo criança, atraso, títulos, 300 corridas
npm run relay-local   # relay de teste: abra dino/?relay=ws://localhost:8796
```
