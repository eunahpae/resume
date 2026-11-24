(function () {
  'use strict';

  // ── Footer year ──
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Scroll reveal ──
  var revealEls = document.querySelectorAll('[data-reveal]');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function (el) { revealObserver.observe(el); });

  // ── Timeline node highlight ──
  var timelineItems = document.querySelectorAll('.timeline-item');
  var timelineObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.4 });
  timelineItems.forEach(function (el) { timelineObserver.observe(el); });

  // ── Progress bar + timeline fill (scroll-driven) ──
  var progressBar = document.getElementById('progressBar');
  var timeline = document.getElementById('timeline');
  var timelineProgress = document.getElementById('timelineProgress');

  function onScroll() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';

    if (timeline && timelineProgress) {
      var rect = timeline.getBoundingClientRect();
      var viewportMid = window.innerHeight * 0.6;
      var ratio = (viewportMid - rect.top) / rect.height;
      ratio = Math.max(0, Math.min(1, ratio));
      timelineProgress.style.height = (ratio * 100) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Mobile nav toggle ──
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('is-open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('is-open'); });
    });
  }

  // ── Theme toggle (dark / light, persisted) ──
  var themeToggle = document.getElementById('themeToggle');
  var root = document.documentElement;
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme) root.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      // note: v2.css 가 OS 설정과 무관하게 밝은 화면을 기본으로 한다(2026-10-21 전환)
      var current = root.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ── Project detail modals ──
  var openModal = null;

  function showModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    openModal = modal;
  }
  function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (openModal === modal) openModal = null;
  }

  document.querySelectorAll('[data-modal-target]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      showModal(document.getElementById(trigger.getAttribute('data-modal-target')));
    });
  });
  document.querySelectorAll('.project-modal').forEach(function (modal) {
    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', function () { hideModal(modal); });
    });
  });

  // ── Lightbox (이미지 확대) ──
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');

  if (lightbox && lightboxImg) {
    document.querySelectorAll('.img-shot img').forEach(function (img) {
      img.addEventListener('click', function () {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
      });
    });
    lightbox.querySelectorAll('[data-lightbox-close]').forEach(function (el) {
      el.addEventListener('click', function () {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        if (!openModal) document.body.classList.remove('modal-open');
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lightbox && lightbox.classList.contains('is-open')) {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      if (!openModal) document.body.classList.remove('modal-open');
    } else if (openModal) {
      hideModal(openModal);
    }
  });

  // ── 메일 주소 복사 (문의는 메일로 받는다 - GitHub Pages 에서는 서버 폼이 안 돈다) ──
  var copyBtn = document.getElementById('copyMail');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var st = document.getElementById('copyStatus'), tm, done = function (t) { if (!st) return; st.textContent = t; clearTimeout(tm); tm = setTimeout(function () { st.textContent = ''; }, 2000); }; // note: 연달아 누르면 앞 타이머가 새 문구를 일찍 지우던 것
    if (navigator.clipboard) navigator.clipboard.writeText(copyBtn.getAttribute('data-mail')).then(function () { done('메일 주소를 복사했습니다.'); }, function () { done('복사하지 못했습니다. 주소를 직접 선택해 주세요.'); });
    else done('복사하지 못했습니다. 주소를 직접 선택해 주세요.');
  });

  // ── Contact form ──
  var form = document.getElementById('contactForm');
  if (!form) return;

  var submitBtn = document.getElementById('submitBtn');
  var btnLabel = submitBtn.querySelector('.btn-label');
  var statusEl = document.getElementById('formStatus');
  var defaultLabel = btnLabel.textContent;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(fieldId, message) {
    var el = form.querySelector('[data-error-for="' + fieldId + '"]');
    if (el) el.textContent = message || '';
  }

  function validate() {
    var ok = true;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var message = form.message.value.trim();

    setError('fName', ''); setError('fEmail', ''); setError('fMessage', '');

    if (!name) { setError('fName', '이름을 입력해주세요.'); ok = false; }
    if (!email) { setError('fEmail', '이메일을 입력해주세요.'); ok = false; }
    else if (!EMAIL_RE.test(email)) { setError('fEmail', '올바른 이메일 형식이 아닙니다.'); ok = false; }
    if (!message) { setError('fMessage', '문의 내용을 입력해주세요.'); ok = false; }

    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;
    if (!validate()) return;

    // Honeypot: 값이 채워져 있으면 봇으로 간주하고 조용히 성공 처리
    if (form.website.value.trim() !== '') {
      showStatus('success', '보냈습니다. 확인 후 답장드리겠습니다.');
      form.reset();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    btnLabel.textContent = '보내는 중...';
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    fetch('mail.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form))
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success) {
          showStatus('success', '보냈습니다. 확인 후 답장드리겠습니다.');
          form.reset();
        } else {
          showStatus('error', (data && data.message) || '보내지 못했습니다. 잠시 뒤 다시 시도하거나 메일로 보내 주세요.');
        }
      })
      .catch(function () {
        showStatus('error', '보내지 못했습니다. 잠시 뒤 다시 시도하거나 메일로 보내 주세요.');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        btnLabel.textContent = defaultLabel;
      });
  });

  function showStatus(type, text) {
    statusEl.textContent = text;
    statusEl.className = 'form-status ' + type;
  }
})();
