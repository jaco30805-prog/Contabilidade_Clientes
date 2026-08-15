/**
 * Voal Consult — Calculadora de Preço
 *
 * Reproduz a lógica de tabela_precos_contabilidade.xlsx (aba "Calculadora de
 * Preço"), com as tabelas de referência guardadas no Supabase (pricing_*) e
 * ajustáveis dentro do programa, em vez de fixas na planilha.
 *
 * IMPORTANTE: preço é definido e combinado com o cliente ANTES do serviço
 * começar. Não tem nenhuma relação com o tempo efetivamente gasto
 * (js/timeTracking.js) — são módulos completamente independentes.
 */
const Pricing = {
  baseRates: [],
  employeeTiers: [],
  nfTiers: [],
  movementTiers: [],
  complexityAddons: [],
  urgencyMultipliers: [],
  settings: {},
  settingsMeta: [],
  avulsoServices: [],
  employmentEvents: [],

  async loadAll() {
    const [baseRates, employeeTiers, nfTiers, movementTiers, complexityAddons, urgencyMultipliers, settings, avulsoServices, employmentEvents] = await Promise.all([
      sb.from('pricing_base_rates').select('*').order('regime').order('atividade'),
      sb.from('pricing_employee_tiers').select('*').order('funcionarios'),
      sb.from('pricing_nf_tiers').select('*').order('tipo_emissao').order('limite_inferior'),
      sb.from('pricing_movement_tiers').select('*').order('limite_inferior'),
      sb.from('pricing_complexity_addons').select('*').order('adicional'),
      sb.from('pricing_urgency_multipliers').select('*').order('multiplicador'),
      sb.from('pricing_settings').select('*').order('key'),
      sb.from('pricing_avulso_services').select('*').order('servico'),
      sb.from('pricing_employment_events').select('*').order('evento')
    ]);

    this.baseRates = baseRates.data || [];
    this.employeeTiers = employeeTiers.data || [];
    this.nfTiers = nfTiers.data || [];
    this.movementTiers = movementTiers.data || [];
    this.complexityAddons = complexityAddons.data || [];
    this.urgencyMultipliers = urgencyMultipliers.data || [];
    this.settingsMeta = settings.data || [];
    this.settings = {};
    this.settingsMeta.forEach(s => { this.settings[s.key] = Number(s.value); });
    this.avulsoServices = avulsoServices.data || [];
    this.employmentEvents = employmentEvents.data || [];
  },

  // Equivalente a um VLOOKUP aproximado (TRUE): pega o maior limite_inferior
  // que ainda é <= value.
  _tierLookup(tiers, value) {
    let match = null;
    tiers.forEach(t => {
      if (t.limite_inferior <= value && (!match || t.limite_inferior > match.limite_inferior)) match = t;
    });
    return match;
  },

  calculate(input) {
    const baseRow = this.baseRates.find(r => r.regime === input.regime && r.atividade === input.atividade);
    const baseValue = baseRow ? Number(baseRow.valor_base) : 0;

    let dpValue = 0;
    const funcionarios = Number(input.funcionarios) || 0;
    if (funcionarios <= 10) {
      const tier = this.employeeTiers.find(t => t.funcionarios === funcionarios);
      dpValue = tier ? Number(tier.adicional) : 0;
    } else {
      dpValue = Number(this.settings.funcionarios_acima_10_base || 0) + (funcionarios - 10) * Number(this.settings.funcionarios_acima_10_incremento || 0);
    }

    const nfTiersFiltered = this.nfTiers.filter(t => t.tipo_emissao === input.tipoEmissao);
    const nfMatch = this._tierLookup(nfTiersFiltered, Number(input.volumeNf) || 0);
    const nfValue = nfMatch ? Number(nfMatch.adicional) : 0;

    const movMatch = this._tierLookup(this.movementTiers, Number(input.movimentacoes) || 0);
    const movValue = movMatch ? Number(movMatch.adicional) : 0;

    const complexRow = this.complexityAddons.find(c => c.tipo_atividade === input.complexidade);
    const complexValue = complexRow ? Number(complexRow.adicional) : 0;

    const subtotal = baseValue + dpValue + nfValue + movValue + complexValue;

    const urgRow = this.urgencyMultipliers.find(u => u.nivel === input.urgencia);
    const multiplicador = urgRow ? Number(urgRow.multiplicador) : 1;

    const piso = input.regime === 'MEI' ? Number(this.settings.piso_mei || 0) : Number(this.settings.piso_outros || 0);
    const precoSugerido = Math.max(subtotal * multiplicador, piso);

    const custoSistemas = Number(input.custoSistemas) || 0;
    const custoMaoObra = Number(input.custoMaoObra) || 0;
    const custoIndireto = Number(input.custoIndireto) || 0;
    const impostoPct = input.impostoPct !== '' && input.impostoPct != null
      ? Number(input.impostoPct)
      : Number(this.settings.imposto_servico_padrao || 0);

    const custoTotal = custoSistemas + custoMaoObra + custoIndireto + precoSugerido * impostoPct;
    const margem = precoSugerido - custoTotal;
    const margemPct = precoSugerido > 0 ? margem / precoSugerido : 0;

    return {
      baseValue, dpValue, nfValue, movValue, complexValue, subtotal,
      multiplicador, piso, precoSugerido,
      custoSistemas, custoMaoObra, custoIndireto, impostoPct, custoTotal, margem, margemPct
    };
  }
};

window.Pricing = Pricing;
