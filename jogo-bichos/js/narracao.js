/* Grande Prêmio dos Bichos — roteiro do locutor.
   Cada momento tem 1 a 2 versões de frase (o jogo sorteia, sem repetir a anterior).
   Arquivo de cada frase: audio/narracao/<momento>_<número>.mp3  (ex.: anda_porco_2.mp3)
   Sem o MP3: os momentos com voz: true são falados pela voz do navegador; os outros ficam só com os efeitos.
   Para mudar uma frase: mude aqui, grave de novo e rode `npm run frases`. */
(function () {
  'use strict';
  var EMPOLGADO = 'locutor de corrida, empolgado e divertido';
  var NARRACAO = {
    pasta: 'audio/narracao/',
    frases: {
      abertura: { quando: 'Começo da partida', tom: 'locutor abrindo o evento, festivo', voz: true,
        textos: ['Senhoras e senhores... bem-vindos ao Grande Prêmio dos Bichos!',
                 'Começa agora a corrida mais maluca do mundo: o Grande Prêmio dos Bichos!'] },
      largada: { quando: 'Os bichos vão para a largada', tom: 'suspense que explode em empolgação', voz: true,
        textos: ['Atenção... preparados... e foi dada a largada!',
                 'Os bichos estão posicionados... Valendo!'] },
      anda_tartaruga: { quando: 'O dado da tartaruga saiu', tom: EMPOLGADO,
        textos: ['Lá vai a tartaruga, devagar e sempre!', 'A tartaruga acelera! Quem diria!'] },
      anda_porco: { quando: 'O dado do porco saiu', tom: EMPOLGADO,
        textos: ['O porco sai correndo e rebolando!', 'Olha o porco! Que disparada!'] },
      anda_pato: { quando: 'O dado do pato saiu', tom: EMPOLGADO,
        textos: ['O pato bate as asas e avança!', 'Quá, quá! O pato vai que vai!'] },
      anda_coelho: { quando: 'O dado do coelho saiu', tom: EMPOLGADO,
        textos: ['O coelho dá um pulo enorme!', 'Lá vai o coelho, saltitando!'] },
      anda_gato: { quando: 'O dado do gato saiu', tom: EMPOLGADO,
        textos: ['O gato corre na ponta das patas!', 'O gato dispara! Que bicho ligeiro!'] },
      carona: { quando: 'Um bicho cai em cima de outro (ou leva alguém nas costas)', tom: 'rindo, surpreso',
        textos: ['Olha a carona! Subiu nas costas!', 'Pegou carona! Que folga!'] },
      banana_posta: { quando: 'Alguém põe uma casca de banana na pista', tom: 'malicioso, avisando',
        textos: ['Cuidado! Tem casca de banana na pista!', 'Uma banana na pista... Isso vai dar confusão!'] },
      escorregou: { quando: 'Um bicho pisa na banana e escorrega para trás', tom: 'gritando de surpresa, engraçado',
        textos: ['Escorregou na banana! Ihhh!', 'Pisou na banana e voltou para trás!'] },
      aposta: { quando: 'Alguém faz uma aposta', tom: 'animado, rápido',
        textos: ['Aposta feita!', 'Hmm... apostou forte!'] },
      lider: { quando: 'Um bicho novo assume a liderança', tom: 'eufórico',
        textos: ['Mudou a liderança!', 'Temos um novo líder na corrida!'] },
      reta_final: { quando: 'O primeiro bicho chega perto da chegada', tom: 'tenso, eletrizante',
        textos: ['Estamos na reta final! Quem vai levar?'] },
      fim_volta: { quando: 'Os 5 dados saíram: hora de pagar as apostas', tom: 'animado, anunciando resultado', voz: true,
        textos: ['Fim da volta! Vamos ver quem acertou as apostas.', 'Os dados acabaram! Hora de pagar as apostas.'] },
      nova_volta: { quando: 'Começa uma nova volta', tom: 'animado',
        textos: ['Os dados voltaram para o copo. Nova volta!'] },
      chegada_tartaruga: { quando: 'A tartaruga cruza a chegada', tom: 'gol de final de campeonato', voz: true,
        textos: ['E a tartaruga cruza a linha de chegada!'] },
      chegada_porco: { quando: 'O porco cruza a chegada', tom: 'gol de final de campeonato', voz: true,
        textos: ['E o porco cruza a linha de chegada!'] },
      chegada_pato: { quando: 'O pato cruza a chegada', tom: 'gol de final de campeonato', voz: true,
        textos: ['E o pato cruza a linha de chegada!'] },
      chegada_coelho: { quando: 'O coelho cruza a chegada', tom: 'gol de final de campeonato', voz: true,
        textos: ['E o coelho cruza a linha de chegada!'] },
      chegada_gato: { quando: 'O gato cruza a chegada', tom: 'gol de final de campeonato', voz: true,
        textos: ['E o gato cruza a linha de chegada!'] },
      campeao: { quando: 'Tela final: quem ganhou mais moedas', tom: 'festa, aplausos', voz: true,
        textos: ['Fim de corrida! Parabéns ao campeão das apostas!', 'Que corrida! Palmas para quem juntou mais moedas!'] }
    },
    arquivo: function (momento, i) { return momento + '_' + (i + 1) + '.mp3'; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NARRACAO;
  if (typeof window !== 'undefined') window.NARRACAO = NARRACAO;
})();
