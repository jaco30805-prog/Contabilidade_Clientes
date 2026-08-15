/**
 * Voal Consult — Guarda de Autenticação
 *
 * Toda página protegida chama `await Auth.init()` antes de renderizar
 * qualquer dado. Sem sessão válida, redireciona para login.html.
 *
 * Importante: isto é reforço de experiência (evita a pessoa ver a tela
 * "vazia" piscar antes do redirecionamento). A proteção real dos dados é o
 * RLS no Supabase — mesmo que este script tivesse um bug, nenhuma consulta
 * ao banco retorna linha sem uma sessão autenticada válida.
 */
const Auth = {
  session: null,
  profile: null,

  async init() {
    const { data: { session } } = await sb.auth.getSession();
    this.session = session;

    const isLoginPage = document.body.dataset.page === 'login';

    if (!session && !isLoginPage) {
      window.location.replace('login.html');
      return false;
    }

    if (session) {
      await this.loadProfile();
    }

    // Reage a logout/expiração de sessão acontecendo em outra aba.
    sb.auth.onAuthStateChange((event, newSession) => {
      this.session = newSession;
      const stillLoginPage = document.body.dataset.page === 'login';
      if (!newSession && !stillLoginPage) {
        window.location.replace('login.html');
      }
    });

    return true;
  },

  async loadProfile() {
    if (!this.session) return null;
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', this.session.user.id)
        .maybeSingle();
      if (error) throw error;
      this.profile = data;
      return data;
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      return null;
    }
  },

  currentUserLabel() {
    if (this.profile?.full_name) return this.profile.full_name;
    return this.session?.user?.email || 'Usuário';
  },

  currentUserId() {
    return this.session?.user?.id || null;
  },

  async signIn(email, password) {
    return sb.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    await sb.auth.signOut();
    window.location.replace('login.html');
  },

  async requestPasswordReset(email) {
    const basePath = window.location.pathname.replace(/[^/]*$/, '');
    return sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + basePath + 'login.html'
    });
  },

  async updatePassword(newPassword) {
    return sb.auth.updateUser({ password: newPassword });
  }
};

window.Auth = Auth;
