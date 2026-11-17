/* DEM · devolutiva breve para o aluno (SUGESTÃO, ainda não publicada)
   Monta, por regra fixa e sem IA, o texto curto que o aluno pode ver sobre o próprio diagnóstico.
   Depende do motor (MOTOR.diagnosticar). Não mostra percentual, nome de solução nem parceiro.
   Tom: consultivo, direto, sem promessa de contato além da conversa individual. */
(function (raiz) {
  'use strict';
  const MOTOR = (typeof module !== 'undefined' && module.exports) ? require('./diagnostico-mentoria-motor.js') : raiz.MOTOR;

  // Onde você está: um parágrafo por etapa (1 a 5)
  const ONDE = [
    'Você tem o tema e ainda não começou a montar. É o ponto de partida de toda mentoria. Antes de pensar em venda, o trabalho agora é dar forma ao método, aos encontros e ao que o seu aluno leva no fim.',
    'A sua mentoria está em construção. Método, encontros e materiais estão tomando forma, e este é o momento de fechar o desenho para poder marcar uma data de lançamento.',
    'A sua mentoria está pronta e ainda não foi vendida. O produto existe. O passo que falta é levar os primeiros alunos até ele.',
    'Você já vendeu a sua mentoria, e as vendas ainda não ganharam ritmo. Isso mostra que existe quem compre. O trabalho agora é transformar vendas pontuais em rotina.',
    'Você vende com regularidade e quer crescer. A mentoria já se provou, e daqui para a frente o crescimento depende mais da estrutura em volta dela do que do seu esforço pessoal.'
  ];

  // O que pede atenção agora: um parágrafo por grupo principal
  const ATENCAO = {
    v_jv: 'Pelas suas respostas, o que mais pede atenção hoje são as vendas: como as pessoas chegam até a sua mentoria e o que acontece até elas comprarem.',
    v_nv: 'Pelas suas respostas, o que mais pede atenção hoje é a preparação para vender: preço, público e o caminho até a compra.',
    b: 'Pelas suas respostas, o que mais pede atenção hoje é a base do negócio: empresa, contrato, contabilidade e controle do dinheiro. É a parte que o aluno não vê e que protege você quando a mentoria cresce.',
    t: 'Pelas suas respostas, o que mais pede atenção hoje é a estrutura em volta de você: quem faz o quê, quais ferramentas sustentam a operação e quanto do trabalho ainda passa pelas suas mãos.'
  };

  // O que já está mais encaminhado (só aparece quando o grupo tem dor baixa)
  const ENCAMINHADO = {
    v: 'as vendas',
    b: 'a base do negócio (empresa, contrato e finanças)',
    t: 'o time e a estrutura'
  };

  // A prioridade que o aluno marcou na última pergunta, escrita para caber dentro da frase
  const PRIORIDADE = [
    'vender, seja começar ou vender mais',
    'organizar o jurídico, o contábil e o financeiro',
    'montar o time e sair do operacional',
    'terminar de montar a mentoria'
  ];

  // Cada sinal do motor, dito para o aluno como um passo
  function passo(s, r) {
    switch (s.id) {
      case 'trafego': return 'Atrair mais gente interessada na sua mentoria.';
      case 'pagina': return 'Ter uma página de vendas que apresente bem a sua mentoria.';
      case 'fechamento': return 'Ganhar segurança na conversa de venda.';
      case 'crm': return 'Acompanhar quem demonstrou interesse até a decisão de compra.';
      case 'canal_unico': return 'Abrir um segundo caminho de venda, para não depender de um só.';
      case 'preco': return 'Fechar o preço e o que entra na sua oferta.';
      case 'plataforma': return 'Definir e configurar por onde o seu aluno vai pagar.';
      case 'pix': return 'Organizar a cobrança numa plataforma de pagamento.';
      case 'burocracia': return 'Destravar contrato, cobrança e nota fiscal.';
      case 'cnpj': return r.cnpj === 1 ? 'Conferir com o contador se a mentoria cabe no CNPJ que você usa.' : 'Definir por qual CNPJ a mentoria vai ser vendida.';
      case 'contabil': return 'Preparar a parte contábil para a mentoria: atividade no CNPJ, impostos e nota fiscal.';
      case 'contrato': return 'Ter um contrato feito para a sua mentoria.';
      case 'marca': return r.marca === 3 ? 'Definir o nome da mentoria e verificar se ele está disponível.' : 'Proteger o nome da sua mentoria com o registro de marca.';
      case 'financeiro': return 'Separar e acompanhar o dinheiro da mentoria.';
      case 'sozinho': return 'Escolher a primeira função para tirar das suas mãos.';
      case 'funcoes': return 'Delegar parte do que hoje depende só de você.';
      case 'ferramentas': return 'Montar as ferramentas básicas da operação.';
      case 'dedicacao': return 'Abrir mais espaço na agenda para a mentoria.';
      case 'tempo': return 'Ter quem ajude você nas vendas.';
      case 'produto': return 'Concluir a montagem da mentoria e marcar uma data.';
      default: return null;
    }
  }

  function montar(r, nome) {
    const d = MOTOR.diagnosticar(r, nome);
    if (!d) return null;
    const primeiro = String(nome || '').trim().replace(/^TESTE\s+/i, '').split(/\s+/)[0] || '';

    // até 3 passos: primeiro o que falta na própria mentoria, depois o grupo principal, depois os outros
    const ordem = ['p'].concat(d.ordem);
    const pontos = [];
    ordem.forEach(function (cl) {
      d.sinais.forEach(function (s) {
        if (s.cl !== cl || pontos.length >= 3) return;
        const t = passo(s, r);
        if (t && pontos.indexOf(t) === -1) pontos.push(t);
      });
    });

    const menor = d.ordem[2];
    // quem ainda não vende nunca recebe "as vendas" como parte encaminhada
    const podeCitar = d.dores[menor] < 34 && menor !== d.principal && !(menor === 'v' && d.caminho === 'nv');
    const encaminhado = podeCitar ? 'A parte mais encaminhada hoje: ' + ENCAMINHADO[menor] + '.' : '';

    return {
      titulo: (primeiro ? primeiro + ', este' : 'Este') + ' é o momento da sua mentoria',
      etapa: d.etapa,
      etapaNome: d.etapaNome,
      ondeEsta: ONDE[d.etapa - 1],
      atencao: d.principal === 'v' ? ATENCAO[d.caminho === 'jv' ? 'v_jv' : 'v_nv'] : ATENCAO[d.principal],
      pontos: pontos,
      encaminhado: encaminhado,
      prioridade: PRIORIDADE[r.prioridade] ? 'Você apontou como prioridade para os próximos 90 dias: ' + PRIORIDADE[r.prioridade] + '.' : '',
      fecho: 'A sua conversa individual vai aprofundar estes pontos com você.'
    };
  }

  const API = { montar: montar };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else raiz.DEM_DEVOLUTIVA = API;
})(typeof window !== 'undefined' ? window : this);
