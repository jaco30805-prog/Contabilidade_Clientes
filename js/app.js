/**
 * Voal Consult — ERP & Gestão Contábil
 * Aplicação Principal SPA (Tema Claro Minimalista & 100% em Português PT-BR)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const authOk = await Auth.init();
  if (!authOk) return; // sem sessão — Auth já redirecionou para login.html
  window.Sidebar?.applyAuthenticatedUser();

  await DataStore.init();
  await ObligationsManager.syncCompetenceObligations();
  App.init();
});

const App = {
  // Cada página é independente (multi-página): esta chave vem do
  // atributo <body data-page="..."> e diz qual tela renderizar ao carregar.
  currentPage: null,
  selectedClientId: null,
  selectedCompetence: ObligationsManager.getCurrentCompetence(),

  init() {
    this.currentPage = document.body.dataset.page || '';
    this.setupEventListeners();
    this.renderHeaderCompetenceSelector();
    this.renderCurrentPage();
  },

  // =========================================================================
  // Despacho por página
  // =========================================================================
  // Cada página HTML já é a sua própria rota (clientes.html, cnds.html...).
  // Esta função só decide qual renderização rodar ao carregar a página atual.
  renderCurrentPage() {
    switch (this.currentPage) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'clientes':
        this.renderClientsList();
        break;
      case 'dossie': {
        const params = new URLSearchParams(window.location.search);
        this.selectedClientId = params.get('id') || this.selectedClientId;
        this.renderClientDetail(this.selectedClientId);
        break;
      }
      case 'conformidade':
        this.renderObligationsView();
        break;
      case 'cnds':
        this.renderCNDsView();
        break;
      case 'honorarios':
        this.renderFinancialView();
        break;
      case 'configuracoes':
        this.renderReportsView();
        break;
    }
  },

  // Navega para o dossiê de um cliente (página própria, recebe ?id= na URL)
  goToClient(clientId) {
    window.location.href = `dossie.html?id=${encodeURIComponent(clientId)}`;
  },

  // =========================================================================
  // Configuração de Eventos
  // =========================================================================
  setupEventListeners() {
    // Fechar Modais
    document.querySelectorAll('.modal-backdrop-wrap, .modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAllModals();
      });
    });
    document.querySelectorAll('.modal-close-trigger, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Copiar CNPJ
    const btnCopyCnpj = document.getElementById('btn-copy-cnpj');
    if (btnCopyCnpj) {
      btnCopyCnpj.addEventListener('click', () => {
        const client = DataStore.getClientById(this.selectedClientId);
        if (client && (client.cnpj || client.cpf)) {
          navigator.clipboard.writeText(client.cnpj || client.cpf);
          btnCopyCnpj.textContent = 'Copiado!';
          setTimeout(() => { btnCopyCnpj.textContent = 'Copiar'; }, 2000);
          this.showToast('CNPJ copiado para a área de transferência!', 'success');
        }
      });
    }

    this.setupInputMasks();
  },

  renderHeaderCompetenceSelector() {
    const selector = document.getElementById('header-competence-select');
    if (!selector) return;

    const currentYear = 2026;
    let html = '';
    for (let m = 12; m >= 1; m--) {
      const val = `${currentYear}-${String(m).padStart(2, '0')}`;
      const selected = val === this.selectedCompetence ? 'selected' : '';
      html += `<option value="${val}" ${selected}>${ObligationsManager.formatCompetence(val)}</option>`;
    }
    selector.innerHTML = html;

    selector.addEventListener('change', async (e) => {
      this.selectedCompetence = e.target.value;
      await ObligationsManager.syncCompetenceObligations(this.selectedCompetence);
      if (this.currentPage === 'conformidade') this.renderObligationsView();
      if (this.currentPage === 'dashboard') this.renderDashboard();
    });
  },

  // =========================================================================
  // VIEW: PAINEL GERAL (DASHBOARD)
  // =========================================================================
  renderDashboard() {
    const clients = DataStore.getClients();
    const activeClients = clients.filter(c => c.status === 'ATIVO');
    const metrics = ObligationsManager.getMetrics(this.selectedCompetence);

    // MRR = receita recorrente mensal — esporádicos não entram (não é
    // recorrência, é serviço pontual).
    const totalMRR = activeClients
      .filter(c => c.recurrence !== 'ESPORADICO')
      .reduce((acc, c) => acc + (c.financial?.monthlyFee || 0), 0);

    // 4 Indicadores KPIs
    const elMrr = document.getElementById('dash-stat-mrr');
    if (elMrr) elMrr.textContent = Validators.formatCurrency(totalMRR);

    const elClients = document.getElementById('dash-stat-clients');
    if (elClients) elClients.textContent = `${activeClients.length} empresas`;

    const elObligations = document.getElementById('dash-stat-obligations');
    if (elObligations) elObligations.textContent = `${metrics.completed} / ${metrics.total}`;

    const elObligationsPct = document.getElementById('dash-stat-obligations-pct');
    if (elObligationsPct) {
      elObligationsPct.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        ${metrics.progressPercentage}% no prazo regulamentar
      `;
    }

    const elAlerts = document.getElementById('dash-stat-alerts');
    if (elAlerts) elAlerts.textContent = `${metrics.overdue} pendências`;

    // Resumo Rápido
    const elQuickOverdue = document.getElementById('stat-quick-overdue');
    if (elQuickOverdue) elQuickOverdue.textContent = metrics.overdue;

    const elQuickPending = document.getElementById('stat-quick-pending');
    if (elQuickPending) elQuickPending.textContent = metrics.pendingCount;

    const elQuickMrr = document.getElementById('stat-quick-mrr');
    if (elQuickMrr) elQuickMrr.textContent = Validators.formatCurrency(totalMRR);

    const elQuickContracts = document.getElementById('stat-quick-contracts');
    if (elQuickContracts) elQuickContracts.textContent = `${activeClients.length} empresas ativas`;

    this.renderDashboardRecentActivity(clients);
  },

  renderDashboardRecentActivity(clients) {
    const container = document.getElementById('dash-activity-list');
    if (!container) return;

    let allInteractions = [];
    clients.forEach(c => {
      if (c.interactions && c.interactions.length > 0) {
        c.interactions.forEach(int => {
          allInteractions.push({
            ...int,
            clientId: c.id,
            clientName: c.companyName || c.tradeName
          });
        });
      }
    });

    allInteractions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allInteractions.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 24px 12px; color:var(--text-muted); font-size:0.85rem;">
          Nenhum atendimento registrado ainda. Os últimos atendimentos de qualquer cliente aparecem aqui.
        </div>
      `;
      return;
    }

    container.innerHTML = allInteractions.slice(0, 4).map(item => `
      <div class="activity-item" style="cursor:pointer;" onclick="App.goToClient('${item.clientId}')">
        <div class="activity-icon-bullet ${item.type === 'ALERTA' ? 'warning' : 'success'}">
          ${item.type === 'ALERTA' 
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
          }
        </div>
        <div class="activity-content">
          <div class="activity-text">${item.title} &bull; <span style="color:var(--primary-blue); font-weight:500;">${item.clientName}</span></div>
          <div class="activity-time">${Validators.formatDate(item.date)} &bull; ${item.user || 'Voal Consult'}</div>
        </div>
      </div>
    `).join('');
  },

  // =========================================================================
  // VIEW: CARTEIRA DE CLIENTES
  // =========================================================================
  renderClientsList() {
    const clients = DataStore.getClients();
    this.populateClientFilters();
    this.renderClientsTable(clients);
  },

  populateClientFilters() {
    const selectRegime = document.getElementById('filter-client-regime');
    if (selectRegime && selectRegime.options.length <= 1) {
      let html = '<option value="TODOS">Todos os Regimes Tributários</option>';
      Object.values(DataStore.TaxRegimes).forEach(r => {
        html += `<option value="${r.id}">${r.name}</option>`;
      });
      selectRegime.innerHTML = html;
      selectRegime.addEventListener('change', () => this.filterClientsList());
    }

    const selectStatus = document.getElementById('filter-client-status');
    if (selectStatus && selectStatus.options.length <= 1) {
      let html = '<option value="TODOS">Todas as Situações</option>';
      DataStore.ClientStatuses.forEach(s => {
        html += `<option value="${s.id}">${s.name}</option>`;
      });
      selectStatus.innerHTML = html;
      selectStatus.addEventListener('change', () => this.filterClientsList());
    }

    const searchInput = document.getElementById('filter-client-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterClientsList());
    }
  },

  filterClientsList() {
    const query = (document.getElementById('filter-client-search')?.value || '').toLowerCase().trim();
    const regime = document.getElementById('filter-client-regime')?.value || 'TODOS';
    const status = document.getElementById('filter-client-status')?.value || 'TODOS';

    let clients = DataStore.getClients();

    if (regime !== 'TODOS') {
      clients = clients.filter(c => c.taxRegime === regime);
    }

    if (status !== 'TODOS') {
      clients = clients.filter(c => c.status === status);
    }

    if (query) {
      clients = clients.filter(c => 
        (c.companyName && c.companyName.toLowerCase().includes(query)) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(query)) ||
        (c.cnpj && c.cnpj.includes(query)) ||
        (c.cpf && c.cpf.includes(query)) ||
        (c.contactName && c.contactName.toLowerCase().includes(query))
      );
    }

    this.renderClientsTable(clients);
  },

  renderClientsTable(clients) {
    const tbody = document.getElementById('clients-table-tbody');
    const countSpan = document.getElementById('clients-filtered-count');
    if (countSpan) countSpan.textContent = `Mostrando ${clients.length} empresa(s) na carteira da Voal Consult`;

    if (!tbody) return;

    if (clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color:var(--text-muted);">Nenhum cliente cadastrado ou encontrado com os filtros selecionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = clients.map(client => {
      const regimeMeta = DataStore.TaxRegimes[client.taxRegime] || { name: client.taxRegime };
      const certStatus = client.digitalCertificate?.expirationDate 
        ? Validators.getExpirationStatus(client.digitalCertificate.expirationDate, 30)
        : { label: 'Sem cert.', badgeClass: 'chip-muted' };

      return `
        <tr>
          <td>
            <a class="client-anchor" onclick="App.goToClient('${client.id}')">
              ${client.companyName || client.tradeName}
            </a>
            <div style="font-size:0.75rem; color:var(--text-muted);">${client.tradeName || '-'}</div>
            <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${client.cnpj || client.cpf || '-'}</div>
          </td>
          <td>
            <span class="chip chip-info">${regimeMeta.name}</span>
            <div style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">Porte: ${client.companySize || '-'}</div>
          </td>
          <td>
            <span class="chip ${client.status === 'ATIVO' ? 'chip-success' : 'chip-warning'}">${client.status === 'ATIVO' ? 'Ativo' : client.status}</span>
            <div style="margin-top:4px;">
              <span class="chip ${client.recurrence === 'ESPORADICO' ? 'chip-muted' : 'chip-info'}" style="font-size:0.68rem;">${client.recurrence === 'ESPORADICO' ? 'Esporádico' : 'Recorrente'}</span>
            </div>
          </td>
          <td>
            <div style="font-weight:600; font-size:0.85rem;">${client.contactName || '-'}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${client.whatsapp || client.phones?.[0] || '-'}</div>
          </td>
          <td>
            <span class="chip ${certStatus.badgeClass}">${certStatus.label}</span>
          </td>
          <td style="font-weight:700; font-family:var(--font-mono); color:#10B981;">
            ${Validators.formatCurrency(client.financial?.monthlyFee || 0)}
          </td>
          <td>
            <div style="display:flex; gap:6px; justify-content:flex-end;">
              <button class="btn-figma-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.goToClient('${client.id}')">Ver Dossiê</button>
              <button class="btn-figma-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.openClientModal('${client.id}')">Editar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // VIEW: DOSSIÊ 360 DO CLIENTE
  // =========================================================================
  renderClientDetail(clientId) {
    const client = DataStore.getClientById(clientId);
    if (!client) {
      this.showToast('Cliente não localizado no sistema.', 'danger');
      window.location.href = 'clientes.html';
      return;
    }

    const initial = (client.companyName || client.tradeName || 'V').charAt(0).toUpperCase();
    document.getElementById('detail-avatar-initial').textContent = initial;
    document.getElementById('detail-company-name').textContent = client.companyName || client.tradeName;
    document.getElementById('detail-trade-name').textContent = client.tradeName ? `(${client.tradeName})` : '';
    document.getElementById('detail-cnpj').textContent = `CNPJ/CPF: ${client.cnpj || client.cpf || '-'}`;

    const btnEdit = document.getElementById('btn-profile-edit');
    if (btnEdit) btnEdit.onclick = () => this.openClientModal(client.id);

    const btnDelete = document.getElementById('btn-profile-delete');
    if (btnDelete) btnDelete.onclick = () => this.confirmDeleteClient(client.id, client.companyName);

    const btnPrint = document.getElementById('btn-profile-print');
    if (btnPrint) btnPrint.onclick = () => window.print();

    const btnAddNote = document.getElementById('btn-profile-add-note');
    if (btnAddNote) btnAddNote.onclick = () => this.openInteractionModal(client.id);

    this.renderDetailGeneralTab(client);
    this.renderDetailFiscalTab(client);
    this.renderDetailPartnersTab(client);
    this.renderDetailAccessTab(client);
    this.renderDetailCndTab(client);
    this.renderDetailFinancialTab(client);
    this.renderDetailInteractionsTab(client);
    this.renderDetailTimeTab(client);

    this.switchDetailTab('tab-general');

    // Abre a contagem de tempo para este cliente — roda até a página ser
    // deixada (js/timeTracking.js cuida de fechar sozinho).
    if (window.TimeTracker && !TimeTracker.entryId) {
      TimeTracker.open(client.id);
    }
  },

  switchDetailTab(tabId) {
    document.querySelectorAll('.tab-segment-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-pane-view').forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  },

  renderDetailGeneralTab(client) {
    document.getElementById('det-gen-name').textContent = client.companyName || '-';
    document.getElementById('det-gen-trade').textContent = client.tradeName || '-';
    document.getElementById('det-gen-doc').textContent = client.cnpj || client.cpf || '-';
    document.getElementById('det-gen-founding').textContent = Validators.formatDate(client.foundingDate);
    document.getElementById('det-gen-recurrence').innerHTML = client.recurrence === 'ESPORADICO'
      ? '<span class="chip chip-muted">Esporádico — sem monitoramento automático</span>'
      : '<span class="chip chip-info">Recorrente — carteira monitorada</span>';
    document.getElementById('det-gen-contact-name').textContent = client.contactName || '-';
    document.getElementById('det-gen-contact-role').textContent = client.contactRole || '-';
    document.getElementById('det-gen-phones').textContent = client.phones ? client.phones.join(' / ') : '-';
    document.getElementById('det-gen-whatsapp').textContent = client.whatsapp || '-';
    document.getElementById('det-gen-email').textContent = client.email || '-';

    const addr = client.address || {};
    document.getElementById('det-addr-street').textContent = `${addr.street || '-'}, ${addr.number || 'S/N'}`;
    document.getElementById('det-addr-comp').textContent = addr.complement || '-';
    document.getElementById('det-addr-neighborhood').textContent = addr.neighborhood || '-';
    document.getElementById('det-addr-city').textContent = `${addr.city || '-'} / ${addr.state || '-'}`;
    document.getElementById('det-addr-cep').textContent = addr.cep ? Validators.formatCEP(addr.cep) : '-';
  },

  renderDetailFiscalTab(client) {
    document.getElementById('det-fisc-regime').textContent = DataStore.TaxRegimes[client.taxRegime]?.name || client.taxRegime;
    document.getElementById('det-fisc-ie').textContent = client.stateRegistration || 'Isento';
    document.getElementById('det-fisc-im').textContent = client.municipalRegistration || 'Não informado';
    document.getElementById('det-fisc-dept').textContent = client.department || 'Geral';

    const mainCnae = client.mainCnae || { code: '-', description: 'Não informado' };
    document.getElementById('det-fisc-main-cnae').innerHTML = `<strong>${mainCnae.code}</strong> — ${mainCnae.description}`;

    const secContainer = document.getElementById('det-fisc-sec-cnaes');
    if (client.secondaryCnaes && client.secondaryCnaes.length > 0) {
      secContainer.innerHTML = client.secondaryCnaes.map(c => `
        <li style="padding:6px 0; border-bottom:1px solid var(--border-color); font-size:0.85rem;">
          <strong style="color:var(--primary-blue);">${c.code}</strong> — ${c.description}
        </li>
      `).join('');
    } else {
      secContainer.innerHTML = `<li style="color:var(--text-dim); padding:6px 0;">Nenhum CNAE secundário cadastrado.</li>`;
    }
  },

  renderDetailPartnersTab(client) {
    const tbody = document.getElementById('det-partners-tbody');
    if (!tbody) return;

    if (!client.partners || client.partners.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum sócio cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = client.partners.map(p => `
      <tr>
        <td style="font-weight:600;">${p.name}</td>
        <td style="font-family:var(--font-mono);">${p.cpf || '-'}</td>
        <td style="font-weight:700; color:var(--primary-blue);">${p.sharePercentage || 0}%</td>
        <td>
          <span class="chip ${p.isAdmin ? 'chip-success' : 'chip-muted'}">
            ${p.isAdmin ? 'Administrador' : 'Sócio Cotista'}
          </span>
        </td>
        <td style="font-family:var(--font-mono); font-weight:600; color:#10B981;">
          ${p.hasProLabore ? Validators.formatCurrency(p.proLaboreValue || 0) : 'Sem Pró-Labore'}
        </td>
      </tr>
    `).join('');
  },

  renderDetailAccessTab(client) {
    const cert = client.digitalCertificate || {};
    const certStatus = cert.expirationDate ? Validators.getExpirationStatus(cert.expirationDate, 30) : { label: 'Não informado', badgeClass: 'chip-muted' };

    document.getElementById('det-cert-type').textContent = cert.type || 'Não informado';
    document.getElementById('det-cert-issuer').textContent = cert.issuer || 'Não informado';
    document.getElementById('det-cert-exp').textContent = Validators.formatDate(cert.expirationDate);
    document.getElementById('det-cert-status').innerHTML = `<span class="chip ${certStatus.badgeClass}">${certStatus.label}</span>`;

    const keys = client.accessKeys || {};
    document.getElementById('det-key-gov').textContent = keys.govBrUser || '-';
    document.getElementById('det-key-simples').textContent = keys.simplesCode || '-';
    document.getElementById('det-key-post').textContent = keys.postOfficeCode || '-';
    document.getElementById('det-key-notes').textContent = keys.notes || 'Sem observações adicionais.';
  },

  renderDetailCndTab(client) {
    const cnds = client.cnds || {};
    const list = [
      { key: 'federal', label: 'CND Federal / PGFN' },
      { key: 'estadual', label: 'CND Estadual (SEFAZ)' },
      { key: 'municipal', label: 'CND Municipal (Prefeitura)' },
      { key: 'fgts', label: 'CRF FGTS (Caixa)' },
      { key: 'trabalhista', label: 'CNDT Trabalhista (TST)' }
    ];

    const container = document.getElementById('det-cnd-grid');
    if (!container) return;

    container.innerHTML = list.map(item => {
      const info = cnds[item.key] || { validUntil: '', notes: '' };
      const status = info.validUntil ? Validators.getExpirationStatus(info.validUntil, 15) : { label: 'Não informado', badgeClass: 'chip-muted' };

      return `
        <div class="kpi-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="font-weight:700; font-size:0.88rem;">${item.label}</div>
            <span class="chip ${status.badgeClass}">${status.label}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);">
            Validade: ${Validators.formatDate(info.validUntil)}
          </div>
          <div style="font-size:0.75rem; color:var(--text-dim); margin-top:4px;">
            ${info.notes || 'Regular'}
          </div>
        </div>
      `;
    }).join('');
  },

  renderDetailFinancialTab(client) {
    const fin = client.financial || {};
    document.getElementById('det-fin-fee').textContent = Validators.formatCurrency(fin.monthlyFee || 0);
    document.getElementById('det-fin-due').textContent = fin.dueDay ? `Todo dia ${fin.dueDay}` : 'Não informado';
    document.getElementById('det-fin-method').textContent = fin.paymentMethod || 'BOLETO';
    document.getElementById('det-fin-13th').textContent = fin.has13thFee ? 'Sim (Cobrança anual)' : 'Não possui';
    document.getElementById('det-fin-notes').textContent = fin.feeNotes || 'Nenhuma cláusula especial cadastrada.';
  },

  renderDetailInteractionsTab(client) {
    const container = document.getElementById('det-interactions-timeline');
    if (!container) return;

    const interactions = client.interactions || [];
    if (interactions.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:30px;">Nenhum atendimento ou orientação registrada para esta empresa.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="activity-list">
        ${interactions.map(item => `
          <div class="activity-item">
            <div class="activity-icon-bullet ${item.type === 'ALERTA' ? 'warning' : 'success'}">
              ${item.type === 'ALERTA' 
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
              }
            </div>
            <div class="activity-content">
              <div class="activity-text">${item.title}</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">${item.content}</div>
              <div class="activity-time">${Validators.formatDate(item.date)} &bull; ${item.user || 'Voal Consult'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async renderDetailTimeTab(client) {
    const totalEl = document.getElementById('det-time-total');
    const tbody = document.getElementById('det-time-entries-tbody');
    if (!totalEl && !tbody) return;

    if (!window.TimeTracker) return;

    const [totalSeconds, history] = await Promise.all([
      TimeTracker.getTotalSecondsForClient(client.id),
      TimeTracker.getHistoryForClient(client.id)
    ]);

    if (totalEl) totalEl.textContent = TimeTracker._formatDuration(Math.floor(totalSeconds));

    if (tbody) {
      if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Nenhuma sessão registrada ainda — abra este Dossiê para começar a contar.</td></tr>`;
      } else {
        tbody.innerHTML = history.map(entry => {
          const start = new Date(entry.started_at);
          const endRef = entry.ended_at || entry.last_heartbeat_at;
          const end = endRef ? new Date(endRef) : null;
          const durationSecs = Math.max(0, ((end || new Date()) - start) / 1000);
          const responsavel = DataStore._profilesById?.[entry.user_id]?.full_name || '-';
          // Sessão "aberta" mas sem heartbeat recente (> 90s, bem mais que o
          // ciclo de 20s) provavelmente foi abandonada — aba/navegador
          // fechado à força, sem disparar o fechamento correto.
          const secondsSinceHeartbeat = (Date.now() - new Date(entry.last_heartbeat_at).getTime()) / 1000;
          const isStale = entry.status === 'ABERTO' && secondsSinceHeartbeat > 90;
          const situacao = entry.status === 'ABERTO'
            ? (isStale ? '<span class="chip chip-danger" title="Sem atividade recente — provavelmente a aba foi fechada sem avisar o sistema">Sessão travada?</span>' : '<span class="chip chip-warning">Em andamento</span>')
            : '<span class="chip chip-success">Concluída</span>';
          return `
            <tr>
              <td style="font-family:var(--font-mono); font-size:0.8rem;">${start.toLocaleString('pt-BR')}</td>
              <td style="font-family:var(--font-mono); font-size:0.8rem;">${end ? end.toLocaleString('pt-BR') : '-'}</td>
              <td style="font-family:var(--font-mono); font-weight:700;">${TimeTracker._formatDuration(Math.floor(durationSecs))}</td>
              <td>${responsavel}</td>
              <td>${situacao}</td>
            </tr>`;
        }).join('');
      }
    }
  },

  // =========================================================================
  // VIEW: CONFORMIDADE FISCAL (OBRIGAÇÕES)
  // =========================================================================
  renderObligationsView() {
    const competence = this.selectedCompetence;
    document.getElementById('ob-view-competence-title').textContent = ObligationsManager.formatCompetence(competence);

    const metrics = ObligationsManager.getMetrics(competence);
    document.getElementById('ob-stat-total').textContent = metrics.total;
    document.getElementById('ob-stat-done').textContent = metrics.completed;
    document.getElementById('ob-stat-pending').textContent = metrics.pendingCount;
    document.getElementById('ob-stat-overdue').textContent = metrics.overdue;

    const list = ObligationsManager.getFilteredObligations({ competence });

    const tbody = document.getElementById('obligations-table-tbody');
    if (tbody) {
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhuma obrigação gerada para esta competência.</td></tr>`;
      } else {
        tbody.innerHTML = list.map(item => `
          <tr>
            <td>
              <div style="font-weight:600;">${item.title}</div>
              <div style="font-size:0.72rem; color:var(--text-dim);">Código: ${item.code}</div>
            </td>
            <td>
              <div class="client-anchor" onclick="App.goToClient('${item.clientId}')">${item.clientName}</div>
              <div style="font-size:0.72rem; font-family:var(--font-mono); color:var(--text-dim);">${item.clientCnpj || '-'}</div>
            </td>
            <td style="font-family:var(--font-mono);">${Validators.formatDate(item.dueDate)}</td>
            <td>
              <span class="chip ${item.status === 'CONCLUIDO' ? 'chip-success' : 'chip-warning'}">${item.status === 'CONCLUIDO' ? 'Transmitido' : (item.status === 'PENDENTE' ? 'Pendente' : item.status)}</span>
            </td>
            <td style="font-size:0.8rem; font-family:var(--font-mono);">${item.protocolNumber || '-'}</td>
            <td style="text-align: right;">
              <button class="btn-figma-primary" style="padding:4px 10px; font-size:0.75rem;" onclick="App.openObligationActionModal('${item.id}')">
                ${item.status === 'CONCLUIDO' ? 'Ver / Editar' : 'Transmitir'}
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  },

  // =========================================================================
  // VIEW: CNDs
  // =========================================================================
  renderCNDsView() {
    // Clientes esporádicos não entram na matriz de monitoramento de CND.
    const clients = DataStore.getClients().filter(c => c.status === 'ATIVO' && c.recurrence !== 'ESPORADICO');
    const cndTypes = ['federal', 'estadual', 'municipal', 'fgts', 'trabalhista'];

    // KPIs da matriz: cada cliente ativo tem até 5 certidões monitoradas
    let regularCount = 0, expiringCount = 0, expiredCount = 0, missingCount = 0;
    clients.forEach(client => {
      const cnds = client.cnds || {};
      cndTypes.forEach(type => {
        const validUntil = cnds[type]?.validUntil;
        if (!validUntil) { missingCount++; return; }
        const status = Validators.getExpirationStatus(validUntil, 15).status;
        if (status === 'expired' || status === 'today') expiredCount++;
        else if (status === 'warning') expiringCount++;
        else regularCount++;
      });
    });

    const elRegular = document.getElementById('cnd-stat-regular');
    if (elRegular) elRegular.textContent = regularCount;
    const elRegularSub = document.getElementById('cnd-stat-regular-sub');
    if (elRegularSub) elRegularSub.textContent = `de ${clients.length * cndTypes.length} certidões monitoradas`;

    const elExpiring = document.getElementById('cnd-stat-expiring');
    if (elExpiring) elExpiring.textContent = expiringCount;

    const elExpired = document.getElementById('cnd-stat-expired');
    if (elExpired) elExpired.textContent = expiredCount;

    const elMissing = document.getElementById('cnd-stat-missing');
    if (elMissing) elMissing.textContent = missingCount;

    const tbody = document.getElementById('cnd-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = clients.map(client => {
      const cnds = client.cnds || {};
      const renderCell = (k) => {
        const c = cnds[k] || { validUntil: '' };
        if (!c.validUntil) return '<span class="chip chip-muted">Não inf.</span>';
        const st = Validators.getExpirationStatus(c.validUntil, 15);
        return `<span class="chip ${st.badgeClass}">${Validators.formatDate(c.validUntil)}</span>`;
      };

      return `
        <tr>
          <td>
            <div class="client-anchor" onclick="App.goToClient('${client.id}')">${client.companyName || client.tradeName}</div>
            <div style="font-size:0.72rem; font-family:var(--font-mono); color:var(--text-dim);">${client.cnpj || client.cpf || '-'}</div>
          </td>
          <td>${renderCell('federal')}</td>
          <td>${renderCell('estadual')}</td>
          <td>${renderCell('municipal')}</td>
          <td>${renderCell('fgts')}</td>
          <td>${renderCell('trabalhista')}</td>
          <td style="text-align: right;">
            <button class="btn-figma-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="App.openCNDEditModal('${client.id}')">Atualizar</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // VIEW: HONORÁRIOS
  // =========================================================================
  renderFinancialView() {
    // Página de Honorários (MRR) — só carteira recorrente. Esporádicos têm
    // valor de serviço avulso, não mensalidade, e aparecem só na Carteira.
    const clients = DataStore.getClients().filter(c => c.status === 'ATIVO' && c.recurrence !== 'ESPORADICO');
    const totalMRR = clients.reduce((sum, c) => sum + (c.financial?.monthlyFee || 0), 0);
    const count13th = clients.filter(c => c.financial?.has13thFee).length;

    document.getElementById('fin-total-mrr').textContent = Validators.formatCurrency(totalMRR);
    document.getElementById('fin-clients-billed').textContent = `${clients.length} empresas`;
    document.getElementById('fin-13th-count').textContent = `${count13th} clientes`;

    const tbody = document.getElementById('financial-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = clients.map(client => {
      const fin = client.financial || {};
      return `
        <tr>
          <td>
            <div class="client-anchor" onclick="App.goToClient('${client.id}')">${client.companyName || client.tradeName}</div>
            <div style="font-size:0.72rem; font-family:var(--font-mono); color:var(--text-dim);">${client.cnpj || '-'}</div>
          </td>
          <td><span class="chip chip-info">${DataStore.TaxRegimes[client.taxRegime]?.name || client.taxRegime}</span></td>
          <td style="font-weight:700; color:#10B981; font-family:var(--font-mono);">${Validators.formatCurrency(fin.monthlyFee || 0)}</td>
          <td>Dia ${fin.dueDay || '10'}</td>
          <td><span class="chip chip-muted">${fin.paymentMethod || 'BOLETO'}</span></td>
          <td><span class="chip ${fin.has13thFee ? 'chip-success' : 'chip-muted'}">${fin.has13thFee ? 'Sim' : 'Não'}</span></td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${fin.feeNotes || '-'}</td>
        </tr>
      `;
    }).join('');
  },

  // =========================================================================
  // VIEW: CONFIGURAÇÕES & BACKUP
  // =========================================================================
  async renderReportsView() {
    // Painel "Versão do Sistema": números reais em vez de contagens fixas
    const clients = DataStore.getClients();
    const elClientCount = document.getElementById('sys-stat-clients');
    if (elClientCount) elClientCount.textContent = clients.length;

    const elObligationsCount = document.getElementById('sys-stat-obligations');
    if (elObligationsCount) {
      // Conta o total real no banco (o cache local só tem as competências
      // já sincronizadas nesta sessão de página).
      const { count } = await sb.from('obligations').select('*', { count: 'exact', head: true });
      elObligationsCount.textContent = count ?? ObligationsManager.getAllObligations().length;
    }

    // Certificados Digitais: tabela vem da carteira real de clientes
    const certTbody = document.getElementById('certificates-table-tbody');
    if (certTbody) {
      const withCert = clients.filter(c => c.digitalCertificate?.expirationDate);
      certTbody.innerHTML = withCert.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">Nenhum certificado digital cadastrado.</td></tr>`
        : withCert.map(client => {
            const cert = client.digitalCertificate;
            const status = Validators.getExpirationStatus(cert.expirationDate, 30);
            return `
              <tr>
                <td><a class="client-anchor" href="dossie.html?id=${client.id}">${client.companyName || client.tradeName}</a></td>
                <td style="font-family:var(--font-mono);font-size:0.8rem;">${client.cnpj || client.cpf || '-'}</td>
                <td><span class="chip chip-info">${cert.type === 'A3' ? 'e-CNPJ A3' : 'e-CNPJ A1'}</span></td>
                <td style="font-size:0.8rem;color:var(--text-muted);">${cert.issuer || '-'}</td>
                <td style="font-family:var(--font-mono);font-size:0.8rem;">${Validators.formatDate(cert.expirationDate)}</td>
                <td><span class="chip ${status.badgeClass}">${status.label}</span></td>
              </tr>
            `;
          }).join('');
    }

    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.onclick = () => {
        const csv = DataStore.exportCSV();
        this.downloadFile(csv, `voal_consult_clientes_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
        this.showToast('Planilha CSV gerada com sucesso!', 'success');
      };
    }

    const btnExportJSON = document.getElementById('btn-export-json');
    if (btnExportJSON) {
      btnExportJSON.onclick = () => {
        const json = DataStore.exportJSON();
        this.downloadFile(json, `voal_consult_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        this.showToast('Backup JSON exportado com sucesso!', 'success');
      };
    }

    const inputImportJSON = document.getElementById('input-import-json');
    if (inputImportJSON) {
      inputImportJSON.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm('Isso vai CRIAR novamente cada cliente do backup como um cadastro novo (não sobrescreve os existentes). Deseja continuar?')) {
          inputImportJSON.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
          this.showToast('Restaurando backup, aguarde...', 'info');
          const res = await DataStore.importJSON(ev.target.result);
          if (res.success) {
            this.showToast(`${res.count} clientes restaurados com sucesso!`, 'success');
            setTimeout(() => { window.location.href = 'clientes.html'; }, 800);
          } else {
            this.showToast(`Erro ao importar: ${res.error}`, 'danger');
          }
        };
        reader.readAsText(file);
      };
    }
  },

  // =========================================================================
  // MODAL CLIENTE
  // =========================================================================
  openClientModal(clientId = null) {
    const modal = document.getElementById('modal-client-form');
    const form = document.getElementById('client-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('modal-client-title').textContent = clientId ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente — Voal Consult';
    document.getElementById('client-form-id').value = clientId || '';

    const partnersContainer = document.getElementById('form-partners-list');
    if (partnersContainer) partnersContainer.innerHTML = '';

    if (clientId) {
      const client = DataStore.getClientById(clientId);
      if (client) {
        document.getElementById('form-company-name').value = client.companyName || '';
        document.getElementById('form-trade-name').value = client.tradeName || '';
        document.getElementById('form-cnpj').value = client.cnpj || client.cpf || '';
        document.getElementById('form-founding-date').value = client.foundingDate || '';
        document.getElementById('form-tax-regime').value = client.taxRegime || '';
        document.getElementById('form-company-size').value = client.companySize || 'ME';
        document.getElementById('form-status').value = client.status || 'ATIVO';
        document.getElementById('form-accountant').value = client.responsibleAccountant || 'Voal Consult';
        document.getElementById('form-recurrence').value = client.recurrence || 'RECORRENTE';

        document.getElementById('form-contact-name').value = client.contactName || '';
        document.getElementById('form-contact-role').value = client.contactRole || '';
        document.getElementById('form-phone').value = client.phones ? client.phones[0] : '';
        document.getElementById('form-whatsapp').value = client.whatsapp || '';
        document.getElementById('form-email').value = client.email || '';

        const addr = client.address || {};
        document.getElementById('form-cep').value = addr.cep || '';
        document.getElementById('form-street').value = addr.street || '';
        document.getElementById('form-number').value = addr.number || '';
        document.getElementById('form-comp').value = addr.complement || '';
        document.getElementById('form-neighborhood').value = addr.neighborhood || '';
        document.getElementById('form-city').value = addr.city || '';
        document.getElementById('form-state').value = addr.state || '';

        document.getElementById('form-ie').value = client.stateRegistration || '';
        document.getElementById('form-im').value = client.municipalRegistration || '';
        document.getElementById('form-cnae-code').value = client.mainCnae?.code || '';
        document.getElementById('form-cnae-desc').value = client.mainCnae?.description || '';

        if (client.partners && client.partners.length > 0) {
          client.partners.forEach(p => this.addPartnerRow(p));
        } else {
          this.addPartnerRow();
        }

        const cert = client.digitalCertificate || {};
        document.getElementById('form-cert-type').value = cert.type || 'A1';
        document.getElementById('form-cert-exp').value = cert.expirationDate || '';
        document.getElementById('form-cert-issuer').value = cert.issuer || '';
        
        const keys = client.accessKeys || {};
        document.getElementById('form-key-gov').value = keys.govBrUser || '';
        document.getElementById('form-key-simples').value = keys.simplesCode || '';

        const fin = client.financial || {};
        document.getElementById('form-fee-value').value = fin.monthlyFee || '';
        document.getElementById('form-fee-due').value = fin.dueDay || '10';
        document.getElementById('form-fee-method').value = fin.paymentMethod || 'BOLETO';
        document.getElementById('form-fee-13th').checked = !!fin.has13thFee;
        document.getElementById('form-fee-notes').value = fin.feeNotes || '';
      }
    } else {
      this.addPartnerRow();
    }

    this.switchModalTab('form-tab-ident');
    modal.classList.add('active');
  },

  switchModalTab(tabId) {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.modal-tab-pane').forEach(pane => {
      if (pane.id === tabId) {
        pane.style.display = 'block';
      } else {
        pane.style.display = 'none';
      }
    });
  },

  addPartnerRow(data = {}) {
    const container = document.getElementById('form-partners-list');
    if (!container) return;

    const rowId = 'partner_row_' + Date.now();
    const div = document.createElement('div');
    div.id = rowId;
    div.style.cssText = 'background:var(--bg-card-subtle); padding:12px; border-radius:var(--radius-md); margin-bottom:10px; border:1px solid var(--border-color);';

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600; font-size:0.8rem;">Sócio / Administrador</span>
        <button type="button" class="btn-figma-secondary" style="padding:2px 6px; font-size:0.7rem; color:#EF4444;" onclick="document.getElementById('${rowId}').remove()">Remover</button>
      </div>
      <div class="grid-row">
        <div class="span-6 field-group"><label>Nome Completo</label><input type="text" class="form-control partner-name" value="${data.name || ''}" required></div>
        <div class="span-6 field-group"><label>CPF</label><input type="text" class="form-control partner-cpf" value="${data.cpf || ''}"></div>
      </div>
      <div class="grid-row">
        <div class="span-4 field-group"><label>% Participação</label><input type="number" class="form-control partner-share" value="${data.sharePercentage || 50}"></div>
        <div class="span-4 field-group">
          <label>Condição</label>
          <select class="form-control partner-admin">
            <option value="true" ${data.isAdmin ? 'selected' : ''}>Administrador</option>
            <option value="false" ${!data.isAdmin ? 'selected' : ''}>Cotista</option>
          </select>
        </div>
        <div class="span-4 field-group"><label>Pró-Labore (R$)</label><input type="number" class="form-control partner-prolabore" value="${data.proLaboreValue || 0}"></div>
      </div>
    `;

    container.appendChild(div);
  },

  async saveClientForm(e) {
    e.preventDefault();
    const clientId = document.getElementById('client-form-id').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const partners = [];
    document.querySelectorAll('#form-partners-list > div').forEach(box => {
      const name = box.querySelector('.partner-name')?.value.trim();
      if (name) {
        partners.push({
          id: 'part_' + Date.now(),
          name,
          cpf: box.querySelector('.partner-cpf')?.value.trim(),
          sharePercentage: parseFloat(box.querySelector('.partner-share')?.value) || 0,
          isAdmin: box.querySelector('.partner-admin')?.value === 'true',
          hasProLabore: (parseFloat(box.querySelector('.partner-prolabore')?.value) || 0) > 0,
          proLaboreValue: parseFloat(box.querySelector('.partner-prolabore')?.value) || 0
        });
      }
    });

    const clientData = {
      id: clientId || null,
      companyName: document.getElementById('form-company-name').value.trim(),
      tradeName: document.getElementById('form-trade-name').value.trim(),
      cnpj: document.getElementById('form-cnpj').value.trim(),
      foundingDate: document.getElementById('form-founding-date').value,
      taxRegime: document.getElementById('form-tax-regime').value || null,
      companySize: document.getElementById('form-company-size').value,
      status: document.getElementById('form-status').value,
      responsibleAccountant: document.getElementById('form-accountant').value.trim(),
      recurrence: document.getElementById('form-recurrence').value || 'RECORRENTE',

      contactName: document.getElementById('form-contact-name').value.trim(),
      contactRole: document.getElementById('form-contact-role').value.trim(),
      phones: [document.getElementById('form-phone').value.trim()].filter(Boolean),
      whatsapp: document.getElementById('form-whatsapp').value.trim(),
      email: document.getElementById('form-email').value.trim(),

      address: {
        cep: document.getElementById('form-cep').value.trim(),
        street: document.getElementById('form-street').value.trim(),
        number: document.getElementById('form-number').value.trim(),
        complement: document.getElementById('form-comp').value.trim(),
        neighborhood: document.getElementById('form-neighborhood').value.trim(),
        city: document.getElementById('form-city').value.trim(),
        state: document.getElementById('form-state').value.trim()
      },

      stateRegistration: document.getElementById('form-ie').value.trim(),
      municipalRegistration: document.getElementById('form-im').value.trim(),
      mainCnae: {
        code: document.getElementById('form-cnae-code').value.trim(),
        description: document.getElementById('form-cnae-desc').value.trim()
      },

      partners,

      digitalCertificate: {
        type: document.getElementById('form-cert-type').value,
        expirationDate: document.getElementById('form-cert-exp').value,
        issuer: document.getElementById('form-cert-issuer').value.trim()
      },

      accessKeys: {
        govBrUser: document.getElementById('form-key-gov').value.trim(),
        simplesCode: document.getElementById('form-key-simples').value.trim()
      },

      financial: {
        monthlyFee: parseFloat(document.getElementById('form-fee-value').value) || 0,
        dueDay: parseInt(document.getElementById('form-fee-due').value, 10) || 10,
        paymentMethod: document.getElementById('form-fee-method').value,
        has13thFee: document.getElementById('form-fee-13th').checked,
        feeNotes: document.getElementById('form-fee-notes').value.trim()
      }
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

    try {
      const saved = await DataStore.upsertClient(clientData);
      await ObligationsManager.syncCompetenceObligations(this.selectedCompetence);
      this.closeAllModals();
      this.showToast(`Cliente ${saved.companyName || 'salvo'} com sucesso!`, 'success');

      if (this.currentPage === 'dossie' && this.selectedClientId === saved.id) {
        this.renderClientDetail(saved.id);
      } else if (this.currentPage === 'clientes') {
        this.renderClientsList();
      } else {
        window.location.href = 'clientes.html';
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      this.showToast('Erro ao salvar cliente. Tente novamente.', 'danger');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Cadastro'; }
    }
  },

  async confirmDeleteClient(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${name}" da carteira?`)) return;
    try {
      await DataStore.deleteClient(id);
      this.showToast('Cliente excluído com sucesso.', 'danger');
      if (this.currentPage === 'clientes') {
        this.renderClientsList();
      } else {
        window.location.href = 'clientes.html';
      }
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      this.showToast('Erro ao excluir cliente. Tente novamente.', 'danger');
    }
  },

  openInteractionModal(clientId) {
    const modal = document.getElementById('modal-interaction');
    if (!modal) return;

    document.getElementById('inter-client-id').value = clientId;
    document.getElementById('inter-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('inter-title').value = '';
    document.getElementById('inter-content').value = '';

    modal.classList.add('active');
  },

  async saveInteractionForm(e) {
    e.preventDefault();
    const clientId = document.getElementById('inter-client-id').value;
    const interaction = {
      type: document.getElementById('inter-type').value,
      date: document.getElementById('inter-date').value,
      title: document.getElementById('inter-title').value.trim(),
      content: document.getElementById('inter-content').value.trim()
    };

    try {
      await DataStore.addInteraction(clientId, interaction);
      this.closeAllModals();
      this.showToast('Atendimento registrado com sucesso!', 'success');

      if (this.currentPage === 'dossie' && this.selectedClientId === clientId) {
        this.renderClientDetail(clientId);
      } else if (this.currentPage === 'dashboard') {
        this.renderDashboard();
      }
    } catch (err) {
      console.error('Erro ao registrar atendimento:', err);
      this.showToast('Erro ao registrar atendimento. Tente novamente.', 'danger');
    }
  },

  openObligationActionModal(obligationId) {
    const ob = ObligationsManager.getAllObligations().find(o => o.id === obligationId);
    if (!ob) return;

    const modal = document.getElementById('modal-obligation-action');
    if (!modal) return;

    document.getElementById('ob-action-id').value = ob.id;
    document.getElementById('ob-action-title').textContent = `${ob.title} — ${ob.clientName}`;
    document.getElementById('ob-action-status').value = ob.status || 'PENDENTE';
    document.getElementById('ob-action-protocol').value = ob.protocolNumber || '';

    modal.classList.add('active');
  },

  async saveObligationAction(e) {
    e.preventDefault();
    const id = document.getElementById('ob-action-id').value;
    const status = document.getElementById('ob-action-status').value;
    const protocolNumber = document.getElementById('ob-action-protocol').value.trim();

    try {
      await ObligationsManager.updateObligationStatus(id, { status, protocolNumber });
      this.closeAllModals();
      this.showToast('Status da obrigação atualizado com sucesso!', 'success');

      if (this.currentPage === 'conformidade') this.renderObligationsView();
      if (this.currentPage === 'dashboard') this.renderDashboard();
    } catch (err) {
      console.error('Erro ao atualizar obrigação:', err);
      this.showToast('Erro ao atualizar obrigação. Tente novamente.', 'danger');
    }
  },

  openCNDEditModal(clientId) {
    const client = DataStore.getClientById(clientId);
    if (!client) return;

    const modal = document.getElementById('modal-cnd-edit');
    if (!modal) return;

    document.getElementById('cnd-edit-client-id').value = client.id;
    document.getElementById('cnd-edit-client-name').textContent = client.companyName || client.tradeName;

    const cnds = client.cnds || {};
    ['federal', 'estadual', 'municipal', 'fgts', 'trabalhista'].forEach(k => {
      const field = document.getElementById(`cnd-edit-${k}`);
      if (field) field.value = cnds[k]?.validUntil || '';
    });

    modal.classList.add('active');
  },

  async saveCNDEdit(e) {
    e.preventDefault();
    const clientId = document.getElementById('cnd-edit-client-id').value;
    const client = DataStore.getClientById(clientId);
    if (!client) return;

    const cndsByType = {};
    ['federal', 'estadual', 'municipal', 'fgts', 'trabalhista'].forEach(k => {
      const val = document.getElementById(`cnd-edit-${k}`)?.value || '';
      cndsByType[k] = {
        validUntil: val,
        status: val ? Validators.getExpirationStatus(val).status : 'none'
      };
    });

    try {
      await DataStore.updateClientCnds(clientId, cndsByType);
      this.closeAllModals();
      this.showToast('Validades das certidões atualizadas com sucesso!', 'success');

      if (this.currentPage === 'cnds') this.renderCNDsView();
      if (this.currentPage === 'dossie' && this.selectedClientId === clientId) this.renderClientDetail(clientId);
    } catch (err) {
      console.error('Erro ao atualizar certidões:', err);
      this.showToast('Erro ao atualizar certidões. Tente novamente.', 'danger');
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop-wrap, .modal-backdrop').forEach(m => m.classList.remove('active'));
  },

  setupInputMasks() {
    const cnpjInput = document.getElementById('form-cnpj');
    if (cnpjInput) {
      cnpjInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const clean = Validators.onlyNumbers(val);
        if (clean.length > 11) {
          e.target.value = Validators.formatCNPJ(clean);
        } else {
          e.target.value = Validators.formatCPF(clean);
        }
      });
    }

    const cepInput = document.getElementById('form-cep');
    if (cepInput) {
      cepInput.addEventListener('input', async (e) => {
        const clean = Validators.onlyNumbers(e.target.value);
        e.target.value = Validators.formatCEP(clean);

        if (clean.length === 8) {
          try {
            const data = await Validators.fetchViaCEP(clean);
            document.getElementById('form-street').value = data.logradouro;
            document.getElementById('form-neighborhood').value = data.bairro;
            document.getElementById('form-city').value = data.cidade;
            document.getElementById('form-state').value = data.uf;
            App.showToast('Endereço completado automaticamente via CEP!', 'success');
          } catch (err) {}
        }
      });
    }

    ['form-phone', 'form-whatsapp'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          e.target.value = Validators.formatPhone(e.target.value);
        });
      }
    });
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-deck');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-deck';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill-voal toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

window.App = App;
