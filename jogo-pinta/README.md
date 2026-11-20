# Pinta-Chão dos Bichos — TV + celulares (v1.0.0)

Jogo de andar e pintar para jogar em família, de 1 a 4 jogadores. Pensado para criança pequena (4 anos): 4 setas gigantes no celular, nada para ler, ninguém é eliminado.

- Online: https://ackerss.github.io/jogos/pinta/
- Testar no PC (TV e celulares na mesma tela): https://ackerss.github.io/jogos/pinta/?modo=pc
- Criado pelo Claude em 20/11/2026. Arte toda desenhada em código (bichinhos originais, sem imagens de outros jogos).

## Como se joga
1. Abra o jogo na TV. Cada um aponta a câmera do celular para o QR Code e escolhe um bichinho (Mimi, Pingo, Piu, Sapeca, Lulu ou Foguinho).
2. Enquanto todos entram, já dá para **treinar**: no celular, "🎮 Treinar as setas" e o bichinho anda na TV.
3. O primeiro que entrou toca **▶ Começar** (ou OK no controle da TV).
4. O celular vira **4 setas gigantes**. O bichinho anda para o lado da seta e **continua andando sozinho** até a próxima seta, pintando o chão com a sua cor. Pode tocar ou deslizar o dedo.
5. Itens: **🪣 balde** (pinta uma área grande de uma vez), **🖌️ pincel gigante** (pinta mais largo por 6 s) e **⚡ raio** (corre mais por 5 s). Eles aparecem mais perto de quem está perdendo.
6. No fim, todo mundo ganha um título (Mais tinta, Pegou mais itens, Pé ligeiro, Pinta por cima, Lava-porquinho...).

### Modos (escolha na TV)
- **🏆 Cada um por si:** quem tiver mais chão da sua cor no fim ganha. Pintar por cima da cor do outro vale!
- **👥 Equipes:** Time Rosa x Time Azul. Cada um escolhe o time no celular.
- **🤝 Todos juntos:** todos contra o relógio. Porquinhos de lama andam sujando o chão; encoste neles para lavar. Ganham até 3 estrelas (a meta muda com o número de jogadores).

### 🧸 Modo criança (no celular de cada um)
- Pinta **3 quadradinhos de largura** (o adulto pinta 1).
- **Vira sozinho** quando bate na parede (nunca fica parado).
- Pega os itens de mais longe.
- A TV lembra quem é criança pelo nome.

## Na TV (controle remoto: setas + OK)
- Jogo (modo), ⏱️ tempo (curto 45 s, médio 60 s, longo 90 s), 🐢 velocidade (calma é o padrão), 🎮 controle da TV joga (não / sim / criança), 🎵 música.
- Cenários Jardim, Neve e Lua, trocando a cada partida.
- No fim: **Jogar de novo** ou **Trocar jogadores**. Voltar do controle = sair.
- Botões escondidos no canto de cima: **teste tv** (põe 2 robôs), **teste pc** (simulador) e **⛶** (tela cheia).

## Três modos da mesma página
| Endereço | Modo |
|---|---|
| `pinta/` | TV oficial (QR Code + código) |
| `pinta/?sala=ABCD` | Celular |
| `pinta/?modo=pc&celulares=3&bots=1` | Simulador: TV e celulares na mesma tela (teclado: WASD, IJKL e TFGH) |

Extras para testes: `?tempo=15` (partida de 15 s), `?jogo=equipes` ou `?jogo=juntos`, `?res=1` (força a resolução normal na TV).

## Arquivos
| Arquivo | Função |
|---|---|
| `js/mundo.js` | Regras puras: chão em quadradinhos (24×12), andar e fazer curva, pintar, itens, porquinhos, robôs, resultado. Testado. |
| `js/arte.js` | Desenhos (bichinhos de frente e de costas, itens, porquinho, obstáculos, cenários), guardados como figurinhas. |
| `js/tv.js` | Tela da TV: palco 1280×720 escalado, chão e tinta em canvas, placar no topo, sala, contagem e fim. |
| `js/main.js` | Diretor do jogo (roda na TV): sala, treino no lobby, setas, laço de animação, telas dos celulares. |
| `js/celular.js` | Telas do celular (as mesmas no simulador). As 4 setas são uma área só: vale a direção do dedo. |
| `js/controle.js` | Celular de verdade: entrar com nome e código, reconectar. |
| `js/simulador.js` | Conexão de mentira para o `?modo=pc`. |
| `js/som.js` | Sons e musiquinha gerados na hora (sem arquivos); a música acelera nos últimos 10 s. |
| `rede/rede.ts`, `js/rede.js` | Conexão TV ↔ celulares (motor Doot, cópia da usada no Dino e no Rabisco). |
| `arte/` | Capa e fundo para a central. |

## Leve para a TV
A tinta é desenhada uma vez numa camada própria (só muda o quadradinho que foi pintado); cenário e bichinhos são figurinhas prontas. O desenho usa até 1,5× mais pixels em TV Full HD e volta sozinho para o normal se ficar lento.

## Verificar
```
npm run check         # sintaxe
npm test              # regras: curvas, paredes, placar = chão pintado, balde, poderes, porquinhos, 300 partidas de robôs, criança x adulto
npm run relay-local   # relay de teste: abra pinta/?relay=ws://localhost:8797
```
