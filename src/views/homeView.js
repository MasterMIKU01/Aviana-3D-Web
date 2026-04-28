import { BUILDINGS_CONFIG } from '../config/buildings.js';
import { buildCardResource, PLACEHOLDER_IMAGE } from '../lib/cloudResolver.js';

const INTRO_SLIDES = [
  {
    title: '像素中航大',
    subtitle: '用科技传承百年文脉，让中航大在虚拟世界中重新绽放',
    bg: '/assets/cards/demo.png'
  },
  {
    title: '关于我们的项目',
    content:
      '欢迎来到“像素中航大”！我们是一支由来自中航大各个学院的本科生组成的团队，用现代科技为百年中航大注入了新的活力。\n\n我们想向那些因地域限制无法来到中航大的人们分享中航大的景色，传递中航大的精神。',
    bg: '/assets/cards/demo.png'
  },
  {
    title: '我们做了什么',
    content:
      '完整复原东丽校区，开发 AI 智能导览系统，构建校史知识库，提供观光路线、明信片等沉浸式体验。',
    bg: '/assets/cards/demo.png'
  }
];

const ABOUT_INFO =
  '像素中航大：基于体素建模的虚拟校园重建。'

function makeCardHtml(card) {
  return `
    <article class="card" data-id="${card.id}">
      <div class="card-media-wrap">
        <img src="${card.imageUrl}" alt="${card.title}" class="card-media" loading="lazy" />
        <div class="card-gradient"></div>
        <h3 class="card-title">${card.title}</h3>
      </div>
      <p class="card-author">改造者：${card.author || '未知'}</p>
    </article>
  `;
}

function makeSlideHtml(slide, idx, active) {
  return `
    <section class="intro-slide ${active ? 'active' : ''}" data-index="${idx}">
      <img class="intro-bg" src="${slide.bg || PLACEHOLDER_IMAGE}" alt="intro" />
      <div class="intro-shade"></div>
      <div class="intro-content">
        <h2>${slide.title}</h2>
        ${slide.subtitle ? `<p class="intro-subtitle">${slide.subtitle}</p>` : ''}
        ${slide.content ? `<p class="intro-text">${slide.content}</p>` : ''}
      </div>
    </section>
  `;
}

