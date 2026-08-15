/**
 * Voal Consult — Comportamento compartilhado da barra lateral
 * Roda em toda página (uma única fonte de verdade para esse comportamento):
 *  1) Destaca o item de menu correspondente à página atual.
 *  2) Controla o colapso/expansão da barra lateral, com preferência salva.
 *
 * Executa de forma síncrona assim que o script é lido (sem esperar
 * DOMContentLoaded), já que ele é carregado no fim do <body>, depois
 * de toda a marcação da página já estar presente no DOM.
 */
(function () {
  const container = document.getElementById('app-container');

  // 1) Destacar o item de menu ativo comparando a URL atual com cada link
  const currentFile = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.nav-item').forEach(item => {
    const link = item.querySelector('a[href]');
    if (!link) return;
    const linkFile = link.getAttribute('href').split('/').pop();
    item.classList.toggle('active', linkFile === currentFile);
  });

  // 2) Colapsar / expandir a barra lateral (preferência por navegador)
  const COLLAPSE_KEY = 'voal_sidebar_collapsed';
  if (container && localStorage.getItem(COLLAPSE_KEY) === '1') {
    container.classList.add('sidebar-collapsed');
  }

  // Só assume o comportamento padrão de colapso em botões que não têm
  // outra função já atribuída (ex.: o botão "Voltar" do Dossiê usa o
  // mesmo estilo, mas navega para a Carteira de Clientes).
  document.querySelectorAll('.sidebar-collapse-btn:not([onclick])').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!container) return;
      const collapsed = container.classList.toggle('sidebar-collapsed');
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    });
  });
})();
