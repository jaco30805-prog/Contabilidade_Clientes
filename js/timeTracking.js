/**
 * Voal Consult — Contador de Tempo por Cliente
 *
 * Abre uma sessão de trabalho (time_entries) quando o Dossiê de um cliente é
 * carregado, e fecha quando a página é deixada — navegação para outra tela,
 * fechar a aba/navegador. Isso cobre o pedido de "contar o tempo enquanto a
 * janelinha do cliente estiver aberta", mesmo que parte do atendimento
 * aconteça fora do sistema.
 *
 * IMPORTANTE: isto é só medição interna de produtividade. Não tem nenhuma
 * relação com o preço cobrado do cliente — preço é definido ANTES do
 * serviço, pela calculadora (js/pricing.js), não pelo tempo gasto.
 */
const TimeTracker = {
  entryId: null,
  startedAt: null,
  clientId: null,
  _tickInterval: null,
  _heartbeatInterval: null,
  _closed: false,

  async open(clientId) {
    this.clientId = clientId;
    const userId = window.Auth?.currentUserId();
    if (!userId) return;

    try {
      // Retoma uma sessão já aberta por este usuário para este cliente
      // (ex.: usuário deu F5 na página) em vez de duplicar contagem.
      const { data: existing, error: findError } = await sb
        .from('time_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', userId)
        .eq('status', 'ABERTO')
        .maybeSingle();
      if (findError) throw findError;

      if (existing) {
        this.entryId = existing.id;
        this.startedAt = new Date(existing.started_at);
      } else {
        const { data: created, error: insertError } = await sb
          .from('time_entries')
          .insert({ client_id: clientId, user_id: userId })
          .select('*')
          .single();
        if (insertError) throw insertError;
        this.entryId = created.id;
        this.startedAt = new Date(created.started_at);
      }

      this._startTicking();
      this._startHeartbeat();
      this._registerCloseHandlers();
    } catch (err) {
      console.error('Erro ao iniciar contagem de tempo:', err);
    }
  },

  _startTicking() {
    const el = document.getElementById('dossie-timer');
    const tick = () => {
      if (!this.startedAt || !el) return;
      const secs = Math.max(0, Math.floor((Date.now() - this.startedAt.getTime()) / 1000));
      el.textContent = this._formatDuration(secs);
    };
    tick();
    this._tickInterval = setInterval(tick, 1000);
  },

  _startHeartbeat() {
    // Atualiza periodicamente enquanto a página fica aberta — garante que,
    // se a aba/navegador for fechado à força (sem disparar o evento de
    // saída), a sessão ainda tenha um "fim aproximado" registrado, em vez de
    // ficar aberta indefinidamente.
    this._heartbeatInterval = setInterval(() => {
      if (!this.entryId) return;
      sb.from('time_entries')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', this.entryId)
        .then(({ error }) => { if (error) console.warn('Heartbeat de tempo falhou:', error); });
    }, 20000);
  },

  _registerCloseHandlers() {
    // pagehide cobre navegação/fechar aba de forma confiável (inclusive
    // bfcache); beforeunload como reforço. Não usa visibilitychange —
    // trocar de aba momentaneamente não deve fechar a sessão.
    const closeNow = () => this.close();
    window.addEventListener('pagehide', closeNow);
    window.addEventListener('beforeunload', closeNow);
  },

  close() {
    if (this._closed || !this.entryId) return;
    this._closed = true;
    clearInterval(this._tickInterval);
    clearInterval(this._heartbeatInterval);

    const token = window.Auth?.session?.access_token;
    if (!token) return;

    // fetch com keepalive: disparado (não aguardado) dentro do handler de
    // saída da página — o navegador garante a tentativa de envio mesmo após
    // a página começar a descarregar, diferente de uma chamada normal do
    // supabase-js que seria cancelada.
    const url = `${window.SUPABASE_URL}/rest/v1/time_entries?id=eq.${this.entryId}`;
    fetch(url, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        apikey: window.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ status: 'FECHADO', ended_at: new Date().toISOString() })
    }).catch(() => {});
  },

  _formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  async getHistoryForClient(clientId, limit = 15) {
    const { data, error } = await sb
      .from('time_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) { console.error(error); return []; }
    return data;
  },

  async getTotalSecondsForClient(clientId) {
    const { data, error } = await sb
      .from('time_entries')
      .select('started_at, ended_at, last_heartbeat_at')
      .eq('client_id', clientId);
    if (error) { console.error(error); return 0; }
    return data.reduce((sum, e) => {
      const end = e.ended_at || e.last_heartbeat_at || e.started_at;
      const secs = (new Date(end) - new Date(e.started_at)) / 1000;
      return sum + Math.max(0, secs);
    }, 0);
  }
};

window.TimeTracker = TimeTracker;
