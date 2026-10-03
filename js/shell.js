/* =========================================================
   外壳音乐控制
   1. 进页面尝试自动播放
   2. 被浏览器拦截时，用户第一次交互（点击/滑动/滚轮/按键）立刻播放
   3. 三重保险，永远只有一个 audio 在播
   ========================================================= */
(function () {
  /* ---------- 保险 1：全局锁，防止脚本被重复执行 ---------- */
  if (window.__bgmBooted) return;
  window.__bgmBooted = true;

  const audio = document.getElementById('bgm');
  const btn = document.getElementById('bgmBtn');
  if (!audio || !btn) return;

  /* ---------- 保险 2：把页面里所有 audio 清一遍，只留一个 ---------- */
  const allAudios = document.querySelectorAll('audio');
  allAudios.forEach((a) => {
    if (a !== audio) {
      a.pause();
      a.src = '';
      a.remove();
    }
  });

  audio.volume = 0.9;
  audio.loop = false;

  /* ---------- 保险 3：播放前先确保是唯一在播的 ---------- */
  function killOthers() {
    const playing = document.querySelectorAll('audio');
    playing.forEach((a) => {
      if (a !== audio && !a.paused) a.pause();
    });
  }

  let started = false;
  let userPaused = false;

  function play() {
    if (userPaused) return;
    killOthers();
    audio.play().then(() => {
      started = true;
      btn.classList.add('is-playing');
    }).catch(() => {
      btn.classList.remove('is-playing');
    });
  }

  function pause() {
    audio.pause();
    btn.classList.remove('is-playing');
  }

  /* 进页面立即尝试自动播放 */
  play();

  audio.addEventListener('ended', () => {
    btn.classList.remove('is-playing');
  });

  /* 按钮：手动播放 / 暂停 */
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      userPaused = false;
      if (audio.ended) audio.currentTime = 0;
      play();
    } else {
      userPaused = true;
      pause();
    }
  });

  /* 自动播放被拦截时，用户第一次交互立刻播放 */
  function tryPlay() {
    if (!started && !userPaused && audio.paused && !audio.ended) play();
  }

  ['click', 'wheel', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, tryPlay, { passive: true });
  });

  /* 接收 iframe 里的交互通知 */
  window.addEventListener('message', (e) => {
    if (e.data === 'user-interact') tryPlay();
  });

  /* 页面从 bfcache 返回时，同步按钮状态 */
  window.addEventListener('pageshow', () => {
    if (!audio.paused) btn.classList.add('is-playing');
    else btn.classList.remove('is-playing');
  });
})();
