# Rascunho de ideias de jogos — ACKER PLAY

Registro em 02/11/2026, a pedido do usuário, a partir de uma seleção sugerida pelo Codex que ele achou interessante.

**STATUS: RASCUNHO PARA DISCUSSÃO. Nada nesta lista é decisão definitiva, especificação aprovada ou autorização para iniciar desenvolvimento.** Nomes, ordem, regras, quantidade de jogadores, duração, visual e bots podem mudar. Mesmo as expressões de prioridade do texto de origem devem ser lidas como sugestões provisórias, conforme o pedido mais recente do usuário.

## Orientação para Antigravity (Gemini), Claude e Codex

- Consultar este documento ao discutir próximos jogos.
- Não começar protótipos, criar jogos, alterar cards do portal ou publicar funcionalidades com base somente neste rascunho. Aguardar o usuário escolher o próximo trabalho.
- O texto fornecido contém ideias e avaliações de outra conversa, não código de jogo a integrar.
- As referências a jogos comerciais explicam a proposta; não são autorização para copiar artes, personagens, marcas ou arquivos.
- Quantidades e tempos abaixo são referências do texto ou estimativas de proposta, não resultados de testes. Regras de jogos originais, desempenho e qualidade dos bots não foram verificados neste registro.
- Nenhum dos jogos ou bots desta seleção foi implementado ou testado nesta tarefa. A Corrida dos Toques continua sendo o jogo existente.

## Perfil de experiência em consideração

- Jogos para adultos e adolescentes, com estratégia, blefe, dedução, cooperação ou decisões interessantes, sem exigir longa explicação.
- Simplicidade nos controles e no aprendizado, sem necessidade de infantilizar a experiência.
- Grupo habitual de 3 a 4 pessoas, com possibilidade de mais participantes quando houver visitas.
- TV como tela compartilhada e autoridade da partida; celulares como controles e telas privadas para cartas, poderes, pistas e decisões secretas.
- Bots, quando fizer sentido, para completar a mesa e permitir experimentar sozinho antes de reunir a família. Sua utilidade varia conforme a mecânica.
- Manter a direção técnica existente: acesso online gratuito, sem PC ligado, motor Doot/CLASP e entrada por QR/código. Eventual implementação deve seguir AGENTS.md.
- Prototipagem no ChatGPT/Gemini Canvas, conforme PROMPT_CRIAR_JOGOS_NO_CHAT.md, continua sendo o caminho previsto para explorar ideias antes da integração.

## Seleção e ordem sugerida — revisáveis

| Ordem sugerida | Ideia | Encaminhamento provisório |
| --- | --- | --- |
| 1 | Lobisomem de Uma Noite | Candidato a primeiro protótipo |
| 2 | Expedição Maldita — A Caverna | Experimentar a mecânica |
| 3 | Arena dos Monstros | Experimentar versão simplificada |
| 4 | Ponte do Desespero | Manter na seleção |
| 5 | Desenho Impossível | Manter e avaliar se a mecânica é divertida |
| 6 | O Cofre Misterioso | Manter na seleção |
| 7 | Cidade das Máscaras | Possível segunda etapa, simplificada |
| Futuro | Citadels | Referência reservada para depois |
| Sem prioridade por enquanto | Coup e Skull | Deixar fora da seleção inicial |

Outros jogos de cartas mencionados na conversa de origem permanecem possibilidades futuras, sem nomes adicionais registrados aqui.

## 1. Lobisomem de Uma Noite

**Blefe e dedução; referência de 3–10 jogadores e cerca de 10 minutos.** Inspiração: One Night Ultimate Werewolf. A preferência sugerida é explorar primeiro a experiência básica, antes de acrescentar personagens ou poderes próprios.

- Uma noite e uma votação, sem narrador humano obrigatório e sem eliminação antecipada deixando alguém esperando.
- TV com vila e avatares; cada celular recebe informações secretas.
- Exemplo inicial de quatro assentos: dois Lobisomens, um Vidente, um Ladrão, um Encrenqueiro e dois Aldeões, distribuindo quatro cartas aos jogadores e deixando três no centro. Composição ainda sujeita a conferir quando houver implementação.
- Lobisomens reconhecem o parceiro; Vidente consulta uma carta de jogador ou duas do centro; Ladrão pode trocar a própria carta e ver o que recebeu; Encrenqueiro troca cartas de outros dois sem olhar; Aldeão participa da dedução.
- Informação obtida durante a noite pode deixar de corresponder ao papel final após as trocas. Preservar essa distinção na lógica e nas explicações.
- Fluxo proposto: lobby → noite e poderes secretos → discussão de 3–5 minutos → votação secreta → revelação das cartas iniciais, trocas e resultado → revanche.
- Possível animação das trocas somente após a votação.
- Simulador sugerido com quatro assentos alternáveis entre humano e bot; permitir um humano e três bots, controlando apenas seu próprio celular.
- Bots com comportamentos distintos (desconfiado, mentiroso, cauteloso), capazes de agir, blefar, levantar suspeitas e votar, sem acesso a segredos que seu personagem não poderia conhecer. Falas prontas podem ajudar a interação no teste solo.
- Narração provisória sem serviço externo; futuramente avaliar áudios gerados e baixados pelo usuário, por exemplo no ElevenLabs. Não pressupõe contratar ou integrar serviço. No HTML único, incorporar os áudios ou usar narração provisória; depois avaliar arquivos separados.
- Votação, empates, condições de vitória, ordem exata dos poderes e tratamento de ausência de lobisomens ainda precisam ser definidos e conferidos. Este resumo não é um regulamento completo.

## 2. Expedição Maldita — A Caverna

