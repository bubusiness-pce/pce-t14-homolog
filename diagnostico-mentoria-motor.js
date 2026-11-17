/* Diagnóstico do Negócio de Mentoria · motor
   Fonte única das perguntas, do caminho (quem já vende × quem ainda não vende) e do cálculo da ficha.
   A página do aluno e o painel do time leem este arquivo. Nada aqui toca em tela nem em banco.
   Respostas: pergunta de uma resposta guarda o índice da opção (número); de várias, uma lista de índices. */
(function (raiz) {
  'use strict';

  const VERSAO = 'v2-2026-11-17';

  const BLOCOS = ['Momento e vendas', 'Back-office', 'Time e estrutura'];

  const GRUPOS = {
    v: { nome: 'Vendas', foco: 'as vendas da sua mentoria' },
    b: { nome: 'Back-office', foco: 'a parte jurídica, contábil e financeira da sua mentoria' },
    t: { nome: 'Time e estrutura', foco: 'o time e a estrutura que sustentam a sua mentoria' }
  };

  // Etapa = posição na esteira de construção e venda da mentoria (1 a 5)
  const ETAPAS = [
    { nome: 'Ideia', aluno: 'o tema está definido e a montagem ainda vai começar', time: 'tem o tema, ainda não começou a montar' },
    { nome: 'Construção', aluno: 'em construção', time: 'montando método, encontros e materiais' },
    { nome: 'Pronta para vender', aluno: 'pronta, à espera das primeiras vendas', time: 'mentoria pronta, ainda sem vendas' },
    { nome: 'Primeiras vendas', aluno: 'com as primeiras vendas feitas', time: 'já vendeu, as vendas não engrenaram' },
    { nome: 'Vendas regulares', aluno: 'vendendo com regularidade', time: 'vende com regularidade e quer crescer' }
  ];

  /* tipo: 'uma' (clicou, avança) ou 'varias' (marca e continua)
     max: limite de marcações · exclusiva: índice da opção que desmarca as outras
     curto: nome de cada opção para usar dentro de frase · nota: aviso para quem valida as perguntas */
  const PERGUNTAS = {
    momento: {
      bloco: 0, tipo: 'uma',
      titulo: 'Em que ponto está a sua mentoria hoje?',
      contexto: 'Escolha a frase que mais se parece com o seu momento.',
      paraQue: 'Define a etapa do aluno, de 1 a 5, e separa quem já vende de quem ainda não vende.',
      opcoes: [
        'Tenho o tema, mas ainda não comecei a montar',
        'Estou montando o método, os encontros e os materiais',
        'Está pronta, mas ainda não vendi',
        'Já vendi, mas as vendas ainda não engrenaram',
        'Vendo com regularidade e quero crescer'
      ]
    },

    // ---- só para quem já vende
    fat: {
      bloco: 0, tipo: 'uma',
      titulo: 'Quanto a sua mentoria faturou por mês, em média, nos últimos três meses?',
      contexto: 'Uma faixa aproximada basta.',
      paraQue: 'Dá ao Bruno o tamanho do negócio antes da conversa.',
      // Faixas iguais às do formulário do MELID validado pela Sofia (Diagnóstico de Autoridade, pergunta A7,
      // faturamento como mentor). Ordem do Carlos em 17/11/2026: não mudar sem ele.
      opcoes: ['Até R$ 10 mil por mês', 'De R$ 10 mil a R$ 30 mil por mês', 'De R$ 30 mil a R$ 100 mil por mês', 'Acima de R$ 100 mil por mês']
    },
    canais: {
      bloco: 0, tipo: 'varias',
      titulo: 'De onde vêm os alunos que compram a sua mentoria?',
      contexto: 'Marque todos os caminhos que já trouxeram venda.',
      paraQue: 'Mostra onde o aluno vende e se depende de um caminho só.',
      opcoes: [
        'Indicação de alunos e conhecidos', 'Instagram', 'YouTube', 'LinkedIn', 'Palestras e eventos',
        'Anúncios pagos', 'Lista de WhatsApp ou de e-mail', 'Clientes de outra empresa minha'
      ],
      curto: ['indicação', 'Instagram', 'YouTube', 'LinkedIn', 'palestras e eventos', 'anúncios pagos', 'lista de WhatsApp ou de e-mail', 'clientes de outra empresa']
    },
    plataforma: {
      bloco: 0, tipo: 'varias',
      titulo: 'Por onde o aluno paga a sua mentoria?',
      contexto: 'Marque as formas que você usa hoje.',
      paraQue: 'Registra a plataforma de venda, pedida na reunião.',
      nota: 'Lista de plataformas sugerida. Incluir ou tirar nomes conforme o que o time conhece.',
      opcoes: [
        'Hotmart', 'Kiwify', 'Eduzz', 'Outra plataforma de pagamento',
        'Link de pagamento ou maquininha do banco', 'Pix ou transferência direta', 'Boleto ou parcelas combinadas direto comigo'
      ]
    },
    gargalo: {
      bloco: 0, tipo: 'varias', max: 2,
      titulo: 'O que mais trava as suas vendas hoje?',
      contexto: 'Marque até duas opções.',
      paraQue: 'Aponta o gargalo que o Bruno aprofunda primeiro.',
      opcoes: [
        'Atrair gente interessada, com conteúdo e anúncios',
        'Ter uma página de vendas que convença',
        'Fechar a venda na conversa',
        'Acompanhar os interessados até a compra',
        'Falta de tempo ou de gente para vender',
        'Contrato, cobrança e nota fiscal atrasam a venda'
      ]
    },

    // ---- só para quem ainda não vende
    preco: {
      bloco: 0, tipo: 'uma',
      titulo: 'Você já definiu o preço da sua mentoria?',
      contexto: 'Considere o valor por aluno.',
      paraQue: 'Mostra se a oferta já está fechada.',
      nota: 'Faixas sugeridas. Ajustar se o perfil da turma pedir outras.',
      opcoes: ['Ainda não defini', 'Até R$ 5 mil', 'De R$ 5 mil a R$ 15 mil', 'De R$ 15 mil a R$ 40 mil', 'Acima de R$ 40 mil']
    },
    publico: {
      bloco: 0, tipo: 'uma',
      titulo: 'Quantas pessoas acompanham você hoje?',
      contexto: 'Some seguidores, lista de contatos e clientes da sua empresa.',
      paraQue: 'Indica se já existe público para a primeira oferta ou se a conversa começa por atrair gente.',
      nota: 'Faixas sugeridas.',
      opcoes: ['Menos de 1 mil', 'De 1 mil a 10 mil', 'De 10 mil a 50 mil', 'Mais de 50 mil']
    },
    plataforma_nv: {
      bloco: 0, tipo: 'uma',
      titulo: 'Você já sabe por onde o aluno vai pagar?',
      contexto: 'Hotmart, Kiwify, Eduzz, link do banco ou outra forma de pagamento.',
      paraQue: 'Mostra se a estrutura de venda já existe.',
      opcoes: ['Sim, a conta já está criada', 'Já escolhi, falta configurar', 'Ainda não escolhi']
    },
    falta: {
      bloco: 0, tipo: 'varias', max: 2,
      titulo: 'O que falta para você começar a vender?',
      contexto: 'Marque até duas opções.',
      paraQue: 'Aponta por onde o Bruno começa com quem ainda não vende.',
      opcoes: [
        'Terminar de montar a mentoria',
        'Definir o preço e a oferta',
        'Ter página e material de venda',
        'Ter público para oferecer',
        'Saber conduzir a conversa de venda',
        'Regularizar a empresa e o contrato',
        'Ter tempo ou equipe para vender'
      ]
    },

    // ---- back-office (todos respondem)
    cnpj: {
      bloco: 1, tipo: 'uma',
      titulo: 'Por qual CNPJ a sua mentoria é vendida, ou vai ser?',
      contexto: '',
      paraQue: 'Mostra se existe empresa para a mentoria ou se ela usa a estrutura de outro negócio.',
      opcoes: ['Um CNPJ aberto só para a mentoria', 'O CNPJ de outra empresa que já tenho', 'No meu CPF, como pessoa física', 'Ainda não decidi']
    },
    contabil: {
      bloco: 1, tipo: 'uma',
      titulo: 'O seu contador já preparou a empresa para vender mentoria?',
      contexto: 'Atividade no CNPJ (CNAE), regime de impostos e emissão de nota fiscal.',
      paraQue: 'Mostra se houve orientação contábil: CNAE e adaptações, como pedido na reunião.',
      opcoes: ['Sim, está tudo ajustado', 'Tenho contador, mas ainda não tratamos da mentoria', 'Não tenho contador', 'Não sei dizer']
    },
    contrato: {
      bloco: 1, tipo: 'uma',
      titulo: 'Como é o contrato que o aluno assina com você?',
      contexto: 'Se ainda não vende, responda pelo que já tem pronto.',
      paraQue: 'Mostra se houve orientação jurídica.',
      opcoes: ['Feito por advogado para a minha mentoria', 'Um modelo que eu adaptei', 'Ainda não tenho contrato']
    },
    marca: {
      bloco: 1, tipo: 'uma',
      titulo: 'O nome da sua mentoria está registrado como marca?',
      contexto: 'O registro é feito no INPI.',
      paraQue: 'Aponta risco sobre o nome antes de investir em divulgação.',
      opcoes: ['Sim, já está registrado', 'O pedido está em andamento', 'Ainda não pedi o registro', 'Ainda não defini o nome']
    },
    financeiro: {
      bloco: 1, tipo: 'uma',
      titulo: 'Como você cuida do dinheiro da mentoria?',
      contexto: '',
      paraQue: 'Mostra se o financeiro está separado e controlado.',
      opcoes: [
        'Conta da empresa separada e controle todo mês',
        'Conta separada, mas sem controle organizado',
        'Misturo com a conta pessoal ou de outra empresa',
        'Ainda não recebi nada pela mentoria'
      ]
    },

    // ---- time e estrutura (todos respondem)
    time: {
      bloco: 2, tipo: 'uma',
      titulo: 'Quem trabalha com você na mentoria hoje?',
      contexto: '',
      paraQue: 'Dá o tamanho do time.',
      opcoes: ['Só eu', 'Eu e uma pessoa de apoio', 'Uma equipe pequena, de 2 a 5 pessoas', 'Uma equipe maior, com funções definidas']
    },
    funcoes: {
      bloco: 2, tipo: 'varias', exclusiva: 7,
      titulo: 'O que hoje depende só de você e poderia estar com outra pessoa?',
      contexto: 'Marque tudo o que se aplica.',
      paraQue: 'Mostra quais funções dá para tirar das mãos do aluno.',
      opcoes: [
        'Atendimento aos alunos', 'Conversas de venda', 'Conteúdo para as redes', 'Anúncios pagos',
        'Financeiro e cobrança', 'Agenda e organização dos encontros', 'Edição de vídeo e materiais',
        'Nada disso depende só de mim'
      ],
      curto: ['atendimento aos alunos', 'conversas de venda', 'conteúdo para as redes', 'anúncios pagos', 'financeiro e cobrança', 'agenda dos encontros', 'edição de vídeo e materiais']
    },
    ferramentas: {
      bloco: 2, tipo: 'varias', exclusiva: 5,
      titulo: 'Quais destas ferramentas você já usa na mentoria?',
      contexto: 'Marque todas as que já fazem parte da sua rotina.',
      paraQue: 'Mostra a estrutura que já existe e o que falta, como o CRM citado na reunião.',
      opcoes: [
        'CRM para acompanhar interessados', 'Área de membros para os alunos', 'Agenda on-line para marcar encontros',
        'Assinatura digital de contrato', 'Envio de e-mail ou WhatsApp para a base', 'Nenhuma destas'
      ],
      curto: ['CRM', 'área de membros', 'agenda on-line', 'assinatura digital de contrato', 'envio de e-mail ou WhatsApp']
    },
    dedicacao: {
      bloco: 2, tipo: 'uma',
      titulo: 'Quanto do seu tempo de trabalho vai para a mentoria?',
      contexto: '',
      paraQue: 'Mostra se a mentoria é o negócio principal ou divide a agenda.',
      opcoes: ['Ela é o meu negócio principal', 'Divido o tempo com outra empresa ou profissão', 'Só algumas horas por semana']
    },
    prioridade: {
      bloco: 2, tipo: 'uma',
      titulo: 'Se você pudesse resolver uma única coisa nos próximos 90 dias, qual seria?',
      contexto: '',
      paraQue: 'É a prioridade dita pelo próprio aluno. O Bruno compara com o que as respostas mostram.',
      opcoes: [
        'Vender: começar ou vender mais',
        'Organizar o jurídico, o contábil e o financeiro',
        'Montar o time e sair do operacional',
        'Terminar de montar a mentoria'
      ]
    }
  };

  const RAMOS = {
    jv: ['fat', 'canais', 'plataforma', 'gargalo'],          // já vende
    nv: ['preco', 'publico', 'plataforma_nv', 'falta']       // ainda não vende
  };
  const COMUNS = ['cnpj', 'contabil', 'contrato', 'marca', 'financeiro', 'time', 'funcoes', 'ferramentas', 'dedicacao', 'prioridade'];
  const NOME_CAMINHO = { jv: 'Já vende', nv: 'Ainda não vende' };

  // Teto de pontos de cada grupo em cada caminho (ver a tabela de pontos em diagnosticar)
  const TETO = { jv: { v: 17, b: 21, t: 17 }, nv: { v: 19, b: 20, t: 17 } };

  function caminho(r) {
    const m = r && r.momento;
    if (typeof m !== 'number') return null;
    return m >= 3 ? 'jv' : 'nv';
  }

  // As 15 perguntas, na ordem, para as respostas dadas até aqui
  function sequencia(r) {
    return ['momento'].concat(RAMOS[caminho(r) || 'nv'], COMUNS);
  }

  function respondida(id, r) {
    const q = PERGUNTAS[id], v = r ? r[id] : undefined;
    if (!q) return false;
    if (q.tipo === 'uma') return typeof v === 'number' && v >= 0 && v < q.opcoes.length;
    return Array.isArray(v) && v.length > 0;
  }

  function completo(r) {
    return caminho(r) !== null && sequencia(r).every(function (id) { return respondida(id, r); });
  }

  function lista(r, id) { return Array.isArray(r[id]) ? r[id] : []; }
  function tem(r, id, i) { return lista(r, id).indexOf(i) !== -1; }
  function juntar(nomes) {
    if (nomes.length <= 1) return nomes.join('');
    return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
  }
  function nivel(pct) { return pct >= 67 ? 'alta' : pct >= 34 ? 'média' : 'baixa'; }

  /* Calcula a ficha a partir das respostas completas.
     Devolve: caminho, etapa (1 a 5), dores {v,b,t} em %, ordem dos grupos, principal,
     prioridade declarada, sinais (pontos de atenção), roteiro da conversa, soluções e a leitura em uma frase. */
  function diagnosticar(r, nome) {
    const c = caminho(r);
    if (c === null) return null;
    const jv = c === 'jv';
    const m = r.momento;
    const p = { v: 0, b: 0, t: 0 };
    let tempoVenda = 0;               // pontos de time vindos das perguntas de venda (teto 3)
    const sinais = [];
    const sinal = function (id, cl, alerta, aprofundar, solucao) {
      sinais.push({ id: id, cl: cl, alerta: alerta, aprofundar: aprofundar, solucao: solucao || null });
    };

    // ---------- momento e vendas
    if (jv) {
      p.v += m === 3 ? 3 : 1;
      p.v += [3, 2, 1, 0][r.fat] || 0;
      const nCanais = lista(r, 'canais').length;
      p.v += nCanais === 1 ? 2 : nCanais === 2 ? 1 : 0;
      const formas = lista(r, 'plataforma');
      const soDireto = formas.length > 0 && formas.every(function (i) { return i === 5 || i === 6; });
      if (soDireto) p.b += 1;
      if (tem(r, 'gargalo', 0)) p.v += 3;
      if (tem(r, 'gargalo', 1)) p.v += 3;
      if (tem(r, 'gargalo', 2)) p.v += 3;
      if (tem(r, 'gargalo', 3)) { p.v += 2; tempoVenda += 1; }
      if (tem(r, 'gargalo', 4)) tempoVenda += 3;
      if (tem(r, 'gargalo', 5)) p.b += 3;

      if (tem(r, 'gargalo', 0)) sinal('trafego', 'v', 'Chega pouca gente interessada', 'De onde vem o público hoje e o que já foi tentado para atrair gente', 'Tráfego pago e conteúdo');
      if (tem(r, 'gargalo', 1)) sinal('pagina', 'v', 'A página de vendas não convence', 'Ver a página ou o material usado hoje para apresentar a mentoria', 'Página de vendas');
      if (tem(r, 'gargalo', 2)) sinal('fechamento', 'v', 'A venda trava na conversa', 'Como é a conversa de venda e em que ponto o interessado desiste', 'Processo comercial');
      const semCrm = !tem(r, 'ferramentas', 0);
      if (tem(r, 'gargalo', 3) || semCrm) {
        sinal('crm', 'v',
          tem(r, 'gargalo', 3) ? (semCrm ? 'Perde interessados por falta de acompanhamento e não usa CRM' : 'Perde interessados por falta de acompanhamento') : 'Vende sem CRM',
          'Como registra e retoma quem demonstrou interesse e não comprou', 'CRM');
      }
      if (nCanais === 1) sinal('canal_unico', 'v', 'As vendas dependem de um caminho só: ' + PERGUNTAS.canais.curto[lista(r, 'canais')[0]], 'Qual segundo caminho de venda faz sentido abrir', 'Tráfego pago e conteúdo');
      if (soDireto) sinal('pix', 'b', 'Recebe só por Pix, boleto ou parcelas diretas, sem plataforma', 'Como controla parcelas, atrasos e comprovantes', 'Plataforma de pagamento');
      if (tem(r, 'gargalo', 5)) sinal('burocracia', 'b', 'Contrato, cobrança ou nota fiscal atrasam a venda', 'Qual etapa mais atrasa: contrato, cobrança ou nota fiscal', null);
    } else {
      p.v += [0, 1, 3][m] || 0;
      if (r.preco === 0) p.v += 2;
      p.v += [3, 2, 1, 0][r.publico] || 0;
      p.v += [0, 1, 2][r.plataforma_nv] || 0;
      if (tem(r, 'falta', 1)) p.v += 2;
      if (tem(r, 'falta', 2)) p.v += 3;
      if (tem(r, 'falta', 3)) p.v += 3;
      if (tem(r, 'falta', 4)) p.v += 2;
      if (tem(r, 'falta', 5)) p.b += 3;
      if (tem(r, 'falta', 6)) tempoVenda += 3;

      if (tem(r, 'falta', 3) || r.publico === 0) {
        sinal('trafego', 'v', tem(r, 'falta', 3) ? 'Falta público para oferecer a mentoria' : 'Público pequeno: menos de 1 mil pessoas',
          'De onde vem o público hoje e o que já foi tentado para atrair gente', 'Tráfego pago e conteúdo');
      }
      if (tem(r, 'falta', 2)) sinal('pagina', 'v', 'Ainda não tem página nem material de venda', 'O que a página precisa mostrar para a primeira oferta', 'Página de vendas');
      if (tem(r, 'falta', 4)) sinal('fechamento', 'v', 'Tem dúvida sobre como conduzir a conversa de venda', 'Montar o passo a passo da conversa de venda', 'Processo comercial');
      if (r.preco === 0 || tem(r, 'falta', 1)) sinal('preco', 'v', 'Preço e oferta ainda não definidos', 'Fechar o preço, o formato e o que entra na oferta', null);
      if (r.plataforma_nv === 1) sinal('plataforma', 'v', 'Escolheu a plataforma de pagamento, falta configurar', 'Configurar a plataforma de pagamento', 'Plataforma de pagamento');
      if (r.plataforma_nv === 2) sinal('plataforma', 'v', 'Ainda não escolheu por onde o aluno vai pagar', 'Escolher e configurar a plataforma de pagamento', 'Plataforma de pagamento');
      if (tem(r, 'falta', 5)) sinal('burocracia', 'b', 'Diz que falta regularizar a empresa e o contrato para vender', 'O que falta regularizar primeiro', null);
    }

    // ---------- back-office
    p.b += [0, 1, 3, jv ? 3 : 2][r.cnpj] || 0;
    p.b += [0, 2, 3, 2][r.contabil] || 0;
    p.b += [0, 2, 3][r.contrato] || 0;
    p.b += [0, 1, 2, 2][r.marca] || 0;
    p.b += [0, 1, 3, 1][r.financeiro] || 0;

    if (r.cnpj === 1) sinal('cnpj', 'b', 'Usa o CNPJ de outra empresa: conferir se a mentoria cabe no contrato social e no CNAE', 'Qual é a outra empresa e se a atividade de mentoria já foi incluída nela', 'Contabilidade');
    if (r.cnpj === 2) sinal('cnpj', 'b', jv ? 'Vende no CPF, como pessoa física' : 'Pretende vender no CPF, como pessoa física', 'Abrir um CNPJ para a mentoria ou usar uma empresa que já existe', 'Contabilidade');
    if (r.cnpj === 3) sinal('cnpj', 'b', 'Ainda não decidiu por qual CNPJ vender', 'Abrir um CNPJ para a mentoria ou usar uma empresa que já existe', 'Contabilidade');
    if (r.contabil >= 1) {
      sinal('contabil', 'b',
        ['', 'Tem contador, mas a mentoria ainda não foi tratada com ele', 'Não tem contador', 'Não sabe dizer se a empresa está preparada para vender mentoria'][r.contabil],
        'Atividade no CNPJ (CNAE), regime de impostos e emissão de nota para a mentoria', 'Contabilidade');
    }
    if (r.contrato >= 1) {
      sinal('contrato', 'b', r.contrato === 1 ? 'Usa um contrato adaptado, sem advogado' : 'Não tem contrato com o aluno',
        'O que o contrato precisa cobrir: entrega, prazo, cancelamento e reembolso', 'Assessoria jurídica');
    }
    if (r.marca === 2) sinal('marca', 'b', 'Nome da mentoria sem registro de marca', 'Registro do nome da mentoria no INPI', 'Assessoria jurídica');
    if (r.marca === 3) sinal('marca', 'b', 'Nome da mentoria ainda não definido', 'Escolher o nome e consultar a disponibilidade antes de divulgar', 'Assessoria jurídica');
    if (r.financeiro === 1) sinal('financeiro', 'b', 'Conta separada, mas sem controle financeiro', 'Como acompanhar entradas, saídas e parcelas a receber', 'Gestão financeira');
    if (r.financeiro === 2) sinal('financeiro', 'b', 'Dinheiro da mentoria misturado com outras contas', 'Como separar a conta e acompanhar entradas, saídas e parcelas a receber', 'Gestão financeira');

    // ---------- time e estrutura
    p.t += [3, 2, 1, 0][r.time] || 0;
    const funcoes = lista(r, 'funcoes').filter(function (i) { return i !== PERGUNTAS.funcoes.exclusiva; });
    p.t += funcoes.length >= 5 ? 3 : funcoes.length >= 3 ? 2 : funcoes.length >= 1 ? 1 : 0;
    const ferramentas = lista(r, 'ferramentas').filter(function (i) { return i !== PERGUNTAS.ferramentas.exclusiva; });
    p.t += ferramentas.length === 0 ? 3 : ferramentas.length <= 2 ? 2 : ferramentas.length <= 4 ? 1 : 0;
    p.t += [0, 1, 2][r.dedicacao] || 0;
    p.t += Math.min(3, tempoVenda);

    if (r.time === 0) sinal('sozinho', 't', 'Trabalha sem equipe', 'Qual é a primeira função a contratar ou terceirizar', 'Contratação e formação de time');
    if (funcoes.length >= 3) {
      sinal('funcoes', 't', 'Concentra ' + funcoes.length + ' funções: ' + juntar(funcoes.map(function (i) { return PERGUNTAS.funcoes.curto[i]; })),
        'O que dá para delegar primeiro', 'Contratação e formação de time');
    }
    if (ferramentas.length === 0) sinal('ferramentas', 't', 'Não usa nenhuma ferramenta de operação', 'Quais ferramentas montar primeiro', 'Ferramentas de operação');
    if (ferramentas.length === 1) sinal('ferramentas', 't', 'Usa só uma ferramenta de operação: ' + PERGUNTAS.ferramentas.curto[ferramentas[0]], 'Quais ferramentas montar primeiro', 'Ferramentas de operação');
    if (r.dedicacao === 2) sinal('dedicacao', 't', 'Dedica só algumas horas por semana à mentoria', 'Quanto tempo consegue liberar e o que precisa sair da agenda', null);
    if (tem(r, 'gargalo', 4) && jv || tem(r, 'falta', 6) && !jv) sinal('tempo', 't', 'Falta tempo ou gente para vender', 'Quem pode assumir a venda, ou parte dela', 'Contratação e formação de time');

    // ---------- produto (mentoria ainda em construção): não entra em grupo, abre a conversa
    const querTerminar = r.prioridade === 3;
    const faltaTerminar = !jv && tem(r, 'falta', 0);
    if (m <= 1 || faltaTerminar || querTerminar) {
      const texto = m === 0 ? 'A mentoria ainda não começou a ser montada'
        : m === 1 ? 'A mentoria ainda está em construção'
        : m === 2 ? 'Marcou a mentoria como pronta, mas diz que ainda falta terminar'
        : 'Já vende, mas quer prioridade para terminar de montar a mentoria';
      sinal('produto', 'p', texto, 'O que falta para a mentoria ficar pronta e a data prevista', null);
    }

    // ---------- prioridade declarada
    const grupoPrioridade = ['v', 'b', 't', null][r.prioridade] || null;
    if (grupoPrioridade) p[grupoPrioridade] += 3;

    const teto = TETO[c];
    const dores = {
      v: Math.round(100 * p.v / teto.v),
      b: Math.round(100 * p.b / teto.b),
      t: Math.round(100 * p.t / teto.t)
    };
    const fixa = ['v', 'b', 't'];
    const ordem = fixa.slice().sort(function (a, b) {
      if (dores[b] !== dores[a]) return dores[b] - dores[a];
      if (a === grupoPrioridade) return -1;
      if (b === grupoPrioridade) return 1;
      return fixa.indexOf(a) - fixa.indexOf(b);
    });
    const principal = ordem[0];

    // ---------- roteiro da conversa de 1 hora
    const roteiro = [];
    const produto = sinais.filter(function (s) { return s.cl === 'p'; })[0];
    if (produto) roteiro.push({ quando: 'Antes de tudo', grupo: 'A mentoria', itens: [produto.aprofundar] });
    const rotulos = ['Comece por', 'Em seguida', 'Se houver tempo'];
    const limites = [3, 2, 1];
    ordem.forEach(function (cl, i) {
      const itens = [];
      sinais.forEach(function (s) {
        if (s.cl === cl && itens.indexOf(s.aprofundar) === -1 && itens.length < limites[i]) itens.push(s.aprofundar);
      });
      if (itens.length) roteiro.push({ quando: rotulos[i], grupo: GRUPOS[cl].nome, itens: itens });
    });

    // ---------- soluções para apresentar (na ordem dos grupos que mais doem)
    const solucoes = [];
    ordem.forEach(function (cl) {
      sinais.forEach(function (s) {
        if (s.cl === cl && s.solucao && solucoes.indexOf(s.solucao) === -1) solucoes.push(s.solucao);
      });
    });

    // ---------- leitura em uma frase (para o time)
    const etapa = m + 1;
    // registro de teste tem o nome começando por "TESTE ": a frase usa o nome que vem depois
    const primeiro = String(nome || '').trim().replace(/^TESTE\s+/i, '').split(/\s+/)[0] || 'O aluno';
    let leitura = primeiro + ' está na etapa ' + etapa + ' de 5: ' + ETAPAS[m].time + '. ';
    if (dores[principal] < 34) {
      leitura += 'As respostas não mostram dor forte em nenhum grupo. A maior é ' + GRUPOS[principal].nome + ', com ' + dores[principal] + '%.';
    } else {
      leitura += 'A dor principal é ' + GRUPOS[principal].nome + ' (' + nivel(dores[principal]) + ', ' + dores[principal] + '%).';
    }
    if (grupoPrioridade === principal) leitura += ' É também a prioridade que declarou.';
    else if (grupoPrioridade) leitura += ' Declarou outra prioridade: ' + GRUPOS[grupoPrioridade].nome + '.';
    else leitura += ' Declarou como prioridade terminar de montar a mentoria.';

    return {
      versao: VERSAO,
      caminho: c,
      caminhoNome: NOME_CAMINHO[c],
      etapa: etapa,
      etapaNome: ETAPAS[m].nome,
      dores: dores,
      niveis: { v: nivel(dores.v), b: nivel(dores.b), t: nivel(dores.t) },
      ordem: ordem,
      principal: principal,
      principalNome: GRUPOS[principal].nome,
      prioridade: grupoPrioridade,                               // 'v' | 'b' | 't' | null (terminar a mentoria)
      prioridadeTexto: PERGUNTAS.prioridade.opcoes[r.prioridade] || '',
      sinais: sinais,
      roteiro: roteiro,
      solucoes: solucoes,
      leitura: leitura,
      focoAluno: GRUPOS[principal].foco,
      etapaAluno: ETAPAS[m].aluno
    };
  }

  // Perguntas e respostas por extenso, na ordem em que a pessoa respondeu
  function respostasLegiveis(r) {
    return sequencia(r).map(function (id, i) {
      const q = PERGUNTAS[id];
      const v = r[id];
      const textos = q.tipo === 'uma'
        ? (typeof v === 'number' && q.opcoes[v] ? [q.opcoes[v]] : [])
        : lista(r, id).map(function (j) { return q.opcoes[j]; });
      return { id: id, numero: i + 1, bloco: BLOCOS[q.bloco], pergunta: q.titulo, respostas: textos };
    });
  }

  // Fichas de exemplo (uma por grupo) para a validação e para os testes. Nomes começam por "TESTE ".
  const EXEMPLOS = [
    {
      rotulo: 'Exemplo: dor em vendas',
      contato: { nome: 'TESTE Marina Exemplo', email: 'marina@exemplo.com', telefone: '(85) 90000-0001' },
      respostas: { momento: 3, fat: 1, canais: [0], plataforma: [5], gargalo: [0, 1], cnpj: 0, contabil: 0, contrato: 0, marca: 1, financeiro: 0, time: 2, funcoes: [3], ferramentas: [1, 2, 3], dedicacao: 0, prioridade: 0 }
    },
    {
      rotulo: 'Exemplo: dor em back-office',
      contato: { nome: 'TESTE Renata Exemplo', email: 'renata@exemplo.com', telefone: '(85) 90000-0002' },
      respostas: { momento: 2, preco: 3, publico: 2, plataforma_nv: 0, falta: [5], cnpj: 1, contabil: 1, contrato: 2, marca: 2, financeiro: 2, time: 1, funcoes: [0, 5], ferramentas: [1, 2], dedicacao: 1, prioridade: 1 }
    },
    {
      rotulo: 'Exemplo: dor em time',
      contato: { nome: 'TESTE Paulo Exemplo', email: 'paulo@exemplo.com', telefone: '(85) 90000-0003' },
      respostas: { momento: 4, fat: 3, canais: [0, 1, 5], plataforma: [0], gargalo: [4, 3], cnpj: 0, contabil: 0, contrato: 0, marca: 0, financeiro: 1, time: 1, funcoes: [0, 1, 2, 4, 5], ferramentas: [1], dedicacao: 0, prioridade: 2 }
    }
  ];

  const MOTOR = {
    VERSAO: VERSAO, BLOCOS: BLOCOS, GRUPOS: GRUPOS, ETAPAS: ETAPAS, PERGUNTAS: PERGUNTAS,
    RAMOS: RAMOS, COMUNS: COMUNS, NOME_CAMINHO: NOME_CAMINHO, TETO: TETO, EXEMPLOS: EXEMPLOS,
    caminho: caminho, sequencia: sequencia, respondida: respondida, completo: completo,
    nivel: nivel, diagnosticar: diagnosticar, respostasLegiveis: respostasLegiveis
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = MOTOR;
  else raiz.MOTOR = MOTOR;
})(typeof window !== 'undefined' ? window : this);
