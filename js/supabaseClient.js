/**
 * Voal Consult — Cliente Supabase
 *
 * A "publishable key" abaixo é segura para ficar no navegador — não é um
 * segredo. Quem protege os dados de verdade é o Row Level Security (RLS)
 * configurado no banco: sem uma sessão de login válida, qualquer consulta
 * feita com esta chave retorna vazio. Nunca coloque aqui a service_role key
 * nem qualquer outra credencial que dê acesso administrativo.
 */
const SUPABASE_URL = 'https://ggdtgrohhegmmljwsdya.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__hxMyPmNYSWnq-E4zUUnEQ_uPpL0zG2';

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Expostos para js/timeTracking.js montar a chamada de fechamento de sessão
// (fetch com keepalive, disparada no unload da página — não pode depender
// de uma Promise do supabase-js, que pode não terminar a tempo).
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
