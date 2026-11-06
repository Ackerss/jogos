/* O Impostor — banco de palavras.
   Cada tema tem EXATAMENTE 16 palavras (a grade 4×4 da TV).
   Depois do "=" vêm 3 pistas que os bots usam (uma palavra cada). As pessoas falam o que quiserem.
   Para acrescentar um tema: copie um bloco, troque o nome, o ícone e as 16 palavras.
   Rode `npm test` para conferir (16 palavras, sem repetir, 3 pistas cada). */
(function (raiz) {
  'use strict';
  var BRUTO = [
    ['Comidas', '🍕',
      'Pizza=borda,calabresa,fatia; Lasanha=camadas,gratinada,domingo; Hambúrguer=lanchonete,carne,ketchup; Feijoada=feijão,sábado,couve;' +
      'Churrasco=espeto,carvão,picanha; Sushi=japonês,hashi,alga; Pastel=feira,frito,garapa; Coxinha=frango,salgado,festa;' +
      'Strogonoff=creme,palha,champignon; Macarrão=espaguete,molho,garfo; Pipoca=milho,cinema,estourar; Sopa=colher,quente,inverno;' +
      'Omelete=ovo,frigideira,batido; Tapioca=goma,nordeste,recheio; Cachorro-quente=salsicha,mostarda,carrocinha; Farofa=mandioca,bacon,acompanhamento'],
    ['Bichos', '🐾',
      'Cachorro=latido,coleira,osso; Gato=miau,bigode,novelo; Leão=juba,rei,savana; Elefante=tromba,marfim,gigante;' +
      'Girafa=pescoço,manchas,alta; Macaco=banana,galho,cipó; Cobra=veneno,rastejar,chocalho; Tubarão=barbatana,dentes,mar;' +
      'Pinguim=gelo,fraque,polo; Coruja=noite,piar,olhos; Tartaruga=casco,lenta,ovos; Papagaio=falar,penas,verde;' +
      'Vaca=leite,mugir,pasto; Cavalo=sela,galope,crina; Coelho=cenoura,toca,páscoa; Jacaré=pântano,mandíbula,rabo'],
    ['Profissões', '💼',
      'Médico=consulta,receita,jaleco; Professor=aula,quadro,prova; Bombeiro=incêndio,mangueira,sirene; Policial=viatura,distintivo,ladrão;' +
      'Cozinheiro=panela,avental,cardápio; Dentista=dente,broca,sorriso; Piloto=avião,cabine,decolagem; Padeiro=pão,madrugada,forno;' +
      'Cabeleireiro=tesoura,secador,corte; Mecânico=oficina,motor,graxa; Carteiro=cartas,correio,entrega; Astronauta=foguete,espaço,capacete;' +
      'Pedreiro=tijolo,cimento,obra; Jardineiro=plantas,regador,grama; Veterinário=bichos,vacina,clínica; Palhaço=circo,nariz,risada'],
    ['Coisas de casa', '🏠',
      'Geladeira=gelo,frio,ímã; Sofá=almofada,sala,deitar; Cama=travesseiro,dormir,lençol; Chuveiro=banho,quente,ralo;' +
      'Televisão=canal,novela,tela; Espelho=reflexo,banheiro,vaidade; Relógio=ponteiro,horas,despertar; Vassoura=varrer,pó,cabo;' +
      'Ventilador=hélice,vento,calor; Micro-ondas=esquentar,apito,prato; Escada=degrau,subir,andar; Janela=vidro,cortina,vista;' +
      'Panela=tampa,fogão,pressão; Abajur=luz,cabeceira,lâmpada; Tapete=chão,pés,persa; Guarda-roupa=cabide,roupas,portas'],
    ['Esportes', '⚽',
      'Futebol=gol,chuteira,juiz; Vôlei=saque,cortada,levantar; Basquete=cesta,enterrada,arremesso; Natação=piscina,braçada,touca;' +
      'Tênis=raquete,saibro,bolinha; Boxe=luvas,ringue,nocaute; Skate=manobra,rodinhas,rampa; Surfe=onda,prancha,praia;' +
      'Ciclismo=bicicleta,pedal,etapa; Judô=faixa,quimono,tatame; Corrida=maratona,chegada,fôlego; Xadrez=tabuleiro,xeque,peões;' +
      'Golfe=taco,buraco,campo; Ginástica=trave,cambalhota,argolas; Futsal=quadra,salão,goleiro; Pingue-pongue=mesa,raquetinha,rede'],
    ['Transportes', '🚗',
      'Carro=volante,garagem,estrada; Ônibus=ponto,motorista,passagem; Avião=asa,aeroporto,voo; Navio=porto,âncora,cruzeiro;' +
      'Bicicleta=pedal,corrente,guidão; Moto=capacete,motoqueiro,ronco; Trem=trilho,estação,vagão; Metrô=subterrâneo,catraca,linha;' +
      'Helicóptero=hélice,resgate,pousar; Foguete=lançamento,espaço,contagem; Caminhão=carga,caçamba,frete; Patinete=elétrico,calçada,equilíbrio;' +
      'Balão=cesto,fogo,flutuar; Canoa=remo,rio,margem; Submarino=fundo,periscópio,mergulho; Táxi=taxímetro,amarelo,bandeirada'],
    ['Frutas', '🍎',
      'Banana=cacho,casca,macaco; Maçã=vermelha,mordida,torta; Melancia=sementes,verão,pesada; Abacaxi=coroa,espinhos,azedo;' +
      'Morango=chantilly,sementinhas,vermelho; Laranja=suco,gomos,vitamina; Uva=parreira,vinho,passa; Manga=fiapo,caroço,amarela;' +
      'Limão=azedo,caipirinha,verde; Coco=água,palmeira,praia; Abacate=caroço,vitamina,guacamole; Kiwi=peludo,verde,sementinhas;' +
      'Goiaba=bichinho,goiabada,rosada; Caju=castanha,nordeste,suco; Jabuticaba=tronco,roxinha,pé; Maracujá=calmante,mousse,azedo'],
    ['Lugares', '🌍',
      'Praia=areia,mar,guarda-sol; Escola=sala,recreio,professora; Hospital=maca,enfermeira,emergência; Cinema=telão,pipoca,ingresso;' +
      'Supermercado=carrinho,caixa,prateleira; Igreja=missa,altar,sino; Aeroporto=embarque,mala,pista; Zoológico=jaula,bichos,visita;' +
      'Parque=balanço,árvores,passeio; Biblioteca=livros,silêncio,estante; Academia=esteira,halteres,suor; Restaurante=garçom,cardápio,conta;' +
      'Shopping=lojas,vitrine,estacionamento; Fazenda=curral,trator,vacas; Circo=lona,palhaço,trapézio; Padaria=pãozinho,balcão,café'],
    ['Instrumentos musicais', '🎸',
      'Violão=cordas,acorde,roda; Guitarra=rock,amplificador,solo; Bateria=baquetas,prato,ritmo; Piano=teclas,cauda,pedal;' +
      'Flauta=sopro,furinhos,doce; Sanfona=forró,fole,gaúcho; Pandeiro=samba,platinelas,batucada; Violino=arco,orquestra,queixo;' +
      'Saxofone=jazz,sopro,palheta; Trompete=fanfarra,metal,pistons; Cavaquinho=pagode,pequeno,cordas; Triângulo=forró,ferrinho,tim;' +
      'Tambor=couro,batida,marcha; Harpa=anjo,cordas,dedilhar; Teclado=eletrônico,teclas,tomada; Microfone=cantar,palco,voz'],
    ['Festas e datas', '🎉',
      'Natal=presépio,peru,presentes; Páscoa=ovo,coelho,chocolate; Carnaval=fantasia,bloco,confete; Festa Junina=quadrilha,fogueira,quentão;' +
      'Aniversário=bolo,velas,parabéns; Casamento=noiva,aliança,buquê; Ano Novo=fogos,contagem,branco; Halloween=abóbora,doces,fantasma;' +
      'Dia das Mães=mãe,maio,flores; Chá de bebê=fraldas,barriga,enxoval; Formatura=diploma,beca,canudo; Piquenique=toalha,cesta,grama;' +
      'Dia das Crianças=outubro,brinquedos,criança; Batizado=padrinho,igreja,água; Copa do Mundo=seleção,torcida,figurinhas; Chá revelação=azul,rosa,surpresa'],
    ['Brinquedos e brincadeiras', '🧸',
      'Bola=chutar,redonda,quicar; Boneca=cabelo,vestido,casinha; Pipa=linha,vento,rabiola; Pião=girar,fieira,madeira;' +
      'Bolinha de gude=vidro,bolso,mira; Esconde-esconde=contar,achar,pique; Pega-pega=correr,fugir,encostar; Amarelinha=giz,pular,céu;' +
      'Quebra-cabeça=peças,encaixar,montar; Videogame=controle,fase,console; Dominó=pedras,pontos,mesa; Baralho=cartas,truco,embaralhar;' +
      'Carrinho=rodinhas,brum,pista; Corda=pular,bater,ritmo; Balanço=empurrar,parquinho,alto; Escorregador=descer,parquinho,escadinha'],
    ['Roupas e acessórios', '👕',
      'Camiseta=manga,estampa,algodão; Calça=jeans,bolso,perna; Vestido=festa,rodado,costureira; Boné=aba,cabeça,sol;' +
      'Óculos=lentes,grau,armação; Chinelo=praia,dedo,borracha; Tênis=cadarço,corrida,meia; Pijama=dormir,listrado,cama;' +
      'Biquíni=praia,piscina,bronzear; Gravata=nó,terno,pescoço; Cachecol=frio,pescoço,lã; Luva=mãos,dedos,inverno;' +
      'Brinco=orelha,joia,furo; Mochila=costas,escola,zíper; Guarda-chuva=chuva,abrir,cabo; Chapéu=aba,cowboy,palha'],
    ['Fantasia e lendas', '🧙',
      'Saci=perneta,cachimbo,redemoinho; Curupira=pés,floresta,ruivo; Mula sem cabeça=fogo,galope,lenda; Iara=rio,canto,encantar;' +
      'Boto=rio,festa,chapéu; Papai Noel=trenó,renas,barba; Fada=varinha,asas,desejo; Bruxa=vassoura,caldeirão,feitiço;' +
      'Vampiro=sangue,caixão,dentes; Sereia=cauda,mar,concha; Dragão=fogo,asas,castelo; Fantasma=lençol,assombração,susto;' +
      'Pirata=tesouro,tapa-olho,navio; Robô=metal,bateria,lata; Unicórnio=chifre,arco-íris,cavalo; Gênio=lâmpada,desejos,garrafa'],
    ['Brasil', '🇧🇷',
      'Cristo Redentor=braços,Corcovado,Rio; Amazônia=floresta,rio,pulmão; Pão de Açúcar=bondinho,Rio,morro; Samba=batucada,passista,escola;' +
      'Capoeira=berimbau,roda,ginga; Açaí=tigela,roxo,granola; Brigadeiro=chocolate,granulado,festa; Pantanal=jacaré,alagado,onça;' +
      'Cataratas do Iguaçu=cachoeira,Foz,quedas; Bumba meu boi=boi,Maranhão,festa; Frevo=sombrinha,Recife,passo; Pelourinho=Salvador,ladeira,casarões;' +
      'Brasília=planalto,capital,congresso; Arara=azul,penas,bico; Pão de queijo=Minas,polvilho,café; Chimarrão=cuia,erva,gaúcho'],
    ['Escola', '🏫',
      'Caderno=folhas,espiral,anotar; Lápis=ponta,apontador,grafite; Borracha=apagar,erro,branca; Estojo=canetas,zíper,guardar;' +
      'Régua=centímetros,medir,reta; Quadro-negro=giz,apagador,lousa; Recreio=lanche,pátio,sinal; Prova=nota,questões,estudar;' +
      'Uniforme=camiseta,brasão,igual; Merenda=refeitório,lanche,tia; Tesoura=cortar,papel,ponta; Cola=bastão,grudar,branca;' +
      'Lição de casa=dever,tarefa,entregar; Diretor=sala,bronca,chefe; Globo terrestre=mapa,girar,países; Calculadora=números,contas,somar'],
    ['Natureza e clima', '🌦️',
      'Chuva=gotas,nuvem,molhado; Sol=calor,amarelo,praia; Lua=noite,cheia,fases; Arco-íris=cores,pote,sete;' +
      'Vulcão=lava,erupção,cratera; Cachoeira=queda,pedras,banho; Montanha=pico,escalar,alpinista; Deserto=areia,camelo,seca;' +
      'Floresta=árvores,mata,trilha; Neve=frio,boneco,branca; Raio=trovão,tempestade,clarão; Estrela=brilhar,céu,cadente;' +
      'Oceano=ondas,profundo,azul; Furacão=vento,destruição,olho; Ilha=náufrago,cercada,mar; Terremoto=tremor,chão,escala'],
    ['Tecnologia', '📱',
      'Celular=tela,chamada,aplicativo; Computador=teclado,mouse,monitor; Internet=wi-fi,conectar,site; Fone de ouvido=música,orelhas,fio;' +
      'Câmera=foto,flash,lente; Impressora=papel,tinta,folha; Controle remoto=pilhas,canal,sofá; Tablet=tela,touch,criança;' +
      'Drone=voar,hélice,filmar; Carregador=tomada,bateria,cabo; Pen drive=USB,arquivos,pequeno; Relógio inteligente=pulso,passos,notificação;' +
      'Senha=segredo,números,cadeado; Selfie=foto,braço,pose; Emoji=carinha,mensagem,sorriso; Caixa de som=volume,grave,música'],
    ['Doces', '🍬',
      'Pudim=calda,caramelo,furo; Bolo de cenoura=cobertura,laranja,fatia; Sorvete=casquinha,derreter,picolé; Paçoca=amendoim,esfarelar,rolha;' +
      'Chocolate=cacau,barra,derreter; Pirulito=palito,lamber,colorido; Algodão-doce=parque,rosa,nuvem; Churros=canela,açúcar,recheado;' +
      'Beijinho=coco,cravo,festa; Pé de moleque=amendoim,rapadura,duro; Gelatina=tremer,colorida,mole; Chiclete=mascar,bola,grudar;' +
      'Mousse=maracujá,aerado,geladeira; Quindim=gema,amarelo,coco; Bombom=embrulho,recheio,caixa; Cocada=coco,açúcar,baiana']
  ];

  var TEMAS = BRUTO.map(function (t) {
    var palavras = t[2].split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var p = s.split('='), pistas = (p[1] || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      return { palavra: p[0].trim(), pistas: pistas };
    });
    return { nome: t[0], icone: t[1], palavras: palavras };
  });

  var PALAVRAS = { TEMAS: TEMAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = PALAVRAS;
  raiz.Palavras = PALAVRAS;
})(typeof window !== 'undefined' ? window : globalThis);
