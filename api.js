// GASのWebアプリURL
const GAS_URL = "https://script.google.com/macros/s/AKfycbxxFBzigYXv2_xGglDOOthoHVXhQzxth1gCn9UocqIy4Owum8y7o7rqp5vCoaUdBRM2/exec";

// モックフラグ (本番連携のため false)
const USE_MOCK = false;

const api = {
  // セッショントークンの取得
  async getSessionToken() {
    if (USE_MOCK) {
      return "mock_token_" + Date.now();
    }
    try {
      const res = await fetch(GAS_URL + "?action=getSession", { method: 'GET' });
      const json = await res.json();
      return json.token || ("session_" + Date.now());
    } catch (e) {
      console.warn("GASトークン取得フォールバック:", e);
      return "offline_token_" + Date.now();
    }
  },

  // スコアの登録 (CORS対策: text/plain でPOST送信)
  async registerScore(name, score, token) {
    if (USE_MOCK) {
      console.log(`Mock Register: ${name}, ${score}`);
      return new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'register',
          name: name,
          score: score,
          token: token
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '登録に失敗しました');
      }
      return json;
    } catch (err) {
      console.error("Score register error:", err);
      // ローカルストレージにもバックアップ保存
      this.saveLocalScore(name, score);
      throw err;
    }
  },

  // ランキング取得
  async getRanking() {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve([
          { name: "はるき", score: 2800 },
          { name: "ゆい", score: 2450 },
          { name: "れん", score: 1900 },
          { name: "りこ", score: 1500 }
        ]);
      }, 400));
    }

    try {
      const res = await fetch(GAS_URL + "?action=getRanking");
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        return json.data;
      }
      return this.getLocalScores();
    } catch (err) {
      console.warn("GASランキング取得失敗。ローカル記録を使用します:", err);
      return this.getLocalScores();
    }
  },

  // ローカル保存用フォールバック
  saveLocalScore(name, score) {
    try {
      const scores = this.getLocalScores();
      scores.push({ name: name, score: score, date: new Date().toLocaleDateString() });
      scores.sort((a, b) => b.score - a.score);
      localStorage.setItem('yakusuu_ranking', JSON.stringify(scores.slice(0, 20)));
    } catch (e) {
      console.error(e);
    }
  },

  getLocalScores() {
    try {
      const raw = localStorage.getItem('yakusuu_ranking');
      return raw ? JSON.parse(raw) : [
        { name: "やくすう名人", score: 3200 },
        { name: "ペアマスター", score: 2500 },
        { name: "さんすうキッズ", score: 1800 }
      ];
    } catch (e) {
      return [];
    }
  }
};
