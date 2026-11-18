/* O Impostor — figuras (emoji) das palavras, para o "Modo criança".
   Com o modo ligado, a TV só sorteia temas que têm figura para TODAS as 16 palavras,
   e o celular mostra a figura grande em cima da palavra (quem ainda não lê também joga).
   Para acrescentar: "Tema|Palavra": "emoji". Rode `npm test` para conferir. */
(function (raiz) {
  'use strict';
  var F = {
    Comidas: { 'Pizza': '🍕', 'Lasanha': '🍝', 'Hambúrguer': '🍔', 'Feijoada': '🫘', 'Churrasco': '🍖', 'Sushi': '🍣', 'Pastel': '🥟', 'Coxinha': '🍗',
      'Strogonoff': '🍛', 'Macarrão': '🍜', 'Pipoca': '🍿', 'Sopa': '🥣', 'Omelete': '🍳', 'Tapioca': '🌮', 'Cachorro-quente': '🌭', 'Farofa': '🥄' },
    Bichos: { 'Cachorro': '🐶', 'Gato': '🐱', 'Leão': '🦁', 'Elefante': '🐘', 'Girafa': '🦒', 'Macaco': '🐵', 'Cobra': '🐍', 'Tubarão': '🦈',
      'Pinguim': '🐧', 'Coruja': '🦉', 'Tartaruga': '🐢', 'Papagaio': '🦜', 'Vaca': '🐮', 'Cavalo': '🐴', 'Coelho': '🐰', 'Jacaré': '🐊' },
    Profissões: { 'Médico': '🩺', 'Professor': '👩‍🏫', 'Bombeiro': '🚒', 'Policial': '👮', 'Cozinheiro': '👨‍🍳', 'Dentista': '🦷', 'Piloto': '✈️', 'Padeiro': '🥖',
      'Cabeleireiro': '💇', 'Mecânico': '🔧', 'Carteiro': '✉️', 'Astronauta': '👩‍🚀', 'Pedreiro': '🧱', 'Jardineiro': '🌻', 'Veterinário': '🐕', 'Palhaço': '🤡' },
    'Coisas de casa': { 'Geladeira': '🧊', 'Sofá': '🛋️', 'Cama': '🛏️', 'Chuveiro': '🚿', 'Televisão': '📺', 'Espelho': '🪞', 'Relógio': '⏰', 'Vassoura': '🧹',
      'Ventilador': '🌀', 'Micro-ondas': '📦', 'Escada': '🪜', 'Janela': '🪟', 'Panela': '🍲', 'Abajur': '💡', 'Tapete': '🟥', 'Guarda-roupa': '🚪' },
    Esportes: { 'Futebol': '⚽', 'Vôlei': '🏐', 'Basquete': '🏀', 'Natação': '🏊', 'Tênis': '🎾', 'Boxe': '🥊', 'Skate': '🛹', 'Surfe': '🏄',
      'Ciclismo': '🚴', 'Judô': '🥋', 'Corrida': '🏃', 'Xadrez': '♟️', 'Golfe': '⛳', 'Ginástica': '🤸', 'Futsal': '🥅', 'Pingue-pongue': '🏓' },
    Transportes: { 'Carro': '🚗', 'Ônibus': '🚌', 'Avião': '✈️', 'Navio': '🚢', 'Bicicleta': '🚲', 'Moto': '🏍️', 'Trem': '🚆', 'Metrô': '🚇',
      'Helicóptero': '🚁', 'Foguete': '🚀', 'Caminhão': '🚚', 'Patinete': '🛴', 'Balão': '🎈', 'Canoa': '🛶', 'Submarino': '🤿', 'Táxi': '🚕' },
    Frutas: { 'Banana': '🍌', 'Maçã': '🍎', 'Melancia': '🍉', 'Abacaxi': '🍍', 'Morango': '🍓', 'Laranja': '🍊', 'Uva': '🍇', 'Manga': '🥭',
      'Limão': '🍋', 'Coco': '🥥', 'Abacate': '🥑', 'Kiwi': '🥝', 'Goiaba': '🍐', 'Caju': '🍑', 'Jabuticaba': '🫐', 'Maracujá': '🟡' },
    Doces: { 'Pudim': '🍮', 'Bolo de cenoura': '🍰', 'Sorvete': '🍦', 'Paçoca': '🥜', 'Chocolate': '🍫', 'Pirulito': '🍭', 'Algodão-doce': '☁️', 'Churros': '🥖',
      'Beijinho': '🥥', 'Pé de moleque': '🧱', 'Gelatina': '🟩', 'Chiclete': '🫧', 'Mousse': '🥛', 'Quindim': '🟨', 'Bombom': '🍬', 'Cocada': '🥥' }
  };
  /* Temas que valem no Modo criança (os mais fáceis de reconhecer pela figura). */
  var CRIANCA = ['Bichos', 'Frutas', 'Transportes', 'Esportes', 'Comidas'];
  function de(tema, palavra) { return (F[tema] && F[tema][palavra]) || ''; }
  var Figuras = { F: F, CRIANCA: CRIANCA, de: de };
  if (typeof module !== 'undefined' && module.exports) module.exports = Figuras;
  raiz.Figuras = Figuras;
})(typeof window !== 'undefined' ? window : globalThis);
