/**
 * Voal Consult — Modais compartilhados
 * Formulário de Cliente, Registro de Atendimento, Transmissão de Obrigação
 * e Atualização de CNDs.
 *
 * Antes, essa marcação estava copiada à mão dentro de index.html e não
 * existia nas demais páginas — por isso botões como "Editar", "Atualizar"
 * e "Ver / Editar" não abriam nada fora do index.html. Agora é uma única
 * fonte de verdade, injetada no <body> de qualquer página que carregue
 * este script (antes de js/app.js, para que os modais já existam no DOM
 * quando App.init() configurar os eventos de fechar modal).
 */
(function () {
  if (document.getElementById('modal-client-form')) return; // já presente na página

  const html = `
  <!-- MODAL: FORMULÁRIO DE CLIENTE -->
  <div id="modal-client-form" class="modal-backdrop-wrap">
    <div class="modal-card-box">
      <div class="modal-head">
        <h3 id="modal-client-title">Novo Cadastro de Cliente — Voal Consult</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>

      <!-- Tudo numa página só, rolando — os links abaixo só pulam pra seção,
           não escondem nada. Campo obrigatório escondido atrás de uma aba
           fechada era exatamente o que travava o "Salvar Cadastro" sem
           nenhum aviso visível. -->
      <div class="section-jump-nav">
        <button type="button" onclick="App.jumpToSection('form-tab-ident')">1. Identificação</button>
        <button type="button" onclick="App.jumpToSection('form-tab-contact')">2. Contatos</button>
        <button type="button" onclick="App.jumpToSection('form-tab-fiscal')">3. Fiscal</button>
        <button type="button" onclick="App.jumpToSection('form-tab-partners')">4. Sócios</button>
        <button type="button" onclick="App.jumpToSection('form-tab-access')">5. Certificados</button>
        <button type="button" onclick="App.jumpToSection('form-tab-fee')">6. Honorários</button>
      </div>

      <form id="client-form" onsubmit="App.saveClientForm(event)">
        <input type="hidden" id="client-form-id">

        <div class="modal-content-scroll">

          <div id="form-tab-ident" class="form-section">
            <div class="figma-panel-title">1. Identificação</div>
            <div class="grid-row">
              <div class="span-8 field-group">
                <label>Razão Social / Nome Completo *</label>
                <input type="text" id="form-company-name" class="form-control" required>
              </div>
              <div class="span-4 field-group">
                <label>Nome Fantasia</label>
                <input type="text" id="form-trade-name" class="form-control">
              </div>
            </div>

            <div class="grid-row">
              <div class="span-4 field-group">
                <label>CNPJ / CPF * <span style="font-weight:400; color:var(--text-muted);">(CNPJ busca dados na Receita)</span></label>
                <input type="text" id="form-cnpj" class="form-control" required>
              </div>
              <div class="span-4 field-group">
                <label>Data de Abertura / Fundação</label>
                <input type="date" id="form-founding-date" class="form-control">
              </div>
              <div class="span-4 field-group">
                <label>Situação Cadastral</label>
                <select id="form-status" class="form-control">
                  <option value="ATIVO">Ativo</option>
                  <option value="IMPLANTACAO">Em Implantação</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>

            <div class="grid-row">
              <div class="span-4 field-group">
                <label>Regime Tributário</label>
                <select id="form-tax-regime" class="form-control">
                  <option value="">— Não definido —</option>
                  <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                  <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                  <option value="LUCRO_REAL">Lucro Real</option>
                  <option value="MEI">MEI</option>
                  <option value="IMUNE_ISENTA">Imune / Isenta</option>
                </select>
              </div>
              <div class="span-4 field-group">
                <label>Porte Empresarial</label>
                <select id="form-company-size" class="form-control">
                  <option value="ME">ME (Microempresa)</option>
                  <option value="EPP">EPP (Pequeno Porte)</option>
                  <option value="MEDIO">Médio Porte</option>
                  <option value="GRANDE">Grande Porte</option>
                  <option value="MEI">MEI</option>
                </select>
              </div>
              <div class="span-4 field-group">
                <label>Consultor Responsável</label>
                <input type="text" id="form-accountant" class="form-control" placeholder="Voal Consult">
              </div>
            </div>

            <div class="grid-row">
              <div class="span-12 field-group">
                <label>Recorrência do Atendimento</label>
                <select id="form-recurrence" class="form-control">
                  <option value="RECORRENTE">Recorrente — carteira monitorada (CND, obrigações mensais)</option>
                  <option value="ESPORADICO">Esporádico — serviço pontual, sem monitoramento automático</option>
                </select>
              </div>
            </div>
          </div>

          <div id="form-tab-contact" class="form-section">
            <div class="figma-panel-title">2. Contatos</div>
            <div class="grid-row">
              <div class="span-6 field-group">
                <label>Nome do Contato Principal</label>
                <input type="text" id="form-contact-name" class="form-control">
              </div>
              <div class="span-6 field-group">
                <label>Cargo / Vínculo</label>
                <input type="text" id="form-contact-role" class="form-control">
              </div>
            </div>

            <div class="grid-row">
              <div class="span-4 field-group">
                <label>Telefone Fixo</label>
                <input type="text" id="form-phone" class="form-control">
              </div>
              <div class="span-4 field-group">
                <label>WhatsApp</label>
                <input type="text" id="form-whatsapp" class="form-control">
              </div>
              <div class="span-4 field-group">
                <label>E-mail Comercial</label>
                <input type="email" id="form-email" class="form-control">
              </div>
            </div>

            <div class="grid-row">
              <div class="span-3 field-group">
                <label>CEP (Busca Automática)</label>
                <input type="text" id="form-cep" class="form-control">
              </div>
              <div class="span-7 field-group">
                <label>Logradouro</label>
                <input type="text" id="form-street" class="form-control">
              </div>
              <div class="span-2 field-group">
                <label>Número</label>
                <input type="text" id="form-number" class="form-control">
              </div>
            </div>

            <div class="grid-row">
              <div class="span-4 field-group">
                <label>Complemento</label>
                <input type="text" id="form-comp" class="form-control">
              </div>
              <div class="span-3 field-group">
                <label>Bairro</label>
                <input type="text" id="form-neighborhood" class="form-control">
              </div>
              <div class="span-3 field-group">
                <label>Cidade</label>
                <input type="text" id="form-city" class="form-control">
              </div>
              <div class="span-2 field-group">
                <label>UF</label>
                <input type="text" id="form-state" class="form-control" maxlength="2">
              </div>
            </div>
          </div>

          <div id="form-tab-fiscal" class="form-section">
            <div class="figma-panel-title">3. Fiscal</div>
            <div class="grid-row">
              <div class="span-6 field-group">
                <label>Inscrição Estadual (IE)</label>
                <input type="text" id="form-ie" class="form-control">
              </div>
              <div class="span-6 field-group">
                <label>Inscrição Municipal (IM)</label>
                <input type="text" id="form-im" class="form-control">
              </div>
            </div>
            <div class="grid-row">
              <div class="span-4 field-group">
                <label>CNAE Principal (Código)</label>
                <input type="text" id="form-cnae-code" class="form-control">
              </div>
              <div class="span-8 field-group">
                <label>Descrição da Atividade Econômica</label>
                <input type="text" id="form-cnae-desc" class="form-control">
              </div>
            </div>
          </div>

          <div id="form-tab-partners" class="form-section">
            <div class="figma-panel-title" style="margin-bottom:0;">4. Sócios</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin:8px 0 12px;">
              <span style="font-size:0.85rem; font-weight:600;">Quadro de Sócios e Administradores (QSA)</span>
              <button type="button" class="btn-figma-secondary" onclick="App.addPartnerRow()">+ Adicionar Sócio</button>
            </div>
            <div id="form-partners-list"></div>
          </div>

          <div id="form-tab-access" class="form-section">
            <div class="figma-panel-title">5. Certificados</div>
            <div class="grid-row">
              <div class="span-4 field-group">
                <label>Tipo de Certificado</label>
                <select id="form-cert-type" class="form-control">
                  <option value="A1">A1 (Arquivo Digital)</option>
                  <option value="A3">A3 (Cartão / Token Físico)</option>
                  <option value="NENHUM">Nenhum</option>
                </select>
              </div>
              <div class="span-4 field-group">
                <label>Data de Validade</label>
                <input type="date" id="form-cert-exp" class="form-control">
              </div>
              <div class="span-4 field-group">
                <label>Autoridade Emissora</label>
                <input type="text" id="form-cert-issuer" class="form-control">
              </div>
            </div>
            <div class="grid-row">
              <div class="span-6 field-group">
                <label>Usuário Portal Gov.br</label>
                <input type="text" id="form-key-gov" class="form-control">
              </div>
              <div class="span-6 field-group">
                <label>Código Simples Nacional</label>
                <input type="text" id="form-key-simples" class="form-control">
              </div>
            </div>
          </div>

          <div id="form-tab-fee" class="form-section">
            <div class="figma-panel-title">6. Honorários</div>
            <div class="grid-row">
              <div class="span-4 field-group">
                <label>Honorário Mensal (R$)</label>
                <input type="number" id="form-fee-value" class="form-control" step="0.01">
              </div>
              <div class="span-4 field-group">
                <label>Dia de Vencimento</label>
                <input type="number" id="form-fee-due" class="form-control" min="1" max="31">
              </div>
              <div class="span-4 field-group">
                <label>Forma de Cobrança</label>
                <select id="form-fee-method" class="form-control">
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                </select>
              </div>
            </div>
            <div class="field-group" style="margin-bottom:12px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="form-fee-13th" checked>
                <span>Cobrança contratual de 13º Honorário</span>
              </label>
            </div>
            <div class="field-group">
              <label>Observações do Contrato</label>
              <textarea id="form-fee-notes" class="form-control" rows="3"></textarea>
            </div>
          </div>

        </div>

        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Salvar Cadastro</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: REGISTRO DE ATENDIMENTO -->
  <div id="modal-interaction" class="modal-backdrop-wrap">
    <div class="modal-card-box" style="max-width: 540px;">
      <div class="modal-head">
        <h3>Registrar Atendimento ao Cliente</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>
      <form id="interaction-form" onsubmit="App.saveInteractionForm(event)">
        <input type="hidden" id="inter-client-id">
        <div class="modal-content-scroll">
          <div class="grid-row">
            <div class="span-6 field-group">
              <label>Tipo de Atendimento</label>
              <select id="inter-type" class="form-control">
                <option value="ORIENTACAO">Orientação Tributária</option>
                <option value="REUNIAO">Reunião / Alinhamento</option>
                <option value="SOLICITACAO">Solicitação de Documentos</option>
                <option value="ALERTA">Alerta de Compliance</option>
              </select>
            </div>
            <div class="span-6 field-group">
              <label>Data</label>
              <input type="date" id="inter-date" class="form-control" required>
            </div>
          </div>
          <div class="field-group" style="margin-bottom:12px;">
            <label>Assunto Principal *</label>
            <input type="text" id="inter-title" class="form-control" required>
          </div>
          <div class="field-group">
            <label>Detalhamento da Conversa / Parecer *</label>
            <textarea id="inter-content" class="form-control" rows="4" required></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Salvar Registro</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: TRANSMISSÃO DE OBRIGAÇÃO -->
  <div id="modal-obligation-action" class="modal-backdrop-wrap">
    <div class="modal-card-box" style="max-width: 520px;">
      <div class="modal-head">
        <h3>Atualizar Entrega de Obrigação Fiscal</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>
      <form id="obligation-action-form" onsubmit="App.saveObligationAction(event)">
        <input type="hidden" id="ob-action-id">
        <div class="modal-content-scroll">
          <div style="font-weight:700; margin-bottom:12px; color:var(--primary-blue);" id="ob-action-title">-</div>
          <div class="grid-row">
            <div class="span-6 field-group">
              <label>Situação da Entrega</label>
              <select id="ob-action-status" class="form-control">
                <option value="PENDENTE">Pendente</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Transmitido com Sucesso</option>
                <option value="DISPENSADO">Dispensado / Sem Movimento</option>
              </select>
            </div>
            <div class="span-6 field-group">
              <label>Nº de Protocolo / Recibo</label>
              <input type="text" id="ob-action-protocol" class="form-control" placeholder="Ex: 123.456.789-00">
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Salvar Atualização</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: ATUALIZAR CNDs -->
  <div id="modal-cnd-edit" class="modal-backdrop-wrap">
    <div class="modal-card-box" style="max-width: 600px;">
      <div class="modal-head">
        <h3>Atualizar Validade de Certidões Negativas</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>
      <form id="cnd-edit-form" onsubmit="App.saveCNDEdit(event)">
        <input type="hidden" id="cnd-edit-client-id">
        <div class="modal-content-scroll">
          <div style="font-weight:700; margin-bottom:14px; color:var(--primary-blue);" id="cnd-edit-client-name">-</div>
          <div class="field-group" style="margin-bottom:10px;"><label>CND Federal (Receita / PGFN)</label><input type="date" id="cnd-edit-federal" class="form-control"></div>
          <div class="field-group" style="margin-bottom:10px;"><label>CND Estadual (SEFAZ)</label><input type="date" id="cnd-edit-estadual" class="form-control"></div>
          <div class="field-group" style="margin-bottom:10px;"><label>CND Municipal (Prefeitura / ISS)</label><input type="date" id="cnd-edit-municipal" class="form-control"></div>
          <div class="field-group" style="margin-bottom:10px;"><label>CRF FGTS (Caixa Econômica)</label><input type="date" id="cnd-edit-fgts" class="form-control"></div>
          <div class="field-group"><label>CNDT Trabalhista (Justiça do Trabalho)</label><input type="date" id="cnd-edit-trabalhista" class="form-control"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Salvar Certidões</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: NOVA SOLICITAÇÃO DE SERVIÇO AVULSO -->
  <div id="modal-avulso-request" class="modal-backdrop-wrap">
    <div class="modal-card-box" style="max-width: 620px;">
      <div class="modal-head">
        <h3>Nova Solicitação — Serviço Avulso</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>
      <form id="avulso-request-form" onsubmit="AvulsoServices.saveNewRequest(event)">
        <div class="modal-content-scroll">
          <div class="field-group" style="margin-bottom:12px;">
            <label>Serviço *</label>
            <select id="avulso-req-service" class="form-control" required onchange="AvulsoServices.onServiceSelected()">
              <option value="">— Selecione o serviço —</option>
            </select>
            <div id="avulso-req-service-info" style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;"></div>
          </div>

          <div class="grid-row">
            <div class="span-6 field-group">
              <label>CNPJ ou CPF do Solicitante <span style="font-weight:400; color:var(--text-muted);">(CNPJ busca dados na Receita)</span></label>
              <input type="text" id="avulso-req-doc" class="form-control" required>
            </div>
            <div class="span-6 field-group">
              <label>Nome / Razão Social *</label>
              <input type="text" id="avulso-req-nome" class="form-control" required>
            </div>
          </div>

          <div class="field-group" style="margin-bottom:12px;">
            <label>Já é cliente da carteira? (opcional)</label>
            <select id="avulso-req-client" class="form-control">
              <option value="">— Não vincular a nenhum cliente —</option>
            </select>
          </div>

          <div id="avulso-req-receita-status" style="font-size:0.78rem; color:var(--text-muted);"></div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Criar Solicitação</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: DETALHE / ATUALIZAÇÃO DE SOLICITAÇÃO AVULSA -->
  <div id="modal-avulso-detail" class="modal-backdrop-wrap">
    <div class="modal-card-box" style="max-width: 680px;">
      <div class="modal-head">
        <h3 id="avulso-detail-title">Solicitação</h3>
        <button class="modal-close-trigger">&times;</button>
      </div>
      <form id="avulso-detail-form" onsubmit="AvulsoServices.saveRequestUpdate(event)">
        <input type="hidden" id="avulso-detail-id">
        <div class="modal-content-scroll">
          <div id="avulso-detail-summary" style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;"></div>

          <div class="grid-row">
            <div class="span-6 field-group">
              <label>Situação</label>
              <select id="avulso-detail-status" class="form-control">
                <option value="NOVO">Novo</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div class="span-6 field-group">
              <label>Honorário Acordado (R$)</label>
              <input type="number" id="avulso-detail-honorario" class="form-control" step="0.01">
            </div>
          </div>

          <div class="field-group" style="margin:12px 0;">
            <label>Checklist de Documentos e Informações</label>
            <div id="avulso-detail-checklist"></div>
          </div>

          <div class="field-group">
            <label>Observações</label>
            <textarea id="avulso-detail-notes" class="form-control" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-figma-secondary btn-modal-cancel">Cancelar</button>
          <button type="submit" class="btn-figma-primary">Salvar Solicitação</button>
        </div>
      </form>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
})();
