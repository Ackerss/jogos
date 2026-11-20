/* Pinta-Chão dos Bichos — simulador (?modo=pc): a TV e alguns celulares na mesma tela, sem internet.
   Imita a conexão (Rede.criarSala) para o js/main.js: cada celular simulado usa o mesmo js/celular.js do celular de verdade. */
(function () {
  'use strict';
  if (window.MODO !== 'pc') return;
  window.Simulador = {
    criar: function () {
      var q = new URLSearchParams(location.search);
      var qtd = Math.max(1, Math.min(4, +(q.get('celulares') || 3)));
      var nomes = ['Papai', 'Ana', 'Lavigne', 'Vovó'];
      var aoMudar = function () {}, aoAcao = function () {};
      var area = document.getElementById('celulares');
      var celulares = {};
      var S = {
        codigo: 'TEST', conectado: true, erro: '', qr: '', link: location.href, pessoas: [],
        iniciar: function () {
          for (var i = 0; i < qtd; i++) (function (i) {
            var pid = 'sim' + (i + 1);
            var box = document.createElement('div'); box.className = 'sim-celular';
            box.innerHTML = '<div class="sim-rotulo">📱 ' + nomes[i] + '</div><div class="sim-tela controle"></div>';
            area.appendChild(box);
            celulares[pid] = window.Celular.criar(box.querySelector('.sim-tela'), function (d) { setTimeout(function () { aoAcao(pid, d); }, 40); });
            setTimeout(function () { S.pessoas.push({ pid: pid, nome: nomes[i] }); aoMudar(); }, 300 + i * 350);
          })(i);
        },
        aoMudar: function (f) { aoMudar = f; },
        aoAcao: function (f) { aoAcao = f; },
        tela: function (pid, t) { var c = celulares[pid]; if (c) { var copia = JSON.parse(JSON.stringify(t)); setTimeout(function () { c.mostrar(copia, 0); }, 30); } },
        reenviarTudo: function () {}
      };
      return S;
    }
  };
})();
