# Rabisco sem Fio — TV + celulares (v1.0.0)

O telefone sem fio desenhado, para 3 a 10 jogadores. A TV é o palco; cada um joga pelo próprio celular.

- Online (depois do merge): https://ackerss.github.io/jogos/rabisco/
- Criado pelo Claude em 19/11/2026.

## Como se joga
1. Cada um entra pelo QR Code e **desenha o próprio rosto** (vira o avatar na TV).
2. **Etapa 1:** todos escrevem uma frase maluca (ou tocam numa das sugestões: são 224).
3. Cada frase vai para o próximo da roda, que **desenha**. O seguinte vê só o desenho e **adivinha**. E assim vai, alternando, até o livro passar por todo mundo.
4. **Revelação:** a TV abre livro por livro. Cada página aparece ao lado da anterior ("Ana recebeu isto → e desenhou isto"), os desenhos são refeitos traço por traço e a voz do aparelho lê as frases. No fim de cada livro: "Começou assim → Terminou assim" e a tira completa.
5. **Pódio** com prêmios e "Jogar de novo".

### Pontos
- 💡 **Acertou:** o palpite pegou a ideia da frase que o desenho mostrava → +2 para quem desenhou e +2 para quem adivinhou (aceita sem acento, plural, "surfando/surfista"...).
- 🎉 **Chegou inteiro:** a última frase do livro bate com a primeira → +3 para todos do livro.
- **Reações** 😂 🎨 🤯 pelo celular durante a revelação → +1 para quem fez a página (uma de cada por pessoa).
- Prêmios: Rei da Risada, Mão de Artista, Mestre da Confusão, Olho de Águia.

### Desafios surpresa (ajuste "Desafios", ligado por padrão)
Em cada etapa de desenho, cerca de 1 em cada 3 recebe um: 🙈 **Às cegas** (não vê o que desenha), ✍️ **Traço único**, ⚡ **Relâmpago** (25 s) ou 🫨 **Tremedeira**. A TV anuncia quem pegou o quê, e na revelação o desenho mostra o selo do desafio.

## Na TV (controle remoto: setas + OK)
- Ajustes guardados na TV: ⏱️ tempo de desenho (60/90/120 s), 🎲 desafios, 🗣️ voz lendo as frases.
- O primeiro que entrou é o **chefe da sala**: pode começar e "jogar de novo" pelo celular. A TV também começa com OK.
- Na revelação, **OK** passa a página; o dono do livro também passa pelo celular.
- Botões escondidos no canto de cima: **teste tv** (põe 3 bots), **teste pc** (simulador) e **⛶** (tela cheia).

## Três modos da mesma página
| Endereço | Modo |
|---|---|
| `rabisco/` | TV oficial (QR Code + código) |
| `rabisco/?sala=ABCD` | Celular |
| `rabisco/?modo=pc&bots=3&celulares=2` | Simulador: TV e celulares na mesma tela, com bots |

## Arquivos
| Arquivo | Função |
|---|---|
| `js/partida.js` | Regras puras: roda dos livros, entregas, pontos, prêmios, desafios. Testado. |
| `js/traco.js` | Desenho: formato compacto para a rede, prancheta do celular, desenho traço por traço na TV. |
| `js/frases.js` | 224 frases sugeridas. |
| `js/bots.js` | Bots de teste (rabiscos simples, palpites e rostos). |
| `js/main.js` | Diretor da partida (roda na TV): fases, tempos, telas de cada celular. |
| `js/tv.js` | Telas da TV. |
| `js/celular.js` | Telas do celular (as mesmas no simulador). |
| `js/controle.js` | Celular de verdade: entrar com nome e código, reconectar. |
| `js/simulador.js` | Conexão de mentira para o `?modo=pc`. |
| `js/som.js` | Efeitos sonoros gerados na hora e a voz (do próprio aparelho) que lê as frases. |
| `rede/rede.ts`, `js/rede.js` | Conexão TV ↔ celulares (motor Doot, cópia da usada no Grande Prêmio dos Bichos). |
| `arte/` | Capa e fundo para a central. |

Pela rede, um desenho vira texto curto (no máximo ~36 KB, abaixo do limite de 58 KB do relay). O celular manda rascunhos a cada 3,5 s, então ninguém perde o desenho se o tempo acabar; se recarregar a página, o desenho volta.

## Verificar
```
npm run check   # sintaxe
npm test        # regras, formato do desenho, bots e 200 partidas simuladas
npm run relay-local   # relay de teste: abra rabisco/?relay=ws://localhost:8795
```
