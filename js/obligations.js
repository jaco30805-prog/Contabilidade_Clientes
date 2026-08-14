/**
 * Voal Consult — ERP & Gestão Contábil
 * Módulo de Gestão de Obrigações Acessórias e Prazos Fiscais
 */

const ObligationsManager = {
  STORAGE_KEY: 'voal_monthly_obligations_v3',

  getAllObligations() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erro ao ler obrigações:', e);
      return [];
    }
  },

  saveAllObligations(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  },

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

  syncCompetenceObligations(competence = this.getCurrentCompetence()) {
    const clients = window.DataStore.getClients().filter(c => c.status === 'ATIVO');
    const catalog = window.DataStore.DefaultObligationsCatalog;
    const existing = this.getAllObligations();
    const [compYear, compMonth] = competence.split('-').map(n => parseInt(n, 10));

    let updatedList = [...existing];
    let createdCount = 0;

    clients.forEach(client => {
      const applicableCatalog = catalog.filter(item => {
        if (!item.applicableRegimes.includes(client.taxRegime)) return false;
        if (item.frequency === 'ANUAL' && item.dueMonth !== compMonth) return false;
        return true;
      });

      applicableCatalog.forEach(rule => {
        const exists = updatedList.some(
          ob => ob.clientId === client.id && ob.competence === competence && ob.code === rule.code
        );

        if (!exists) {
          const dueDay = Math.min(rule.dueDay, 28);
          const dueDate = `${compYear}-${String(compMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

          const newObligation = {
            id: `ob_${client.id}_${competence}_${rule.code}`,
            clientId: client.id,
            clientName: client.companyName || client.tradeName,
            clientCnpj: client.cnpj || client.cpf,
            taxRegime: client.taxRegime,
            competence,
            code: rule.code,
            title: rule.name,
            department: rule.department,
            dueDate,
            status: 'PENDENTE',
            completedAt: null,
            completedBy: '',
            protocolNumber: '',
            notes: ''
          };

          updatedList.push(newObligation);
          createdCount++;
        }
      });
    });

    if (createdCount > 0) {
      this.saveAllObligations(updatedList);
    }

    return {
      competence,
      totalObligations: updatedList.filter(o => o.competence === competence),
      createdCount
    };
  },

  updateObligationStatus(id, updateData) {
    const list = this.getAllObligations();
    const index = list.findIndex(o => o.id === id);
    if (index === -1) return false;

    if (updateData.status === 'CONCLUIDO' && !list[index].completedAt) {
      updateData.completedAt = new Date().toISOString();
    } else if (updateData.status !== 'CONCLUIDO') {
      updateData.completedAt = null;
    }

    list[index] = { ...list[index], ...updateData };
    this.saveAllObligations(list);
    return list[index];
  },

  getFilteredObligations({ competence, clientId, department, status, taxRegime, search }) {
    let list = this.getAllObligations();

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
    const list = this.getAllObligations().filter(o => o.competence === competence);
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