export function renderHomeView(container, { onOpenModel, initialView = 'intro' }) {
  const cards = BUILDINGS_CONFIG.map(buildCardResource);
  let activeTab = 'campus';
  let slideIndex = 0;
  let introVisible = initialView !== 'showcase';

  container.innerHTML = `
    <main class="home-root">
      <div class="atmosphere"></div>

      <header class="top-bar">
        <div class="logo-block">
          <p class="logo-kicker">VOXEL CAUC</p>
          <h1>虚拟校园档案馆</h1>
        </div>
      </header>

      <nav class="switcher">
        <button class="switch" data-tab="campus">东丽校区</button>
        <button class="switch" data-tab="about">关于</button>
        <div class="switch-track"></div>
      </nav>

      <section class="panel" id="campus-panel">
        <div class="grid">
          ${cards.map(makeCardHtml).join('')}
        </div>
      </section>

      <section class="panel about hidden" id="about-panel">
        <div class="about-card">
          <h2>项目简介</h2>
          <p>${ABOUT_INFO}</p>
          <h3>版本信息</h3>
          <p>v0.0.1</p>
          <h3>交流群</h3>
          <img src="/assets/qrcode_group.jpg" alt="交流群二维码" height="200" />
          <p>CAUCraft 神人竞技场：496981669</p>
          <p class="icp">暂无</p>
        </div>
      </section>

      <div class="intro">
        <div class="intro-slides">
          ${INTRO_SLIDES.map((slide, idx) => makeSlideHtml(slide, idx, idx === slideIndex)).join('')}
        </div>
        <button class="intro-edge-nav left" data-intro-nav="prev" aria-label="上一页" title="上一页">&lt;</button>
        <button class="intro-edge-nav right" data-intro-nav="next" aria-label="下一页" title="下一页">&gt;</button>
        <div class="intro-controls">
          <div class="intro-dots">
            ${INTRO_SLIDES.map(
              (_, idx) =>
                `<button class="dot ${idx === slideIndex ? 'active' : ''}" data-slide-to="${idx}" aria-label="跳转到第${idx + 1}页"></button>`
            ).join('')}
          </div>
        </div>
      </div>
    </main>
  `;

  const rootEl = container.querySelector('.home-root');
  const introEl = container.querySelector('.intro');
  const switchTrack = container.querySelector('.switch-track');
  const campusPanel = container.querySelector('#campus-panel');
  const aboutPanel = container.querySelector('#about-panel');

  function syncTabUi() {
    const campusActive = activeTab === 'campus';
    campusPanel?.classList.toggle('hidden', !campusActive);
    aboutPanel?.classList.toggle('hidden', campusActive);

    const switches = container.querySelectorAll('.switch');
    switches.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    switchTrack?.classList.toggle('left', campusActive);
    switchTrack?.classList.toggle('right', !campusActive);
  }

  function syncSlideUi() {
    const slides = container.querySelectorAll('.intro-slide');
    const dots = container.querySelectorAll('.dot');
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === slideIndex);
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === slideIndex);
      dot.setAttribute('aria-current', idx === slideIndex ? 'true' : 'false');
    });
  }

  function syncIntroUi() {
    introEl?.classList.toggle('is-offstage', !introVisible);
    rootEl?.classList.toggle('showcase-mode', !introVisible);
    if (showcaseBackBtn) showcaseBackBtn.style.display = introVisible ? 'none' : 'flex';
  }

  function enterShowcase() {
    if (!introVisible) return;
    introVisible = false;
    syncIntroUi();
  }

  function backToIntro() {
    if (introVisible) return;
    introVisible = true;
    syncIntroUi();
  }

  function turnSlide(direction) {
    if (direction === 'next') {
      slideIndex = (slideIndex + 1) % INTRO_SLIDES.length;
    } else {
      slideIndex = (slideIndex - 1 + INTRO_SLIDES.length) % INTRO_SLIDES.length;
    }
    syncSlideUi();
  }

  container.querySelectorAll('.switch').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab || 'campus';
      syncTabUi();
    });
  });

  container.querySelectorAll('.card').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const target = cards.find((item) => item.id === cardEl.dataset.id);
      if (!target) return;
      onOpenModel(target.id, introVisible ? 'intro' : 'showcase');
    });
  });

  container.querySelectorAll('[data-slide-to]').forEach((dotButton) => {
    dotButton.addEventListener('click', () => {
      const targetIndex = Number(dotButton.getAttribute('data-slide-to'));
      if (!Number.isInteger(targetIndex)) return;
      slideIndex = Math.max(0, Math.min(INTRO_SLIDES.length - 1, targetIndex));
      syncSlideUi();
    });
  });

  container.querySelectorAll('[data-intro-nav]').forEach((navButton) => {
    navButton.addEventListener('click', () => {
      if (!introVisible) return;
      turnSlide(navButton.getAttribute('data-intro-nav') === 'next' ? 'next' : 'prev');
    });
  });

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;
  let activePointerId = null;
  let activeTouchId = null;
  let showcaseBackBtn = null;
  let wheelLockUntil = 0;

  const INTRO_TO_SHOWCASE_DISTANCE = 92;
  const SHOWCASE_TO_INTRO_DISTANCE = 42;
  const SWIPE_MAX_DURATION = 700;

  function handleSwipe(dx, dy, elapsed) {
    if (elapsed > SWIPE_MAX_DURATION) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < SHOWCASE_TO_INTRO_DISTANCE && absY < SHOWCASE_TO_INTRO_DISTANCE) return;

    if (absX > absY) {
      if (!introVisible) return;
      turnSlide(dx < 0 ? 'next' : 'prev');
      return;
    }

    if (introVisible && dy < -INTRO_TO_SHOWCASE_DISTANCE) {
      enterShowcase();
      return;
    }

    if (!introVisible && dy > SHOWCASE_TO_INTRO_DISTANCE) {
      backToIntro();
    }
  }

  function onPointerDown(evt) {
    if (evt.pointerType === 'mouse' && evt.button !== 0) return;
    tracking = true;
    activePointerId = evt.pointerId;
    startX = evt.clientX;
    startY = evt.clientY;
    startTime = Date.now();
    // Don't capture mouse pointers — capturing mouse can prevent click events
    if (evt.pointerType !== 'mouse') {
      rootEl?.setPointerCapture?.(evt.pointerId);
    }
  }

  function onPointerMove(evt) {
    if (!tracking) return;
    let clientX = evt.clientX;
    let clientY = evt.clientY;
    if (evt.type && evt.type.startsWith('touch')) {
      const t = (evt.touches && evt.touches[0]) || (evt.changedTouches && evt.changedTouches[0]);
      if (!t) return;
      if (activeTouchId !== null && t.identifier !== activeTouchId) return;
      clientX = t.clientX;
      clientY = t.clientY;
    } else {
      if (activePointerId !== null && evt.pointerId !== activePointerId) return;
    }

    // detect early downward swipe on showcase to return
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (!introVisible && Math.abs(dy) > Math.abs(dx) && dy > SHOWCASE_TO_INTRO_DISTANCE) {
      const scTop = (rootEl && rootEl.scrollTop) || 0;
      if (scTop <= 8 || startY < 120) {
        backToIntro();
        tracking = false;
        if (!evt.type || !evt.type.startsWith('touch')) {
          try { rootEl?.releasePointerCapture?.(evt.pointerId); } catch (e) {}
        }
      }
    }
  }

  function onPointerEnd(evt) {
    if (!tracking) return;
    if (activePointerId !== null && evt.pointerId !== activePointerId) return;
    tracking = false;
    activePointerId = null;

    handleSwipe(evt.clientX - startX, evt.clientY - startY, Date.now() - startTime);
  }

  function onPointerCancel() {
    tracking = false;
    activePointerId = null;
  }

  function onTouchStart(evt) {
    if (!evt.touches || evt.touches.length === 0) return;
    const touch = evt.touches[0];
    tracking = true;
    activeTouchId = touch.identifier;
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  }

  function onTouchEnd(evt) {
    if (!tracking) return;
    tracking = false;

    const touch = Array.from(evt.changedTouches || []).find((item) => item.identifier === activeTouchId);
    activeTouchId = null;
    if (!touch) return;

    handleSwipe(touch.clientX - startX, touch.clientY - startY, Date.now() - startTime);
  }

  function onTouchCancel() {
    tracking = false;
    activeTouchId = null;
  }

  function onWheel(evt) {
    const now = Date.now();
    if (now < wheelLockUntil) return;

    const absX = Math.abs(evt.deltaX);
    const absY = Math.abs(evt.deltaY);

    if (introVisible && absX > absY && absX > 40) {
      turnSlide(evt.deltaX > 0 ? 'next' : 'prev');
      wheelLockUntil = now + 420;
      return;
    }

    if (absY <= absX) return;

    if (introVisible && evt.deltaY > 40) {
      enterShowcase();
      wheelLockUntil = now + 520;
      return;
    }

    if (!introVisible && evt.deltaY < -40 && (rootEl?.scrollTop || 0) <= 2) {
      backToIntro();
      wheelLockUntil = now + 520;
    }
  }

  function onKeyDown(evt) {
    const targetTag = evt.target?.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

    if (evt.key === 'ArrowLeft') {
      if (!introVisible) return;
      evt.preventDefault();
      turnSlide('prev');
      return;
    }

    if (evt.key === 'ArrowRight') {
      if (!introVisible) return;
      evt.preventDefault();
      turnSlide('next');
      return;
    }

    if (evt.key === 'ArrowDown') {
      if (!introVisible) return;
      evt.preventDefault();
      enterShowcase();
      return;
    }

    if (evt.key === 'ArrowUp') {
      if (introVisible || (rootEl?.scrollTop || 0) > 2) return;
      evt.preventDefault();
      backToIntro();
    }
  }

  const gestureTarget = document;
  gestureTarget.addEventListener('pointerdown', onPointerDown, true);
  gestureTarget.addEventListener('pointermove', onPointerMove, true);
  gestureTarget.addEventListener('pointerup', onPointerEnd, true);
  gestureTarget.addEventListener('pointercancel', onPointerCancel, true);
  // touch listeners use capture and are non-passive so we can intercept swipes
  gestureTarget.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
  gestureTarget.addEventListener('touchmove', onPointerMove, { passive: false, capture: true });
  gestureTarget.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
  gestureTarget.addEventListener('touchcancel', onTouchCancel, { passive: false, capture: true });
  gestureTarget.addEventListener('wheel', onWheel, { passive: true, capture: true });
  window.addEventListener('keydown', onKeyDown);

  syncTabUi();
  syncSlideUi();
  syncIntroUi();

  function onShowcaseBackClick(e) {
    e.stopPropagation();
    backToIntro();
  }
  // create a fixed back button for the showcase (so it doesn't slide with intro)
  showcaseBackBtn = document.createElement('button');
  showcaseBackBtn.className = 'intro-back-btn';
  showcaseBackBtn.setAttribute('aria-label', '回到主页');
  showcaseBackBtn.title = '回到主页';
  showcaseBackBtn.textContent = '⤴';
  showcaseBackBtn.style.display = introVisible ? 'none' : 'flex';
  rootEl?.appendChild(showcaseBackBtn);
  showcaseBackBtn.addEventListener('click', onShowcaseBackClick);

  return () => {
    gestureTarget.removeEventListener('pointerdown', onPointerDown, true);
    gestureTarget.removeEventListener('pointermove', onPointerMove, true);
    gestureTarget.removeEventListener('pointerup', onPointerEnd, true);
    gestureTarget.removeEventListener('pointercancel', onPointerCancel, true);
    gestureTarget.removeEventListener('touchstart', onTouchStart, { capture: true });
    gestureTarget.removeEventListener('touchmove', onPointerMove, { capture: true });
    gestureTarget.removeEventListener('touchend', onTouchEnd, { capture: true });
    gestureTarget.removeEventListener('touchcancel', onTouchCancel, { capture: true });
    gestureTarget.removeEventListener('wheel', onWheel, { capture: true });
    window.removeEventListener('keydown', onKeyDown);
    showcaseBackBtn?.removeEventListener('click', onShowcaseBackClick);
    showcaseBackBtn?.remove();
    container.innerHTML = '';
  };
}
