// ポチポチ約数ハンター 〜まるつけマスター〜
// メインゲームスクリプト

(function () {
  'use strict';

  // --- 問題マスターデータ ---
  const QUESTIONS = [
    // レベル1: 基本（20以下の合成数）
    { target: 12, pairs: [[1, 12], [2, 6], [3, 4]], desc: "教科書に出てきた基本の数！" },
    { target: 16, pairs: [[1, 16], [2, 8], [4, 4]], desc: "4×4 の平方数！" },
    { target: 18, pairs: [[1, 18], [2, 9], [3, 6]], desc: "九九でよく出る数！" },
    { target: 20, pairs: [[1, 20], [2, 10], [4, 5]], desc: "教科書の練習問題【2】！" },
    { target: 8,  pairs: [[1, 8], [2, 4]], desc: "小さくて見つけやすい数！" },
    { target: 10, pairs: [[1, 10], [2, 5]], desc: "10の約数は4つ！" },
    { target: 14, pairs: [[1, 14], [2, 7]], desc: "7のだんも思い出そう！" },
    { target: 15, pairs: [[1, 15], [3, 5]], desc: "奇数だけど約数があるよ！" },
    { target: 6,  pairs: [[1, 6], [2, 3]], desc: "完全数とも呼ばれるよ！" },

    // レベル2: 素数＆平方数（教科書準拠）
    { target: 9,  pairs: [[1, 9], [3, 3]], desc: "3×3 の平方数！約数は奇数個！" },
    { target: 13, pairs: [[1, 13]], desc: "素数！1と自分自身だけ！" },
    { target: 17, pairs: [[1, 17]], desc: "素数！1と17だけだよ！" },
    { target: 19, pairs: [[1, 19]], desc: "素数！見落とさないで！" },

    // レベル3: 少し大きめの数
    { target: 24, pairs: [[1, 24], [2, 12], [3, 8], [4, 6]], desc: "約数がたくさん（8個）！" },
    { target: 25, pairs: [[1, 25], [5, 5]], desc: "5×5 の平方数！" },
    { target: 28, pairs: [[1, 28], [2, 14], [4, 7]], desc: "4×7 もペアだよ！" },
    { target: 30, pairs: [[1, 30], [2, 15], [3, 10], [5, 6]], desc: "たくさんのペアがあるよ！" }
  ];

  // --- ゲーム状態管理 ---
  let state = {
    screen: 'title', // 'title' | 'game' | 'result' | 'ranking'
    timeLeft: 90,
    timerId: null,
    score: 0,
    combo: 0,
    maxCombo: 0,
    solvedCount: 0,
    feverGauge: 0,
    isFever: false,
    feverTimerId: null,
    currentQuestion: null,
    selectedNumbers: new Set(),
    sessionToken: null,
    isSubmittingScore: false,
    isFeedbackShowing: false
  };

  // --- DOM要素の参照 ---
  const elApp = document.getElementById('app-container');
  const screens = {
    title: document.getElementById('screen-title'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    ranking: document.getElementById('screen-ranking')
  };

  const elBtnSoundToggle = document.getElementById('btn-sound-toggle');
  const elTimeLeft = document.getElementById('time-left');
  const elScore = document.getElementById('score');
  const elComboBadge = document.getElementById('combo-badge');
  const elComboCount = document.getElementById('combo-count');
  const elFeverBar = document.getElementById('fever-bar');
  const elTargetNumber = document.getElementById('target-number');
  const elTrayChips = document.getElementById('tray-chips');
  const elNumpadGrid = document.getElementById('numpad-grid');
  const elBtnClear = document.getElementById('btn-clear');
  const elBtnSubmit = document.getElementById('btn-submit');

  // フィードバック
  const elFeedbackOverlay = document.getElementById('feedback-overlay');
  const elFeedbackTitle = document.getElementById('feedback-title');
  const elFeedbackDetail = document.getElementById('feedback-detail');
  const elFeedbackPair = document.getElementById('feedback-pair');

  // リザルト
  const elFinalScore = document.getElementById('final-score');
  const elStatSolved = document.getElementById('stat-solved');
  const elStatMaxCombo = document.getElementById('stat-max-combo');
  const elResultRank = document.getElementById('result-rank');
  const elPlayerName = document.getElementById('player-name');
  const elBtnSaveScore = document.getElementById('btn-save-score');
  const elBtnRetry = document.getElementById('btn-retry');

  // ランキング
  const elRankingList = document.getElementById('ranking-list');
  const elBtnBackRanking = document.getElementById('btn-back-ranking');

  // タイトルボタン
  const elBtnStart = document.getElementById('btn-start');
  const elBtnRankingView = document.getElementById('btn-ranking-view');

  // 紙吹雪Canvas
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confettiParticles = [];
  let confettiAnimId = null;

  // --- 画面切り替え ---
  function switchScreen(screenName) {
    state.screen = screenName;
    Object.keys(screens).forEach(key => {
      screens[key].classList.toggle('active', key === screenName);
    });
  }

  // --- Canvas リサイズ ---
  function resizeCanvas() {
    canvas.width = elApp.clientWidth;
    canvas.height = elApp.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // --- スプラッシュインクエフェクト (Splatoon Ink Particles) ---
  function triggerConfetti(count = 60) {
    const colors = ['#00FF66', '#FF007F', '#FAFF00', '#00F0FF', '#9D00FF', '#FF6600'];
    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 220,
        y: canvas.height * 0.38,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 14,
        size: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        splatRatio: Math.random() * 0.4 + 0.8, // 雫の楕円比率
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.38,
        alpha: 1
      });
    }

    if (!confettiAnimId) {
      updateConfetti();
    }
  }

  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      const p = confettiParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.rot += p.rotSpeed;
      p.alpha -= 0.018;

      if (p.alpha <= 0 || p.y > canvas.height + 25) {
        confettiParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      // メインのインクしずく（丸）
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * p.splatRatio, 0, 0, Math.PI * 2);
      ctx.fill();

      // インクの飛び散り小粒（スプラトゥーン感）
      ctx.beginPath();
      ctx.arc(p.size * 1.3, -p.size * 0.5, p.size * 0.3, 0, Math.PI * 2);
      ctx.arc(-p.size * 1.1, p.size * 0.6, p.size * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(updateConfetti);
    } else {
      confettiAnimId = null;
    }
  }

  // --- ゲーム開始 ---
  async function startGame() {
    sounds.init();
    sounds.playClick();

    // 状態リセット
    state.timeLeft = 90;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.solvedCount = 0;
    state.feverGauge = 0;
    state.isFever = false;
    state.isFeedbackShowing = false;
    elApp.classList.remove('fever-mode');
    elComboBadge.classList.remove('show');

    updateHeaderUI();
    switchScreen('game');

    // バックグラウンドでセッショントークンを取得
    api.getSessionToken().then(token => {
      state.sessionToken = token;
    });

    // 問題プールをシャッフル
    questionPool = shuffleArray([...QUESTIONS]);
    questionIndex = 0;

    nextQuestion();

    // タイマー開始
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(onTick, 1000);
  }

  let questionPool = [];
  let questionIndex = 0;

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- 次の問題を出題 ---
  function nextQuestion() {
    if (questionIndex >= questionPool.length) {
      questionPool = shuffleArray([...QUESTIONS]);
      questionIndex = 0;
    }
    state.currentQuestion = questionPool[questionIndex++];
    state.selectedNumbers.clear();

    elTargetNumber.textContent = state.currentQuestion.target;
    updateTrayUI();

    // ボタングリッドの構築
    buildNumpad(state.currentQuestion.target);
  }

  // --- 数字ボタングリッドの動的生成 ---
  function buildNumpad(target) {
    elNumpadGrid.innerHTML = '';

    // ボタン数は 基本20個（5列×4行）。もしお題が24や30ならその数まで配置
    const maxBtn = Math.max(20, target);
    
    // レイアウト調整
    if (maxBtn <= 20) {
      elNumpadGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    } else if (maxBtn <= 24) {
      elNumpadGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    } else {
      elNumpadGrid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    }

    for (let i = 1; i <= maxBtn; i++) {
      const btn = document.createElement('button');
      btn.className = 'tile-btn';
      btn.dataset.num = i;
      btn.textContent = i;
      
      btn.addEventListener('click', () => {
        onTileClick(i, btn);
      });

      elNumpadGrid.appendChild(btn);
    }
  }

  // --- タイルクリック（ポチポチ選択/解除） ---
  function onTileClick(num, btn) {
    if (state.screen !== 'game' || state.timeLeft <= 0 || state.isFeedbackShowing) return;

    if (state.selectedNumbers.has(num)) {
      state.selectedNumbers.delete(num);
      btn.classList.remove('selected');
      sounds.playDeselect();
    } else {
      state.selectedNumbers.add(num);
      btn.classList.add('selected');
      sounds.playClick();
    }

    updateTrayUI();
  }

  // --- えらんだ数トレイの更新 ---
  function updateTrayUI() {
    elTrayChips.innerHTML = '';
    const sorted = Array.from(state.selectedNumbers).sort((a, b) => a - b);

    if (sorted.length === 0) {
      elTrayChips.innerHTML = '<span style="color:#90A4AE; font-size:0.95rem;">（ボタンを押してね）</span>';
      return;
    }

    sorted.forEach(num => {
      const chip = document.createElement('span');
      chip.className = 'tray-chip';
      chip.textContent = num;
      elTrayChips.appendChild(chip);
    });
  }

  // --- 全クリアボタン ---
  elBtnClear.addEventListener('click', () => {
    if (state.screen !== 'game' || state.timeLeft <= 0 || state.isFeedbackShowing) return;
    sounds.playClick();
    state.selectedNumbers.clear();
    const btns = elNumpadGrid.querySelectorAll('.tile-btn');
    btns.forEach(b => b.classList.remove('selected'));
    updateTrayUI();
  });

  // --- 判定処理（けっていボタン） ---
  elBtnSubmit.addEventListener('click', onSubmit);

  function onSubmit() {
    if (state.screen !== 'game' || state.timeLeft <= 0 || state.isFeedbackShowing) return;

    const target = state.currentQuestion.target;
    
    // 正しい約数を計算
    const correctDivisors = new Set();
    state.currentQuestion.pairs.forEach(pair => {
      correctDivisors.add(pair[0]);
      correctDivisors.add(pair[1]);
    });

    const userSelected = state.selectedNumbers;

    // 何も選んでいない場合
    if (userSelected.size === 0) {
      sounds.playWrong();
      showTemporaryFeedback('ひとつも選ばれていないよ！', '約数だと思う数字をポチポチ選んでね！', false, null);
      return;
    }

    // 正解・不正解チェック
    const missing = []; // 選ぶべきだったのに選んでいない約数
    const incorrect = []; // 約数でないのに選んでしまった数

    correctDivisors.forEach(d => {
      if (!userSelected.has(d)) missing.push(d);
    });

    userSelected.forEach(s => {
      if (!correctDivisors.has(s)) incorrect.push(s);
    });

    if (missing.length === 0 && incorrect.length === 0) {
      // ★ 完全正解（パーフェクト！）
      onCorrectAnswer(target, correctDivisors);
    } else {
      // ★ 不正解（おしい！）
      onWrongAnswer(target, missing, incorrect);
    }
  }

  // --- 正解時の処理 ---
  function onCorrectAnswer(target, divisorsSet) {
    state.solvedCount++;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;

    // スコア計算
    let baseScore = 300;
    let comboBonus = (state.combo - 1) * 60;
    let gainedScore = (baseScore + comboBonus) * (state.isFever ? 2 : 1);
    state.score += gainedScore;

    // 効果音と紙吹雪
    sounds.playStepSuccess(state.combo % 8);
    if (state.combo >= 2) {
      elComboBadge.classList.add('show');
      elComboCount.textContent = state.combo;
    }
    triggerConfetti(50);

    // フィーバーゲージ加算
    if (!state.isFever) {
      state.feverGauge = Math.min(100, state.feverGauge + 25);
      if (state.feverGauge >= 100) {
        startFever();
      }
    }

    updateHeaderUI();

    // ペア文字列の生成（教科書対応）
    const pairStrings = state.currentQuestion.pairs
      .map(p => p[0] === p[1] ? `${p[0]}×${p[1]}` : `${p[0]}×${p[1]}`)
      .join(', ');

    const sortedDivisors = Array.from(divisorsSet).sort((a, b) => a - b).join(', ');

    // フィードバック表示（1.2秒後に自動で次へ）
    showTemporaryFeedback(
      `🎉 PERFECT SPLASH!! +${gainedScore}点`,
      `全エリアぬり完了！ ${target} の約数は <strong>${sortedDivisors}</strong>（ぜんぶで ${divisorsSet.size}こ）！`,
      true,
      `インクが重なるペア： ${pairStrings}`,
      1300,
      () => {
        if (state.timeLeft <= 0 || state.screen !== 'game') {
          endGame();
          return;
        }
        nextQuestion();
      }
    );
  }

  // --- 不正解時の処理 ---
  function onWrongAnswer(target, missing, incorrect) {
    sounds.playWrong();
    state.combo = 0;
    elComboBadge.classList.remove('show');

    // 時間ペナルティ（-3秒）
    state.timeLeft = Math.max(0, state.timeLeft - 3);
    updateHeaderUI();

    // ★ ペナルティで0秒になった場合は即座に強制終了！ ★
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endGame();
      return;
    }

    let titleMsg = '💥 OUT OF INK!!（-3秒）';
    let detailMsg = '';
    if (incorrect.length > 0) {
      const badNum = incorrect[0];
      const remainder = target % badNum;
      const quotient = Math.floor(target / badNum);
      titleMsg = '💥 OUT OF INK!! あまりが出ちゃった！（-3秒）';
      detailMsg = `「${badNum}」でわるとあまりが出るぞ！（${target} ÷ ${badNum} ＝ ${quotient} あまり ${remainder}）`;
    } else if (missing.length > 0) {
      const missedNum = missing[0];
      const partner = target / missedNum;
      titleMsg = '⚠️ INK SHORTAGE!! ぬり残しがあるぞ！（-3秒）';
      detailMsg = `まだあるぞ！「${missedNum}」も ${target} の約数だ！（${Math.min(missedNum, partner)} × ${Math.max(missedNum, partner)} ＝ ${target}）`;
    }

    showTemporaryFeedback(
      titleMsg,
      detailMsg,
      false,
      null,
      1400
    );
  }

  // --- フィードバックポップアップ表示 ---
  function showTemporaryFeedback(title, detail, isCorrect, pairText, duration = 1200, callback = null) {
    state.isFeedbackShowing = true;
    elFeedbackTitle.textContent = title;
    elFeedbackTitle.className = `feedback-title ${isCorrect ? 'correct' : 'wrong'}`;
    elFeedbackDetail.innerHTML = detail;

    if (pairText) {
      elFeedbackPair.style.display = 'block';
      elFeedbackPair.textContent = pairText;
    } else {
      elFeedbackPair.style.display = 'none';
    }

    elFeedbackOverlay.classList.add('active');

    setTimeout(() => {
      elFeedbackOverlay.classList.remove('active');
      state.isFeedbackShowing = false;
      if (callback) callback();
    }, duration);
  }

  // --- フィーバーモード ---
  function startFever() {
    state.isFever = true;
    state.feverGauge = 100;
    sounds.playFever();
    elApp.classList.add('fever-mode');
    
    // 時間を5秒ボーナス追加
    if (state.timeLeft > 0 && state.screen === 'game') {
      state.timeLeft = Math.min(99, state.timeLeft + 5);
      updateHeaderUI();
    }

    let feverSeconds = 12; // 12秒間フィーバー
    if (state.feverTimerId) {
      clearInterval(state.feverTimerId);
      state.feverTimerId = null;
    }

    state.feverTimerId = setInterval(() => {
      if (state.screen !== 'game' || state.timeLeft <= 0) {
        clearInterval(state.feverTimerId);
        state.feverTimerId = null;
        endFever();
        return;
      }

      feverSeconds--;
      state.feverGauge = (feverSeconds / 12) * 100;
      elFeverBar.style.width = `${state.feverGauge}%`;

      if (feverSeconds <= 0) {
        clearInterval(state.feverTimerId);
        state.feverTimerId = null;
        endFever();
      }
    }, 1000);
  }

  function endFever() {
    state.isFever = false;
    state.feverGauge = 0;
    if (state.feverTimerId) {
      clearInterval(state.feverTimerId);
      state.feverTimerId = null;
    }
    elApp.classList.remove('fever-mode');
    updateHeaderUI();
  }

  // --- タイマー処理 ---
  function onTick() {
    if (state.screen !== 'game') {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
      return;
    }

    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHeaderUI();
      endGame();
      return;
    }

    updateHeaderUI();

    if (state.timeLeft <= 10) {
      elTimeLeft.classList.add('time-warning');
    } else {
      elTimeLeft.classList.remove('time-warning');
    }
  }

  // --- ヘッダーUI更新 ---
  function updateHeaderUI() {
    elTimeLeft.textContent = state.timeLeft;
    elScore.textContent = state.score.toLocaleString();
    if (!state.isFever) {
      elFeverBar.style.width = `${state.feverGauge}%`;
    }
  }

  // --- ゲーム終了（リザルト画面） ---
  function endGame() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    if (state.feverTimerId) {
      clearInterval(state.feverTimerId);
      state.feverTimerId = null;
    }
    endFever();

    // フィードバックポップアップや警告があれば確実に解除
    elFeedbackOverlay.classList.remove('active');
    state.isFeedbackShowing = false;
    elTimeLeft.classList.remove('time-warning');

    sounds.playResult();
    triggerConfetti(80);

    elFinalScore.textContent = state.score.toLocaleString();
    elStatSolved.textContent = state.solvedCount;
    elStatMaxCombo.textContent = state.maxCombo;

    // 称号・ランク判定（完全オリジナル・著作権クリーン）
    let rank = '🖌️ インク見習いルーキー';
    if (state.score >= 4000) {
      rank = '👑 伝説のウルトラペイントマスター！';
    } else if (state.score >= 3000) {
      rank = '🏆 カンスト級！全色ぬりつくしチャンプ';
    } else if (state.score >= 2000) {
      rank = '⭐ クールな約数スプラッシャー！';
    } else if (state.score >= 1000) {
      rank = '🎨 ペイントぬりぬりファイター！';
    }
    elResultRank.textContent = `称号: ${rank}`;

    // 前回のプレイヤー名があれば復元
    const savedName = localStorage.getItem('yakusuu_player_name') || '';
    elPlayerName.value = savedName;

    elBtnSaveScore.disabled = false;
    elBtnSaveScore.textContent = '🏆 ランキングに登録';

    switchScreen('result');
  }

  // --- スコア保存 ---
  elBtnSaveScore.addEventListener('click', async () => {
    if (state.isSubmittingScore) return;

    if (!navigator.onLine) {
      sounds.playWrong();
      elBtnSaveScore.textContent = '⚠️ オフラインのため登録できません';
      elBtnSaveScore.style.background = '#C62828';
      setTimeout(() => {
        elBtnSaveScore.textContent = '🏆 ランキングに登録';
        elBtnSaveScore.style.background = '';
      }, 2500);
      return;
    }

    const name = elPlayerName.value.trim() || '名無しさん';
    localStorage.setItem('yakusuu_player_name', name);

    sounds.playClick();
    state.isSubmittingScore = true;
    elBtnSaveScore.textContent = '登録中...';
    elBtnSaveScore.disabled = true;

    try {
      await api.registerScore(name, state.score, state.sessionToken);
      elBtnSaveScore.textContent = '✔ ランキング登録完了！';
      setTimeout(() => {
        showRanking();
      }, 900);
    } catch (err) {
      console.error(err);
      sounds.playWrong();
      elBtnSaveScore.textContent = '⚠️ 通信エラー：登録できませんでした';
      elBtnSaveScore.style.background = '#C62828';
      setTimeout(() => {
        elBtnSaveScore.disabled = false;
        elBtnSaveScore.textContent = '🏆 ランキングに登録';
        elBtnSaveScore.style.background = '';
      }, 2500);
    } finally {
      state.isSubmittingScore = false;
    }
  });

  // --- もう一度遊ぶ ---
  elBtnRetry.addEventListener('click', () => {
    startGame();
  });

  // --- ランキング表示 ---
  async function showRanking() {
    switchScreen('ranking');
    elRankingList.innerHTML = '<div style="text-align:center; padding:20px; color:#78909C;">ランキングを取得中...</div>';

    if (!navigator.onLine) {
      elRankingList.innerHTML = '<div style="text-align:center; padding:24px; color:#C62828; font-weight:700;">⚠️ 現在オフラインです。<br><span style="font-size:0.95rem; color:#546E7A;">インターネットに接続するとランキングが表示されます。</span></div>';
      return;
    }

    try {
      const list = await api.getRanking();
      if (!list || list.length === 0) {
        elRankingList.innerHTML = '<div style="text-align:center; padding:20px; color:#78909C;">まだランキングデータがありません。<br>あなたが最初のチャレンジャーです！</div>';
        return;
      }

      elRankingList.innerHTML = '';
      list.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `ranking-item rank-${index + 1}`;

        let crown = '';
        if (index === 0) crown = '🥇 ';
        else if (index === 1) crown = '🥈 ';
        else if (index === 2) crown = '🥉 ';
        else crown = `${index + 1}位 `;

        div.innerHTML = `
          <span>${crown}${escapeHtml(item.name)}</span>
          <span style="color:#0D47A1; font-weight:900;">${item.score.toLocaleString()} 点</span>
        `;
        elRankingList.appendChild(div);
      });
    } catch (err) {
      elRankingList.innerHTML = '<div style="text-align:center; padding:20px; color:#C62828;">⚠️ ランキングの取得に失敗しました。<br><span style="font-size:0.9rem; color:#546E7A;">通信環境を確認してください。</span></div>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  elBtnRankingView.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    showRanking();
  });

  elBtnBackRanking.addEventListener('click', () => {
    sounds.playClick();
    switchScreen(state.timeLeft > 0 && state.screen === 'game' ? 'game' : 'title');
  });

  // --- サウンド切り替え ---
  elBtnSoundToggle.addEventListener('click', () => {
    sounds.init();
    const muted = sounds.toggleMute();
    elBtnSoundToggle.textContent = muted ? '🔇' : '🔊';
  });

  // --- タイトルスタートボタン ---
  elBtnStart.addEventListener('click', () => {
    startGame();
  });

  // --- PCキーボード操作対応 ---
  window.addEventListener('keydown', (e) => {
    if (state.screen !== 'game' || state.timeLeft <= 0 || state.isFeedbackShowing) return;

    if (e.key === 'Enter') {
      onSubmit();
    } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'Delete') {
      elBtnClear.click();
    } else {
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num > 0) {
        const btn = elNumpadGrid.querySelector(`button[data-num="${num}"]`);
        if (btn) btn.click();
      }
    }
  });

})();
