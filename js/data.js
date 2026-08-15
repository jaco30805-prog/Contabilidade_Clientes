/**
 * Voal Consult — ERP & Gestão Contábil
 * Base de Dados Densa e Estruturada com Empresas Reais
 */

const DataStore = {
  STORAGE_KEY: 'voal_consult_db_v3',
  SETTINGS_KEY: 'voal_consult_settings_v3',

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

  DefaultObligationsCatalog: [
    {
      code: 'PGDAS',
      name: 'PGDAS-D (Apuração Simples Nacional / DAS)',
      frequency: 'MENSAL',
      dueDay: 20,
      department: 'FISCAL',
      applicableRegimes: ['SIMPLES_NACIONAL'],
      description: 'Cálculo mensal e emissão da guia única DAS do Simples Nacional.'
    },
    {
      code: 'DCTFWEB',
      name: 'DCTFWeb (Previdenciária e Retenções)',
      frequency: 'MENSAL',
      dueDay: 15,
      department: 'PESSOAL',
      applicableRegimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'IMUNE_ISENTA'],
      description: 'Confissão de débitos previdenciários e de terceiros integrados ao eSocial.'
    },
    {
      code: 'EFD_REINF',
      name: 'EFD-Reinf (Retenções e Serviços Tomados)',
      frequency: 'MENSAL',
      dueDay: 15,
      department: 'FISCAL',
      applicableRegimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'IMUNE_ISENTA'],
      description: 'Escrituração de retenções de impostos sobre serviços tomados/prestados.'
    },
    {
      code: 'EFD_CONTRIB',
      name: 'EFD-Contribuições (PIS/COFINS)',
      frequency: 'MENSAL',
      dueDay: 15,
      department: 'FISCAL',
      applicableRegimes: ['LUCRO_PRESUMIDO', 'LUCRO_REAL'],
      description: 'Escrituração Fiscal Digital de PIS/Pasep e COFINS.'
    },
    {
      code: 'SPED_FISCAL',
      name: 'EFD ICMS IPI (SPED Fiscal)',
      frequency: 'MENSAL',
      dueDay: 20,
      department: 'FISCAL',
      applicableRegimes: ['LUCRO_PRESUMIDO', 'LUCRO_REAL'],
      description: 'Escrituração digital de apuração de ICMS e IPI.'
    },
    {
      code: 'FGTS_DIGITAL',
      name: 'FGTS Digital / Guia Rápida',
      frequency: 'MENSAL',
      dueDay: 20,
      department: 'PESSOAL',
      applicableRegimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI', 'IMUNE_ISENTA'],
      description: 'Emissão e recolhimento das guias de FGTS mensal.'
    },
    {
      code: 'FOLHA_PROLABORE',
      name: 'Fechamento de Folha & Pró-Labore (eSocial)',
      frequency: 'MENSAL',
      dueDay: 5,
      department: 'PESSOAL',
      applicableRegimes: ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI', 'IMUNE_ISENTA'],
      description: 'Fechamento de eventos periódicos e emissão de holerites e pró-labore.'
    }
  ],

  getInitialSampleData() {
    return [
      {
        id: 'cli_001',
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-08-14T14:30:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'Restaurante e Churrascaria Sabor Paulista Ltda',
        tradeName: 'Sabor Paulista Grill',
        cnpj: '12.345.678/0001-90',
        cpf: '',
        stateRegistration: '110.234.567.890',
        municipalRegistration: '9.876.543-2',
        taxRegime: 'SIMPLES_NACIONAL',
        companySize: 'EPP',
        foundingDate: '2018-03-15',
        responsibleAccountant: 'Voal Consult',
        department: 'FISCAL',
        
        mainCnae: { code: '56.11-2-01', description: 'Restaurantes e similares' },
        secondaryCnaes: [
          { code: '56.11-2-03', description: 'Lanchonetes, casas de chá e sucos' },
          { code: '56.20-1-04', description: 'Fornecimento de alimentos preparados' }
        ],

        contactName: 'Ricardo Augusto Silveira',
        contactRole: 'Sócio-Administrador',
        phones: ['(11) 3456-7890'],
        whatsapp: '(11) 98765-4321',
        email: 'contato@saborpaulista.com.br',
        financialEmail: 'financeiro@saborpaulista.com.br',

        address: {
          cep: '01310-100',
          street: 'Avenida Paulista',
          number: '1200',
          complement: 'Térreo e Mezanino',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP'
        },

        partners: [
          { id: 'p1', name: 'Ricardo Augusto Silveira', cpf: '123.456.789-00', sharePercentage: 60, isAdmin: true, hasProLabore: true, proLaboreValue: 5000 },
          { id: 'p2', name: 'Mariana Costa Silveira', cpf: '234.567.890-11', sharePercentage: 40, isAdmin: false, hasProLabore: false, proLaboreValue: 0 }
        ],

        digitalCertificate: { type: 'A1', expirationDate: '2026-09-15', issuer: 'Certisign' },
        accessKeys: { govBrUser: '123.456.789-00', simplesCode: '876543219012', notes: 'e-CNPJ A1 ativo.' },

        financial: { monthlyFee: 1850.00, dueDay: 10, paymentMethod: 'BOLETO', has13thFee: true, feeNotes: 'Reajuste anual pelo IPCA.' },

        cnds: {
          federal: { validUntil: '2026-11-20', status: 'valid', notes: 'Sem pendências' },
          estadual: { validUntil: '2026-10-15', status: 'valid', notes: 'SEFAZ SP regular' },
          municipal: { validUntil: '2026-08-25', status: 'warning', notes: 'Taxa TFE quitada' },
          fgts: { validUntil: '2026-09-05', status: 'valid', notes: 'CRF regular' },
          trabalhista: { validUntil: '2026-12-10', status: 'valid', notes: 'CNDT válida' }
        },

        interactions: [
          { id: 'i1', date: '2026-08-08', type: 'ORIENTACAO', user: 'Voal Consult', title: 'Planejamento Tributário Filial', content: 'Simulação de custos para filial em shopping.' }
        ]
      },
      {
        id: 'cli_002',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: '2026-08-12T11:00:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'TechVanguard Inovações em Software S.A.',
        tradeName: 'TechVanguard Labs',
        cnpj: '23.456.789/0001-01',
        cpf: '',
        stateRegistration: 'Isento',
        municipalRegistration: '4.567.890-1',
        taxRegime: 'LUCRO_PRESUMIDO',
        companySize: 'MEDIO',
        foundingDate: '2020-05-18',
        responsibleAccountant: 'Voal Consult',
        department: 'CONTABIL',

        mainCnae: { code: '62.01-5-01', description: 'Desenvolvimento de software sob encomenda' },
        secondaryCnaes: [{ code: '62.02-3-00', description: 'Desenvolvimento e licenciamento de software' }],

        contactName: 'Lucas Ferreira Prado',
        contactRole: 'Diretor de Operações (COO)',
        phones: ['(11) 4002-8922'],
        whatsapp: '(11) 97123-4567',
        email: 'financeiro@techvanguard.io',

        address: {
          cep: '04538-133',
          street: 'Avenida Brigadeiro Faria Lima',
          number: '3477',
          complement: '14º Andar',
          neighborhood: 'Itaim Bibi',
          city: 'São Paulo',
          state: 'SP'
        },

        partners: [
          { id: 'p3', name: 'Lucas Ferreira Prado', cpf: '345.678.901-22', sharePercentage: 55, isAdmin: true, hasProLabore: true, proLaboreValue: 12000 },
          { id: 'p4', name: 'Felipe Albuquerque Sato', cpf: '456.789.012-33', sharePercentage: 45, isAdmin: true, hasProLabore: true, proLaboreValue: 12000 }
        ],

        digitalCertificate: { type: 'A1', expirationDate: '2027-02-28', issuer: 'Serasa Experian' },
        accessKeys: { govBrUser: '345.678.901-22', simplesCode: '', notes: 'NFS-e Paulistana integrada via WebService.' },

        financial: { monthlyFee: 3400.00, dueDay: 15, paymentMethod: 'PIX', has13thFee: true, feeNotes: 'Inclui folha para 18 desenvolvedores.' },

        cnds: {
          federal: { validUntil: '2027-01-10', status: 'valid', notes: 'Regular' },
          estadual: { validUntil: '2026-12-31', status: 'valid', notes: 'Isento ICMS' },
          municipal: { validUntil: '2026-11-15', status: 'valid', notes: 'NFS-e em dia' },
          fgts: { validUntil: '2026-09-20', status: 'valid', notes: 'CRF regular' },
          trabalhista: { validUntil: '2027-01-05', status: 'valid', notes: 'Regular' }
        },

        interactions: []
      },
      {
        id: 'cli_003',
        createdAt: '2024-02-15T09:00:00Z',
        updatedAt: '2026-08-14T09:15:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'Metalúrgica & Usinagem Alpha Ltda',
        tradeName: 'Alpha Metalúrgica',
        cnpj: '34.567.890/0001-12',
        cpf: '',
        stateRegistration: '336.789.012.345',
        municipalRegistration: '1.234.567-8',
        taxRegime: 'LUCRO_REAL',
        companySize: 'MEDIO',
        foundingDate: '2012-08-20',
        responsibleAccountant: 'Voal Consult',
        department: 'FISCAL',

        mainCnae: { code: '25.39-0-01', description: 'Serviços de usinagem e solda' },
        secondaryCnaes: [],

        contactName: 'Antônio Carlos de Souza',
        contactRole: 'Diretor Industrial',
        phones: ['(11) 2233-4455'],
        whatsapp: '(11) 99111-2233',
        email: 'diretoria@alphametal.com.br',

        address: {
          cep: '07222-000',
          street: 'Estrada Velha de Guarulhos',
          number: '850',
          complement: 'Galpão 03',
          neighborhood: 'Cumbica',
          city: 'Guarulhos',
          state: 'SP'
        },

        partners: [
          { id: 'p5', name: 'Antônio Carlos de Souza', cpf: '567.890.123-44', sharePercentage: 50, isAdmin: true, hasProLabore: true, proLaboreValue: 8500 },
          { id: 'p6', name: 'Benedito Souza Filho', cpf: '678.901.234-55', sharePercentage: 50, isAdmin: true, hasProLabore: true, proLaboreValue: 8500 }
        ],

        digitalCertificate: { type: 'A3', expirationDate: '2026-08-30', issuer: 'Valid Certificadora' },
        accessKeys: { govBrUser: '567.890.123-44', notes: 'Token físico A3 na empresa.' },

        financial: { monthlyFee: 5200.00, dueDay: 20, paymentMethod: 'TRANSFERENCIA', has13thFee: true, feeNotes: 'Lucro Real com Sped Fiscal e LALUR.' },

        cnds: {
          federal: { validUntil: '2026-09-30', status: 'valid', notes: 'Parcelamento em dia' },
          estadual: { validUntil: '2026-08-10', status: 'expired', notes: 'GIA retificadora pendente' },
          municipal: { validUntil: '2026-12-15', status: 'valid', notes: 'Regular' },
          fgts: { validUntil: '2026-09-10', status: 'valid', notes: 'CRF regular' },
          trabalhista: { validUntil: '2026-10-25', status: 'valid', notes: 'Regular' }
        },

        interactions: []
      },
      {
        id: 'cli_004',
        createdAt: '2025-01-20T14:00:00Z',
        updatedAt: '2026-08-05T16:00:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'Dr. Roberto Hiroshi Clínica Médica SS',
        tradeName: 'Clínica Oftalmológica Hiroshi',
        cnpj: '45.678.901/0001-23',
        cpf: '',
        stateRegistration: 'Isento',
        municipalRegistration: '6.789.012-3',
        taxRegime: 'LUCRO_PRESUMIDO',
        companySize: 'EPP',
        foundingDate: '2019-11-10',
        responsibleAccountant: 'Voal Consult',
        department: 'FISCAL',

        mainCnae: { code: '86.30-5-03', description: 'Atividade médica ambulatorial' },
        secondaryCnaes: [],

        contactName: 'Dra. Beatriz Naomi Hiroshi',
        contactRole: 'Sócia-Médica',
        phones: ['(11) 3145-6677'],
        whatsapp: '(11) 98222-3344',
        email: 'adm@clinicahiroshi.med.br',

        address: {
          cep: '01401-000',
          street: 'Alameda Santos',
          number: '1800',
          complement: 'Conjunto 81/82',
          neighborhood: 'Cerqueira César',
          city: 'São Paulo',
          state: 'SP'
        },

        partners: [
          { id: 'p7', name: 'Dr. Roberto Hiroshi', cpf: '789.012.345-66', sharePercentage: 50, isAdmin: true, hasProLabore: true, proLaboreValue: 10000 },
          { id: 'p8', name: 'Dra. Beatriz Naomi Hiroshi', cpf: '890.123.456-77', sharePercentage: 50, isAdmin: true, hasProLabore: true, proLaboreValue: 10000 }
        ],

        digitalCertificate: { type: 'A1', expirationDate: '2026-12-20', issuer: 'Soluti' },
        accessKeys: { govBrUser: '789.012.345-66', notes: 'Enquadrada em ISS Uniprofissional (SUP).' },

        financial: { monthlyFee: 2600.00, dueDay: 10, paymentMethod: 'BOLETO', has13thFee: true, feeNotes: 'Inclui Dmed anual.' },

        cnds: {
          federal: { validUntil: '2027-02-15', status: 'valid', notes: 'Regular' },
          estadual: { validUntil: '2026-12-31', status: 'valid', notes: 'Isento' },
          municipal: { validUntil: '2026-11-20', status: 'valid', notes: 'ISS SUP em dia' },
          fgts: { validUntil: '2026-09-15', status: 'valid', notes: 'CRF regular' },
          trabalhista: { validUntil: '2027-01-20', status: 'valid', notes: 'Regular' }
        },

        interactions: []
      },
      {
        id: 'cli_005',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-08-02T10:00:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'Marcos Vinicius Santos Manutenções MEI',
        tradeName: 'M.V. Instalações Elétricas',
        cnpj: '56.789.012/0001-34',
        cpf: '901.234.567-88',
        stateRegistration: 'Isento',
        municipalRegistration: '7.890.123-4',
        taxRegime: 'MEI',
        companySize: 'MEI',
        foundingDate: '2023-04-10',
        responsibleAccountant: 'Voal Consult',
        department: 'FISCAL',

        mainCnae: { code: '43.21-5-00', description: 'Instalação e manutenção elétrica' },
        secondaryCnaes: [],

        contactName: 'Marcos Vinicius Santos',
        contactRole: 'Titular MEI',
        phones: ['(11) 97777-8888'],
        whatsapp: '(11) 97777-8888',
        email: 'marcos.eletrica@gmail.com',

        address: {
          cep: '03001-000',
          street: 'Rua do Gasômetro',
          number: '350',
          complement: 'Apto 42',
          neighborhood: 'Brás',
          city: 'São Paulo',
          state: 'SP'
        },

        partners: [
          { id: 'p9', name: 'Marcos Vinicius Santos', cpf: '901.234.567-88', sharePercentage: 100, isAdmin: true, hasProLabore: false, proLaboreValue: 0 }
        ],

        digitalCertificate: { type: 'A1', expirationDate: '2027-04-15', issuer: 'Serpro' },
        accessKeys: { govBrUser: '901.234.567-88', simplesCode: '112233445566', notes: 'NFS-e Portal Nacional.' },

        financial: { monthlyFee: 250.00, dueDay: 5, paymentMethod: 'PIX', has13thFee: false, feeNotes: 'Emissão mensal do DAS-SIMEI.' },

        cnds: {
          federal: { validUntil: '2026-10-30', status: 'valid', notes: 'DAS em dia' },
          estadual: { validUntil: '2026-12-31', status: 'valid', notes: 'Isento' },
          municipal: { validUntil: '2026-10-15', status: 'valid', notes: 'CCM regular' },
          fgts: { validUntil: '2026-09-30', status: 'valid', notes: 'Sem empregados' },
          trabalhista: { validUntil: '2026-11-20', status: 'valid', notes: 'Regular' }
        },

        interactions: []
      },
      {
        id: 'cli_006',
        createdAt: '2026-07-01T15:00:00Z',
        updatedAt: '2026-08-14T11:00:00Z',
        status: 'ATIVO',
        type: 'PJ',
        companyName: 'Studio Zen Estética e Bem Estar Ltda',
        tradeName: 'Studio Zen',
        cnpj: '67.890.123/0001-45',
        cpf: '',
        stateRegistration: 'Isento',
        municipalRegistration: '8.901.234-5',
        taxRegime: 'SIMPLES_NACIONAL',
        companySize: 'ME',
        foundingDate: '2026-06-25',
        responsibleAccountant: 'Voal Consult',
        department: 'GERAL',

        mainCnae: { code: '96.02-5-02', description: 'Atividades de estética e beleza' },
        secondaryCnaes: [],

        contactName: 'Camila Peixoto Rossi',
        contactRole: 'Sócia Proprietária',
        phones: ['(11) 98999-0011'],
        whatsapp: '(11) 98999-0011',
        email: 'adm@studiozen.com.br',

        address: {
          cep: '04080-001',
          street: 'Avenida Rouxinol',
          number: '520',
          complement: 'Casa 02',
          neighborhood: 'Moema',
          city: 'São Paulo',
          state: 'SP'
        },

        partners: [
          { id: 'p10', name: 'Camila Peixoto Rossi', cpf: '012.345.678-99', sharePercentage: 100, isAdmin: true, hasProLabore: true, proLaboreValue: 3000 }
        ],

        digitalCertificate: { type: 'A1', expirationDate: '2027-07-01', issuer: 'Certisign' },
        accessKeys: { govBrUser: '012.345.678-99', simplesCode: '998877665544', notes: 'Alvará sanitário deferido.' },

        financial: { monthlyFee: 1200.00, dueDay: 15, paymentMethod: 'BOLETO', has13thFee: true, feeNotes: 'Assessoria contábil mensal.' },

        cnds: {
          federal: { validUntil: '2027-01-15', status: 'valid', notes: 'Empresa nova' },
          estadual: { validUntil: '2026-12-31', status: 'valid', notes: 'Isento' },
          municipal: { validUntil: '2026-12-31', status: 'valid', notes: 'Em dia' },
          fgts: { validUntil: '2026-10-01', status: 'valid', notes: 'CRF emitido' },
          trabalhista: { validUntil: '2027-01-10', status: 'valid', notes: 'Regular' }
        },

        interactions: []
      }
    ];
  },

  init() {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData) {
      const initial = this.getInitialSampleData();
      this.saveClients(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = this.getInitialSampleData();
        this.saveClients(initial);
        return initial;
      }
      return parsed;
    } catch (e) {
      const initial = this.getInitialSampleData();
      this.saveClients(initial);
      return initial;
    }
  },

  getClients() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : this.init();
    } catch (e) {
      return this.init();
    }
  },

  saveClients(clients) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clients));
  },

  getClientById(id) {
    const clients = this.getClients();
    return clients.find(c => c.id === id) || null;
  },

  upsertClient(clientData) {
    const clients = this.getClients();
    const now = new Date().toISOString();

    if (!clientData.id) {
      clientData.id = 'cli_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      clientData.createdAt = now;
      clientData.updatedAt = now;
      if (!clientData.interactions) clientData.interactions = [];
      if (!clientData.partners) clientData.partners = [];
      if (!clientData.cnds) {
        clientData.cnds = {
          federal: { validUntil: '', status: 'none', notes: '' },
          estadual: { validUntil: '', status: 'none', notes: '' },
          municipal: { validUntil: '', status: 'none', notes: '' },
          fgts: { validUntil: '', status: 'none', notes: '' },
          trabalhista: { validUntil: '', status: 'none', notes: '' }
        };
      }
      clients.unshift(clientData);
    } else {
      const index = clients.findIndex(c => c.id === clientData.id);
      if (index !== -1) {
        clientData.updatedAt = now;
        if (!clientData.interactions && clients[index].interactions) {
          clientData.interactions = clients[index].interactions;
        }
        clients[index] = { ...clients[index], ...clientData };
      } else {
        clientData.createdAt = now;
        clientData.updatedAt = now;
        clients.unshift(clientData);
      }
    }

    this.saveClients(clients);
    return clientData;
  },

  deleteClient(id) {
    const clients = this.getClients();
    const filtered = clients.filter(c => c.id !== id);
    this.saveClients(filtered);
    return filtered;
  },

  addInteraction(clientId, interaction) {
    const client = this.getClientById(clientId);
    if (!client) return false;
    
    if (!client.interactions) client.interactions = [];
    interaction.id = 'int_' + Date.now();
    interaction.date = interaction.date || new Date().toISOString().split('T')[0];
    
    client.interactions.unshift(interaction);
    this.upsertClient(client);
    return true;
  },

  resetToSampleData() {
    const initial = this.getInitialSampleData();
    this.saveClients(initial);
    localStorage.removeItem(ObligationsManager.STORAGE_KEY);
    return initial;
  },

  exportJSON() {
    const clients = this.getClients();
    const obligations = localStorage.getItem(ObligationsManager.STORAGE_KEY) || '[]';
    const backup = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      system: 'Voal Consult ERP',
      clients,
      obligations: JSON.parse(obligations)
    };
    return JSON.stringify(backup, null, 2);
  },

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.clients || !Array.isArray(data.clients)) {
        throw new Error('Arquivo de backup inválido.');
      }
      this.saveClients(data.clients);
      if (data.obligations) {
        localStorage.setItem(ObligationsManager.STORAGE_KEY, JSON.stringify(data.obligations));
      }
      return { success: true, count: data.clients.length };
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

    return '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  }
};

window.DataStore = DataStore;
