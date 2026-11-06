# Mentira Convincente — continuidade (pausado em 06/11/2026)

O Claude começou este jogo e parou a pedido do Jacson. A continuação será feita pelo ChatGPT/Codex.

## O jogo (decidido)
- TV LG = tela da partida (autoridade). Celulares entram pelo QR Code, como em `jogo-lobisomem/`.
- 3 a 8 jogadores (bots completam). Cerca de 7 rodadas (opções 5/7/10). A última rodada vale o dobro.
- Rodada: a TV mostra uma curiosidade verdadeira com uma lacuna. Cada um escreve uma resposta FALSA no celular (cerca de 60 s).
  A TV mistura as mentiras com a verdade (todas em MAIÚSCULAS). Cada um escolhe no celular qual acha que é a verdade (cerca de 25 s; a própria mentira não aparece para quem a escreveu).
- Pontos: acertar a verdade = +1000. Cada pessoa que cai na sua mentira = +500 para você.
- Se houver menos de 4 opções, entram "mentiras da casa" (lista `falsas` do banco). Quem cai nelas não dá ponto a ninguém.
- Botão "🎲 Me dá uma ideia" no celular: sugere uma mentira pronta do banco.
- Revelação na TV: mostra cada mentira escolhida, quem caiu e de quem era a mentira. A verdade aparece por último. Depois vem o placar.
- No fim: pódio e prêmios ("Melhor mentiroso" = enganou mais gente, "Detetive" = acertou mais).
- TV leve (lição do PR #11): sem blur, sem backdrop-filter e sem mix-blend. Animações simples.
- Visual e nome originais. Não copiar o Fibbage (nome, arte e textos).

## Já feito (pasta `jogo-mentira/`)
- `js/auditoria.js`: correção das respostas, SEM IA paga e sem internet. Funciona no navegador e no Node.
  - `normalizar(texto, textoAntesDaLacuna)` faz o seguinte:
    - expande abreviações (vc→você, q→que, pq→porque, tbm→também, c/→com…);
    - põe acentos que faltam (nao→não, coracao→coração, incrivel→incrível…);
    - tira emojis, "kkkk", letras repetidas e a pontuação do fim;
    - tira o artigo repetido ("é o ___" + "o unicórnio" → "Unicórnio");
    - recusa palavrão, resposta vazia ou com mais de 40 letras.
  - `pareceVerdade(mentira, [resposta, ...aceitas])` recusa uma mentira igual ou parecida com a verdade (erro de digitação, plural, acento) ou que contenha a verdade.
  - `iguais(a, b)` recusa uma mentira repetida, igual à de outro jogador.
  - Testado à mão e funcionando. Ainda falta um arquivo de testes automáticos.
- `js/banco.js`: cerca de 270 curiosidades verdadeiras em PT-BR, em 11 categorias. Formato de cada linha:
  `[categoria, frase com ___, resposta, aceitas "a|b", falsas "x|y|z"]`.
  - Escolhi fatos conhecidos e conferíveis, mas não conferi um por um na internet. Vale revisar.
  - 6 mentiras prontas são parecidas demais com a verdade pelo critério da auditoria (ex.: "Molly" × "Dolly"). O jogo deve simplesmente pular essas na hora de usar.

## Falta fazer
1. `rede/rede.ts` → `js/rede.js`: copiar o de `jogo-lobisomem/rede/rede.ts` trocando o prefixo `lobos/` por `mentira/` e o plugin por `acker-mentira` (playerCap 8). Gerar com o esbuild da Corrida (`scripts/rede.mjs` do lobisomem serve de modelo).
   - Recomendo mandar ao celular um ESTADO em JSON e desenhar a tela no próprio celular, em vez de mandar HTML. Assim o campo de texto não é apagado a cada atualização.
2. `js/partida.js`: lógica pura (fases sala → escrever → escolher → revelar → placar → fim, pontos, opções embaralhadas, bots). Precisa de testes em `tests/`.
3. TV (`js/tv.js`, `js/main.js`): sala com QR, ajustes (rodadas, tempo, bots), relógio, revelação animada, placar e navegação pelo controle remoto (setas + OK, igual ao lobisomem).
   - Não repetir perguntas entre partidas: guardar os ids já usados no `localStorage` da TV.
4. Celular (`js/celular.js`, `js/controle.js`):
   - entrar com o nome;
   - escrever a mentira, com prévia "vai aparecer assim" (usar `auditoria.js`);
   - escolher a resposta;
   - ver os pontos e o botão "Jogar de novo".
5. `index.html` com 3 modos (TV, celular `?sala=`, simulador `?modo=pc`), `css/`, arte `arte/capa.svg` (3:4) e `arte/fundo.svg` (16:9).
6. `package.json` com `check` e `test`, `scripts/relay-local.mjs` (copiar do lobisomem) e README.
7. Central (`index.html` da raiz): um bloco novo na lista `JOGOS` com link `./mentira/`.
8. `.github/workflows/deploy.yml`: um passo para rodar check e test, e copiar a pasta para `_site/mentira/`.
9. Testar com TV e 2 celulares simulados (relay local) e só depois testar na TV LG de verdade.
