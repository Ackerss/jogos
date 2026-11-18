/* O Impostor — roteiro do narrador (apresentador de programa de jogos, divertido).
   Cada momento tem 1 a 3 versões (o jogo sorteia uma, sem repetir a anterior).
   Áudio de cada frase: audio/narracao/<momento>_<número>.mp3  (ex.: votacao_2.mp3)
   Sem o MP3, a TV fala a mesma frase com a voz do navegador (se houver). Nada quebra.
   Para mudar uma frase: mude aqui, grave o MP3 de novo e rode `npm run frases`. */
(function (raiz) {
  'use strict';
  var NARRACAO = {
    pasta: 'audio/narracao/',
    /* Momentos que tocam sempre. Os outros só tocam na 1ª rodada no modo "Automática". */
    essenciais: ['ultima_rodada', 'empate', 'era_impostor', 'era_inocente', 'ninguem_acusado', 'ultima_chance', 'impostor_acertou', 'impostor_errou', 'fim_partida', 'fim_empate'],
    frases: {
      abertura: { quando: 'Começo da partida, enquanto o primeiro tema é sorteado', tom: 'apresentador animado de programa de auditório, empolgante',
        textos: ['Bem-vindos ao Impostor! Todo mundo vai receber a mesma palavra secreta... menos um.',
                 'Atenção, pessoal! Entre vocês existe um impostor. Ele não sabe a palavra... mas vai fingir que sabe!'] },
      nova_rodada: { quando: 'Começo de uma nova rodada (sorteio do tema)', tom: 'animado, ritmo rápido',
        textos: ['Nova rodada! Vamos sortear o tema.',
                 'Mais uma rodada... e um novo impostor pode estar entre vocês.'] },
      ultima_rodada: { quando: 'Começo da última rodada da partida', tom: 'empolgado, suspense de final',
        textos: ['Última rodada! Ainda dá tempo de virar o placar.'] },
      olhar_palavra: { quando: 'Cada um olha o próprio celular para ver a palavra', tom: 'baixo, cúmplice, como quem conta um segredo',
        textos: ['Olhe o seu celular... sem deixar ninguém ver.',
                 'Confira a sua palavra em segredo... e faça cara de paisagem.'] },
      pistas_inicio: { quando: 'Começam as pistas faladas em voz alta', tom: 'explicando com bom humor',
        textos: ['Cada um diz uma palavra ligada à palavra secreta. Nem fácil demais... nem difícil demais!',
                 'Hora das pistas! Uma palavra por pessoa. Cuidado para não entregar o segredo ao impostor.'] },
      pistas_escritas: { quando: 'Começam as pistas escritas no celular (com bots na mesa)', tom: 'explicando com bom humor',
        textos: ['Hora das pistas! Na sua vez, escreva uma palavra no celular. Ela aparece aqui na TV.'] },
      segunda_volta: { quando: 'Começa a segunda volta de pistas', tom: 'animado',
        textos: ['Mais uma volta de pistas!',
                 'Segunda volta! Agora prestem ainda mais atenção.'] },
      debate: { quando: 'Terminaram as pistas: hora de conversar', tom: 'provocador, divertido',
        textos: ['E agora? Quem estava blefando? Conversem!',
                 'Alguma pista pareceu estranha? Hora de discutir!'] },
      debate_10s: { quando: 'Faltam 10 segundos de conversa', tom: 'urgente',
        textos: ['Dez segundos!'] },
      votacao: { quando: 'Hora de votar no celular', tom: 'firme, dramático',
        textos: ['Hora de votar! No celular, escolha quem você acha que é o impostor.',
                 'Chega de conversa. Quem é o impostor?'] },
      empate: { quando: 'Empate na votação: votam de novo só entre os empatados', tom: 'surpreso, animado',
        textos: ['Empate! Votem de novo, só entre os empatados.'] },
      revelar: { quando: 'A TV mostra o mais votado, antes de virar a carta', tom: 'suspense, lento, rufar de tambores',
        textos: ['Será que vocês acertaram?...',
                 'O mais votado foi... vamos ver quem ele é de verdade.'] },
      era_impostor: { quando: 'O mais votado ERA o impostor', tom: 'comemoração',
        textos: ['Na mosca! Vocês pegaram o impostor!',
                 'Descoberto! Era o impostor mesmo!'] },
      era_inocente: { quando: 'O mais votado era inocente: o impostor escapou', tom: 'decepção divertida, provocador',
        textos: ['Errado! Essa pessoa era inocente... e o impostor escapou!',
                 'Que pena... vocês acusaram um inocente. O impostor está rindo à toa!'] },
      ninguem_acusado: { quando: 'Ninguém votou (ou empate de novo): o impostor escapou', tom: 'provocador',
        textos: ['Ninguém foi acusado... e o impostor escapou!'] },
      ultima_chance: { quando: 'O impostor pego tenta adivinhar a palavra', tom: 'suspense, desafiador',
        textos: ['Mas calma... o impostor ainda pode roubar a vitória se adivinhar a palavra!',
                 'Última chance do impostor: qual era a palavra secreta?'] },
      impostor_acertou: { quando: 'O impostor acertou a palavra e roubou a vitória', tom: 'surpresa total, exagerado',
        textos: ['Acertou em cheio! O impostor rouba a vitória!'] },
      impostor_errou: { quando: 'O impostor errou a palavra: vitória dos inocentes', tom: 'comemoração',
        textos: ['Errou a palavra! Vitória dos inocentes!',
                 'Não era essa! Os inocentes vencem a rodada!'] },
      fim_partida: { quando: 'Fim da partida: a TV mostra quem venceu', tom: 'grande final, empolgado',
        textos: ['Fim da partida! Palmas para quem venceu!',
                 'Acabou! Vamos ver o placar final.'] },
      fim_empate: { quando: 'Fim da partida com empate no primeiro lugar', tom: 'divertido',
        textos: ['Fim da partida... e deu empate no topo!'] }
    },
    arquivo: function (momento, i) { return momento + '_' + (i + 1) + '.mp3'; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NARRACAO;
  raiz.NARRACAO = NARRACAO;
})(typeof window !== 'undefined' ? window : globalThis);
