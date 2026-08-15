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
  }
};

window.Validators = Validators;
