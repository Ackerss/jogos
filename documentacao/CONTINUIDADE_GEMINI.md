# Continuidade no Antigravity / Gemini

## Leia nesta ordem
1. `../LEIA-ME-PRIMEIRO.md`
2. `ESTADO_ATUAL.md`
3. `TESTES_DAS_PLATAFORMAS.md`
4. `ARQUITETURA.md`
5. `../AGENTS.md`
6. `../jogo-corrida/src/logic.ts` e `../jogo-corrida/src/main.ts`

Não reinicie a pesquisa de plataformas sem uma falha concreta ou pedido do usuário. Doot foi escolhido; ambos HexStacker e Pit Party responderam aos comandos do usuário na TV. O usuário quer jogar agora e refinar depois, não um novo ciclo de questionários.

## Contexto operacional
Pasta principal: `C:\Users\User\Meu Drive\ANTIGRAVITY\JOGOS MULTIPLAYER TV LG`.
Windows / PowerShell. Node e npm disponíveis na máquina nesta sessão. O projeto original Doot usa pnpm; o jogo pequeno usa **npm e package-lock.json**, não misturar locks.

Usuário quer tudo ONLINE e GRATUITO, sem manter o PC ligado. O servidor local foi mantido como alternativa técnica, não como experiência principal.

## Reconstrução
Na pasta `jogo-corrida`:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run build
npm.cmd test
```

Só depois, para conferir localmente:

```powershell
npm.cmd start
```

Abra `http://localhost:8787`. Para celulares na LAN, o servidor imprime o IP local. Esse IP pode mudar; não gravá-lo como URL online definitiva. A versão estática pode ser hospedada em outro provedor gratuito preservando a mesma arquitetura, se for necessário no futuro.

## Publicação
O ID existente do Site está em `../jogo-corrida/.openai/hosting.json`. Preservar; não criar novo site. A credencial de Git do Sites é temporária e NÃO está no projeto. Não inventar token nem pedir ao usuário que exponha senhas. No Codex, usar as ferramentas oficiais do Sites e seu helper de publicação. No Gemini, se essas ferramentas não estiverem disponíveis, editar e gerar localmente e devolver o código ao Codex para publicar; não afirmar que publicou.

Não subir `../evidencias`, `../documentacao` ou dados privados para resolver a publicação. A raiz publicável é SOMENTE `jogo-corrida/`; o artefato servido é `dist/`.

## Validação que importa
- Dois participantes diferentes pontuam separadamente e aparecem na TV.
- Contagem regressiva não aceita toques prematuros.
- Encerra em 20 s e resultado não muda após o corte.
- Revanche inicia pelo primeiro celular, zera os pontos e preserva a sala.
- Nome repetido não cria participante fantasma; reconexão preserva identidade.
- Tela da TV cabe sem rolagem em 1280×720 e funciona em 1920×1080; celular fica legível em 390×844.
- Registrar as validações locais/browser separadas da validação física futura da LG.

Não fazer testes de carga no relay público. Não atualizar o motor copiado sem primeiro ler sua origem e verificar API; ele foi congelado para reduzir mudanças simultâneas.

## Depois do primeiro retorno do usuário
Recolher somente o necessário: entrou no link, QR conectou, os dois jogadores pontuaram, partida terminou, revanche funcionou. Se houver falha, pedir a tela/etapa concreta. Depois disso o usuário escolherá o jogo pessoal definitivo e a direção gráfica. Não presumir agora corrida 3D, franquias, personagens ou compras.
