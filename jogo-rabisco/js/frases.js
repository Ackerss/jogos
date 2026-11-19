/* Rabisco sem Fio — frases sugeridas para começar cada livro (todas dá para desenhar).
   Quem não quer inventar toca numa sugestão. Quem não escrever nada a tempo recebe uma delas. */
(function (raiz) {
  'use strict';
  var FRASES = [
    'Vovó surfando num tsunami', 'Um polvo tocando bateria', 'Cachorro dirigindo um ônibus escolar', 'Pinguim de férias na praia',
    'Jacaré no dentista', 'Girafa com torcicolo', 'Um fantasma com medo do escuro', 'Elefante equilibrado numa bola',
    'Astronauta pescando na lua', 'Pizza voadora atacando a cidade', 'Gato fazendo yoga', 'Vaca pulando de paraquedas',
    'Dinossauro numa festa de aniversário', 'Sereia vendendo picolé', 'Tubarão vegetariano comendo alface', 'Robô apaixonado por uma torradeira',
    'Bebê gigante pisando num prédio', 'Galinha botando um ovo de ouro', 'Papai Noel de férias no verão', 'Coelho mágico tirando um homem da cartola',
    'Abelha carregando uma sacola de compras', 'Rei sentado num trono de privada', 'Cobra com cachecol no inverno', 'Morcego de cabeça para baixo lendo jornal',
    'Lagarta virando borboleta', 'Pato de óculos escuros', 'Bombeiro salvando um gato da árvore', 'Vulcão espirrando',
    'Sorvete derretendo no sol', 'Leão no cabeleireiro', 'Tartaruga ganhando uma corrida', 'Camelo no deserto com sede',
    'Banana escorregando numa casca de gente', 'Ovo frito tomando sol', 'Hipopótamo de bailarina', 'Caracol apostando corrida com uma lesma',
    'Homem-aranha com medo de aranha', 'Panda comendo bambu no cinema', 'Coruja fazendo prova', 'Mosquito tocando violino',
    'Zumbi pedindo pizza', 'Vampiro na praia ao meio-dia', 'Bruxa numa vassoura com defeito', 'Dragão assando marshmallow',
    'Unicórnio preso no trânsito', 'Alienígena tirando selfie', 'Minhoca de chapéu', 'Formigas carregando um sanduíche',
    'Peixe dentro de um aquário dentro de outro aquário', 'Macaco comendo banana de pijama', 'Rato roubando o queijo da ratoeira', 'Ovelha contando humanos para dormir',
    'Porco tomando banho de lama', 'Tigre listrado de bolinhas', 'Foca equilibrando uma pizza no nariz', 'Cavalo usando salto alto',
    'Avô andando de skate', 'Menina soltando pipa num furacão', 'Professor dormindo na aula', 'Médico tirando um peixe da garganta',
    'Pirata sem o tesouro', 'Ninja escondido atrás de um poste', 'Cozinheiro fugindo de uma panela', 'Palhaço triste na chuva',
    'Mágico serrando uma melancia', 'Jogador de futebol fazendo gol contra', 'Goleiro dormindo no gol', 'Noiva fugindo do casamento de patinete',
    'Fazendeiro ordenhando uma girafa', 'Detetive procurando a própria lupa', 'Super-herói lavando a capa', 'Princesa beijando um sapo',
    'Sapo virando príncipe careca', 'Bebê dirigindo um trator', 'Carteiro sendo perseguido por um cachorro', 'Dentista com dor de dente',
    'Mergulhador encontrando um sofá no fundo do mar', 'Caminhão de sorvete na neve', 'Árvore de Natal na praia', 'Boneco de neve no deserto',
    'Castelo de areia sendo invadido por caranguejos', 'Nuvem chorando em cima de uma pessoa', 'Lua comendo um queijo', 'Sol usando protetor solar',
    'Estrela cadente caindo numa piscina', 'Arco-íris saindo de uma torneira', 'Chuva de hambúrguer', 'Tornado de pipoca',
    'Casa voando com balões', 'Prédio com pernas andando pela cidade', 'Trem passando dentro de casa', 'Barco navegando numa banheira',
    'Avião de papel gigante', 'Foguete movido a refrigerante', 'Bicicleta com dez rodas', 'Carro de corrida puxado por cavalos',
    'Elevador cheio de pinguins', 'Escada rolante para o céu', 'Geladeira cheia de neve', 'Televisão assistindo uma pessoa',
    'Celular tocando no meio do mar', 'Computador com gripe', 'Relógio atrasado correndo', 'Despertador sendo jogado pela janela',
    'Meia perdida procurando o par', 'Sapato com fome comendo um pé', 'Escova de dente com medo de boca', 'Guarda-chuva com goteira',
    'Óculos para cachorro', 'Peruca voando com o vento', 'Bigode gigante', 'Chapéu de melancia',
    'Bolo de aniversário explodindo', 'Brigadeiro gigante rolando ladeira abaixo', 'Feijoada no espaço', 'Pastel de vento literalmente voando',
    'Coxinha andando de patins', 'Pão de queijo jogando futebol', 'Abacaxi de sunga', 'Melancia com cinto de segurança',
    'Cenoura fugindo de um coelho', 'Batata frita tomando banho de ketchup', 'Sopa de letrinhas escrevendo socorro', 'Ovo de páscoa chocando um pintinho',
    'Churrasco na chuva', 'Picnic invadido por formigas', 'Fila do banco com um dinossauro', 'Mercado com carrinho desgovernado',
    'Festa do pijama de monstros', 'Casamento de dois robôs', 'Aniversário de cem anos da vovó', 'Formatura de cachorros',
    'Show de rock de minhocas', 'Desfile de moda de galinhas', 'Olimpíada de lesmas', 'Copa do mundo de tartarugas',
    'Futebol de pinguins', 'Corrida de sacos com cangurus', 'Natação de gatos', 'Luta de travesseiros no castelo',
    'Cachorro passeando com o dono na coleira', 'Gato mandando no humano', 'Peixe pescando um pescador', 'Galo acordando a lua',
    'Árvore cortando o cabelo', 'Montanha com espinhas', 'Rio de chocolate', 'Ilha com uma única palmeira e um sofá',
    'Pirâmide de cabeça para baixo', 'Torre Eiffel derretendo', 'Cristo Redentor dando um abraço', 'Pão de Açúcar coberto de açúcar',
    'Saci jogando futebol', 'Curupira de tênis ao contrário', 'Boto cor-de-rosa dançando forró', 'Mula sem cabeça procurando a cabeça',
    'Vovô dormindo na rede', 'Tia do zap mandando bom dia', 'Cunhado queimando a carne do churrasco', 'Sogra chegando de surpresa',
    'Bebê chorando no avião', 'Criança comendo areia', 'Pai dançando no casamento', 'Mãe com olhos nas costas',
    'Ladrão roubando um banco de praça', 'Policial correndo atrás de um pato', 'Juiz dando cartão vermelho para um cachorro', 'Prefeito inaugurando um buraco',
    'Pescador mentindo o tamanho do peixe', 'Turista perdido no mapa', 'Motorista de Uber com cavalo', 'Garçom equilibrando vinte pratos',
    'Pintor pintando a si mesmo', 'Cientista maluco com o cabelo em pé', 'Cantor de ópera quebrando o copo', 'Bailarina na cama elástica',
    'Homem das cavernas usando celular', 'Cavaleiro com armadura enferrujada', 'Faraó acordando de mau humor', 'Viking num pedalinho',
    'Cowboy montado num porco', 'Abelha rainha de coroa', 'Fada do dente cobrando juros', 'Duende guardando o pote de ouro',
    'Ciclope com um monóculo', 'Medusa no cabeleireiro', 'Gênio da lâmpada preso na garrafa pet', 'Lobo mau de dieta',
    'Três porquinhos construindo um shopping', 'Chapeuzinho vermelho de skate', 'Cinderela perdendo a bota', 'Branca de Neve com sete gatos',
    'Rapunzel careca', 'Pinóquio no detector de mentiras', 'Aladim no tapete mágico de carro', 'Peter Pan com medo de altura',
    'Monstro embaixo da cama com medo de criança', 'Esqueleto tomando leite', 'Múmia desenrolando no vento', 'Lobisomem no barbeiro',
    'Abóbora de Halloween sorrindo', 'Cemitério com festa', 'Casa mal-assombrada à venda', 'Caveira de óculos escuros',
    'Planeta usando bambolê', 'Disco voador abduzindo uma vaca', 'Marciano com saudade de casa', 'Astronauta flutuando com um sanduíche',
    'Buraco negro engolindo meias', 'Cometa com rabo de cavalo', 'Estrela do mar no céu', 'Satélite com antena torta',
    'Pinguim no micro-ondas', 'Urso polar com calor no Rio', 'Camelo com duas malas nas corcovas', 'Avestruz com a cabeça na areia',
    'Flamingo numa perna só no ônibus', 'Papagaio contando um segredo', 'Tucano com nariz de palhaço', 'Preguiça ganhando a maratona',
    'Capivara relaxando na piscina', 'Onça pintada pintando um quadro', 'Mico-leão dourado de coroa', 'Tamanduá aspirando formigas'
  ];

  function sugestoes(qtd, rand, evitar) {
    rand = rand || Math.random; evitar = evitar || [];
    var livres = FRASES.filter(function (f) { return evitar.indexOf(f) < 0; });
    if (livres.length < qtd) livres = FRASES.slice();
    var out = [];
    while (out.length < qtd && livres.length) out.push(livres.splice(Math.floor(rand() * livres.length), 1)[0]);
    return out;
  }
  var Frases = { LISTA: FRASES, sugestoes: sugestoes };
  if (typeof module !== 'undefined' && module.exports) module.exports = Frases;
  else raiz.Frases = Frases;
})(typeof window !== 'undefined' ? window : this);
