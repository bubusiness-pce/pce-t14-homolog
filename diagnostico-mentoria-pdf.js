/* DEM · Diagnóstico Empresarial MELID — PDF da devolutiva breve
 *
 * Uso no navegador (depois de diagnostico-mentoria-motor.js e diagnostico-mentoria-devolutiva.js):
 *   DEM_PDF.baixar(respostas, nome [, opcoes])  -> Promise; gera e baixa "DEM - Devolutiva - {Nome}.pdf"
 *   DEM_PDF.gerar(respostas, nome [, opcoes])   -> Promise<Blob>
 * opcoes: { tema: 'navy' | 'claro', aviso: function(texto, pct), data: Date }
 *
 * Mesmo meio do Teste de Arquétipos MELID: a folha A4 é montada em HTML fora da tela, fotografada pelo
 * html2canvas e posta no jsPDF (bibliotecas do cdnjs, carregadas só na hora). Tudo acontece no navegador:
 * nenhum dado do aluno sai da página. Por cima da imagem vai uma camada de texto invisível, para o
 * texto do PDF poder ser selecionado, copiado e pesquisado.
 */
(function (raiz) {
  'use strict';

  const LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  };
  const FONTES_CSS = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600;700&display=swap';
  const FACES = ["500 20px 'EB Garamond'", "600 20px 'EB Garamond'", "italic 500 20px 'EB Garamond'",
    '400 15px Inter', '500 15px Inter', '600 15px Inter', '700 15px Inter'];
  const AMOSTRA = 'AÁÂÃÀÇÉÊÍÓÔÕÚaáâãàçéêíóôõú0123456789·';

  // pasta deste arquivo (para achar a logo e o leão no mesmo lugar, no GitHub Pages ou local)
  const BASE = (function () {
    try { return new URL('.', document.currentScript.src).href; } catch (e) { return ''; }
  })();

  const W = 794, H = 1123; // A4 a 96 px por polegada

  const TEMAS = {
    navy: {
      fundo: '#0B1426', tinta: '#F3EEE3', tinta2: '#AEB6C4', titulo: '#F3EEE3', ouro: '#D9B872', ouro2: '#C9A45C',
      fio: '#2A3950', painel: '#111D35', painelFio: '#2A3950', moldura: 'rgba(217,184,114,.22)',
      noFuturo: '#3A4862', noFuturoTxt: '#8C96A8', noAtualTxt: '#0B1426', noAtualFundo: '#D9B872',
      fechoFundo: '#111D35', fechoTxt: '#F3EEE3', logo: null, leao: '#D9B872', leaoOpac: 0.10
    },
    claro: {
      fundo: '#FFFFFF', tinta: '#2B3445', tinta2: '#5A6273', titulo: '#0B1426', ouro: '#795A24', ouro2: '#C9A45C',
      fio: '#D9D2C3', painel: '#F6F2E9', painelFio: '#D9D2C3', moldura: 'rgba(201,164,92,.22)',
      noFuturo: '#D5CFC2', noFuturoTxt: '#8A8F99', noAtualTxt: '#F3EEE3', noAtualFundo: '#0B1426',
      fechoFundo: '#0B1426', fechoTxt: '#F3EEE3', logo: '#0B1426', leao: '#D9B872', leaoOpac: 0.10
    }
  };

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function limparNome(nome) {
    return String(nome || '').replace(/^\s*TESTE\s+/i, '').replace(/\s+/g, ' ').trim();
  }
  function nomeArquivo(nome) {
    const n = limparNome(nome) || 'Aluno';
    return ('DEM - Devolutiva - ' + n).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf';
  }
  function dataBrasilia(d) {
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch (e) { return d.toLocaleDateString('pt-BR'); }
  }
  // "A parte mais encaminhada hoje: a base do negócio." -> rótulo + conteúdo (mesmo texto, só arrumado)
  function partir(frase) {
    const i = frase.indexOf(':');
    if (i < 0) return { rotulo: '', valor: frase };
    const v = frase.slice(i + 1).trim();
    // número e a palavra seguinte ficam juntos ("90 dias")
    return { rotulo: frase.slice(0, i).trim().replace(/(\d) /g, '$1 '), valor: v.charAt(0).toUpperCase() + v.slice(1) };
  }

  function carregarScript(src, pronto) {
    if (pronto()) return Promise.resolve();
    return new Promise(function (ok, falha) {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { pronto() ? ok() : falha(new Error('biblioteca não respondeu: ' + src)); };
      s.onerror = function () { falha(new Error('não carregou: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function carregarLibs() {
    return Promise.all([
      carregarScript(LIBS.html2canvas, function () { return !!raiz.html2canvas; }),
      carregarScript(LIBS.jspdf, function () { return !!(raiz.jspdf && raiz.jspdf.jsPDF); })
    ]);
  }
  function carregarFontes() {
    const ja = Array.prototype.some.call(document.querySelectorAll('link[rel=stylesheet]'), function (l) {
      return /EB\+Garamond/.test(l.href) && /Inter[^&]*700/.test(l.href) && /ital/.test(l.href);
    });
    if (!ja) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONTES_CSS; document.head.appendChild(l);
    }
    if (!document.fonts) return Promise.resolve();
    const tudo = Promise.all(FACES.map(function (f) { return document.fonts.load(f, AMOSTRA).catch(function () { return null; }); }))
      .then(function () { return document.fonts.ready; });
    return Promise.race([tudo, new Promise(function (ok) { setTimeout(ok, 9000); })]);
  }
  function carregarImagem(src) {
    return new Promise(function (ok, falha) {
      const im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { falha(new Error('imagem não carregou: ' + src)); };
      im.src = src;
    });
  }
  // pinta a imagem (logo branca, leão cinza) numa cor só, mantendo o recorte
  function tingir(im, cor, largura) {
    const k = largura / im.naturalWidth;
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, c.width, c.height);
    if (cor) { g.globalCompositeOperation = 'source-in'; g.fillStyle = cor; g.fillRect(0, 0, c.width, c.height); }
    return c.toDataURL('image/png');
  }

  /* ---------- a folha ---------- */
  function css(t) {
    return '' +
      '.dem-f{width:' + W + 'px;height:' + H + 'px;box-sizing:border-box;position:relative;overflow:hidden;background:' + t.fundo + ';' +
      'font-family:Inter,Arial,sans-serif;color:' + t.tinta + ';padding:54px 70px 0;-webkit-font-smoothing:antialiased;font-size:15px}' +
      '.dem-f *{box-sizing:border-box;margin:0;padding:0}' +
      '.dem-f .moldura{position:absolute;left:22px;top:22px;right:22px;bottom:22px;border:1px solid ' + t.moldura + ';pointer-events:none}' +
      '.dem-f .miolo{height:' + (H - 54 - 86) + 'px;display:flex;flex-direction:column;justify-content:space-between}' +
      '.dem-f .bl{flex-shrink:0}' +
      // topo
      '.dem-f .topo{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid ' + t.fio + '}' +
      '.dem-f .topo img{height:56px;width:auto;display:block}' +
      '.dem-f .topo .dem{text-align:right}' +
      '.dem-f .kick{font:600 11.5px/1.3 Inter,Arial,sans-serif;letter-spacing:.17em;text-transform:uppercase;color:' + t.ouro + '}' +
      '.dem-f .topo .sub{font:italic 500 17px/1.3 "EB Garamond",Georgia,serif;color:' + t.tinta2 + ';margin-top:4px}' +
      '.dem-f .meta{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:32px;margin-top:16px}' +
      '.dem-f .meta .rot{font:600 11.5px/1.3 Inter,Arial,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:' + t.tinta2 + ';margin-bottom:6px}' +
      '.dem-f .meta .val{font:500 16px/1.4 Inter,Arial,sans-serif;color:' + t.titulo + '}' +
      // título
      '.dem-f h1{font:500 38px/1.12 "EB Garamond",Georgia,serif;color:' + t.titulo + ';letter-spacing:-.005em}' +
      '.dem-f .traco{width:56px;height:2px;background:' + t.ouro2 + ';margin-top:16px}' +
      // seções
      '.dem-f .sec{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}' +
      '.dem-f .sec .n{font:600 21px/1 "EB Garamond",Georgia,serif;color:' + t.ouro + '}' +
      '.dem-f .sec .s{font:700 11.5px/1 Inter,Arial,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:' + t.titulo + '}' +
      '.dem-f .sec .l{flex:1;height:1px;align-self:center;background:' + t.fio + '}' +
      '.dem-f p.txt{font-size:1em;line-height:1.66;color:' + t.tinta + '}' +
      // esteira
      '.dem-f .est{position:relative;display:grid;grid-template-columns:repeat(5,1fr);margin:2px 0 16px}' +
      '.dem-f .est .trilho{position:absolute;left:10%;right:10%;top:16px;height:1px;background:' + t.noFuturo + '}' +
      '.dem-f .est .feito{position:absolute;left:10%;top:15px;height:2px;background:' + t.ouro2 + '}' +
      '.dem-f .no{position:relative;text-align:center}' +
      '.dem-f .no .c{width:32px;height:32px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;' +
      'font:500 13px/1 Inter,Arial,sans-serif;background:' + t.fundo + ';border:1.5px solid ' + t.noFuturo + ';color:' + t.noFuturoTxt + '}' +
      '.dem-f .no.antes .c{border-color:' + t.ouro2 + ';color:' + t.ouro + '}' +
      '.dem-f .no.atual .c{width:42px;height:42px;margin-top:-5px;font-weight:700;background:' + t.noAtualFundo + ';border:0;color:' + t.noAtualTxt + ';font-size:16px;' +
      'box-shadow:0 0 0 6px ' + (t === TEMAS.navy ? 'rgba(217,184,114,.18)' : 'rgba(201,164,92,.22)') + '}' +
      '.dem-f .no .r{display:block;margin-top:11px;font:500 11.5px/14px Inter,Arial,sans-serif;color:' + t.noFuturoTxt + '}' +
      '.dem-f .no.antes .r{color:' + t.tinta2 + '}' +
      '.dem-f .no.atual .r{margin-top:6px;font-weight:700;color:' + t.titulo + '}' +
      '.dem-f .etapa{font:500 25px/1.25 "EB Garamond",Georgia,serif;color:' + t.titulo + ';margin-bottom:10px}' +
      '.dem-f .etapa b{font-weight:600;color:' + t.ouro + '}' +
      // pontos
      '.dem-f .pontos{margin-top:14px}.dem-f .ponto+.ponto{border-top:1px solid ' + t.fio + '}' +
      '.dem-f .ponto{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:baseline;padding:8px 0}' +
      '.dem-f .ponto .pn{font:600 18px/1 "EB Garamond",Georgia,serif;color:' + t.ouro + '}' +
      '.dem-f .ponto .pt{font:500 1em/1.4 Inter,Arial,sans-serif;color:' + t.titulo + '}' +
      // encaminhado e prioridade
      '.dem-f .extras{display:grid;gap:16px}' +
      '.dem-f .extras.dois{grid-template-columns:1fr 1fr}' +
      '.dem-f .cx{background:' + t.painel + ';border-top:2px solid ' + t.ouro2 + ';padding:14px 16px}.dem-f .extras.dois .cx .rot{min-height:30px}' +
      '.dem-f .cx .rot{font:500 11.5px/15px Inter,Arial,sans-serif;color:' + t.tinta2 + ';margin-bottom:6px}' +
      '.dem-f .cx .val{font:500 19px/22px "EB Garamond",Georgia,serif;color:' + t.titulo + '}' +
      // fecho
      '.dem-f .fecho{position:relative;overflow:hidden;background:' + t.fechoFundo + ';padding:16px 112px 16px 28px;border-left:3px solid ' + t.ouro2 + '}' +
      '.dem-f .fecho .leao{position:absolute;right:20px;top:50%;width:80px;height:auto;margin-top:-45px;opacity:' + t.leaoOpac + '}' +
      '.dem-f .fecho p{position:relative;font:italic 500 24px/29px "EB Garamond",Georgia,serif;color:' + t.fechoTxt + '}' +
      // rodapé
      '.dem-f .rodape{position:absolute;left:70px;right:70px;bottom:40px;display:flex;justify-content:space-between;align-items:center;' +
      'padding-top:10px;border-top:1px solid ' + t.fio + ';font:600 11.5px/1.2 Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:' + t.tinta2 + '}' +
      '.dem-f .rodape .d{color:' + t.ouro + ';letter-spacing:.06em;text-transform:none;font-weight:500}' +
      // aperto, só quando o conteúdo é longo
      '.dem-f.a1 .topo{padding-bottom:12px}.dem-f.a1 .meta{margin-top:12px}.dem-f.a1 h1{font-size:36px}.dem-f.a1 .traco{margin-top:12px}' +
      '.dem-f.a1 .sec{margin-bottom:12px}.dem-f.a1 .est{margin-bottom:12px}.dem-f.a1 .etapa{font-size:23px;margin-bottom:6px}' +
      '.dem-f.a1 .ponto{padding:6px 0}.dem-f.a1 .pontos{margin-top:10px}.dem-f.a1 .cx{padding:12px 16px}.dem-f.a1 .fecho{padding:14px 112px 14px 28px}' +
      '.dem-f.a2 p.txt{line-height:1.55}.dem-f.a2 .ponto .pt{line-height:1.4}.dem-f.a2 h1{font-size:34px}';
  }

  function blocos(o, nome, data, etapas, img) {
    const n = Math.max(1, Math.min(5, o.etapa | 0));
    const nos = etapas.map(function (e, i) {
      const cls = i + 1 < n ? 'antes' : (i + 1 === n ? 'atual' : 'depois');
      return '<div class="no ' + cls + '"><span class="c t">' + (i + 1) + '</span><span class="r t">' + esc(e.nome) + '</span></div>';
    }).join('');
    const feito = n > 1 ? '<div class="feito" style="width:' + ((n - 1) * 20) + '%"></div>' : '';

    const pontos = (o.pontos || []).map(function (p, i) {
      return '<div class="ponto"><span class="pn t">' + ('0' + (i + 1)).slice(-2) + '</span><span class="pt t">' + esc(p) + '</span></div>';
    }).join('');

    const ex = [];
    if (o.encaminhado) ex.push(partir(o.encaminhado));
    if (o.prioridade) ex.push(partir(o.prioridade));
    const extras = ex.length ? '<div class="bl extras' + (ex.length === 2 ? ' dois' : '') + '">' + ex.map(function (x) {
      return '<div class="cx">' + (x.rotulo ? '<div class="rot t">' + esc(x.rotulo) + '</div>' : '') + '<div class="val t">' + esc(x.valor) + '</div></div>';
    }).join('') + '</div>' : '';

    return [
      '<div class="bl"><div class="topo"><img src="' + img.logo + '" alt="Mentor de Líderes">' +
        '<div class="dem"><div class="kick t">DEM · Diagnóstico Empresarial MELID</div><div class="sub t">Devolutiva individual</div></div></div>' +
        '<div class="meta"><div><div class="rot t">Preparado para</div><div class="val t">' + esc(nome) + '</div></div>' +
        '<div><div class="rot t">Data</div><div class="val t">' + esc(data) + '</div></div></div></div>',
      '<div class="bl"><h1 class="t">' + esc(o.titulo) + '</h1><div class="traco"></div></div>',
      '<div class="bl"><div class="sec"><span class="n t">01</span><span class="s t">Onde você está</span><span class="l"></span></div>' +
        '<div class="est"><div class="trilho"></div>' + feito + nos + '</div>' +
        '<div class="etapa t"><b>Etapa ' + n + ' de 5 ·</b> ' + esc(o.etapaNome) + '</div>' +
        '<p class="txt t">' + esc(o.ondeEsta) + '</p></div>',
      '<div class="bl"><div class="sec"><span class="n t">02</span><span class="s t">O que pede atenção agora</span><span class="l"></span></div>' +
        '<p class="txt t">' + esc(o.atencao) + '</p>' + (pontos ? '<div class="pontos">' + pontos + '</div>' : '') + '</div>',
      extras,
      '<div class="bl fecho"><img class="leao" src="' + img.leao + '" alt=""><p class="t">' + esc(o.fecho) + '</p></div>'
    ].filter(Boolean);
  }

  function folhaHTML(conteudo, pag, total) {
    return '<div class="dem-f"><div class="moldura"></div><div class="miolo">' + conteudo + '</div>' +
      '<div class="rodape"><span class="t">Mentor de Líderes</span><span class="d t">' +
      (total > 1 ? 'Página ' + pag + ' de ' + total + ' · ' : '') + 'As suas respostas são confidenciais</span></div></div>';
  }

  // cabe numa página? se não couber, encolhe o corpo um pouco; se ainda assim não couber, vai para duas
  function paginar(host, bls) {
    host.innerHTML = folhaHTML(bls.join(''), 1, 1);
    const f = host.firstElementChild, m = f.querySelector('.miolo');
    const cabe = function () { return m.scrollHeight <= m.clientHeight + 1; };
    const conteudoAltura = function () {
      let s = 0; Array.prototype.forEach.call(m.children, function (c) { s += c.offsetHeight; }); return s;
    };
    const minimo = 12 * (bls.length - 1); // respiro mínimo entre blocos
    // níveis de aperto: primeiro o respiro, depois um pouco do corpo (nunca abaixo de 13,5 px = 10 pt)
    const niveis = [{ k: 15, a: '' }, { k: 15, a: 'a1' }, { k: 14.5, a: 'a1 a2' }, { k: 14, a: 'a1 a2' }, { k: 13.5, a: 'a1 a2' }];
    for (let i = 0; i < niveis.length; i++) {
      f.className = 'dem-f ' + niveis[i].a; f.style.fontSize = niveis[i].k + 'px';
      if (cabe() && conteudoAltura() + minimo <= m.clientHeight) return [{ html: bls.join(''), k: niveis[i].k, a: niveis[i].a }];
    }
    f.className = 'dem-f';
    // duas páginas: o que não couber passa para a segunda
    const p1 = [], p2 = [];
    f.style.fontSize = '15px'; m.innerHTML = '';
    bls.forEach(function (b) {
      if (p2.length) { p2.push(b); return; }
      m.insertAdjacentHTML('beforeend', b);
      if (conteudoAltura() + 18 * (m.children.length - 1) > m.clientHeight && m.children.length > 1) { m.removeChild(m.lastElementChild); p2.push(b); }
      else p1.push(b);
    });
    return [{ html: p1.join(''), k: 15 }, { html: p2.join(''), k: 15 }];
  }

  /* ---------- camada de texto invisível ---------- */
  function linhasDoTexto(el, origem) {
    const linhas = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const rg = document.createRange();
    let no;
    while ((no = w.nextNode())) {
      const s = no.nodeValue, re = /\S+/g; let m;
      while ((m = re.exec(s))) {
        rg.setStart(no, m.index); rg.setEnd(no, m.index + m[0].length);
        const r = rg.getClientRects()[0];
        if (!r || !r.width) continue;
        const top = r.top - origem.top, ult = linhas[linhas.length - 1];
        if (ult && Math.abs(ult.top - top) < r.height * 0.5) {
          ult.txt += ' ' + m[0]; ult.right = r.right - origem.left;
        } else {
          linhas.push({ txt: m[0], left: r.left - origem.left, right: r.right - origem.left, top: top, h: r.height });
        }
      }
    }
    return linhas;
  }
  function camadaDeTexto(pdf, folha) {
    const origem = folha.getBoundingClientRect(), mm = 210 / W;
    pdf.setFont('helvetica', 'normal');
    Array.prototype.forEach.call(folha.querySelectorAll('.t'), function (el) {
      linhasDoTexto(el, origem).forEach(function (l) {
        const tam = l.h * 0.75 / 1.2; // altura da linha em pt -> corpo da letra
        pdf.setFontSize(tam);
        const larg = pdf.getTextWidth(l.txt), alvo = (l.right - l.left) * mm;
        const esc = larg > 0 ? Math.max(20, Math.min(300, alvo / larg * 100)) : 100;
        pdf.text(l.txt, l.left * mm, (l.top + l.h * 0.8) * mm, { renderingMode: 'invisible', horizontalScale: esc / 100 });
      });
    });
  }

  /* ---------- gerar ---------- */
  async function gerar(respostas, nome, opcoes) {
    opcoes = opcoes || {};
    const dizer = typeof opcoes.aviso === 'function' ? opcoes.aviso : function () {};
    const t = TEMAS[opcoes.tema] || TEMAS.navy;
    const DEV = raiz.DEM_DEVOLUTIVA, MOT = raiz.MOTOR;
    if (!DEV || !MOT) throw new Error('carregue o motor e a devolutiva antes do PDF');
    const o = DEV.montar(respostas, nome);
    if (!o) throw new Error('respostas incompletas: não há devolutiva para gerar');

    dizer('Etapa 1 de 3 · Preparando o seu relatório…', 8);
    const base = opcoes.base || BASE;
    const ims = await Promise.all([carregarLibs(), carregarFontes(),
      carregarImagem(base + 'logo-melid-white.png'), carregarImagem(base + 'diagnostico-mentoria-leao.png')]);
    const img = { logo: tingir(ims[2], t.logo, 600), leao: tingir(ims[3], t.leao, 240) };

    dizer('Etapa 2 de 3 · Montando a página…', 40);
    let estilo = document.getElementById('dem-pdf-estilo');
    if (!estilo) { estilo = document.createElement('style'); estilo.id = 'dem-pdf-estilo'; document.head.appendChild(estilo); }
    estilo.textContent = css(t);
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:0;top:0;width:' + W + 'px;visibility:hidden;pointer-events:none;z-index:-1';
    document.body.appendChild(host);

    try {
      const nomeLimpo = limparNome(nome) || 'Aluno';
      const bls = blocos(o, nomeLimpo, dataBrasilia(opcoes.data || new Date()), MOT.ETAPAS, img);
      const paginas = paginar(host, bls);
      const pdf = new raiz.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

      for (let i = 0; i < paginas.length; i++) {
        dizer('Etapa 3 de 3 · Gerando o PDF' + (paginas.length > 1 ? ' (página ' + (i + 1) + ' de ' + paginas.length + ')' : '') + '…', 55 + Math.round(i / paginas.length * 40));
        host.innerHTML = folhaHTML(paginas[i].html, i + 1, paginas.length);
        const folha = host.firstElementChild;
        folha.style.fontSize = paginas[i].k + 'px';
        if (paginas[i].a) folha.className = 'dem-f ' + paginas[i].a;
        await Promise.all(Array.prototype.map.call(folha.querySelectorAll('img'), function (im) {
          return im.decode ? im.decode().catch(function () {}) : null;
        }));
        const canvas = await raiz.html2canvas(folha, {
          scale: 2, useCORS: true, logging: false, backgroundColor: t.fundo, width: W, height: H,
          scrollX: 0, scrollY: 0, windowWidth: 1024, windowHeight: 1200,
          onclone: function (doc) { const f = doc.querySelector('.dem-f'); if (f && f.parentNode) f.parentNode.style.visibility = 'visible'; }
        });
        if (i) pdf.addPage('a4', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        camadaDeTexto(pdf, folha);
      }
      pdf.setProperties({ title: 'DEM · Devolutiva · ' + nomeLimpo, subject: 'Diagnóstico Empresarial MELID', author: 'Mentor de Líderes', creator: 'Mentor de Líderes' });
      dizer('PDF pronto.', 100);
      return pdf.output('blob');
    } finally {
      host.remove();
    }
  }

  async function baixar(respostas, nome, opcoes) {
    const blob = await gerar(respostas, nome, opcoes);
    const arquivo = nomeArquivo(nome);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = arquivo; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return { arquivo: arquivo, bytes: blob.size };
  }

  // navegador dentro do Instagram, Facebook, TikTok etc.: costuma não baixar arquivo
  function navegadorInterno() {
    return /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\//i.test(navigator.userAgent || '');
  }

  raiz.DEM_PDF = { gerar: gerar, baixar: baixar, nomeArquivo: nomeArquivo, navegadorInterno: navegadorInterno };
})(window);
