import { BUILDINGS_CONFIG } from '../config/buildings.js';
import { buildCardResource, PLACEHOLDER_IMAGE } from '../lib/cloudResolver.js';

const INTRO_SLIDES = [
  {
    title: '像素中航大',
    subtitle: '用科技传承百年文脉，让南开在虚拟世界中重新绽放',
    bg: 'cloud://cloudbase-3gbf3fip28cb9f0b.636c-cloudbase-3gbf3fip28cb9f0b-1371154534/cards/主教学楼.webp'
  },
  {
    title: '关于我们的项目',
    content:
      '欢迎来到“像素南开”！我们是一支由21名来自南开大学各个学院的本科生组成的团队，用现代科技为百年南开注入了新的活力。\n\n我们想向那些因地域限制无法来到南开的人们分享南开的景色，传递南开的精神。',
    bg: 'cloud://cloudbase-3gbf3fip28cb9f0b.636c-cloudbase-3gbf3fip28cb9f0b-1371154534/cards/第二主教学楼.webp'
  },
  {
    title: '我们做了什么',
    content:
      '完整复原八里台校区，开发 AI 智能导览系统，构建校史知识库，提供观光路线、明信片等沉浸式体验。',
    bg: 'cloud://cloudbase-3gbf3fip28cb9f0b.636c-cloudbase-3gbf3fip28cb9f0b-1371154534/cards/海冰楼.webp'
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
      <img class="intro-bg" src="${PLACEHOLDER_IMAGE}" alt="intro" />
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
          <p class="logo-kicker">VOXEL NKU</p>
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
  let wheelLockUntil = 0;

  const SWIPE_DISTANCE = 48;
  const SWIPE_MAX_DURATION = 700;

  function onPointerDown(evt) {
    if (evt.pointerType === 'mouse' && evt.button !== 0) return;
    tracking = true;
    startX = evt.clientX;
    startY = evt.clientY;
    startTime = Date.now();
  }

  function onPointerEnd(evt) {
    if (!tracking) return;
    tracking = false;

    const elapsed = Date.now() - startTime;
    if (elapsed > SWIPE_MAX_DURATION) return;

    const dx = evt.clientX - startX;
    const dy = evt.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < SWIPE_DISTANCE && absY < SWIPE_DISTANCE) return;

    if (absX > absY) {
      if (!introVisible) return;
      turnSlide(dx < 0 ? 'next' : 'prev');
      return;
    }

    if (introVisible && dy < -SWIPE_DISTANCE) {
      enterShowcase();
      return;
    }

    if (!introVisible && dy > SWIPE_DISTANCE && (rootEl?.scrollTop || 0) <= 2) {
      backToIntro();
    }
  }

  function onPointerCancel() {
    tracking = false;
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

  rootEl?.addEventListener('pointerdown', onPointerDown);
  rootEl?.addEventListener('pointerup', onPointerEnd);
  rootEl?.addEventListener('pointercancel', onPointerCancel);
  rootEl?.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  syncTabUi();
  syncSlideUi();
  syncIntroUi();

  return () => {
    rootEl?.removeEventListener('pointerdown', onPointerDown);
    rootEl?.removeEventListener('pointerup', onPointerEnd);
    rootEl?.removeEventListener('pointercancel', onPointerCancel);
    rootEl?.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    container.innerHTML = '';
  };
}
