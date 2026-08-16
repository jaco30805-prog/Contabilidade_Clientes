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
  MODULO_LABELS: { BASICO: 'Básico', MEDIO: 'Médio', AVANCADO: 'Avançado' },
  STATUS_LABELS: {
    NOVO: { label: 'Novo', chip: 'chip-info' },
    EM_ANDAMENTO: { label: 'Em Andamento', chip: 'chip-warning' },
    AGUARDANDO_CLIENTE: { label: 'Aguardando Cliente', chip: 'chip-muted' },
    CONCLUIDO: { label: 'Concluído', chip: 'chip-success' },
    CANCELADO: { label: 'Cancelado', chip: 'chip-danger' }
  },
  // Prioridade de exibição no pipeline (Épico C, PRD 16/08/2026) — o que
  // está em andamento sobe pro topo, concluído/cancelado desce pro fim.
  // Não é mais ordenado só por data de criação.
  STATUS_SORT_PRIORITY: { EM_ANDAMENTO: 0, AGUARDANDO_CLIENTE: 1, NOVO: 2, CONCLUIDO: 3, CANCELADO: 4 },

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

  // Antes o catálogo vinha sempre dividido em 3 seções (Básico/Médio/
  // Avançado), forçando quem procurava um serviço a primeiro adivinhar em
  // qual módulo ele estava. Agora é uma lista única, ordenada por nome —
  // o módulo vira só uma etiqueta discreta no card, não mais uma divisão
  // de tela (Épico C, PRD 16/08/2026).
  renderCatalog() {
    const container = document.getElementById('avulso-catalog-list');
    if (!container) return;

    const catalog = [...DataStore.getAvulsoCatalog()].sort((a, b) => a.nome.localeCompare(b.nome));

    container.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
        ${catalog.map(item => `
          <div class="kpi-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
              <div style="font-weight:700; font-size:0.88rem;">${item.nome}</div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                <span class="chip chip-muted">${item.aplicavelA}</span>
                <span class="chip chip-info" style="font-size:0.68rem;">${this.MODULO_LABELS[item.modulo] || item.modulo}</span>
              </div>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:10px;">${item.descricao}</div>
            <div style="font-size:0.8rem; font-weight:600; color:#10B981; font-family:var(--font-mono);">
              ${this.formatHonorario(item)}
            </div>
            <div style="font-size:0.72rem; color:var(--text-dim); margin-bottom:10px;">Execução interna: ${item.prazoExecucaoInterna || '-'}</div>
            <div style="display:flex; gap:8px;">
              <button class="btn-figma-secondary" style="flex:1; font-size:0.78rem;" onclick="AvulsoServices.openNewRequestModal('${item.id}')">Nova Solicitação</button>
              ${(item.etapasExecucao || []).length > 0 ? `<button class="btn-figma-secondary" style="font-size:0.78rem;" onclick="AvulsoServices.toggleRoteiro('${item.id}')">Roteiro</button>` : ''}
            </div>
            <div id="avulso-roteiro-${item.id}" style="display:none; margin-top:10px; padding-top:10px; border-top:1px solid var(--border-color);"></div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Abre/fecha o roteiro de execução do serviço direto no card do catálogo
  // — o passo a passo interno que antes só existia no documento original,
  // agora vindo do banco (avulso_service_catalog.etapas_execucao).
  toggleRoteiro(catalogId) {
    const panel = document.getElementById(`avulso-roteiro-${catalogId}`);
    if (!panel) return;
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    const item = DataStore.getAvulsoCatalog().find(c => c.id === catalogId);
    panel.innerHTML = this.renderRoteiroHtml(item);
    panel.style.display = 'block';
  },

  // HTML do roteiro de execução — reaproveitado no card do catálogo, na
  // Nova Solicitação (ao escolher o serviço) e no Detalhe da solicitação.
  renderRoteiroHtml(item) {
    const etapas = item?.etapasExecucao || [];
    if (etapas.length === 0) return '<div style="font-size:0.78rem; color:var(--text-dim);">Roteiro de execução ainda não cadastrado para este serviço.</div>';
    return `
      <div style="font-size:0.72rem; font-weight:700; color:var(--text-dim); margin-bottom:6px;">PASSO A PASSO DE EXECUÇÃO INTERNA</div>
      <ol style="padding-left:18px; margin:0; display:flex; flex-direction:column; gap:6px;">
        ${etapas.map(e => `<li style="font-size:0.8rem; color:var(--text-main);">${e.descricao}</li>`).join('')}
      </ol>
    `;
  },

  formatHonorario(item) {
    if (item.honorarioModelo === 'EXITO') return 'Honorário de êxito (% sobre valor recuperado)';
    if (item.honorarioMin == null && item.honorarioMax == null) return 'Sob consulta';
    return `${Validators.formatCurrency(item.honorarioMin)} a ${Validators.formatCurrency(item.honorarioMax)}`;
  },

  renderPipeline() {
    const tbody = document.getElementById('avulso-pipeline-tbody');
    if (!tbody) return;

    const catalogById = {};
    DataStore.getAvulsoCatalog().forEach(c => { catalogById[c.id] = c; });

    // Em andamento sobe pro topo — concluído/cancelado desce pro fim.
    // Desempate por mais recente dentro do mesmo grupo de prioridade.
    const requests = [...DataStore.getAvulsoRequests()].sort((a, b) => {
      const pa = this.STATUS_SORT_PRIORITY[a.status] ?? 9;
      const pb = this.STATUS_SORT_PRIORITY[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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
  openNewRequestModal(preselectServiceId, preselectClientId) {
    const modal = document.getElementById('modal-avulso-request');
    const form = document.getElementById('avulso-request-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('avulso-req-service-info').textContent = '';
    document.getElementById('avulso-req-receita-status').textContent = '';
    document.getElementById('avulso-req-client-hint').textContent = '';
    this._pendingReceitaSnapshot = null;
    this._linkedClientAutofill = false;

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
    clientSelect.innerHTML = '<option value="">— Não é cliente / preencher manualmente —</option>'
      + clients.map(c => `<option value="${c.id}">${c.companyName || c.tradeName}</option>`).join('');
    if (preselectClientId) clientSelect.value = preselectClientId;

    this.onServiceSelected();
    this.onClientSelected();
    this._setupDocInput();

    modal.querySelector('.modal-content-scroll')?.scrollTo(0, 0);
    modal.classList.add('active');
  },

  onServiceSelected() {
    const id = document.getElementById('avulso-req-service').value;
    const info = document.getElementById('avulso-req-service-info');
    const roteiro = document.getElementById('avulso-req-service-roteiro');
    const item = DataStore.getAvulsoCatalog().find(c => c.id === id);
    if (!item) {
      info.textContent = '';
      if (roteiro) roteiro.innerHTML = '';
      return;
    }
    info.textContent = `${this.formatHonorario(item)} · Execução interna: ${item.prazoExecucaoInterna || '-'} · Conclusão total: ${item.prazoConclusaoTotal || '-'}`;
    // Mostra de cara como esse serviço deve ser executado — antes só dava
    // pra ver isso reabrindo o documento original do roteiro.
    if (roteiro) roteiro.innerHTML = this.renderRoteiroHtml(item);
  },

  // Selecionar um cliente já cadastrado preenche CNPJ/CPF e Nome sozinho
  // (e trava os dois campos) — assim não sobra a impressão de que são dois
  // cadastros redundantes. Desmarcando o cliente, os campos voltam a ficar
  // livres para preenchimento manual (caso do solicitante que não é cliente).
  onClientSelected() {
    const clientId = document.getElementById('avulso-req-client').value;
    const docInput = document.getElementById('avulso-req-doc');
    const nomeInput = document.getElementById('avulso-req-nome');
    const hint = document.getElementById('avulso-req-client-hint');
    const receitaStatus = document.getElementById('avulso-req-receita-status');

    if (!clientId) {
      if (this._linkedClientAutofill) {
        docInput.value = '';
        nomeInput.value = '';
      }
      this._linkedClientAutofill = false;
      docInput.readOnly = false;
      nomeInput.readOnly = false;
      if (hint) hint.textContent = '';
      return;
    }

    const client = DataStore.getClients().find(c => c.id === clientId);
    if (!client) return;

    const doc = Validators.onlyNumbers(client.cnpj || client.cpf || '');
    docInput.value = doc ? (doc.length > 11 ? Validators.formatCNPJ(doc) : Validators.formatCPF(doc)) : '';
    nomeInput.value = client.companyName || client.tradeName || '';
    docInput.readOnly = true;
    nomeInput.readOnly = true;
    this._linkedClientAutofill = true;
    this._pendingReceitaSnapshot = null;
    if (receitaStatus) receitaStatus.textContent = '';
    if (hint) hint.textContent = 'Preenchido automaticamente a partir do cadastro do cliente.';
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

    const clientId = document.getElementById('avulso-req-client').value || null;
    try {
      await DataStore.createAvulsoRequest({
        catalogServiceId: serviceId,
        clientId,
        cnpj: isCnpj ? docClean : null,
        cpf: !isCnpj ? docClean : null,
        nomeSolicitante: document.getElementById('avulso-req-nome').value.trim(),
        dadosReceita,
        checklist
      });
      App.closeAllModals();
      App.showToast('Solicitação criada com sucesso!', 'success');
      this.render();
      this._syncDossieIfNeeded(clientId);
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

    // "O que fazer" (roteiro do catálogo) ao lado de "o que já foi obtido"
    // (checklist da solicitação) — antes só existia o checklist.
    const roteiroContainer = document.getElementById('avulso-detail-roteiro');
    if (roteiroContainer) roteiroContainer.innerHTML = this.renderRoteiroHtml(service);

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
      this._syncDossieIfNeeded(request.clientId);
    } catch (err) {
      console.error('Erro ao atualizar solicitação avulsa:', err);
      App.showToast('Erro ao atualizar solicitação. Tente novamente.', 'danger');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Solicitação'; }
    }
  },

  // this.render() só atualiza os elementos da própria página de Serviços
  // Avulsos (ids que só existem lá). Quando a solicitação está vinculada a
  // um cliente e o Dossiê desse cliente está aberto na mesma página, atualiza
  // a aba "Serviços Avulsos" do Dossiê também — mesmo padrão usado em
  // App.saveClientForm / App.saveInteractionForm.
  _syncDossieIfNeeded(clientId) {
    if (clientId && window.App?.currentPage === 'dossie' && App.selectedClientId === clientId) {
      App.renderDetailAvulsosTab?.(DataStore.getClientById(clientId));
    }
  }
};

window.AvulsoServices = AvulsoServices;
