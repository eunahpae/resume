// V2 동작: 순서 지연값, 숫자 카운터, 커서 따라 빛나는 테두리, AI 흐름 켜기.
// 스크롤 이벤트는 쓰지 않는다(IntersectionObserver 만). 움직임 줄이기 설정이면 최종 상태로 바로.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 차례로 등장하는 요소에 순번(--i) 부여 - CSS 의 animation-delay 가 읽는다
  ['.hero-headline .w', '.hero-chips li', '.ai-workflow .flow-step'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) { el.style.setProperty('--i', i); });
  });

  function io(selector, onEnter, threshold) {
    var els = document.querySelectorAll(selector);
    if (!('IntersectionObserver' in window)) { els.forEach(onEnter); return; }
    var ob = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { onEnter(e.target); ob.unobserve(e.target); } });
    }, { threshold: threshold || 0.4 });
    els.forEach(function (el) { ob.observe(el); });
  }

  // 첫 화면 연출: 빈 흰 틀 위에 요청 쪽지가 떠 있다가(FLOAT_MS) 위에서부터 한 장씩 메뉴로 날아가 앉고,
  // 상단바 → 사이드바 → 오른쪽 화면 순으로 서비스가 조립된 뒤, 데모 커서가 메뉴를 눌러 화면 셋을 보여 준다.
  // 떠 있는 자리는 화면(.svc-screen) 기준 좌표 - 메뉴 칸의 원래 자리(offsetLeft/Top)에서 그 자리까지 거리를 --dx/--dy 로.
  // 단계는 클래스로만 남긴다(.is-nav / .is-top / .is-view) - 모양은 v2.css 의 HERO 절
  var slots = document.querySelector('.svc-slots'), mark = document.querySelector('.req-sentinel');
  var screen = slots && slots.closest('.svc-screen');
  // 화면 윗선 = 큰 제목 글자 윗선(위의 이름·직함 두 줄은 빼고). 제목 위치는 글꼴·폭에 따라 달라서 재서 --head-top 으로 넘긴다
  var media = document.querySelector('.hero-media'), headline = document.querySelector('.hero-headline'), heroText = document.querySelector('.hero-text');
  var alignTop = function () {
    if (!media || !headline || !heroText) return;
    if (window.innerWidth <= 1100) { media.style.removeProperty('--head-top'); return; }
    var cs = getComputedStyle(headline), lead = (parseFloat(cs.lineHeight) - parseFloat(cs.fontSize)) / 2 || 0;
    media.style.setProperty('--head-top', Math.round(headline.getBoundingClientRect().top - heroText.getBoundingClientRect().top + lead) + 'px');
  };
  alignTop();
  window.addEventListener('resize', alignTop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignTop);
  if (screen) {
    var FLOAT_MS = 3000; // 쪽지가 떠 있는 시간(요청 문장을 읽을 시간)
    var STEP = 140, FLY = 820; // 쪽지 사이 간격, 한 장이 나는 시간
    var hero = document.querySelector('.hero');
    var notes = [].slice.call(slots.querySelectorAll('.svc-note'));
    var groups = [].slice.call(slots.querySelectorAll('.svc-group'));
    var phase = 'wait', timers = [], cursor = null, cur = null;
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    notes.forEach(function (el, i) { el.style.setProperty('--i', i); });

    // 화면 전환. rows 면 새 화면의 줄이 위에서부터 채워진다
    var show = function (v, rows) {
      screen.setAttribute('data-v', v);
      if (!rows || reduce) return;
      screen.querySelectorAll('.svc-view[data-v="' + v + '"] tbody tr').forEach(function (tr, k) {
        tr.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: 200 + k * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
    };
    var finish = function () { // 움직임 없이 최종 상태로
      timers.forEach(clearTimeout); phase = 'done';
      if (hero) hero.classList.add('is-caught');
      notes.forEach(function (el) { el.classList.remove('is-float', 'is-fly'); });
      groups.forEach(function (g) { g.classList.add('on'); });
      slots.classList.remove('is-wait', 'is-placing'); slots.classList.add('is-done');
      screen.classList.add('is-nav', 'is-top', 'is-view'); show(0);
    };

    var place = function () {
      if (phase !== 'wait' && phase !== 'float') return;
      slots.classList.remove('is-wait'); slots.classList.add('is-placing');
      notes.forEach(function (el, i) {
        var col = i % 2, row = i >> 1;
        // note: 쪽지는 빈 틀 위에 두 줄로 엇갈려 뜬다. 글자 열(1440 폭에서 x 약 650 까지)을 가리지 않게 틀 왼쪽 밖으로는 96px 까지만(쪽지는 scale 1.6)
        var tx = -100 + col * 215 + (row % 2) * 14, ty = 10 + row * 84 + col * 42;
        el.style.setProperty('--dx', (tx - el.offsetLeft) + 'px');
        el.style.setProperty('--dy', (ty - el.offsetTop) + 'px');
        el.classList.add('is-float');
      });
      void slots.offsetHeight;
      requestAnimationFrame(function () { slots.classList.remove('is-placing'); });
      phase = 'float';
    };

    // 한 장: 곡선으로 날며 기울기가 풀리고 작아진다. 날아가는 도중 손글씨가 메뉴명으로, 쪽지 색이 점으로 바뀐다
    var fly = function (el) {
      var cs = getComputedStyle(el), drift = cs.translate === 'none' ? '0px 0px' : cs.translate;
      var dx = parseFloat(el.style.getPropertyValue('--dx')), dy = parseFloat(el.style.getPropertyValue('--dy')), r = parseFloat(cs.getPropertyValue('--r'));
      el.classList.add('is-fly'); el.classList.remove('is-float');
      var a = el.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r + 'deg) scale(1.6)', translate: drift },
        { transform: 'translate(' + dx * .4 + 'px,' + (dy * .4 - 34) + 'px) rotate(' + r * .3 + 'deg) scale(1.2)', offset: .5 },
        { transform: 'translate(0px,0px) rotate(0deg) scale(1)', translate: '0px 0px' }
      ], { duration: FLY, easing: 'cubic-bezier(.45,0,.15,1)' });
      el.querySelector('.req-ask').animate([{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0, offset: .65 }], { duration: FLY });
      el.querySelector('.req-done').animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], { duration: FLY });
      try { el.animate([{ transform: 'scale(0)' }, { transform: 'scale(0)', offset: .7 }, { transform: 'scale(1.6)', offset: .88 }, { transform: 'scale(1)' }],
        { duration: FLY + 120, pseudoElement: '::before' }); } catch (e) { /* note: pseudoElement 를 못 쓰는 브라우저는 점이 그냥 보인다 */ }
      a.onfinish = function () { el.classList.remove('is-fly'); };
      var g = groups[+el.getAttribute('data-g')];
      if (g) g.classList.add('on');
    };

    var land = function () {
      if (phase === 'wait') return finish(); // 글꼴을 못 받아 아직 안 떴으면 바로 최종
      if (phase !== 'float') return;
      phase = 'land';
      if (hero) hero.classList.add('is-caught');
      // 상단바(헤더) → 사이드바 → 쪽지가 메뉴로 → 오른쪽 화면
      var HEAD = 550; // 상단바가 다 나온 뒤 쪽지가 날기 시작
      screen.classList.add('is-top');
      later(function () { screen.classList.add('is-nav'); }, HEAD - 250);
      notes.forEach(function (el, i) { later(function () { fly(el); }, HEAD + i * STEP); });
      var t = HEAD + (notes.length - 1) * STEP + FLY;
      later(function () { screen.classList.add('is-view'); show(0, true); slots.classList.add('is-done'); phase = 'done'; }, t + 100);
      later(tour, t + 1800);
    };

    // 데모 커서: 회원 → 결제 → 운영 대표 메뉴를 차례로 누르고 사라진다
    var at = function (el) {
      var a = screen.getBoundingClientRect(), b = el.getBoundingClientRect();
      return [b.left - a.left + 40, b.top - a.top + b.height / 2 - 4];
    };
    var tf = function (p) { return 'translate(' + p[0] + 'px,' + p[1] + 'px)'; };
    var press = function (el, v) {
      cursor.animate([{ scale: '1' }, { scale: '.8' }, { scale: '1' }], { duration: 260 });
      screen.insertAdjacentHTML('beforeend', '<i class="svc-ripple"></i>');
      var rp = screen.lastElementChild; rp.style.left = cur[0] + 'px'; rp.style.top = cur[1] + 'px';
      rp.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 480, easing: 'ease-out' }).onfinish = function () { rp.remove(); };
      el.classList.add('is-press'); later(function () { el.classList.remove('is-press'); }, 220);
      show(v, true);
    };
    var tour = function () {
      if (reduce) return;
      screen.insertAdjacentHTML('beforeend', '<svg class="svc-cursor" viewBox="0 0 18 22" aria-hidden="true"><path d="M2 1.5v16.2l4.3-4.1 2.9 6.6 2.7-1.2-2.9-6.5H15z"/></svg>');
      cursor = screen.lastElementChild;
      cur = [screen.clientWidth * .6, screen.clientHeight * .75];
      cursor.animate([{ transform: tf(cur), opacity: 0 }, { transform: tf(cur), opacity: 1 }], { duration: 300, fill: 'forwards' });
      var t = 400;
      [1, 2, 0].forEach(function (v) {
        var el = slots.querySelector('[data-pick="' + v + '"]');
        later(function () {
          var p = at(el);
          cursor.animate([{ transform: tf(cur), opacity: 1 }, { transform: tf(p), opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' });
          cur = p;
        }, t);
        later(function () { press(el, v); }, t + 820);
        t += 3000;
      });
      later(hideCursor, t - 1600);
    };
    var hideCursor = function () {
      if (!cursor) return;
      var c = cursor; cursor = null;
      c.animate([{ transform: tf(cur), opacity: 1 }, { transform: tf(cur), opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = function () { c.remove(); };
    };

    slots.addEventListener('click', function (e) {
      var li = e.target.closest('.svc-note');
      if (!li || phase !== 'done') return;
      timers.forEach(clearTimeout); hideCursor(); // 방문자가 직접 누르면 투어는 멈춘다
      show(li.getAttribute('data-g'), true);
    });

    if (reduce || window.innerWidth < 1100 || !mark || !('IntersectionObserver' in window) || !screen.animate) finish();
    else {
      slots.classList.add('is-wait');
      // note: 손글씨 글꼴을 받은 뒤에 띄운다(글꼴이 바뀌면 쪽지 줄바꿈이 달라짐). 안 오면 0.8초 뒤 그냥 띄운다
      var go = function () { if (phase === 'wait') place(); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
      setTimeout(go, 800);
      window.addEventListener('resize', function () { if (phase === 'float') place(); });
      new IntersectionObserver(function (es) { if (!es[0].isIntersecting) land(); }).observe(mark);
      later(land, FLOAT_MS);
    }
  }

  // 숫자 카운터: data-count 까지 올라간다
  io('.stat-num[data-count]', function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    var out = el.querySelector('.n');
    if (reduce || !out) { if (out) out.textContent = end; return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      out.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  // AI 흐름: 화면에 들어오면 단계가 차례로 켜진다
  io('.ai-workflow .flow-diagram', function (el) { el.classList.add('is-on'); }, 0.5);

  // 카드 테두리 빛: 포인터 위치를 CSS 변수로
  if (!reduce) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.case-card, .bundle-card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
})();
