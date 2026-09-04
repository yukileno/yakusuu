// GASのWebアプリURL（スプレッドシートのコンテナバインドGAS）
const GAS_URL = "https://script.google.com/macros/s/AKfycbxJD9RhMiNdEWWV-3yCGWm4DbQ06q-qz5-utz20h-0pFokum1xw7nv1iHJIDnKK8axXJw/exec";

// モックフラグ (本番連携のため false)
const USE_MOCK = false;

const QUEUE_KEY = 'yakusuu_offline_queue';
const LOCAL_RANKING_KEY = 'yakusuu_ranking';

const api = {
  // セッショントークンの取得
  async getSessionToken() {
    if (USE_MOCK || !navigator.onLine) {
      return "offline_token_" + Date.now();
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

  // 未送信スコアキューの取得
  getOfflineQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // 未送信キューへの保存
  saveOfflineQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to save offline queue:", e);
    }
  },

  // スコア登録（オフライン時は自動キューイング）
  async registerScore(name, score, token) {
    const item = {
      name: name,
      score: score,
      token: token || ("offline_" + Date.now()),
      date: new Date().toLocaleString('ja-JP')
    };

    // 常に端末ローカル記録も更新
    this.saveLocalScore(name, score);

    // オフライン状態なら即座にキューへ追加
    if (!navigator.onLine) {
      const queue = this.getOfflineQueue();
      queue.push(item);
      this.saveOfflineQueue(queue);
      console.log(`[Offline] スコアを未送信キューに保存しました (未送信計: ${queue.length}件)`);
      return { success: true, offline: true, queueCount: queue.length };
    }

    // オンライン送信を試行
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'register',
          name: item.name,
          score: item.score,
          token: item.token,
          date: item.date
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '登録失敗');
      }

      // 今回の送信が成功したら、ついでに過去の未送信キューがあれば一括送信
      this.syncOfflineScores().catch(() => {});
      return json;
    } catch (err) {
      console.warn("GAS送信エラー。未送信キューに退避します:", err);
      const queue = this.getOfflineQueue();
      queue.push(item);
      this.saveOfflineQueue(queue);
      return { success: true, offline: true, queueCount: queue.length };
    }
  },

  // 未送信スコアの一括自動再送（オンライン復帰時・起動時）
  async syncOfflineScores(onSyncCallback) {
    const queue = this.getOfflineQueue();
    if (queue.length === 0 || !navigator.onLine) {
      return { synced: 0 };
    }

    console.log(`[Sync] 未送信スコア ${queue.length} 件を一括送信中...`);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'bulkRegister',
          items: queue
        })
      });

      const json = await res.json();
      if (json.success) {
        const syncedCount = queue.length;
        localStorage.removeItem(QUEUE_KEY);
        console.log(`[Sync] ✔ 未送信スコア ${syncedCount} 件をすべて同期しました！`);
        if (typeof onSyncCallback === 'function') {
          onSyncCallback(syncedCount);
        }
        return { success: true, synced: syncedCount };
      }
    } catch (err) {
      console.warn("[Sync] 一括同期に失敗しました（次回再接続時に再試行）:", err);
    }
    return { synced: 0 };
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
      scores.push({ name: name, score: score, date: new Date().toLocaleDateString('ja-JP') });
      scores.sort((a, b) => b.score - a.score);
      localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(scores.slice(0, 20)));
    } catch (e) {
      console.error(e);
    }
  },

  getLocalScores() {
    try {
      const raw = localStorage.getItem(LOCAL_RANKING_KEY);
      return raw ? JSON.parse(raw) : [
        { name: "はるき", score: 2800 },
        { name: "ゆい", score: 2450 },
        { name: "れん", score: 1900 },
        { name: "りこ", score: 1500 }
      ];
    } catch (e) {
      return [];
    }
  }
};

// ネットワーク再接続時に自動で未送信スコアを同期
window.addEventListener('online', () => {
  console.log("ネットワーク復帰を検知しました。未送信スコアを同期します。");
  api.syncOfflineScores((count) => {
    if (window.showSyncNotification) {
      window.showSyncNotification(count);
    }
  });
});
