/* Mentira Convincente — "auditoria" das respostas (sem IA, tudo no aparelho).
   Deixa todas as respostas com a mesma cara, para ninguém descobrir a mentira pelo jeito de escrever:
   - expande abreviações (vc → você, q → que, pq → porque…);
   - põe acentos que costumam faltar (nao → não, coracao → coração, incrivel → incrível…);
   - tira emojis, risadas (kkkk, haha), letras repetidas (muuuito → muito) e pontuação no fim;
   - tira o artigo repetido ("o ___" + "o unicórnio" → "unicórnio");
   - recusa palavrão, resposta vazia ou longa demais;
   - recusa resposta igual ou parecida com a verdadeira, ou com a de outra pessoa.
   Na TV todas as respostas aparecem em MAIÚSCULAS, então maiúscula/minúscula não denuncia ninguém.
   Funciona no navegador (window.Auditoria) e no Node (testes). */
(function (raiz) {
  'use strict';

  var MAX = 40; // letras (o campo do celular já limita em 40)

  /* Abreviações e gírias de internet → palavra completa. Chave sempre em minúsculas e sem acento. */
  var ABREV = {
    vc: 'você', vcs: 'vocês', voce: 'você', voces: 'vocês',
    q: 'que', qq: 'qualquer', qlq: 'qualquer', qqr: 'qualquer', oq: 'o que',
    pq: 'porque', pq_: 'porque', porq: 'porque',
    tb: 'também', tbm: 'também', tmb: 'também', tbem: 'também', tambem: 'também',
    n: 'não', nao: 'não', naum: 'não', ñ: 'não',
    cmg: 'comigo', ctg: 'contigo', td: 'tudo', tds: 'todos', tdo: 'tudo',
    mt: 'muito', mto: 'muito', mta: 'muita', mts: 'muitos', mtos: 'muitos', mtas: 'muitas',
    hj: 'hoje', hje: 'hoje', qdo: 'quando', qnd: 'quando', qndo: 'quando', qto: 'quanto', qnt: 'quanto', qtos: 'quantos',
    msm: 'mesmo', dps: 'depois', agr: 'agora', blz: 'beleza', vdd: 'verdade', obg: 'obrigado', vlw: 'valeu',
    kd: 'cadê', cade: 'cadê', aki: 'aqui', axo: 'acho', ngm: 'ninguém', nd: 'nada', gnt: 'gente', dnv: 'de novo',
    pfv: 'por favor', pfvr: 'por favor', fds: 'fim de semana', sla: 'sei lá', mds: 'meu Deus',
    eh: 'é', pra: 'para', pro: 'para o', pras: 'para as', pros: 'para os', ta: 'está', tah: 'está', to: 'estou',
    'c/': 'com', 's/': 'sem', 'p/': 'para', 'd+': 'demais', hrs: 'horas', min: 'minutos', seg: 'segundos'
  };
  // "to"/"ta"/"min"/"seg" só viram palavra completa quando a resposta tem mais de uma palavra
  // (sozinhas podem ser a própria resposta, ex.: "Ta" de tântalo, "Min" de nome).
  var SO_NO_MEIO = { to: 1, ta: 1, tah: 1, min: 1, seg: 1, pro: 1 };

  /* Palavras comuns que o povo escreve sem acento. */
  var ACENTO = {
    entao: 'então', sao: 'são', mae: 'mãe', maes: 'mães', pao: 'pão', paes: 'pães', mao: 'mão', maos: 'mãos',
    cao: 'cão', caes: 'cães', chao: 'chão', irmao: 'irmão', irma: 'irmã', ja: 'já', la: 'lá', so: 'só', ate: 'até',
    cafe: 'café', pe: 'pé', fe: 'fé', jose: 'José', joao: 'João', onibus: 'ônibus', arvore: 'árvore', arvores: 'árvores',
    agua: 'água', aguas: 'águas', musica: 'música', numero: 'número', historia: 'história', cerebro: 'cérebro',
    estomago: 'estômago', ingles: 'inglês', frances: 'francês', portugues: 'português', chines: 'chinês', japones: 'japonês',
    holandes: 'holandês', escoces: 'escocês', irlandes: 'irlandês', indio: 'índio', lampada: 'lâmpada', acucar: 'açúcar',
    cachaca: 'cachaça', crianca: 'criança', criancas: 'crianças', cabeca: 'cabeça', praca: 'praça', onca: 'onça',
    abobora: 'abóbora', pessego: 'pêssego', sabado: 'sábado', petroleo: 'petróleo', oleo: 'óleo', unico: 'único',
    unica: 'única', ultimo: 'último', ultima: 'última', rapido: 'rápido', otimo: 'ótimo', pessimo: 'péssimo',
    facil: 'fácil', dificil: 'difícil', util: 'útil', cha: 'chá', sofa: 'sofá', guarana: 'guaraná', maracuja: 'maracujá',
    jacare: 'jacaré', picole: 'picolé', tres: 'três', mes: 'mês', ninguem: 'ninguém', alguem: 'alguém', porem: 'porém',
    alem: 'além', armazem: 'armazém', xicara: 'xícara', saude: 'saúde', magica: 'mágica', fisica: 'física',
    quimica: 'química', matematica: 'matemática', medico: 'médico', medica: 'médica', galaxia: 'galáxia',
    satelite: 'satélite', orbita: 'órbita', atomo: 'átomo', oxigenio: 'oxigênio', hidrogenio: 'hidrogênio',
    eletrico: 'elétrico', eletrica: 'elétrica', camera: 'câmera', video: 'vídeo', radio: 'rádio', codigo: 'código',
    pagina: 'página', japao: 'Japão', alemao: 'alemão', africa: 'África', america: 'América', asia: 'Ásia',
    europa: 'Europa', oceano: 'oceano', antartida: 'Antártida', antartica: 'Antártica', artico: 'Ártico',
    brasilia: 'Brasília', amapa: 'Amapá', para_: 'Pará', goias: 'Goiás', parana: 'Paraná', piaui: 'Piauí',
    ceara: 'Ceará', maranhao: 'Maranhão', macapa: 'Macapá', belem: 'Belém', sao_paulo: 'São Paulo',
    passaro: 'pássaro', passaros: 'pássaros', crocodilo: 'crocodilo', hipopotamo: 'hipopótamo', rinoceronte: 'rinoceronte',
    camelo: 'camelo', pinguim: 'pinguim', tubarao: 'tubarão', golfinho: 'golfinho', aguia: 'águia', urubu: 'urubu',
    tatu: 'tatu', pe_de_moleque: 'pé de moleque', file: 'filé', pure: 'purê', creme: 'creme',
    feijao: 'feijão', limao: 'limão', melao: 'melão', mamao: 'mamão', macarrao: 'macarrão', camarao: 'camarão',
    paises: 'países', ilha: 'ilha', ima: 'ímã', imas: 'ímãs', ovo: 'ovo',
    papai: 'papai', mamae: 'mamãe', sotao: 'sótão', orgao: 'órgão', orgaos: 'órgãos', orfao: 'órfão', bencao: 'bênção',
    acido: 'ácido', azul: 'azul', lapis: 'lápis', onix: 'ônix', virus: 'vírus', bonus: 'bônus', tenis: 'tênis',
    juri: 'júri', taxi: 'táxi', album: 'álbum', heroi: 'herói', herois: 'heróis', chapeu: 'chapéu', ceu: 'céu',
    veu: 'véu', reu: 'réu', trofeu: 'troféu', museu: 'museu', anel: 'anel', papel: 'papel', facil_: 'fácil',
    familia: 'família', policia: 'polícia', noticia: 'notícia', agencia: 'agência', ciencia: 'ciência',
    sitio: 'sítio', predio: 'prédio', remedio: 'remédio', silencio: 'silêncio', palacio: 'palácio', negocio: 'negócio',
    especie: 'espécie', superficie: 'superfície', serie: 'série', carie: 'cárie', area: 'área', idea: 'ideia',
    heroico: 'heroico', tamanduá: 'tamanduá', tamandua: 'tamanduá', sanduiche: 'sanduíche', ciume: 'ciúme',
    juiz: 'juiz', raiz: 'raiz', pais_: 'país', egito: 'Egito', grecia: 'Grécia', italia: 'Itália', mexico: 'México',
    canada: 'Canadá', india: 'Índia', russia: 'Rússia', suecia: 'Suécia', noruega: 'Noruega', belgica: 'Bélgica',
    suica: 'Suíça', austria: 'Áustria', australia: 'Austrália', indonesia: 'Indonésia', etiopia: 'Etiópia',
    nigeria: 'Nigéria', colombia: 'Colômbia', panama: 'Panamá', peru: 'Peru', equador: 'Equador', marrocos: 'Marrocos',
    islandia: 'Islândia', finlandia: 'Finlândia', irlanda: 'Irlanda', escocia: 'Escócia', tailandia: 'Tailândia',
    havai: 'Havaí', jamaica: 'Jamaica', polonia: 'Polônia', hungria: 'Hungria', bulgaria: 'Bulgária', romenia: 'Romênia',
    unicornio: 'unicórnio', dragao: 'dragão', leao: 'leão', leoes: 'leões', petala: 'pétala', solido: 'sólido',
    liquido: 'líquido', metodo: 'método', periodo: 'período', seculo: 'século', titulo: 'título', capitulo: 'capítulo',
    pais__: 'país', obvio: 'óbvio', ambar: 'âmbar', lider: 'líder', carater: 'caráter', reptil: 'réptil', fossil: 'fóssil',
    missil: 'míssil', automovel: 'automóvel', movel: 'móvel', imovel: 'imóvel', lagrima: 'lágrima', silaba: 'sílaba',
    tunel: 'túnel', nivel: 'nível', papeis: 'papéis', aneis: 'anéis', hoteis: 'hotéis', pasteis: 'pastéis', pastel: 'pastel',
    biquini: 'biquíni', caqui: 'caqui', abacaxi: 'abacaxi', acai: 'açaí', caju: 'caju', cupuacu: 'cupuaçu', pequi: 'pequi',
    urucum: 'urucum', jabuti: 'jabuti', sucuri: 'sucuri', saci: 'saci', curupira: 'curupira', iara: 'Iara'
  };
  // Algumas entradas acima só existem para evitar confusão com palavras que já estão certas; remove as chaves "técnicas".
  ['pq_', 'para_', 'sao_paulo', 'pe_de_moleque', 'facil_', 'pais_', 'pais__'].forEach(function (k) { delete ABREV[k]; delete ACENTO[k]; });
  Object.keys(ACENTO).forEach(function (k) { if (ACENTO[k] === k) delete ACENTO[k]; }); // palavras que já estavam certas

  /* Palavrões: a resposta é recusada (o jogo é de família). Comparação sem acento e em minúsculas. */
  var PALAVRAO = ['porra', 'caralho', 'merda', 'puta', 'puto', 'putaria', 'buceta', 'boceta', 'cu', 'cuzao', 'foder', 'fuder',
    'foda', 'fodase', 'bosta', 'viado', 'veado_', 'pqp', 'fdp', 'vsf', 'vtnc', 'tnc', 'cacete', 'piroca', 'xoxota', 'xereca',
    'arrombado', 'arrombada', 'caralha', 'punheta', 'siririca', 'brioco', 'rola_', 'pinto_', 'babaca_', 'corno', 'corna',
    'vagabunda', 'vadia', 'piranha_', 'retardado', 'retardada', 'otario', 'otaria', 'desgracado', 'desgracada'];
  var PALAVRAO_SET = {};
  PALAVRAO.forEach(function (p) { if (p.slice(-1) !== '_') PALAVRAO_SET[p] = 1; });

  var ARTIGOS = { o: 1, a: 1, os: 1, as: 1, um: 1, uma: 1, uns: 1, umas: 1 };
  var LIGACAO = { o: 1, a: 1, os: 1, as: 1, um: 1, uma: 1, uns: 1, umas: 1, de: 1, do: 1, da: 1, dos: 1, das: 1, e: 1, em: 1, no: 1, na: 1, nos: 1, nas: 1 };
  var ROMANO = /^[ivxlcdm]+$/i;
  var LETRA = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF';
  var RE_TOKEN = new RegExp('[' + LETRA + '0-9]', '');

  function semAcento(s) {
    var de = 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñÝýÿ';
    var para = 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy';
    var r = '';
    for (var i = 0; i < s.length; i++) { var k = de.indexOf(s[i]); r += k < 0 ? s[i] : para[k]; }
    return r;
  }
  function temAcento(s) { return /[\u00C0-\u00FF]/.test(s); }

  /* Mantém o "jeito" da palavra original: tudo maiúsculo ou primeira maiúscula. */
  function mesmoFormato(orig, nova) {
    if (orig.length > 1 && orig === orig.toUpperCase() && orig !== orig.toLowerCase()) return nova.toUpperCase();
    if (orig[0] && orig[0] !== orig[0].toLowerCase()) return nova[0].toUpperCase() + nova.slice(1);
    return nova;
  }

  /* Regras de acento por terminação (só para palavras sem nenhum acento). */
  function acentoPorFinal(p) {
    var low = p.toLowerCase();
    if (low.length < 4) return null;
    var regras = [
      [/coes$/, 'ções'], [/cao$/, 'ção'], [/oes$/, 'ões'], [/aes$/, 'ães'], [/ao$/, 'ão'],
      [/avel$/, 'ável'], [/ivel$/, 'ível'], [/aveis$/, 'áveis'], [/iveis$/, 'íveis'],
      [/encia$/, 'ência'], [/encias$/, 'ências'], [/ancia$/, 'ância'], [/ancias$/, 'âncias'],
      [/orio$/, 'ório'], [/orios$/, 'órios'], [/ario$/, 'ário'], [/arios$/, 'ários'],
      [/logico$/, 'lógico'], [/logica$/, 'lógica'], [/fobia$/, 'fobia']
    ];
    for (var i = 0; i < regras.length; i++) if (regras[i][0].test(low)) return low.replace(regras[i][0], regras[i][1]);
    return null;
  }

  /* Uma palavra: risada some, letras repetidas encolhem, abreviação expande, acento entra. */
  function palavra(p, varias) {
    var low = p.toLowerCase();
    if (/^(k{2,}|(ha){2,}h?|(he){2,}|(hi){2,}|(rs){2,}|(hu){2,}|(ja){3,}|lol|kk)$/.test(semAcento(low))) return '';
    // muuuito → muito (mas números romanos como XIII ficam)
    if (!ROMANO.test(p)) {
      var enc = p.replace(new RegExp('([' + LETRA + '])\\1{2,}', 'g'), '$1');
      if (enc !== p) { p = enc; low = p.toLowerCase(); }
    }
    var chave = semAcento(low);
    if (Object.prototype.hasOwnProperty.call(ABREV, low) || Object.prototype.hasOwnProperty.call(ABREV, chave)) {
      var k = Object.prototype.hasOwnProperty.call(ABREV, low) ? low : chave;
      if (!SO_NO_MEIO[k] || varias) return mesmoFormato(p, ABREV[k]);
    }
    if (!temAcento(p)) {
      if (Object.prototype.hasOwnProperty.call(ACENTO, low)) return mesmoFormato(p, ACENTO[low]);
      var f = acentoPorFinal(p);
      if (f) return mesmoFormato(p, f);
    }
    return p;
  }

  /* Normaliza a resposta. antes = texto da frase que vem logo antes da lacuna (para tirar artigo repetido).
     Devolve { ok, texto, erro, mudou }. */
  function normalizar(bruto, antes) {
    var s = String(bruto == null ? '' : bruto);
    s = s.replace(/[\u2018\u2019\u00B4`]/g, "'").replace(/[\u201C\u201D]/g, '"');
    // só letras, números e pontuação simples (tira emojis e símbolos)
    s = s.replace(new RegExp('[^' + LETRA + '0-9 \\-\',.%°ºª&/()+?!:;#@$]', 'g'), ' ');
    s = s.replace(/["]/g, ' ').replace(/\s+/g, ' ').trim();
    var partes = s.split(' ').filter(Boolean);
    var varias = partes.length > 1;
    var saida = [];
    partes.forEach(function (tok) {
      // separa pontuação grudada (ex.: "vc," → "vc" + ",")
      var m = tok.match(/^([(]*)(.*?)([.,!?:;)]*)$/);
      var nucleo = m ? m[2] : tok;
      if (ABREV[nucleo.toLowerCase()] && /[\/+]$/.test(nucleo)) { saida.push(m[1] + palavra(nucleo, varias) + m[3]); return; }
      var p = nucleo ? palavra(nucleo, varias) : '';
      if (p === '' && nucleo) return;
      saida.push((m ? m[1] : '') + p + (m ? m[3] : ''));
    });
    s = saida.join(' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/\s+([,.!?:;%])/g, '$1').replace(/([,!?:;])\1+/g, '$1').replace(/\.{2,}/g, '');
    s = s.replace(/^[\s.,!?:;\-/]+|[\s.,!?:;\-/]+$/g, '').trim();
    // tira o artigo repetido da frase: "O animal é o ___" + "o unicórnio" → "unicórnio"
    if (antes) {
      var ult = semAcento(String(antes).trim().split(/\s+/).pop() || '').toLowerCase().replace(/[^a-z]/g, '');
      var pal = s.split(' ');
      var prim = semAcento(pal[0] || '').toLowerCase();
      if (pal.length > 1 && ARTIGOS[prim] && (ARTIGOS[ult] || ult === prim || /^(d|n|pel)(o|a|os|as)$/.test(ult))) s = pal.slice(1).join(' ');
    }
    // primeira letra maiúscula (o resto como a pessoa escreveu)
    if (s) s = s[0].toUpperCase() + s.slice(1);
    if (!s || !RE_TOKEN.test(s)) return { ok: false, texto: '', erro: 'Escreva uma resposta.' };
    if (s.length > MAX + 5) return { ok: false, texto: s, erro: 'Muito comprida. Use no máximo ' + MAX + ' letras.' };
    var palavras = semAcento(s.toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean);
    for (var i = 0; i < palavras.length; i++) if (PALAVRAO_SET[palavras[i]]) return { ok: false, texto: s, erro: 'Essa palavra não vale aqui. 😉 Tente outra.' };
    return { ok: true, texto: s, erro: '', mudou: s !== String(bruto).trim() };
  }

  /* Chave para comparar respostas: sem acento, minúsculas, sem artigos/ligações, sem plural simples. */
  function palavrasChave(s) {
    return semAcento(String(s || '').toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) {
      return w && !LIGACAO[w];
    }).map(function (w) {
      return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w;
    });
  }
  function chave(s) { return palavrasChave(s).join(''); }

  function distancia(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var ant = [], cur = [];
    for (var j = 0; j <= n; j++) ant[j] = j;
    for (var i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      ant = cur;
    }
    return ant[n];
  }
  function tolerancia(k) { return k.length >= 8 ? 2 : k.length >= 5 ? 1 : 0; }

  /* Duas respostas são "a mesma coisa"? (erro de digitação, plural, acento, artigo) */
  function iguais(a, b) {
    var ka = chave(a), kb = chave(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    return distancia(ka, kb) <= Math.min(tolerancia(ka), tolerancia(kb));
  }

  /* A mentira entrega a verdade? Igual/parecida, ou contém todas as palavras da verdade. */
  function pareceVerdade(mentira, verdades) {
    var lista = Array.isArray(verdades) ? verdades : [verdades];
    var pm = palavrasChave(mentira);
    for (var i = 0; i < lista.length; i++) {
      var v = lista[i];
      if (!v) continue;
      if (iguais(mentira, v)) return true;
      var pv = palavrasChave(v);
      if (pv.length && pv.join('').length >= 3 && pv.every(function (w) { return pm.some(function (x) { return x === w || (w.length >= 5 && distancia(x, w) <= 1); }); })) return true;
    }
    return false;
  }

  var API = { MAX: MAX, normalizar: normalizar, chave: chave, iguais: iguais, pareceVerdade: pareceVerdade, semAcento: semAcento, distancia: distancia };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.Auditoria = API;
})(typeof window !== 'undefined' ? window : this);
