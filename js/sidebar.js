/**
 * Voal Consult — Barra Lateral (fonte única)
 *
 * Antes, o bloco <aside class="sidebar">...</aside> inteiro era colado à mão
 * em cada uma das 9 páginas — foi a causa raiz do bug em que um item de menu
 * ficava desatualizado numa página e ninguém percebia até quebrar a navegação.
 * Agora a marcação nasce uma única vez aqui, a partir de NAV_ITEMS, e é
 * injetada no elemento <aside id="sidebar-mount"> de cada página.
 *
 * Também cuida do comportamento compartilhado da sidebar:
 *  1) Destaca o item de menu correspondente à página atual.
 *  2) Controla o colapso/expansão da barra lateral, com preferência salva.
 *
 * Carregado logo após a tag <aside id="sidebar-mount">, no topo do <body> —
 * antes do resto da página — para injetar o menu sem "flash" de conteúdo
 * vazio. Executa de forma síncrona assim que é lido, sem esperar
 * DOMContentLoaded.
 */
(function () {
  const NAV_ITEMS = [
    { href: 'index.html', label: 'Painel Geral',
      icon: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>' },
    { href: 'clientes.html', label: 'Carteira de Clientes',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { href: 'calendario.html', label: 'Calendário Fiscal',
      icon: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>' },
    { href: 'conformidade.html', label: 'Conformidade Fiscal',
      icon: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>' },
    { href: 'cnds.html', label: 'Matriz de CNDs',
      icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>' },
    { href: 'honorarios.html', label: 'Honorários (MRR)',
      icon: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>' },
    { href: 'precificacao.html', label: 'Calculadora de Preço',
      icon: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>' },
    { href: 'relatorios.html', label: 'Relatórios',
      icon: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' },
    { href: 'configuracoes.html', label: 'Configurações &amp; Backup',
      icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>' }
  ];

  const BRAND_ICON = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/>';

  function svg(paths, size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`;
  }

  function render() {
    const mount = document.getElementById('sidebar-mount');
    if (!mount) return;

    const navHtml = NAV_ITEMS.map(item =>
      `<li class="nav-item"><a href="${item.href}"><span class="nav-icon">${svg(item.icon, 18)}</span><span>${item.label}</span></a></li>`
    ).join('');

    mount.innerHTML = `
    <div class="brand-box">
      <div class="brand-icon-box">${svg(BRAND_ICON, 20)}</div>
      <div class="brand-text"><h2>Voal Consult</h2><span>ERP &amp; Gestão Contábil</span></div>
    </div>
    <div class="nav-label">Navegação</div>
    <ul class="nav-menu">${navHtml}</ul>
    <div class="sidebar-footer">
      <div class="user-avatar-tag">VC</div>
      <div style="flex:1; min-width:0;">
        <div class="sidebar-footer-name" style="font-size:0.85rem;font-weight:700;color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Voal Consult</div>
        <div class="sidebar-footer-role" style="font-size:0.72rem;color:var(--text-muted);">Equipe Interna</div>
      </div>
      <button id="btn-sidebar-logout" title="Sair" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;flex-shrink:0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
      </button>
    </div>`;
  }

  render();

  // 1) Destacar o item de menu ativo comparando a URL atual com cada link
  const currentFile = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-item').forEach(item => {
    const link = item.querySelector('a[href]');
    if (!link) return;
    const linkFile = link.getAttribute('href').split('/').pop();
    item.classList.toggle('active', linkFile === currentFile);
  });

  // 2) Colapsar / expandir a barra lateral (preferência por navegador)
  const container = document.getElementById('app-container');
  const COLLAPSE_KEY = 'voal_sidebar_collapsed';
  if (container && localStorage.getItem(COLLAPSE_KEY) === '1') {
    container.classList.add('sidebar-collapsed');
  }

  // Delegado no <document>, não no botão: este script roda logo no topo do
  // <body> (antes do <header> — onde o botão mora — existir no DOM), então
  // anexar o listener direto no botão não pegaria nada. Delegação funciona
  // independente da ordem de carregamento.
  // Só assume o comportamento padrão de colapso em botões que não têm
  // outra função já atribuída (ex.: o botão "Voltar" do Dossiê usa o
  // mesmo estilo, mas navega para a Carteira de Clientes).
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.sidebar-collapse-btn:not([onclick])');
    if (!btn || !container) return;
    const collapsed = container.classList.toggle('sidebar-collapsed');
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  });

  // 3) Preenche nome/papel reais assim que Auth.init() resolver a sessão, e
  // liga o botão de sair. Chamado explicitamente por cada página (depois do
  // guard de autenticação), não aqui — window.Auth ainda não existe neste
  // ponto do carregamento.
  const ROLE_LABELS = { socio: 'Sócio(a)', contador: 'Contador(a)', assistente: 'Assistente' };
  window.Sidebar = {
    applyAuthenticatedUser() {
      const label = window.Auth?.currentUserLabel?.() || 'Equipe Interna';
      const role = ROLE_LABELS[window.Auth?.profile?.role] || 'Equipe Interna';
      document.querySelector('.sidebar-footer-name')?.replaceChildren(document.createTextNode(label));
      document.querySelector('.sidebar-footer-role')?.replaceChildren(document.createTextNode(role));
      document.getElementById('btn-sidebar-logout')?.addEventListener('click', () => window.Auth.signOut());
    }
  };
})();
