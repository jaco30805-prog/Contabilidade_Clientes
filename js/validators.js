/**
 * Módulo de Validação e Formatação de Dados Contábeis
 * Sistema de Gestão de Clientes - Consultório Contábil
 */

const Validators = {
  // Limpar caracteres não numéricos
  onlyNumbers(value) {
    return (value || '').toString().replace(/\D/g, '');
  },

  // Formatar CNPJ: 00.000.000/0000-00
  formatCNPJ(value) {
    const numbers = this.onlyNumbers(value).slice(0, 14);
    if (!numbers) return '';
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  },

  // Validar CNPJ
  validateCNPJ(cnpj) {
    const clean = this.onlyNumbers(cnpj);
    if (clean.length !== 14) return false;
    
    // Elimina CNPJs inválidos conhecidos (todos dígitos iguais)
    if (/^(\d)\1+$/.test(clean)) return false;

    // Valida 1º dígito verificador
    let tamanho = clean.length - 2;
    let numeros = clean.substring(0, tamanho);
    let digitos = clean.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

    // Valida 2º dígito verificador
    tamanho = tamanho + 1;
    numeros = clean.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

    return true;
  },

  // Formatar CPF: 000.000.000-00
  formatCPF(value) {
    const numbers = this.onlyNumbers(value).slice(0, 11);
    if (!numbers) return '';
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  },

  // Validar CPF
  validateCPF(cpf) {
    const clean = this.onlyNumbers(cpf);
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(clean.substring(9, 10), 10)) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(clean.substring(10, 11), 10)) return false;

    return true;
  },

  // Formatar Telefone / Celular: (11) 98765-4321 ou (11) 3456-7890
  formatPhone(value) {
    const numbers = this.onlyNumbers(value).slice(0, 11);
    if (!numbers) return '';
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  },

  // Formatar CEP: 00000-000
  formatCEP(value) {
    const numbers = this.onlyNumbers(value).slice(0, 8);
    if (!numbers) return '';
    return numbers.replace(/^(\d{5})(\d)/, '$1-$2');
  },

  // Formatar Moeda BRL: R$ 1.500,00
  formatCurrency(value) {
    if (value === null || value === undefined || value === '') return 'R$ 0,00';
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  // Converter string formatada (R$ 1.500,00 ou 1500,00) para Float
  parseCurrency(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.toString().replace(/[^\d,-]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  },

  // Formatar Data ISO (YYYY-MM-DD) para PT-BR (DD/MM/YYYY)
  formatDate(dateStr) {
    if (!dateStr) return '-';
    // Se vier YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  },

  // Calcular dias restantes até a data informada
  daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Status e Badge de vencimento (Certificado Digital, CND, etc.)
  getExpirationStatus(dateStr, warningDays = 30) {
    // badgeClass sempre no formato "chip-*", para casar com as classes
    // reais definidas em css/styles.css (usadas em todo o app como
    // `class="chip ${status.badgeClass}"`).
    if (!dateStr) {
      return { status: 'none', label: 'Não informado', days: null, badgeClass: 'chip-muted' };
    }
    const days = this.daysUntil(dateStr);
    if (days < 0) {
      return {
        status: 'expired',
        label: `Vencido há ${Math.abs(days)} dia(s)`,
        days,
        badgeClass: 'chip-danger'
      };
    }
    if (days === 0) {
      return {
        status: 'today',
        label: 'Vence Hoje!',
        days,
        badgeClass: 'chip-danger'
      };
    }
    if (days <= warningDays) {
      return {
        status: 'warning',
        label: `Vence em ${days} dia(s)`,
        days,
        badgeClass: 'chip-warning'
      };
    }
    return {
      status: 'valid',
      label: `Válido (${days} dias)`,
      days,
      badgeClass: 'chip-success'
    };
  },

  // Buscar endereço via ViaCEP
  async fetchViaCEP(cep) {
    const clean = this.onlyNumbers(cep);
    if (clean.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos.');
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        throw new Error('CEP não encontrado na base dos Correios.');
      }
      return {
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        complemento: data.complemento || ''
      };
    } catch (err) {
      console.warn('Falha ao buscar ViaCEP:', err.message);
      throw err;
    }
  },

  // Chamada crua à BrasilAPI (espelho público da Receita Federal, gratuito
  // e sem necessidade de chave/credencial) — usada tanto pelo autofill de
  // cadastro (fetchCNPJData) quanto pela verificação de Simples/MEI
  // (checkSimplesStatus), sem duplicar validação/tratamento de erro.
  async _fetchReceitaCNPJ(cnpj) {
    const clean = this.onlyNumbers(cnpj);
    if (clean.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos.');
    }
    // Corta na validação local (mesmo dígito verificador usado no cadastro)
    // antes de gastar uma chamada de rede com um CNPJ que já sabemos inválido.
    if (!this.validateCNPJ(clean)) {
      throw new Error('CNPJ inválido — confira os dígitos.');
    }
    let res;
    try {
      res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    } catch (err) {
      throw new Error('Não foi possível consultar a Receita Federal agora. Verifique sua conexão.');
    }
    if (!res.ok) {
      // A API devolve uma mensagem específica (ex.: "CNPJ inválido", CNPJ
      // não encontrado) — melhor repassar isso do que um erro genérico.
      const body = await res.json().catch(() => null);
      throw new Error(body?.message
        || (res.status === 404 ? 'CNPJ não encontrado na Receita Federal.' : 'Falha ao consultar CNPJ na Receita Federal.'));
    }
    return res.json();
  },

  // Buscar dados cadastrais via CNPJ pra autopreencher o cadastro de cliente.
  async fetchCNPJData(cnpj) {
    const data = await this._fetchReceitaCNPJ(cnpj);

    // Ano mais recente do histórico de escrituração (ECF) é a melhor pista
    // pública disponível para Lucro Real x Presumido — a API não expõe o
    // "regime tributário" de forma direta como faz para Simples/MEI.
    const regimeHistorico = Array.isArray(data.regime_tributario)
      ? [...data.regime_tributario].sort((a, b) => (b.ano || 0) - (a.ano || 0))[0]
      : null;
    const tributacaoMap = { 'LUCRO REAL': 'LUCRO_REAL', 'LUCRO PRESUMIDO': 'LUCRO_PRESUMIDO' };

    let taxRegimeGuess = null;
    if (data.opcao_pelo_mei === true) taxRegimeGuess = 'MEI';
    else if (data.opcao_pelo_simples === true) taxRegimeGuess = 'SIMPLES_NACIONAL';
    else if (regimeHistorico) taxRegimeGuess = tributacaoMap[regimeHistorico.forma_de_tributacao] || null;

    let companySizeGuess = null;
    if (data.opcao_pelo_mei === true) companySizeGuess = 'MEI';
    else if (data.codigo_porte === '01' || data.codigo_porte === 1) companySizeGuess = 'ME';
    else if (data.codigo_porte === '03' || data.codigo_porte === 3) companySizeGuess = 'EPP';
    // codigo_porte "05" (DEMAIS) cobre médio e grande porte sem distinção —
    // não dá pra chutar qual dos dois sem arriscar preencher errado.

    return {
      companyName: data.razao_social || '',
      tradeName: data.nome_fantasia || '',
      foundingDate: data.data_inicio_atividade || '',
      situacao: data.descricao_situacao_cadastral || '',
      taxRegimeGuess,
      companySizeGuess,
      cnaeCode: data.cnae_fiscal ? String(data.cnae_fiscal) : '',
      cnaeDesc: data.cnae_fiscal_descricao || '',
      cep: data.cep || '',
      street: [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim(),
      number: data.numero || '',
      complement: data.complemento || '',
      neighborhood: data.bairro || '',
      city: data.municipio || '',
      state: data.uf || '',
      phone: data.ddd_telefone_1 || '',
      email: data.email || '',
      // Percentual de participação societária não é público na Receita —
      // a API não retorna esse campo, só nome/CPF (mascarado) e qualificação.
      partners: (data.qsa || []).map(s => ({
        name: s.nome_socio || '',
        cpf: s.cnpj_cpf_do_socio || '',
        isAdmin: /administr|presidente|titular|s[oó]cio-ger/i.test(s.qualificacao_socio || '')
      }))
    };
  },

  // Verifica se o CNPJ continua optante pelo Simples Nacional / MEI.
  // Usa a mesma base pública da Receita (Cadastro Nacional de Pessoa
  // Jurídica) do autofill — NÃO é a consulta "ao vivo" do portal oficial
  // (essa exige captcha, sem API sem contratar provedor pago), então pode
  // ter alguma defasagem em relação ao portal. Serve pra pegar exclusão que
  // passou despercebida, não substitui a certidão oficial em caso de dúvida.
  async checkSimplesStatus(cnpj) {
    const data = await this._fetchReceitaCNPJ(cnpj);
    return {
      companyName: data.razao_social || '',
      situacaoCadastral: data.descricao_situacao_cadastral || '',
      isSimples: data.opcao_pelo_simples === true,
      isMei: data.opcao_pelo_mei === true,
      dataExclusaoSimples: data.data_exclusao_do_simples || null,
      dataExclusaoMei: data.data_exclusao_do_mei || null
    };
  }
};

window.Validators = Validators;
