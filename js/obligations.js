/**
 * Voal Consult — ERP & Gestão Contábil
 * Módulo de Gestão de Obrigações Acessórias e Prazos Fiscais — Supabase
 *
 * Mesma lógica de antes (gera obrigações do mês a partir do catálogo +
 * carteira ativa), mas persistida no Supabase. O cache local (_obligations)
 * só guarda as competências já sincronizadas nesta sessão de página — cada
 * tela chama syncCompetenceObligations(competencia) antes de ler dados
 * daquele mês, então a leitura (getAllObligations, getFilteredObligations,
 * getMetrics) continua síncrona sobre o que já foi carregado.
 */

const ObligationsManager = {
  _obligations: [],

  getCurrentCompetence() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  formatCompetence(compStr) {
    if (!compStr) return '-';
    const [year, month] = compStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mIndex = parseInt(month, 10) - 1;
    return `${monthNames[mIndex] || month} de ${year}`;
  },

  _mapObligationFromDb(row) {
    const client = window.DataStore?.getClientById(row.client_id);
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client ? (client.companyName || client.tradeName) : '(cliente removido)',
      clientCnpj: client ? (client.cnpj || client.cpf) : '',
      taxRegime: client ? client.taxRegime : '',
      competence: row.competence,
      code: row.code,
      title: row.title,
      department: row.department,
      dueDate: row.due_date,
      status: row.status,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      protocolNumber: row.protocol_number || '',
      notes: row.notes || ''
    };
  },

  // Garante que as obrigações do catálogo existam para todo cliente ativo
  // nesta competência, e carrega essa competência (do jeito que está no
  // banco, já mesclando o que outra pessoa da equipe possa ter gerado) para
  // o cache local.
  async syncCompetenceObligations(competence = this.getCurrentCompetence()) {
    try {
      // Clientes esporádicos ficam fora do monitoramento automático de
      // obrigações — só a carteira recorrente gera obrigação mensal.
      const clients = (window.DataStore?.getClients() || []).filter(c => c.status === 'ATIVO' && c.recurrence !== 'ESPORADICO');
      const catalog = window.DataStore?.DefaultObligationsCatalog || [];
      const [compYear, compMonth] = competence.split('-').map(n => parseInt(n, 10));

      const { data: existingRows, error: fetchError } = await sb
        .from('obligations')
        .select('*')
        .eq('competence', competence);
      if (fetchError) throw fetchError;

      const existingKeys = new Set((existingRows || []).map(o => `${o.client_id}::${o.code}`));
      const toInsert = [];

      clients.forEach(client => {
        const applicable = catalog.filter(item => {
          if (!item.applicableRegimes.includes(client.taxRegime)) return false;
          if (item.frequency === 'ANUAL' && item.dueMonth !== compMonth) return false;
          return true;
        });

        applicable.forEach(rule => {
          const key = `${client.id}::${rule.code}`;
          if (existingKeys.has(key)) return;

          const dueDay = Math.min(rule.dueDay || 28, 28);
          const dueDate = `${compYear}-${String(compMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

          toInsert.push({
            client_id: client.id,
            code: rule.code,
            competence,
            title: rule.name,
            department: rule.department,
            due_date: dueDate,
            status: 'PENDENTE'
          });
        });
      });

      if (toInsert.length > 0) {
        const { error: insertError } = await sb
          .from('obligations')
          .upsert(toInsert, { onConflict: 'client_id,competence,code', ignoreDuplicates: true });
        if (insertError) throw insertError;
      }

      const { data: finalRows, error: refetchError } = await sb
        .from('obligations')
        .select('*')
        .eq('competence', competence);
      if (refetchError) throw refetchError;

      const mapped = (finalRows || []).map(row => this._mapObligationFromDb(row));
      this._obligations = this._obligations.filter(o => o.competence !== competence).concat(mapped);

      return {
        competence,
        totalObligations: mapped,
        createdCount: toInsert.length
      };
    } catch (err) {
      console.error('Erro ao sincronizar obrigações:', err);
      window.App?.showToast?.('Não foi possível sincronizar as obrigações do mês.', 'danger');
      return { competence, totalObligations: this.getFilteredObligations({ competence }), createdCount: 0 };
    }
  },

  async updateObligationStatus(id, updateData) {
    const payload = { ...updateData };
    const current = this._obligations.find(o => o.id === id);

    if (payload.status === 'CONCLUIDO' && !(current && current.completedAt)) {
      payload.completed_at = new Date().toISOString();
      payload.completed_by = window.Auth?.currentUserId() || null;
    } else if (payload.status !== 'CONCLUIDO') {
      payload.completed_at = null;
      payload.completed_by = null;
    }
    if ('protocolNumber' in payload) {
      payload.protocol_number = payload.protocolNumber;
      delete payload.protocolNumber;
    }

    const { data, error } = await sb.from('obligations').update(payload).eq('id', id).select('*').single();
    if (error) throw error;

    const mapped = this._mapObligationFromDb(data);
    const idx = this._obligations.findIndex(o => o.id === id);
    if (idx !== -1) this._obligations[idx] = mapped;
    else this._obligations.push(mapped);

    return mapped;
  },

  getAllObligations() {
    return this._obligations;
  },

  getFilteredObligations({ competence, clientId, department, status, taxRegime, search }) {
    let list = this._obligations;

    if (competence) {
      list = list.filter(o => o.competence === competence);
    }

    if (clientId) {
      list = list.filter(o => o.clientId === clientId);
    }

    if (department && department !== 'TODOS') {
      list = list.filter(o => o.department === department);
    }

    if (status && status !== 'TODOS') {
      list = list.filter(o => o.status === status);
    }

    if (taxRegime && taxRegime !== 'TODOS') {
      list = list.filter(o => o.taxRegime === taxRegime);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        (o.clientName && o.clientName.toLowerCase().includes(q)) ||
        (o.title && o.title.toLowerCase().includes(q)) ||
        (o.clientCnpj && o.clientCnpj.includes(q)) ||
        (o.protocolNumber && o.protocolNumber.toLowerCase().includes(q))
      );
    }

    return list;
  },

  getMetrics(competence = this.getCurrentCompetence()) {
    const list = this._obligations.filter(o => o.competence === competence);
    const total = list.length;
    const completed = list.filter(o => o.status === 'CONCLUIDO').length;
    const inProgress = list.filter(o => o.status === 'EM_ANDAMENTO').length;
    const waived = list.filter(o => o.status === 'DISPENSADO').length;
    const pending = list.filter(o => o.status === 'PENDENTE');

    const today = new Date().toISOString().split('T')[0];
    const overdue = pending.filter(o => o.dueDate < today).length;

    const progressPercentage = total > 0 ? Math.round((completed / (total - waived || 1)) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      waived,
      pendingCount: pending.length,
      overdue,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage))
    };
  }
};

window.ObligationsManager = ObligationsManager;
