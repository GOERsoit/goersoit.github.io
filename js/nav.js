/* =========================================================
   所有屏共用
   1. 入场动画
   2. 进度小船
   3. 最后一屏：
      - 船先从屏幕外左边滑到最右边
      - 到达最右边时，鸟立即飞出来
      - 然后船沿弧线落到中下
      - 礼物出现、落款出现
   4. 点击翻页
   ========================================================= */
(function () {
  const body = document.body;
  const nextUrl = body.dataset.next || '';
  const prevUrl = body.dataset.prev || '';
  const fadeLayer = document.getElementById('fadeLayer');
  const boatWrap = document.getElementById('boatWrap');

  const TOTAL_PAGES = 7;
  const LEFT_START = 8;
  const LEFT_END = 92;

  function calcLeft(progress) {
    return LEFT_START + ((progress - 1) / (TOTAL_PAGES - 1)) * (LEFT_END - LEFT_START);
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function showSignature(delay) {
    const sig = document.getElementById('signature');
    if (sig) setTimeout(() => sig.classList.add('is-visible'), delay);
  }

  /* ---------- 最后一屏：两段路径 ---------- */
  function runFinalCurve() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    /* 第一段：从屏幕外左边 → 屏幕最右边（直线平推） */
    const seg1 = {
      startX: -80,
      startY: h * 0.06,
      endX:   w * 0.92,
      endY:   h * 0.06,
      DURATION: 2200
    };

    /* 第二段：从最右边 → 沿弧线拐到屏幕中下 */
    const seg2 = {
      startX: w * 0.92,
      startY: h * 0.06,
      ctrlX:  w * 1.00,
      ctrlY:  h * 0.55,
      endX:   w * 0.50,
      endY:   h * 0.68,
      DURATION: 3000
    };

    function runSeg1(onDone) {
      const t0 = performance.now();
      function tick(now) {
        let t = (now - t0) / seg1.DURATION;
        if (t > 1) t = 1;

        const e = easeInOutCubic(t);
        const x = seg1.startX + (seg1.endX - seg1.startX) * e;
        const y = seg1.startY + (seg1.endY - seg1.startY) * e;

        boatWrap.style.left = x + 'px';
        boatWrap.style.top  = y + 'px';
        boatWrap.style.transform = 'translate(-50%, 0) rotate(0deg)';

        if (t < 1) requestAnimationFrame(tick);
        else onDone();
      }
      requestAnimationFrame(tick);
    }

    function runSeg2(onDone) {
      const t0 = performance.now();
      function tick(now) {
        let t = (now - t0) / seg2.DURATION;
        if (t > 1) t = 1;

        const e = easeInOutCubic(t);
        const mt = 1 - e;

        const x = mt * mt * seg2.startX + 2 * mt * e * seg2.ctrlX + e * e * seg2.endX;
        const y = mt * mt * seg2.startY + 2 * mt * e * seg2.ctrlY + e * e * seg2.endY;
        const rot = 10 * Math.sin(e * Math.PI);

        boatWrap.style.left = x + 'px';
        boatWrap.style.top  = y + 'px';
        boatWrap.style.transform = `translate(-50%, 0) rotate(${rot}deg)`;

        if (t < 1) requestAnimationFrame(tick);
        else onDone();
      }
      requestAnimationFrame(tick);
    }

    /* ---------- 串联两段 ---------- */
    runSeg1(() => {
      /* 船刚到最右边，鸟立即飞出 */
      flyBirds();

      /* 等鸟飞出来一点，船再开始走弧线 */
      setTimeout(() => {
        runSeg2(() => {
          boatWrap.classList.add('is-docked');

          const gift = document.querySelector('.gift-block');
          if (gift) gift.classList.add('is-visible');

          const caption = document.getElementById('friendCaption');
          if (caption) {
            setTimeout(() => {
              caption.classList.add('is-visible');
              showSignature(400);
            }, 600);
          }
        });
      }, 500);
    });
  }

  /* ---------- 飞鸟：循环飞，严格限制在顶部一条带里 ---------- */
  let birdRAF = null;

  function flyBirds() {
    const birds = document.querySelectorAll('.bird');
    if (!birds.length) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const TOP_MIN = 0.010;
    const TOP_MAX = 0.040;
    const X_MIN   = 0.60;
    const X_MAX   = 0.90;

    function randTarget(baseIndex) {
      const seg = (X_MAX - X_MIN) / 3;
      const xStart = X_MIN + seg * baseIndex;
      const xEnd   = xStart + seg;

      return {
        x: W * (xStart + Math.random() * (xEnd - xStart)),
        y: H * (TOP_MIN + Math.random() * (TOP_MAX - TOP_MIN))
      };
    }

    const states = [];

    birds.forEach((bird, i) => {
      const target = randTarget(i);

      states.push({
        bird,
        index: i,
        target,
        startX: -100,
        startY: target.y + 40 + i * 14,
        flyDuration:  2800 + Math.random() * 800,
        stayDuration: 1400 + Math.random() * 1200,
        exitDuration: 2000 + Math.random() * 600,
        delay: i * 500,
        phase: 'wait',
        phaseStart: 0
      });
    });

    let flapStart = performance.now();

    function resetForNextLoop(st) {
      st.target = randTarget(st.index);
      st.startX = -100;
      st.startY = st.target.y + 40 + st.index * 14;
      st.flyDuration  = 2800 + Math.random() * 800;
      st.stayDuration = 1400 + Math.random() * 1200;
      st.exitDuration = 2000 + Math.random() * 600;

      st.bird.style.opacity = '0';
      st.bird.style.transform = `translate(${st.startX}px, ${st.startY}px)`;

      setTimeout(() => {
        st.bird.style.opacity = '1';
        st.phase = 'fly';
        st.phaseStart = performance.now();
      }, 600 + st.index * 300);
    }

    function flapTick(now) {
      const t = (now - flapStart) / 1000;

      states.forEach((st) => {
        if (st.phase === 'wait') return;

        let x, y;

        if (st.phase === 'fly') {
          const p = Math.min((now - st.phaseStart) / st.flyDuration, 1);
          const e = easeInOutCubic(p);
          x = st.startX + (st.target.x - st.startX) * e;
          const baseY = st.startY + (st.target.y - st.startY) * e;
          const wave = Math.sin(p * Math.PI * 4) * 3 * (1 - p);
          y = baseY + wave;

          if (p >= 1) {
            st.phase = 'stay';
            st.phaseStart = now;
          }
        } else if (st.phase === 'stay') {
          x = st.target.x;
          y = st.target.y;

          if (now - st.phaseStart >= st.stayDuration) {
            st.phase = 'exit';
            st.phaseStart = now;
          }
        } else if (st.phase === 'exit') {
          const p = Math.min((now - st.phaseStart) / st.exitDuration, 1);
          const e = easeInOutCubic(p);
          x = st.target.x + (W + 120 - st.target.x) * e;
          y = st.target.y - 18 * e;

          if (p >= 1) {
            st.phase = 'wait';
            st.phaseStart = 0;
            resetForNextLoop(st);
            return;
          }
        }

        st.bird.style.transform = `translate(${x}px, ${y}px)`;

        const flapSpeed = 14 - st.index * 1.5;
        const angle = Math.sin(t * flapSpeed + st.index * 1.3) * 16;

        const leftWing = st.bird.querySelector('.wing-left');
        const rightWing = st.bird.querySelector('.wing-right');
        if (leftWing)  leftWing.setAttribute('transform', `rotate(${angle} 30 15)`);
        if (rightWing) rightWing.setAttribute('transform', `rotate(${-angle} 30 15)`);
      });

      birdRAF = requestAnimationFrame(flapTick);
    }

    states.forEach((st) => {
      setTimeout(() => {
        st.bird.style.opacity = '1';
        st.phase = 'fly';
        st.phaseStart = performance.now();
      }, st.delay);
    });

    if (birdRAF) cancelAnimationFrame(birdRAF);
    birdRAF = requestAnimationFrame(flapTick);
  }

  /* ---------- 1. 小船定位 ---------- */
  if (boatWrap) {
    const progress = parseInt(boatWrap.dataset.progress || '1', 10);
    const lastProgress = parseInt(sessionStorage.getItem('boat-progress') || '0', 10);

    if (progress === TOTAL_PAGES) {
      if (lastProgress === TOTAL_PAGES - 1) {
        /* 从第 6 页翻过来：船先放屏幕外左侧，跑两段路径 */
        boatWrap.style.transition = 'none';
        boatWrap.style.left = '-80px';
        boatWrap.style.top  = (window.innerHeight * 0.06) + 'px';
        boatWrap.style.transform = 'translate(-50%, 0) rotate(0deg)';
        boatWrap.classList.add('is-visible');

        window.addEventListener('load', () => {
          setTimeout(runFinalCurve, 400);
        });
      } else {
        /* 直接打开或刷新第 7 页：船直接停在终点 */
        boatWrap.style.transition = 'none';
        boatWrap.style.left = (window.innerWidth * 0.50) + 'px';
        boatWrap.style.top  = (window.innerHeight * 0.68) + 'px';
        boatWrap.style.transform = 'translate(-50%, 0) rotate(0deg)';
        boatWrap.classList.add('is-visible', 'is-docked');

        window.addEventListener('load', () => {
          const gift = document.querySelector('.gift-block');
          if (gift) gift.classList.add('is-visible');
          const caption = document.getElementById('friendCaption');
          if (caption) {
            setTimeout(() => {
              caption.classList.add('is-visible');
              showSignature(400);
              setTimeout(flyBirds, 800);
            }, 600);
          }
        });
      }
    } else {
      const currentLeft = calcLeft(progress);
      const shouldSlide =
        lastProgress >= 1 &&
        lastProgress <= TOTAL_PAGES &&
        lastProgress !== progress;

      if (shouldSlide) {
        const lastLeft = calcLeft(lastProgress);
        boatWrap.style.transition = 'none';
        boatWrap.style.setProperty('--boat-left', lastLeft + '%');
        void boatWrap.offsetWidth;

        boatWrap.style.transition = '';
        boatWrap.classList.add('is-visible');
        requestAnimationFrame(() => {
          boatWrap.style.setProperty('--boat-left', currentLeft + '%');
        });
      } else if (lastProgress === 0) {
        /* 第一次打开：从屏幕外左边滑入 */
        boatWrap.style.transition = 'none';
        boatWrap.style.setProperty('--boat-left', '-12%');
        void boatWrap.offsetWidth;

        boatWrap.style.transition = '';
        boatWrap.classList.add('is-visible');
        requestAnimationFrame(() => {
          boatWrap.style.setProperty('--boat-left', currentLeft + '%');
        });
      } else {
        boatWrap.style.setProperty('--boat-left', currentLeft + '%');
        window.addEventListener('load', () => {
          setTimeout(() => boatWrap.classList.add('is-visible'), 500);
        });
      }
    }

    sessionStorage.setItem('boat-progress', progress);
  }

  /* ---------- 2. 入场动画 ---------- */
  window.addEventListener('load', () => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.reveal').forEach((el) => {
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('is-visible'), delay);
      });
    });
  });

  /* ---------- 3. 翻页 ---------- */
  let locked = false;

  function navigate(url) {
    if (!url || locked) return;
    locked = true;
    fadeLayer.classList.add('is-active');
    setTimeout(() => {
      window.location.href = url;
    }, 580);
  }

  function goNext() { navigate(nextUrl); }
  function goPrev() { navigate(prevUrl); }

  window.addEventListener('pageshow', () => {
    fadeLayer.classList.remove('is-active');
    locked = false;
  });

  let touchStartY = 0;
  let touchStartX = 0;
  let moved = false;

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    moved = false;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    if (dy > 8 || dx > 8) moved = true;
  }, { passive: true });

  const screenEl = document.querySelector('.screen');
  if (screenEl) {
    screenEl.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea')) return;
      if (locked) return;
      if (moved) { moved = false; return; }

      const y = e.clientY / window.innerHeight;
      const goRight = y > 0.5;

      if (goRight && !nextUrl) return;
      if (!goRight && !prevUrl) return;

      if (boatWrap && nextUrl) {
        boatWrap.classList.remove('is-visible', 'is-docked');
        boatWrap.style.animation = '';
        boatWrap.style.transition = '';
        boatWrap.classList.add(goRight ? 'sail-out-right' : 'sail-out-left');
      }

      setTimeout(() => {
        if (goRight) goNext();
        else goPrev();
      }, 500);
    });
  }
})();
