/**
 * Voal Consult — Funil de Leads
 *
 * Prospecção comercial, separada de propósito da carteira de clientes:
 * lead não tem CNPJ/CPF fechado ainda (por isso não passa pelo autofill de
 * Receita). Quando o negócio fecha e o CNPJ/CPF é conhecido, "Converter em
 * Cliente" abre o cadastro normal (já pré-preenchido com nome/telefone) —
 * o autofill de CNPJ funciona a partir daí como em qualquer cadastro novo.
 */
const LeadsManager = {
  // Valores livres, sem CHECK no banco — a base já tinha texto inconsistente
  // (URGENTE, Fazendo...); a lista canônica é só pra guiar cadastro novo,
  // sem forçar migração do que já existe.
  STATUS_OPTIONS: ['Inicial', 'Em andamento', 'Aguardando Cliente', 'Convertido', 'Perdido'],
  _convertingLeadId: null,

  render() {
    this.renderKpis();
    this.renderTable();
  },

  renderKpis() {
    const leads = DataStore.getLeads();
    const abertos = leads.filter(l => l.status !== 'Convertido' && l.status !== 'Perdido');
    const valorEntrada = abertos.reduce((sum, l) => sum + (parseFloat(l.entryValue) || 0), 0);
    const mrrPotencial = abertos.reduce((sum, l) => sum + (parseFloat(l.recurringValue) || 0), 0);
    const convertidos = leads.filter(l => l.clientId).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('lead-stat-total', leads.length);
    set('lead-stat-entrada', Validators.formatCurrency(valorEntrada));
    set('lead-stat-mrr', Validators.formatCurrency(mrrPotencial));
    set('lead-stat-convertidos', convertidos);
  },

  renderTable() {
    const tbody = document.getElementById('leads-table-tbody');
    if (!tbody) return;

    const leads = DataStore.getLeads();
    if (leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum lead cadastrado.</td></tr>`;
      return;
    }

    const statusChip = (status) => {
      if (status === 'Convertido') return 'chip-success';
      if (status === 'Perdido') return 'chip-danger';
      if (status === 'Em andamento' || status === 'Fazendo') return 'chip-warning';
      if (status === 'URGENTE') return 'chip-danger';
      return 'chip-muted';
    };

    tbody.innerHTML = leads.map(l => `
      <tr>
        <td style="font-weight:600;">${l.name}</td>
        <td>${l.segment || '-'}</td>
        <td style="font-size:0.8rem; color:var(--text-muted); max-width:260px;">${l.description || '-'}</td>
        <td style="font-family:var(--font-mono); font-size:0.82rem;">
          ${l.entryValue ? 'Entrada: ' + Validators.formatCurrency(l.entryValue) + '<br>' : ''}${l.recurringValue ? 'Mensal: ' + Validators.formatCurrency(l.recurringValue) : (l.entryValue ? '' : '-')}
        </td>
        <td><span class="chip ${statusChip(l.status)}">${l.status || 'Inicial'}</span></td>
        <td>${l.priorityOrDeadline || '-'}</td>
        <td style="text-align:right; white-space:nowrap;">
          ${l.contactPhone ? `<a href="https://wa.me/55${Validators.onlyNumbers(l.contactPhone)}" target="_blank" class="btn-figma-secondary" style="font-size:0.72rem; padding:4px 8px;" title="WhatsApp">WhatsApp</a>` : ''}
          <button class="btn-figma-secondary" style="font-size:0.72rem; padding:4px 8px;" onclick="LeadsManager.openLeadModal('${l.id}')">Editar</button>
          ${l.clientId
            ? `<a href="dossie.html?id=${l.clientId}" class="btn-figma-secondary" style="font-size:0.72rem; padding:4px 8px;">Ver Cliente</a>`
            : `<button class="btn-figma-primary" style="font-size:0.72rem; padding:4px 8px;" onclick="LeadsManager.convertToClient('${l.id}')">Converter em Cliente</button>`}
        </td>
      </tr>
    `).join('');
  },

  // =========================================================================
  // CRIAR / EDITAR LEAD
  // =========================================================================
  openLeadModal(leadId) {
    const modal = document.getElementById('modal-lead-form');
    const form = document.getElementById('lead-form');
    if (!modal || !form) return;

    form.reset();
    const statusSelect = document.getElementById('lead-status');
    const lead = leadId ? DataStore.getLeadById(leadId) : null;

    const options = [...this.STATUS_OPTIONS];
    if (lead?.status && !options.includes(lead.status)) options.unshift(lead.status);
    statusSelect.innerHTML = options.map(s => `<option value="${s}">${s}</option>`).join('');

    document.getElementById('lead-form-id').value = leadId || '';
    document.getElementById('modal-lead-title').textContent = lead ? 'Editar Lead' : 'Novo Lead';
    document.getElementById('lead-name').value = lead?.name || '';
    document.getElementById('lead-segment').value = lead?.segment || '';
    document.getElementById('lead-phone').value = lead?.contactPhone || '';
    document.getElementById('lead-entry-value').value = lead?.entryValue || '';
    document.getElementById('lead-recurring-value').value = lead?.recurringValue || '';
    statusSelect.value = lead?.status || 'Inicial';
    document.getElementById('lead-priority').value = lead?.priorityOrDeadline || '';
    document.getElementById('lead-description').value = lead?.description || '';
    document.getElementById('lead-pending-notes').value = lead?.pendingNotes || '';

    modal.querySelector('.modal-content-scroll')?.scrollTo(0, 0);
    modal.classList.add('active');
  },

  async saveLeadForm(e) {
    e.preventDefault();
    const id = document.getElementById('lead-form-id').value;
    const data = {
      name: document.getElementById('lead-name').value.trim(),
      segment: document.getElementById('lead-segment').value.trim(),
      contactPhone: document.getElementById('lead-phone').value.trim(),
      entryValue: parseFloat(document.getElementById('lead-entry-value').value) || null,
      recurringValue: parseFloat(document.getElementById('lead-recurring-value').value) || null,
      status: document.getElementById('lead-status').value,
      priorityOrDeadline: document.getElementById('lead-priority').value.trim(),
      description: document.getElementById('lead-description').value.trim(),
      pendingNotes: document.getElementById('lead-pending-notes').value.trim()
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

    try {
      if (id) {
        await DataStore.updateLead(id, data);
      } else {
        await DataStore.createLead(data);
      }
      App.closeAllModals();
      App.showToast('Lead salvo com sucesso!', 'success');
      this.render();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      App.showToast('Erro ao salvar lead. Tente novamente.', 'danger');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Lead'; }
    }
  },

  // =========================================================================
  // CONVERTER EM CLIENTE — abre o cadastro normal, já preenchido, e deixa o
  // autofill de CNPJ fazer o resto quando o documento for digitado.
  // =========================================================================
  convertToClient(leadId) {
    const lead = DataStore.getLeadById(leadId);
    if (!lead) return;

    App.openClientModal();
    this._convertingLeadId = leadId;

    document.getElementById('form-company-name').value = lead.name;
    if (lead.contactPhone) {
      document.getElementById('form-whatsapp').value = Validators.formatPhone(lead.contactPhone);
    }
    if (lead.recurringValue) {
      document.getElementById('form-fee-value').value = lead.recurringValue;
    }
    const notesParts = [];
    if (lead.segment) notesParts.push(`Segmento: ${lead.segment}`);
    if (lead.description) notesParts.push(lead.description);
    if (notesParts.length) {
      document.getElementById('form-fee-notes').value = `[Convertido do lead "${lead.name}"] ${notesParts.join(' — ')}`;
    }

    App.showToast('Cadastro pré-preenchido com os dados do lead. Digite o CNPJ ou CPF pra completar o resto.', 'info');
  },

  // Chamado por App.saveClientForm() depois de salvar com sucesso, só
  // quando o cadastro nasceu de uma conversão de lead (ver convertToClient).
  async finishConversion(newClientId) {
    if (!this._convertingLeadId) return;
    const leadId = this._convertingLeadId;
    this._convertingLeadId = null;
    try {
      await DataStore.updateLead(leadId, { clientId: newClientId, status: 'Convertido' });
    } catch (err) {
      console.error('Erro ao vincular lead ao cliente convertido:', err);
      App.showToast('Cliente criado, mas não consegui atualizar o lead de origem. Vincule manualmente.', 'danger');
    }
  }
};

window.LeadsManager = LeadsManager;
