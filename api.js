// 統合GASバックエンドのWebアプリURL（公倍数・約数 共通スプレッドシート連携）
const GAS_URL = "https://script.google.com/macros/s/AKfycbzUWv4NrZrbapQfqZzLIhjDzDejNG3hhMbxU5wyDZ78vA2oYsADe2qNCWwQmUs5swpj/exec";
const CURRENT_UNIT = "yakusuu"; // 本アプリの単元キー

// モックフラグ (本番連携のため false)
const USE_MOCK = false;

const api = {
  // ネットワーク接続状態の確認
  isOnline() {
    return navigator.onLine;
  },

  // セッショントークンの取得
  async getSessionToken() {
    if (USE_MOCK || !this.isOnline()) {
      return "token_" + Date.now();
    }
    try {
      const res = await fetch(GAS_URL + "?action=getSession", { method: 'GET' });
      const json = await res.json();
      return json.token || ("session_" + Date.now());
    } catch (e) {
      return "token_" + Date.now();
    }
  },

  // スコア登録（オンライン必須）
  async registerScore(name, score, token) {
    if (USE_MOCK) {
      console.log(`Mock Register: ${name}, ${score}`);
      return new Promise(resolve => setTimeout(resolve, 500));
    }

    // オフライン時はエラーを投げて登録不可とする
    if (!this.isOnline()) {
      throw new Error("OFFLINE");
    }

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'register',
        unit: CURRENT_UNIT,
        name: name,
        score: score,
        token: token || ("t_" + Date.now())
      })
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || '登録失敗');
    }
    return json;
  },

  // ランキング取得
  async getRanking() {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve([
          { name: "はるき", score: 2800 },
          { name: "ゆい", score: 2450 },
          { name: "れん", score: 1900 }
        ]);
      }, 400));
    }

    if (!this.isOnline()) {
      throw new Error("OFFLINE");
    }

    const res = await fetch(`${GAS_URL}?action=getRanking&unit=${CURRENT_UNIT}`);
    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      return json.data;
    }
    throw new Error(json.error || '取得失敗');
  }
};
