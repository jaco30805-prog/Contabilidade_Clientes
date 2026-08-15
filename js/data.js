/**
 * Voal Consult — ERP & Gestão Contábil
 * Camada de Dados — Supabase (Postgres + RLS), com cache local em memória
 *
 * DataStore.init() busca tudo do Supabase uma vez por carregamento de
 * página e guarda em DataStore._clients. Leituras (getClients,
 * getClientById) continuam síncronas, lendo desse cache — igual ao
 * comportamento anterior baseado em localStorage — para não exigir reescrever
 * toda a renderização em app.js. Escritas (upsertClient, deleteClient,
 * addInteraction) são assíncronas: gravam no Supabase e só então atualizam
 * o cache local.
 *
 * A proteção dos dados não depende deste arquivo: RLS no banco já nega
 * qualquer leitura/escrita sem sessão autenticada.
 */

const DataStore = {
  _clients: [],
  _profilesById: {},
  _obligationsCatalog: [],
  _avulsoCatalog: [],
  _avulsoRequests: [],
  _initialized: false,

  TaxRegimes: {
    SIMPLES_NACIONAL: { id: 'SIMPLES_NACIONAL', name: 'Simples Nacional', badge: 'chip-info', color: '#10B981' },
    LUCRO_PRESUMIDO: { id: 'LUCRO_PRESUMIDO', name: 'Lucro Presumido', badge: 'chip-info', color: '#3B82F6' },
    LUCRO_REAL: { id: 'LUCRO_REAL', name: 'Lucro Real', badge: 'chip-info', color: '#8B5CF6' },
    MEI: { id: 'MEI', name: 'MEI', badge: 'chip-warning', color: '#F59E0B' },
    IMUNE_ISENTA: { id: 'IMUNE_ISENTA', name: 'Imune / Isenta', badge: 'chip-muted', color: '#EC4899' }
  },

  CompanySizes: [
    { id: 'MEI', name: 'MEI' },
    { id: 'ME', name: 'ME (Microempresa)' },
    { id: 'EPP', name: 'EPP (Empresa de Pequeno Porte)' },
    { id: 'MEDIO', name: 'Médio Porte' },
    { id: 'GRANDE', name: 'Grande Porte' }
  ],

  ClientStatuses: [
    { id: 'ATIVO', name: 'Ativo', badge: 'chip-success' },
    { id: 'IMPLANTACAO', name: 'Em Implantação', badge: 'chip-info' },
    { id: 'SUSPENSO', name: 'Suspenso', badge: 'chip-warning' },
    { id: 'INATIVO', name: 'Inativo', badge: 'chip-danger' }
  ],

  CND_TYPES: ['federal', 'estadual', 'municipal', 'fgts', 'trabalhista'],

  // Mantido por compatibilidade — o catálogo "de verdade" agora mora na
  // tabela obligations_catalog e é carregado em init(). Este getter expõe o
  // que foi carregado, no mesmo formato que o código antigo esperava.
  get DefaultObligationsCatalog() {
    return this._obligationsCatalog;
  },

  // =========================================================================
  // INICIALIZAÇÃO — busca tudo do Supabase e monta o cache em memória
  // =========================================================================
  async init() {
    try {
      const [clientsRes, profilesRes, catalogRes, avulsoCatalogRes, avulsoRequestsRes] = await Promise.all([
        sb.from('clients').select(`
          *,
          client_secondary_cnaes(*),
          client_addresses(*),
          client_partners(*),
          client_digital_certificates(*),
          client_financial(*),
          client_cnds(*),
          client_interactions(*)
        `).order('company_name', { ascending: true }),
        sb.from('profiles').select('*'),
        sb.from('obligations_catalog').select('*').eq('active', true),
        sb.from('avulso_service_catalog').select('*').eq('ativo', true).order('modulo').order('ordem'),
        sb.from('avulso_service_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (catalogRes.error) throw catalogRes.error;
      if (avulsoCatalogRes.error) throw avulsoCatalogRes.error;
      if (avulsoRequestsRes.error) throw avulsoRequestsRes.error;

      this._profilesById = {};
      (profilesRes.data || []).forEach(p => { this._profilesById[p.id] = p; });

      this._obligationsCatalog = (catalogRes.data || []).map(row => ({
        code: row.code,
        name: row.name,
        frequency: row.frequency,
        dueDay: row.due_day,
        dueMonth: row.due_month,
        department: row.department,
        applicableRegimes: row.applicable_regimes || [],
        description: row.description
      }));

      this._avulsoCatalog = (avulsoCatalogRes.data || []).map(row => this._mapAvulsoCatalogFromDb(row));
      this._avulsoRequests = (avulsoRequestsRes.data || []).map(row => this._mapAvulsoRequestFromDb(row));

      this._clients = (clientsRes.data || []).map(row => this._mapClientFromDb(row));
      this._initialized = true;
      return this._clients;
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
      window.App?.showToast?.('Não foi possível carregar os dados. Verifique sua conexão.', 'danger');
      this._clients = this._clients || [];
      return this._clients;
    }
  },

  // =========================================================================
  // MAPEAMENTO: linhas do banco (snake_case, normalizado) -> objeto do app
  // (camelCase, aninhado) — mesmo formato usado em toda a renderização.
  // =========================================================================
  _mapClientFromDb(row) {
    const addresses = row.client_addresses || [];
    const currentAddress = addresses.find(a => a.is_current) || addresses[0] || {};

    const financialRaw = Array.isArray(row.client_financial) ? row.client_financial[0] : row.client_financial;
    const fin = financialRaw || {};

    const certs = row.client_digital_certificates || [];
    const cert = [...certs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || {};

    const cndsByType = {};
    (row.client_cnds || []).forEach(c => {
      cndsByType[c.tipo] = {
        validUntil: c.valid_until || '',
        status: c.status,
        notes: c.notes || '',
        source: c.source
      };
    });

    const interactions = (row.client_interactions || [])
      .map(i => ({
        id: i.id,
        date: i.occurred_on,
        type: i.type,
        title: i.title,
        content: i.content,
        user: this._profilesById[i.created_by]?.full_name || 'Voal Consult'
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      type: row.type,
      recurrence: row.recurrence || 'RECORRENTE',
      companyName: row.company_name,
      tradeName: row.trade_name || '',
      cnpj: row.cnpj || '',
      cpf: row.cpf || '',
      stateRegistration: row.state_registration || '',
      municipalRegistration: row.municipal_registration || '',
      taxRegime: row.tax_regime,
      companySize: row.company_size || '',
      foundingDate: row.founding_date || '',
      responsibleAccountant: row.responsible_accountant || '',
      department: row.department || '',

      mainCnae: { code: row.main_cnae_code || '', description: row.main_cnae_description || '' },
      secondaryCnaes: (row.client_secondary_cnaes || []).map(c => ({ code: c.code, description: c.description })),

      contactName: row.contact_name || '',
      contactRole: row.contact_role || '',
      phones: row.phones || [],
      whatsapp: row.whatsapp || '',
      email: row.email || '',
      financialEmail: row.financial_email || '',

      address: {
        cep: currentAddress.cep || '',
        street: currentAddress.street || '',
        number: currentAddress.number || '',
        complement: currentAddress.complement || '',
        neighborhood: currentAddress.neighborhood || '',
        city: currentAddress.city || '',
        state: currentAddress.state || ''
      },

      partners: (row.client_partners || []).map(p => ({
        id: p.id,
        name: p.name,
        cpf: p.cpf || '',
        sharePercentage: p.share_percentage || 0,
        isAdmin: p.is_admin,
        hasProLabore: p.has_pro_labore,
        proLaboreValue: p.pro_labore_value || 0
      })),

      digitalCertificate: {
        type: cert.type || '',
        expirationDate: cert.expiration_date || '',
        issuer: cert.issuer || ''
      },
      accessKeys: {
        govBrUser: row.gov_br_user || '',
        simplesCode: row.simples_code || '',
        notes: row.access_notes || ''
      },

      financial: {
        monthlyFee: fin.monthly_fee || 0,
        dueDay: fin.due_day || 10,
        paymentMethod: fin.payment_method || 'BOLETO',
        has13thFee: !!fin.has_13th_fee,
        feeNotes: fin.fee_notes || ''
      },

      // Retrato da última consulta à Receita Federal (autofill de CNPJ e/ou
      // verificação de Simples Nacional/MEI) — persistido, não só exibido
      // na hora e descartado. receitaLastSyncedAt/simplesCheckedAt nulos
      // significam "nunca consultado".
      receita: {
        situacaoCadastral: row.receita_situacao_cadastral || '',
        naturezaJuridica: row.receita_natureza_juridica || '',
        capitalSocial: row.receita_capital_social,
        porteDescricao: row.receita_porte_descricao || '',
        lastSyncedAt: row.receita_last_synced_at || null
      },
      simplesCheck: {
        situacao: row.simples_situacao || null,
        dataExclusao: row.simples_data_exclusao || null,
        checkedAt: row.simples_checked_at || null
      },

      cnds: cndsByType,
      interactions
    };
  },

  // =========================================================================
  // LEITURA (síncrona, a partir do cache já carregado por init())
  // =========================================================================
  getClients() {
    return this._clients;
  },

  getClientById(id) {
    return this._clients.find(c => c.id === id) || null;
  },

  // =========================================================================
  // ESCRITA
  // =========================================================================
  async upsertClient(clientData) {
    const isNew = !clientData.id;

    const clientRow = {
      status: clientData.status || 'ATIVO',
      recurrence: clientData.recurrence || 'RECORRENTE',
      company_name: clientData.companyName,
      trade_name: clientData.tradeName || null,
      cnpj: clientData.cnpj || null,
      cpf: clientData.cpf || null,
      state_registration: clientData.stateRegistration || null,
      municipal_registration: clientData.municipalRegistration || null,
      tax_regime: clientData.taxRegime || null,
      company_size: clientData.companySize || null,
      founding_date: clientData.foundingDate || null,
      responsible_accountant: clientData.responsibleAccountant || null,
      department: clientData.department || null,
      main_cnae_code: clientData.mainCnae?.code || null,
      main_cnae_description: clientData.mainCnae?.description || null,
      contact_name: clientData.contactName || null,
      contact_role: clientData.contactRole || null,
      phones: clientData.phones || [],
      whatsapp: clientData.whatsapp || null,
      email: clientData.email || null,
      financial_email: clientData.financialEmail || null,
      gov_br_user: clientData.accessKeys?.govBrUser || null,
      simples_code: clientData.accessKeys?.simplesCode || null,
      access_notes: clientData.accessKeys?.notes || null
    };

    // Retrato da Receita Federal só é incluído quando veio junto (ex.: CNPJ
    // consultado agora mesmo no formulário de cadastro novo) — omitir a
    // chave, em vez de mandar null, evita apagar um retrato salvo antes por
    // uma edição que não passou pela consulta de novo.
    if (clientData.receita) {
      clientRow.receita_situacao_cadastral = clientData.receita.situacaoCadastral || null;
      clientRow.receita_natureza_juridica = clientData.receita.naturezaJuridica || null;
      clientRow.receita_capital_social = clientData.receita.capitalSocial ?? null;
      clientRow.receita_porte_descricao = clientData.receita.porteDescricao || null;
      clientRow.receita_last_synced_at = clientData.receita.lastSyncedAt || new Date().toISOString();
    }

    let clientId = clientData.id;

    if (isNew) {
      const { data, error } = await sb.from('clients').insert(clientRow).select('id').single();
      if (error) throw error;
      clientId = data.id;
    } else {
      const { error } = await sb.from('clients').update(clientRow).eq('id', clientId);
      if (error) throw error;
    }

    // Honorários (1 linha por cliente)
    if (clientData.financial) {
      const { error } = await sb.from('client_financial').upsert({
        client_id: clientId,
        monthly_fee: clientData.financial.monthlyFee || 0,
        due_day: clientData.financial.dueDay || null,
        payment_method: clientData.financial.paymentMethod || null,
        has_13th_fee: !!clientData.financial.has13thFee,
        fee_notes: clientData.financial.feeNotes || null
      }, { onConflict: 'client_id' });
      if (error) throw error;
    }

    // Certificado digital — substitui a linha vigente (o app só mantém "o certificado atual")
    if (clientData.digitalCertificate && (clientData.digitalCertificate.type || clientData.digitalCertificate.expirationDate)) {
      await sb.from('client_digital_certificates').delete().eq('client_id', clientId);
      const { error } = await sb.from('client_digital_certificates').insert({
        client_id: clientId,
        type: clientData.digitalCertificate.type || null,
        issuer: clientData.digitalCertificate.issuer || null,
        expiration_date: clientData.digitalCertificate.expirationDate || null
      });
      if (error) throw error;
    }

    // Sócios — substitui a lista inteira (o formulário sempre envia o QSA completo)
    if (clientData.partners) {
      await sb.from('client_partners').delete().eq('client_id', clientId);
      const rows = clientData.partners.filter(p => p.name).map(p => ({
        client_id: clientId,
        name: p.name,
        cpf: p.cpf || null,
        share_percentage: p.sharePercentage || 0,
        is_admin: !!p.isAdmin,
        has_pro_labore: !!p.hasProLabore,
        pro_labore_value: p.proLaboreValue || 0
      }));
      if (rows.length > 0) {
        const { error } = await sb.from('client_partners').insert(rows);
        if (error) throw error;
      }
    }

    // Endereço — só cria uma nova versão "atual" se cidade/UF mudou (o que
    // de fato importa para saber qual adapter municipal/estadual usar depois).
    // Ajustes de rua/número/CEP no mesmo município atualizam a linha vigente.
    if (clientData.address) {
      await this._upsertAddress(clientId, clientData.address);
    }

    // Cliente novo: garante as 5 linhas de CND (pendentes de preenchimento)
    if (isNew) {
      const cndRows = this.CND_TYPES.map(tipo => ({ client_id: clientId, tipo }));
      const { error } = await sb.from('client_cnds').insert(cndRows);
      if (error) throw error;
    }

    await this._refetchClient(clientId);
    return this.getClientById(clientId);
  },

  async _upsertAddress(clientId, address) {
    const { data: current } = await sb
      .from('client_addresses')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_current', true)
      .maybeSingle();

    const hasAnyValue = address.city || address.street || address.cep;
    if (!hasAnyValue) return;

    if (!current) {
      const { error } = await sb.from('client_addresses').insert({
        client_id: clientId,
        cep: address.cep || null,
        street: address.street || null,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city || '',
        state: address.state || '',
        is_current: true
      });
      if (error) throw error;
      return;
    }

    const cityChanged = (current.city || '') !== (address.city || '');
    const stateChanged = (current.state || '') !== (address.state || '');

    if (cityChanged || stateChanged) {
      // Nova linha "atual" — o trigger do banco fecha a anterior automaticamente
      // preenchendo effective_to, preservando o histórico do endereço antigo.
      const { error } = await sb.from('client_addresses').insert({
        client_id: clientId,
        cep: address.cep || null,
        street: address.street || null,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city: address.city || '',
        state: address.state || '',
        is_current: true
      });
      if (error) throw error;
    } else {
      const { error } = await sb.from('client_addresses').update({
        cep: address.cep || null,
        street: address.street || null,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null
      }).eq('id', current.id);
      if (error) throw error;
    }
  },

  async deleteClient(id) {
    const { error } = await sb.from('clients').delete().eq('id', id);
    if (error) throw error;
    this._clients = this._clients.filter(c => c.id !== id);
  },

  // Grava o retrato da Receita Federal (situação cadastral, natureza
  // jurídica, capital social, porte) direto no cliente já existente — usado
  // pelo botão "Atualizar agora" do Dossiê, fora do fluxo do formulário.
  async saveReceitaSnapshot(clientId, receita) {
    const { error } = await sb.from('clients').update({
      receita_situacao_cadastral: receita.situacaoCadastral || null,
      receita_natureza_juridica: receita.naturezaJuridica || null,
      receita_capital_social: receita.capitalSocial ?? null,
      receita_porte_descricao: receita.porteDescricao || null,
      receita_last_synced_at: receita.lastSyncedAt || new Date().toISOString()
    }).eq('id', clientId);
    if (error) throw error;
    await this._refetchClient(clientId);
  },

  // Grava o resultado da verificação de Simples Nacional/MEI assim que a
  // consulta termina — não pode depender da pessoa clicar em "Salvar
  // Cadastro" depois, senão o resultado da checagem em lote se perde ao
  // recarregar a página.
  async saveSimplesCheckResult(clientId, result) {
    const { error } = await sb.from('clients').update({
      simples_situacao: result.situacao || null,
      simples_data_exclusao: result.dataExclusao || null,
      simples_checked_at: result.checkedAt || new Date().toISOString()
    }).eq('id', clientId);
    if (error) throw error;
    await this._refetchClient(clientId);
  },

  async addInteraction(clientId, interaction) {
    const { error } = await sb.from('client_interactions').insert({
      client_id: clientId,
      occurred_on: interaction.date || new Date().toISOString().split('T')[0],
      type: interaction.type || null,
      title: interaction.title,
      content: interaction.content || null,
      created_by: window.Auth?.currentUserId() || null
    });
    if (error) throw error;
    await this._refetchClient(clientId);
  },

  // Atualiza as 5 certidões de um cliente (matriz de CNDs)
  async updateClientCnds(clientId, cndsByType) {
    const rows = Object.entries(cndsByType).map(([tipo, info]) => ({
      client_id: clientId,
      tipo,
      valid_until: info.validUntil || null,
      status: info.status || 'none',
      source: 'manual'
    }));
    const { error } = await sb.from('client_cnds').upsert(rows, { onConflict: 'client_id,tipo' });
    if (error) throw error;
    await this._refetchClient(clientId);
  },

  // =========================================================================
  // SERVIÇOS AVULSOS — catálogo de referência + pipeline de solicitações
  // =========================================================================
  _mapAvulsoCatalogFromDb(row) {
    return {
      id: row.id,
      modulo: row.modulo,
      ordem: row.ordem,
      nome: row.nome,
      aplicavelA: row.aplicavel_a,
      descricao: row.descricao || '',
      honorarioMin: row.honorario_min,
      honorarioMax: row.honorario_max,
      honorarioModelo: row.honorario_modelo,
      prazoExecucaoInterna: row.prazo_execucao_interna || '',
      prazoConclusaoTotal: row.prazo_conclusao_total || '',
      documentosNecessarios: row.documentos_necessarios || [],
      portaisAcessados: row.portais_acessados || []
    };
  },

  _mapAvulsoRequestFromDb(row) {
    return {
      id: row.id,
      catalogServiceId: row.catalog_service_id,
      clientId: row.client_id,
      cnpj: row.cnpj || '',
      cpf: row.cpf || '',
      nomeSolicitante: row.nome_solicitante,
      status: row.status,
      dadosReceita: row.dados_receita || null,
      checklist: row.checklist || [],
      honorarioAcordado: row.honorario_acordado,
      observacoes: row.observacoes || '',
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  getAvulsoCatalog() {
    return this._avulsoCatalog;
  },

  getAvulsoRequests() {
    return this._avulsoRequests;
  },

  async createAvulsoRequest(data) {
    const { data: inserted, error } = await sb.from('avulso_service_requests').insert({
      catalog_service_id: data.catalogServiceId,
      client_id: data.clientId || null,
      cnpj: data.cnpj || null,
      cpf: data.cpf || null,
      nome_solicitante: data.nomeSolicitante,
      status: 'NOVO',
      dados_receita: data.dadosReceita || null,
      checklist: data.checklist || [],
      created_by: window.Auth?.currentUserId() || null
    }).select('*').single();
    if (error) throw error;
    const mapped = this._mapAvulsoRequestFromDb(inserted);
    this._avulsoRequests.unshift(mapped);
    return mapped;
  },

  async updateAvulsoRequest(id, patch) {
    const row = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.checklist !== undefined) row.checklist = patch.checklist;
    if (patch.honorarioAcordado !== undefined) row.honorario_acordado = patch.honorarioAcordado;
    if (patch.observacoes !== undefined) row.observacoes = patch.observacoes;

    const { data: updated, error } = await sb.from('avulso_service_requests')
      .update(row).eq('id', id).select('*').single();
    if (error) throw error;

    const mapped = this._mapAvulsoRequestFromDb(updated);
    const idx = this._avulsoRequests.findIndex(r => r.id === id);
    if (idx !== -1) this._avulsoRequests[idx] = mapped;
    return mapped;
  },

  async _refetchClient(clientId) {
    const { data, error } = await sb.from('clients').select(`
      *,
      client_secondary_cnaes(*),
      client_addresses(*),
      client_partners(*),
      client_digital_certificates(*),
      client_financial(*),
      client_cnds(*),
      client_interactions(*)
    `).eq('id', clientId).single();

    if (error) {
      console.error('Erro ao recarregar cliente:', error);
      return;
    }

    const mapped = this._mapClientFromDb(data);
    const idx = this._clients.findIndex(c => c.id === clientId);
    if (idx === -1) {
      this._clients.unshift(mapped);
    } else {
      this._clients[idx] = mapped;
    }
  },

  // =========================================================================
  // BACKUP / EXPORTAÇÃO — trabalham em cima do cache já carregado
  // =========================================================================
  exportJSON() {
    const obligations = window.ObligationsManager ? window.ObligationsManager.getAllObligations() : [];
    const backup = {
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      system: 'Voal Consult ERP (Supabase)',
      clients: this._clients,
      obligations
    };
    return JSON.stringify(backup, null, 2);
  },

  async importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.clients || !Array.isArray(data.clients)) {
        throw new Error('Arquivo de backup inválido.');
      }
      let count = 0;
      for (const client of data.clients) {
        await this.upsertClient({ ...client, id: null }); // sempre cria — evita sobrescrever IDs de outro banco
        count++;
      }
      return { success: true, count };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  exportCSV() {
    const clients = this.getClients();
    const headers = [
      'ID', 'Status', 'Razão Social', 'Nome Fantasia', 'CNPJ/CPF', 'Regime Tributário',
      'Porte', 'Responsável', 'Telefone', 'WhatsApp', 'E-mail', 'Cidade', 'UF',
      'Honorários Mensais (R$)', 'Dia Vencimento', 'Validade Certificado Digital'
    ];

    const rows = clients.map(c => [
      c.id,
      c.status,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${(c.tradeName || '').replace(/"/g, '""')}"`,
      `"${c.cnpj || c.cpf || ''}"`,
      `"${DataStore.TaxRegimes[c.taxRegime]?.name || c.taxRegime || ''}"`,
      c.companySize || '',
      `"${c.responsibleAccountant || ''}"`,
      `"${c.phones ? c.phones.join(' / ') : ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.email || ''}"`,
      `"${c.address?.city || ''}"`,
      `"${c.address?.state || ''}"`,
      c.financial?.monthlyFee || 0,
      c.financial?.dueDay || '',
      c.digitalCertificate?.expirationDate || ''
    ]);

    return '﻿' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  }
};

window.DataStore = DataStore;
