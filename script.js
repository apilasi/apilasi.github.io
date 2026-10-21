(() => {
  'use strict';
  const envelope = document.querySelector('#envelope');
  const openLink = document.querySelector('#open-link');
  const noButton = document.querySelector('#no-button');
  const choices = document.querySelector('#choices');
  let escapes = 0;
  let noBecameYes = false;
  const overlay = document.querySelector('#overlay');
  const closeButton = document.querySelector('#close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = 'closed';
  let audio;
  let lastFocus;
  let timers = [];
  const later = (callback, delay) => timers.push(window.setTimeout(callback, delay));
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('selectstart', event => event.preventDefault());
  document.addEventListener('dragstart', event => event.preventDefault());

  // Keep the layout hidden until local fonts settle, then reveal it in order.
  const loadingScreen = document.querySelector('#loading-screen');
  const wordHeart = document.querySelector('#word-heart');
  const pageHeader = document.querySelector('header');
  const pageMain = document.querySelector('main');
  pageHeader.inert = true;
  pageMain.inert = true;
  // Sample a smooth heart by arc length: words stay evenly spaced on its outline.
  const contour = [];
  let perimeter = 0;
  const curves = [
    [[170,70],[130,5],[38,8],[25,82]],
    [[25,82],[5,151],[83,216],[170,280]],
    [[170,280],[257,216],[335,151],[315,82]],
    [[315,82],[302,8],[210,5],[170,70]]
  ];
  for (let index = 0; index <= 1000; index++) {
    const segment = Math.min(3, Math.floor(index / 250));
    const t = (index - segment * 250) / 250;
    const points = curves[segment];
    const cubic = axis => Math.pow(1-t,3)*points[0][axis] + 3*Math.pow(1-t,2)*t*points[1][axis] + 3*(1-t)*t*t*points[2][axis] + t*t*t*points[3][axis];
    const x = cubic(0);
    const y = cubic(1);
    if (index) perimeter += Math.hypot(x - contour[index - 1].x, y - contour[index - 1].y);
    contour.push({x, y, distance: perimeter});
  }
  for (let index = 0; index < 28; index++) {
    const point = contour.find(point => point.distance >= perimeter * index / 28);
    const word = document.createElement('span');
    word.textContent = 'Полина';
    word.style.cssText = `--x:${point.x}px;--y:${point.y}px;--word-delay:${(index * .025).toFixed(3)}s`;
    word.dataset.driftX = ((point.x - 170) * .48).toFixed(1);
    word.dataset.driftY = ((point.y - 150) * .4 - 22).toFixed(1);
    wordHeart.append(word);
  }
  const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.all([
    Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 4000))]),
    new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 100 : 2600))
  ]).then(async () => {
    // Crossfade the heart and the card together, on the same background.
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    loadingScreen.classList.add('is-dissolving');
    if (!reducedMotion.matches) {
      const dissolving = [...wordHeart.children].map((word, index) => {
        word.style.animation = 'none';
        const driftX = word.dataset.driftX;
        const driftY = word.dataset.driftY;
        const animation = word.animate([
          {opacity:1, filter:'blur(0px)', transform:'translate(-50%, -50%) scale(1)'},
          {opacity:.65, filter:'blur(1px)', offset:.35},
          {opacity:0, filter:'blur(8px)', transform:`translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) scale(1.16) rotate(${index % 2 ? 7 : -7}deg)`}
        ], {duration:1700, delay:(index % 7) * 45, easing:'cubic-bezier(.25,.1,.25,1)', fill:'both'});
        return animation.finished;
      });
      await Promise.all(dissolving);
    }
    loadingScreen.classList.add('is-finished');
    pageHeader.inert = false;
    pageMain.inert = false;
    setTimeout(() => { loadingScreen.hidden = true; }, reducedMotion.matches ? 0 : 300);
  });

  // All sounds are synthesized locally; audio starts only after a user gesture.
  function getAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      audio ||= new AudioContext();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      return audio;
    } catch { return null; }
  }
  function chime() {
    const ctx = getAudio();
    if (!ctx) return;
    [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99].forEach((frequency, index) => {
      const start = ctx.currentTime + index * .19;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.065, start + .025);
      gain.gain.exponentialRampToValueAtTime(.001, start + 1.6);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 1.7);
    });
  }
  function paper() {
    const ctx = getAudio();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * .6, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .2;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass'; filter.frequency.value = 1600; filter.Q.value = .6;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(.14, ctx.currentTime + .12);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .6);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }
  function celebrate() {
    if (reducedMotion.matches) return;
    const container = document.querySelector('#confetti');
    container.replaceChildren();
    const colors = ['#c58a92', '#dec59f', '#f1d9be', '#ac707e', '#b8a18d'];
    for (let i = 0; i < 55; i++) {
      const petal = document.createElement('i');
      petal.className = `petal${i % 3 === 0 ? ' spark' : ''}`;
      petal.style.cssText = `--x:${Math.random()*100}%;--size:${4+Math.random()*7}px;--color:${colors[i%colors.length]};--time:${4+Math.random()*4}s;--delay:${Math.random()*1.5}s;--drift:${Math.random()*200-100}px;--spin:${Math.random()*800-400}deg`;
      container.append(petal);
    }
    later(() => container.replaceChildren(), 10000);
  }
  function open() {
    if (state !== 'closed') return;
    state = 'opening';
    lastFocus = document.activeElement;
    getAudio();
    paper();
    document.body.classList.add('opening');
    envelope.setAttribute('aria-expanded', 'true');
    envelope.disabled = true;
    openLink.disabled = true;
    later(() => {
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      document.querySelector('header').inert = true;
      document.querySelector('main').inert = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.add('visible');
        state = 'open';
        closeButton.focus({preventScroll:true});
        chime();
        celebrate();
      }));
    }, reducedMotion.matches ? 0 : 950);
  }
  function close() {
    if (state !== 'open') return;
    state = 'closing';
    timers.forEach(clearTimeout); timers = [];
    document.querySelector('#confetti').replaceChildren();
    overlay.classList.remove('visible');
    paper();
    later(() => {
      overlay.hidden = true;
      document.body.classList.add('closing-envelope');
      document.body.classList.remove('opening');
      document.body.style.overflow = '';
      document.querySelector('header').inert = false;
      document.querySelector('main').inert = false;
      later(() => {
        document.body.classList.remove('closing-envelope');
        envelope.setAttribute('aria-expanded','false');
        envelope.disabled = false;
        openLink.disabled = false;
        state = 'closed';
        (lastFocus || envelope).focus({preventScroll:true});
      }, reducedMotion.matches ? 0 : 1350);
    }, reducedMotion.matches ? 0 : 500);
  }
  envelope.addEventListener('click', open);
  openLink.addEventListener('click', open);
  function dodge(event) {
    if (state !== 'closed') return;
    if (noBecameYes) { if (event.type === 'click') open(); return; }
    escapes++;
    if (escapes >= 3) {
      noBecameYes = true;
      noButton.classList.remove('choice-no');
      noButton.classList.add('choice-converted');
      noButton.textContent = 'даа';
      const heart = document.createElement('span');
      heart.textContent = '♡';
      heart.setAttribute('aria-hidden', 'true');
      noButton.append(' ', heart);
      noButton.style.left = '';
      noButton.style.top = '';
      noButton.style.transform = '';
      return;
    }
    const scale = Math.max(.28, Math.pow(.85, escapes));
    const bounds = choices.getBoundingClientRect();
    const yes = openLink.getBoundingClientRect();
    const width = noButton.offsetWidth * scale;
    const height = noButton.offsetHeight * scale;
    const pointerX = event.clientX || bounds.left + bounds.width / 2;
    const pointerY = event.clientY || bounds.top;
    let best = null;
    for (let i = 0; i < 32; i++) {
      const x = 6 + Math.random() * Math.max(0, bounds.width - width - 12);
      const y = 6 + Math.random() * Math.max(0, bounds.height - height - 12);
      if (bounds.left + x < yes.right + 12 && bounds.left + x + width > yes.left - 12 && bounds.top + y < yes.bottom + 12 && bounds.top + y + height > yes.top - 12) continue;
      const distance = Math.hypot(bounds.left + x + width / 2 - pointerX, bounds.top + y + height / 2 - pointerY);
      if (!best || distance > best.distance) best = {x,y,distance};
    }
    if (best) {
      noButton.style.left = `${best.x}px`;
      noButton.style.top = `${best.y}px`;
    }
    noButton.style.transform = `scale(${scale}) rotate(${escapes % 2 ? -7 : 7}deg)`;
  }
  noButton.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') dodge(event); });
  noButton.addEventListener('click', event => {
    if (noBecameYes) { open(); return; }
    // A mouse already triggers pointerenter; do not count its click twice.
    if (event.pointerType === 'mouse' && event.detail > 0) return;
    dodge(event);
  });
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (state !== 'open') return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      e.preventDefault();
      closeButton.focus();
    }
  });
  const stars = document.querySelector('.stars');
  for (let i = 0; i < 24; i++) {
    const star = document.createElement('i');
    star.className = 'star';
    const size = 1 + Math.random() * 1.8;
    star.style.cssText = `left:${Math.random()*100}%;top:${15+Math.random()*80}%;width:${size}px;height:${size}px;--duration:${3+Math.random()*5}s;animation-delay:-${Math.random()*8}s`;
    stars.append(star);
  }
})();

