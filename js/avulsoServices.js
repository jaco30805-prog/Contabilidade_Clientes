/**
 * Voal Consult — Serviços Avulsos
 *
 * Catálogo de referência (extraído dos Roteiros Operacionais do escritório)
 * + pipeline de solicitações reais. Uma solicitação nasce com o CNPJ/CPF de
 * quem vai ser atendido: se for CNPJ, a Receita Federal já preenche nome e
 * dados cadastrais sozinha (mesma consulta do autofill do cadastro de
 * cliente); o que resta é só o checklist de documentos que o roteiro pede.
 */
const AvulsoServices = {
  MODULO_LABELS: { BASICO: 'Módulo Básico', MEDIO: 'Módulo Médio', AVANCADO: 'Módulo Avançado' },
  STATUS_LABELS: {
    NOVO: { label: 'Novo', chip: 'chip-info' },
    EM_ANDAMENTO: { label: 'Em Andamento', chip: 'chip-warning' },
    AGUARDANDO_CLIENTE: { label: 'Aguardando Cliente', chip: 'chip-muted' },
    CONCLUIDO: { label: 'Concluído', chip: 'chip-success' },
    CANCELADO: { label: 'Cancelado', chip: 'chip-danger' }
  },

  render() {
    this.renderKpis();
    this.renderCatalog();
    this.renderPipeline();
  },

  renderKpis() {
    const catalog = DataStore.getAvulsoCatalog();
    const requests = DataStore.getAvulsoRequests();
    const abertas = requests.filter(r => r.status === 'NOVO' || r.status === 'EM_ANDAMENTO' || r.status === 'AGUARDANDO_CLIENTE');
    const now = new Date();
    const concluidasMes = requests.filter(r => {
      if (r.status !== 'CONCLUIDO' || !r.updatedAt) return false;
      const d = new Date(r.updatedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('avulso-stat-catalogo', catalog.length);
    set('avulso-stat-abertas', abertas.length);
    set('avulso-stat-concluidas-mes', concluidasMes.length);
  },

  renderCatalog() {
    const container = document.getElementById('avulso-catalog-list');
    if (!container) return;

    const catalog = DataStore.getAvulsoCatalog();
    const grupos = ['BASICO', 'MEDIO', 'AVANCADO'];

    container.innerHTML = grupos.map(modulo => {
      const itens = catalog.filter(c => c.modulo === modulo);
      if (itens.length === 0) return '';
      return `
        <div style="margin-bottom:20px;">
          <div class="figma-panel-title">${this.MODULO_LABELS[modulo]}</div>
          <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); margin-top:8px;">
            ${itens.map(item => `
              <div class="kpi-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
                  <div style="font-weight:700; font-size:0.88rem;">${item.nome}</div>
                  <span class="chip chip-muted" style="flex-shrink:0;">${item.aplicavelA}</span>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:10px;">${item.descricao}</div>
                <div style="font-size:0.8rem; font-weight:600; color:#10B981; font-family:var(--font-mono);">
                  ${this.formatHonorario(item)}
                </div>
                <div style="font-size:0.72rem; color:var(--text-dim); margin-bottom:10px;">Execução interna: ${item.prazoExecucaoInterna || '-'}</div>
                <button class="btn-figma-secondary" style="width:100%; font-size:0.78rem;" onclick="AvulsoServices.openNewRequestModal('${item.id}')">Nova Solicitação</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  formatHonorario(item) {
    if (item.honorarioModelo === 'EXITO') return 'Honorário de êxito (% sobre valor recuperado)';
    if (item.honorarioMin == null && item.honorarioMax == null) return 'Sob consulta';
    return `${Validators.formatCurrency(item.honorarioMin)} a ${Validators.formatCurrency(item.honorarioMax)}`;
  },

  renderPipeline() {
    const tbody = document.getElementById('avulso-pipeline-tbody');
    if (!tbody) return;

    const requests = DataStore.getAvulsoRequests();
    const catalogById = {};
    DataStore.getAvulsoCatalog().forEach(c => { catalogById[c.id] = c; });

    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhuma solicitação de serviço avulso ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(r => {
      const servico = catalogById[r.catalogServiceId];
      const statusInfo = this.STATUS_LABELS[r.status] || { label: r.status, chip: 'chip-muted' };
      const checklistDone = (r.checklist || []).filter(c => c.obtido).length;
      const checklistTotal = (r.checklist || []).length;
      return `
        <tr>
          <td style="font-weight:600;">${r.nomeSolicitante}</td>
          <td>${servico ? servico.nome : '-'}</td>
          <td>${r.cnpj ? Validators.formatCNPJ(r.cnpj) : (r.cpf ? Validators.formatCPF(r.cpf) : '-')}</td>
          <td>${checklistTotal > 0 ? `${checklistDone}/${checklistTotal} itens` : '-'}</td>
          <td><span class="chip ${statusInfo.chip}">${statusInfo.label}</span></td>
          <td style="text-align:right;">
            <button class="btn-figma-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="AvulsoServices.openDetailModal('${r.id}')">Ver / Atualizar</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // NOVA SOLICITAÇÃO
  // =========================================================================
  openNewRequestModal(preselectServiceId) {
    const modal = document.getElementById('modal-avulso-request');
    const form = document.getElementById('avulso-request-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('avulso-req-service-info').textContent = '';
    document.getElementById('avulso-req-receita-status').textContent = '';
    this._pendingReceitaSnapshot = null;

    const serviceSelect = document.getElementById('avulso-req-service');
    const catalog = DataStore.getAvulsoCatalog();
    const grupos = ['BASICO', 'MEDIO', 'AVANCADO'];
    let html = '<option value="">— Selecione o serviço —</option>';
    grupos.forEach(modulo => {
      const itens = catalog.filter(c => c.modulo === modulo);
      if (itens.length === 0) return;
      html += `<optgroup label="${this.MODULO_LABELS[modulo]}">`;
      itens.forEach(item => { html += `<option value="${item.id}">${item.nome}</option>`; });
      html += '</optgroup>';
    });
    serviceSelect.innerHTML = html;
    if (preselectServiceId) serviceSelect.value = preselectServiceId;

    const clientSelect = document.getElementById('avulso-req-client');
    const clients = [...DataStore.getClients()].sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
    clientSelect.innerHTML = '<option value="">— Não vincular a nenhum cliente —</option>'
      + clients.map(c => `<option value="${c.id}">${c.companyName || c.tradeName}</option>`).join('');

    this.onServiceSelected();
    this._setupDocInput();

    modal.querySelector('.modal-content-scroll')?.scrollTo(0, 0);
    modal.classList.add('active');
  },

  onServiceSelected() {
    const id = document.getElementById('avulso-req-service').value;
    const info = document.getElementById('avulso-req-service-info');
    const item = DataStore.getAvulsoCatalog().find(c => c.id === id);
    if (!item) { info.textContent = ''; return; }
    info.textContent = `${this.formatHonorario(item)} · Execução interna: ${item.prazoExecucaoInterna || '-'} · Conclusão total: ${item.prazoConclusaoTotal || '-'}`;
  },

  // Mesmo comportamento do campo CNPJ/CPF do cadastro de cliente: formata os
  // dois, e ao completar 14 dígitos busca os dados na Receita Federal.
  _setupDocInput() {
    const input = document.getElementById('avulso-req-doc');
    if (!input || input._avulsoBound) return;
    input._avulsoBound = true;

    let lastLookup = '';
    input.addEventListener('input', async (e) => {
      const clean = Validators.onlyNumbers(e.target.value);
      e.target.value = clean.length > 11 ? Validators.formatCNPJ(clean) : Validators.formatCPF(clean);

      if (clean.length !== 14 || clean === lastLookup) return;
      lastLookup = clean;

      const status = document.getElementById('avulso-req-receita-status');
      status.textContent = 'Consultando Receita Federal...';
      try {
        const data = await Validators.fetchCNPJData(clean);
        // Descarta se o campo já mudou pra outro documento enquanto essa
        // consulta estava em voo — senão os dados da empresa errada
        // poderiam colar no CNPJ que está no campo agora.
        if (Validators.onlyNumbers(document.getElementById('avulso-req-doc').value) !== clean) return;
        const nomeField = document.getElementById('avulso-req-nome');
        if (!nomeField.value.trim()) nomeField.value = data.companyName;
        // _forDoc guarda pra quem é esse retrato — checado de novo no submit
        // (ver saveNewRequest), caso o campo mude de novo antes de salvar.
        this._pendingReceitaSnapshot = { ...data, _forDoc: clean };
        status.textContent = `Dados encontrados: ${data.companyName}${data.situacao && data.situacao !== 'ATIVA' ? ` — atenção: situação "${data.situacao}"` : ''}`;
      } catch (err) {
        status.textContent = err.message || 'Não foi possível consultar este CNPJ.';
      }
    });
  },

  async saveNewRequest(e) {
    e.preventDefault();
    const serviceId = document.getElementById('avulso-req-service').value;
    const service = DataStore.getAvulsoCatalog().find(c => c.id === serviceId);
    if (!service) { App.showToast('Selecione um serviço.', 'danger'); return; }

    const docClean = Validators.onlyNumbers(document.getElementById('avulso-req-doc').value);
    const isCnpj = docClean.length === 14;

    const checklist = (service.documentosNecessarios || []).map(d => ({
      item: d.item, finalidade: d.finalidade, obtido: false
    }));

    // Só vai junto se ainda for o retrato do documento que está no campo
    // agora — mesma lógica de applyCNPJData() no cadastro de cliente.
    let dadosReceita = null;
    if (this._pendingReceitaSnapshot && this._pendingReceitaSnapshot._forDoc === docClean) {
      const { _forDoc, ...clean } = this._pendingReceitaSnapshot;
      dadosReceita = clean;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Criando...'; }

    try {
      await DataStore.createAvulsoRequest({
        catalogServiceId: serviceId,
        clientId: document.getElementById('avulso-req-client').value || null,
        cnpj: isCnpj ? docClean : null,
        cpf: !isCnpj ? docClean : null,
        nomeSolicitante: document.getElementById('avulso-req-nome').value.trim(),
        dadosReceita,
        checklist
      });
      App.closeAllModals();
      App.showToast('Solicitação criada com sucesso!', 'success');
      this.render();
    } catch (err) {
      console.error('Erro ao criar solicitação avulsa:', err);
      App.showToast('Erro ao criar solicitação. Tente novamente.', 'danger');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Criar Solicitação'; }
    }
  },

  // =========================================================================
  // DETALHE / ATUALIZAÇÃO
  // =========================================================================
  openDetailModal(requestId) {
    const modal = document.getElementById('modal-avulso-detail');
    if (!modal) return;

    const request = DataStore.getAvulsoRequests().find(r => r.id === requestId);
    if (!request) return;
    const service = DataStore.getAvulsoCatalog().find(c => c.id === request.catalogServiceId);

    document.getElementById('avulso-detail-id').value = request.id;
    document.getElementById('avulso-detail-title').textContent = `${request.nomeSolicitante} — ${service ? service.nome : 'Serviço'}`;
    document.getElementById('avulso-detail-summary').textContent =
      `${request.cnpj ? Validators.formatCNPJ(request.cnpj) : (request.cpf ? Validators.formatCPF(request.cpf) : 'Sem documento informado')}`
      + (service ? ` · Sugerido: ${this.formatHonorario(service)}` : '');
    document.getElementById('avulso-detail-status').value = request.status;
    document.getElementById('avulso-detail-honorario').value = request.honorarioAcordado || '';
    document.getElementById('avulso-detail-notes').value = request.observacoes || '';

    const checklistContainer = document.getElementById('avulso-detail-checklist');
    checklistContainer.innerHTML = (request.checklist || []).length === 0
      ? '<p style="color:var(--text-muted); font-size:0.85rem;">Este serviço não tem checklist de documentos cadastrado.</p>'
      : request.checklist.map((c, idx) => `
        <label style="display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-color); cursor:pointer;">
          <input type="checkbox" data-checklist-idx="${idx}" ${c.obtido ? 'checked' : ''} style="margin-top:3px;">
          <div>
            <div style="font-size:0.85rem; font-weight:600;">${c.item}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${c.finalidade || ''}</div>
          </div>
        </label>
      `).join('');

    modal.querySelector('.modal-content-scroll')?.scrollTo(0, 0);
    modal.classList.add('active');
  },

  async saveRequestUpdate(e) {
    e.preventDefault();
    const id = document.getElementById('avulso-detail-id').value;
    const request = DataStore.getAvulsoRequests().find(r => r.id === id);
    if (!request) return;

    const checklist = (request.checklist || []).map((c, idx) => ({
      ...c,
      obtido: document.querySelector(`[data-checklist-idx="${idx}"]`)?.checked || false
    }));

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

    try {
      await DataStore.updateAvulsoRequest(id, {
        status: document.getElementById('avulso-detail-status').value,
        honorarioAcordado: parseFloat(document.getElementById('avulso-detail-honorario').value) || null,
        observacoes: document.getElementById('avulso-detail-notes').value.trim(),
        checklist
      });
      App.closeAllModals();
      App.showToast('Solicitação atualizada!', 'success');
      this.render();
    } catch (err) {
      console.error('Erro ao atualizar solicitação avulsa:', err);
      App.showToast('Erro ao atualizar solicitação. Tente novamente.', 'danger');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Solicitação'; }
    }
  }
};

window.AvulsoServices = AvulsoServices;
