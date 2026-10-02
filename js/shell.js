/* =========================================================
   外壳音乐控制
   加了三重保险，任何情况下都只有一个 audio 在播
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
  allAudios.forEach((a, i) => {
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

  const KEY_MUTED = 'bgm-muted';
  let userPaused = localStorage.getItem(KEY_MUTED) === 'true';

  function play() {
    if (userPaused) return;
    killOthers();
    audio.play().then(() => {
      btn.classList.add('is-playing');
    }).catch(() => {
      btn.classList.remove('is-playing');
    });
  }

  function pause() {
    audio.pause();
    btn.classList.remove('is-playing');
  }

  play();

  audio.addEventListener('ended', () => {
    btn.classList.remove('is-playing');
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      userPaused = false;
      localStorage.setItem(KEY_MUTED, 'false');
      if (audio.ended) audio.currentTime = 0;
      play();
    } else {
      userPaused = true;
      localStorage.setItem(KEY_MUTED, 'true');
      pause();
    }
  });

  function tryPlay() {
    if (!userPaused && audio.paused && !audio.ended) play();
  }

  ['click', 'wheel', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, tryPlay, { passive: true });
  });

  window.addEventListener('message', (e) => {
    if (e.data === 'user-interact') tryPlay();
  });
})();