**Risco e recompensa; proposta de 3–8 jogadores e 10–15 minutos.** Inspiração de mecânica: Diamant.

- Exploradores encontram diamantes, tesouros e perigos na TV.
- A cada etapa, todos escolhem secretamente no celular entre avançar para arriscar mais ou voltar para guardar o ganho.
- Referência de risco: repetir um mesmo perigo encerra a exploração e perde-se o tesouro ainda não guardado; detalhes de divisão e resgate ficam para definir.
- Sugestão de quatro ou cinco cavernas curtas, com cenários, baús e sons de perigo.
- Evitar menus complexos, moedas de habilidade e muitas cartas para memorizar.
- Bots parecem promissores pela decisão simples e simultânea; avaliação conceitual, sem teste.

## 3. Arena dos Monstros

**Combate e estratégia leve; proposta de 3–4 jogadores e 10–15 minutos.** Referências: diversão de King of Tokyo e ambientação de batalhas como GigaBash, com monstros originais em 2D.

- Escolher monstro (dragão, robô, dinossauro, alienígena etc.); em cada turno, rolar três dados e selecionar resultados a manter ou rolar novamente.
- Resultados associados a ataque, cura e energia; um poder especial simples por monstro.
- Pontos por ataques, sobrevivência e objetivos da arena, sujeitos a balanceamento.
- Retorno na rodada seguinte após derrota, para ninguém ficar de fora por muito tempo.
- Primeira versão sem loja de cartas, muitas habilidades ou fichas de evolução.
- Exige definir regras e balanceamento; bots são uma possibilidade, não uma entrega existente.

## 4. Ponte do Desespero

**Ação e reflexo; proposta de 2–6 jogadores e 5–10 minutos.** Referência visual: plataformas e lava de Marooners.

- Personagens atravessam ponte com trechos frágeis, obstáculos, vento e armadilhas; possíveis momentos de cooperação.
- Três comandos grandes no celular: esquerda, pular e direita.
- Queda consome vida e retorna ao último ponto seguro.
- Responsividade, física e sensação de justiça precisam ser avaliadas no navegador e depois na LG. Não há garantia de latência ou desempenho.
- Bots são uma hipótese a experimentar.

## 5. Desenho Impossível

**Comunicação e criatividade; proposta de 3–6 jogadores e 5–10 minutos.** Referências gerais: desenhar/adivinhar de Imagem & Ação e apresentação de Drawful/Jackbox, com outra mecânica.

- Guia recebe uma imagem secreta e orienta verbalmente.
- Piloto move o lápis na TV; desenhista decide quando o lápis encosta no papel; adivinhador tenta identificar a figura.
- Alternar os papéis entre rodadas. Com três pessoas, piloto também controla o traço.
- A configuração para cinco ou seis pessoas ainda não foi definida.
- Testar se dividir o controle é engraçado ou frustrante. Bots têm utilidade limitada pela dependência de comunicação humana.

## 6. O Cofre Misterioso

**Cooperação e enigmas; proposta de 2–6 jogadores e 10–15 minutos.** Inspiração de apresentação: escape rooms e mecanismos de puzzles, como a referência visual 100 Doors.

- TV mostra cofre com quatro fechaduras, mecanismos e cronômetro; cada celular recebe parte diferente das pistas ou dos controles.
- Exemplo de quatro pessoas: uma sabe que o código usa 4, 7 e 2; outra sabe que 7 vem antes de 4; outra sabe que 4 está no fim; a quarta digita. Nesse exemplo a solução é 274.
- Possíveis fases com símbolos, fios, interruptores e alavancas.
- Conversar e combinar informações deve ser essencial. Validar variedade, solução e dificuldade de cada enigma quando houver protótipo.
- Bots têm utilidade limitada e precisam de desenho específico para não resolver tudo pelo grupo.

## 7. Cidade das Máscaras

**Estratégia leve e blefe; proposta de 3–4 jogadores e 15–20 minutos.** Inspiração: uma experiência simplificada em torno de ideias de Citadels.

- Cada jogador constrói um bairro e escolhe secretamente um personagem por rodada.
- Quatro papéis iniciais sugeridos: Rei recebe moedas extras; Ladrão tenta roubar; Construtor ganha desconto; Espião descobre uma escolha secreta.
- TV resolve ações e recursos; jogadores constroem casas, mercados ou castelos para pontuar.
- Meta de pontos pode disparar o fim; critério final e resolução de conflitos ainda precisam ser definidos.
- Mostrar possibilidades na hora da decisão, sem exigir decorar poderes.
- Candidata a segunda etapa. Não confundir esta proposta simplificada com a ideia futura de Citadels.

## Bots — expectativa inicial, sem validação

| Ideia | Expectativa do texto fornecido |
| --- | --- |
| Lobisomem | Promissor, mas blefe e discussão exigem cuidado |
| Caverna | Muito promissor |
| Arena | Muito promissor |
| Ponte | Muito promissor, sujeito a física e controles |
| Desenho | Limitado pela comunicação e criatividade |
| Cofre | Limitado pela combinação de pistas |
| Cidade | Promissor |

Estas avaliações não comprovam qualidade nem facilidade de implementação. No Lobisomem, bots não substituem integralmente a discussão entre pessoas.

## Antes de transformar o rascunho em trabalho

Quando o usuário decidir retomar, escolher o jogo e o recorte do protótipo; só então fechar regras, controles, quantidade de participantes e papel dos bots. A ordem sugerida Lobisomem → Caverna → Arena pode ser revista.

Um HTML isolado pode simular TV e controles na mesma tela, mas não conecta celulares físicos por si só. A integração multiplayer, os testes e a publicação serão etapas posteriores, quando solicitadas.
