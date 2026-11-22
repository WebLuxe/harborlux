/* =========================================================
   Doorgesh — shared site script
   ========================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;
  var safePlay = function (v) { try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} };

  document.documentElement.classList.add("js");

  /* ---------- nav: solid backdrop once scrolled ---------- */
  var nav = $(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("solid", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- reveal on scroll ---------- */
  var rev = $$("[data-reveal]");
  if (!IO || reduce) rev.forEach(function (el) { el.classList.add("in"); });
  else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    rev.forEach(function (el) { ro.observe(el); });
  }

  /* ---------- lazy looping clips: load + play in view, pause out of view ---------- */
  var clips = $$("video[data-src]");
  if (clips.length) {
    var load = function (v) { if (!v.getAttribute("src")) { v.src = v.dataset.src; v.load(); } };
    if (!IO) clips.forEach(function (v) { load(v); if (!reduce) safePlay(v); });
    else {
      var vo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) { load(v); if (!reduce) safePlay(v); }
          else if (!v.paused) v.pause();
        });
      }, { rootMargin: "200px 0px", threshold: 0.01 });
      clips.forEach(function (v) { vo.observe(v); });
    }
  }

  /* ---------- counters ---------- */
  var nums = $$("[data-count]");
  var count = function (el) {
    var to = +el.dataset.count, t0 = 0, dur = 1400;
    if (reduce) { el.textContent = to; return; }
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!IO) nums.forEach(count);
  else {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { co.observe(n); });
  }

  /* ---------- rain sections: two-video crossfade loop over the first 3.6 s ---------- */
  $$("[data-rain]").forEach(function (box) {
    if (reduce) return;
    var src = box.dataset.rain, vids = $$("video", box), active = -1, LOOP = 3.6, LEAD = 0.75, running = false;
    if (vids.length < 2) return;
    var on = function (i) { var v = vids[i]; try { v.currentTime = 0; } catch (e) {} safePlay(v); v.classList.add("on"); };
    vids.forEach(function (v, i) {
      v.addEventListener("timeupdate", function () {
        if (i !== active || !running) return;
        if (v.currentTime >= LOOP - LEAD) {
          var n = 1 - i; active = n; on(n); v.classList.remove("on");
          setTimeout(function () { if (active !== i) v.pause(); }, 800);
        }
      });
    });
    var start = function () {
      if (!vids[0].getAttribute("src")) vids.forEach(function (v) { v.src = src; v.load(); });
      running = true;
      if (active < 0) { active = 0; on(0); } else safePlay(vids[active]);
    };
    var stop = function () { running = false; vids.forEach(function (v) { v.pause(); }); };
    if (!IO) start();
    else new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { rootMargin: "100px 0px" }).observe(box);
  });

  /* ---------- work: filters + detail modal ---------- */
  var filters = $(".filters");
  if (filters) {
    var cards = $$(".pcard");
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", filters).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      var f = b.dataset.f;
      cards.forEach(function (c) {
        var show = f === "all" || c.dataset.cat.split(" ").indexOf(f) > -1;
        c.hidden = !show;
        c.classList.toggle("wide", show && f === "all" && c.dataset.wide === "1");
      });
    });
  }
  var modal = $("#modal");
  if (modal && modal.showModal) {
    var mMedia = $(".modal__media", modal), mTag = $(".modal__tag", modal), mTitle = $(".modal__title", modal),
        mText = $(".modal__text", modal), mUses = $(".modal__uses", modal);
    $$(".pcard").forEach(function (c) {
      c.addEventListener("click", function () {
        var art = $(".pcard__art", c).firstElementChild, m;
        if (art.tagName === "VIDEO") {
          m = document.createElement("video");
          m.muted = true; m.loop = true; m.playsInline = true; m.setAttribute("playsinline", "");
          m.poster = art.poster; m.src = art.dataset.src;
          if (!reduce) m.autoplay = true;
        } else {
          m = document.createElement("img");
          m.src = art.currentSrc || art.src; m.alt = "";
        }
        mMedia.innerHTML = ""; mMedia.appendChild(m);
        mTag.textContent = c.dataset.tagline;
        mTitle.textContent = $("h3", c).textContent;
        mText.innerHTML = $("template", c).innerHTML;
        mUses.innerHTML = "";
        c.dataset.uses.split("|").forEach(function (u) { var li = document.createElement("li"); li.textContent = u; mUses.appendChild(li); });
        modal.showModal();
      });
    });
    var close = function () { modal.close(); };
    $(".modal__x", modal).addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    modal.addEventListener("close", function () { var v = $("video", mMedia); if (v) v.pause(); });
  }

  /* ---------- about: photo deck ---------- */
  var deck = $("#deckCards");
  if (deck) {
    var cs = $$(".card", deck), count2 = $("#deckCount"), n = cs.length, top = 0;
    var pad = function (x) { return (x < 10 ? "0" : "") + x; };
    var lay = function () {
      cs.forEach(function (c, i) {
        var d = (i - top + n) % n;
        c.style.zIndex = n - d;
        c.style.opacity = d > 3 ? 0 : 1;
        c.style.transform = d === 0 ? "none" : "translate(" + (d * 14) + "px," + (d * -10) + "px) rotate(" + (d * 3.2) + "deg) scale(" + (1 - d * 0.04) + ")";
        c.setAttribute("aria-hidden", d !== 0);
      });
      count2.textContent = pad(top + 1) + " / " + pad(n);
    };
    var next = function () { top = (top + 1) % n; lay(); };
    var prev = function () { top = (top - 1 + n) % n; lay(); };
    $("#deckNext").addEventListener("click", next);
    $("#deckPrev").addEventListener("click", prev);
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });
    cs.forEach(function (c, i) {
      var sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
      c.addEventListener("pointerdown", function (e) {
        if (i !== top) return;
        drag = true; sx = e.clientX; sy = e.clientY; dx = dy = 0;
        c.setPointerCapture(e.pointerId); c.classList.add("dragging", "raw");
      });
      c.addEventListener("pointermove", function (e) {
        if (!drag) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        c.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + dx * 0.06 + "deg)";
      });
      var up = function () {
        if (!drag) return;
        drag = false; c.classList.remove("dragging", "raw");
        if (Math.abs(dx) > 90 || Math.abs(dy) > 120) {
          c.style.transform = "translate(" + dx * 3 + "px," + dy * 3 + "px) rotate(" + dx * 0.15 + "deg)";
          c.style.opacity = 0;
          setTimeout(next, 260);
        } else lay();
      };
      c.addEventListener("pointerup", up);
      c.addEventListener("pointercancel", up);
    });
    lay();
  }

  /* ---------- sound: playable kit + scope ---------- */
  var kit = $("#kit");
  if (kit) {
    var ac, master, analyser, noiseBuf;
    var audio = function () {
      if (ac) { if (ac.state === "suspended") ac.resume(); return ac; }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      var comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
      master = ac.createGain(); master.gain.value = 0.8;
      analyser = ac.createAnalyser(); analyser.fftSize = 2048;
      master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ac;
    };
    var env = function (g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
    var noise = function (t, dur) { var s = ac.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 0.5); s.stop(t + dur); return s; };
    var V = {
      kick: function (t) { var o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35); env(g, t, 0.002, 1, 0.5); o.connect(g).connect(master); o.start(t); o.stop(t + 0.6); },
      snare: function (t) { var n = noise(t, 0.25), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "highpass"; f.frequency.value = 1200; env(g, t, 0.002, 0.7, 0.2); n.connect(f).connect(g).connect(master);
        var o = ac.createOscillator(), g2 = ac.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.1); env(g2, t, 0.002, 0.5, 0.12); o.connect(g2).connect(master); o.start(t); o.stop(t + 0.2); },
      hat: function (t) { var n = noise(t, 0.08), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = "highpass"; f.frequency.value = 7500; env(g, t, 0.001, 0.35, 0.05); n.connect(f).connect(g).connect(master); },
      clap: function (t) { var f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.8; f.connect(master);
        [0, 0.012, 0.024, 0.04].forEach(function (d, i) { var n = noise(t + d, 0.2), g = ac.createGain(); env(g, t + d, 0.001, i === 3 ? 0.8 : 0.5, i === 3 ? 0.16 : 0.02); n.connect(g).connect(f); }); },
      bass: function (t) { var o = ac.createOscillator(), g = ac.createGain(), sh = ac.createWaveShaper(), c = new Float32Array(256); for (var i = 0; i < 256; i++) c[i] = Math.tanh((i / 128 - 1) * 2.4); sh.curve = c;
        o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); env(g, t, 0.004, 0.9, 0.9); o.connect(sh).connect(g).connect(master); o.start(t); o.stop(t + 1.1); },
      zap: function (t) { var o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.3); f.type = "lowpass"; f.frequency.value = 3200; env(g, t, 0.002, 0.35, 0.28); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.35); }
    };
    var pads = $$(".pad", kit), byKey = {}, byV = {}, pulse = $(".kit-pulse");
    pads.forEach(function (p) { byKey[p.dataset.key] = p; byV[p.dataset.v] = p; });
    var flash = function (p) {
      p.classList.remove("hit"); void p.offsetWidth; p.classList.add("hit");
      clearTimeout(p._t); p._t = setTimeout(function () { p.classList.remove("hit"); }, 110);
      if (pulse && !reduce && (p.dataset.v === "kick" || p.dataset.v === "bass")) { pulse.classList.remove("go"); void pulse.offsetWidth; pulse.classList.add("go"); }
    };
    var hit = function (p) { audio(); V[p.dataset.v](ac.currentTime + 0.005); flash(p); };
    pads.forEach(function (p) {
      p.addEventListener("pointerdown", function (e) { e.preventDefault(); hit(p); });
      p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hit(p); } });
    });
    window.addEventListener("keydown", function (e) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
      var p = byKey[e.key.toLowerCase()]; if (p) hit(p);
    });

    var PAT = { kick: [0, 3, 8, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15], clap: [12], bass: [0, 7, 10], zap: [14] };
    var playBtn = $("#beat"), playing = false, step = 0, nextT = 0, timer = 0;
    var schedule = function () {
      var spb = 60 / 96 / 4;
      while (nextT < ac.currentTime + 0.12) {
        for (var v in PAT) if (PAT[v].indexOf(step) > -1) {
          V[v](nextT);
          (function (p, at) { setTimeout(function () { flash(p); }, Math.max(0, (at - ac.currentTime) * 1000)); })(byV[v], nextT);
        }
        nextT += spb; step = (step + 1) % 16;
      }
    };
    playBtn.addEventListener("click", function () {
      audio(); playing = !playing;
      playBtn.setAttribute("aria-pressed", playing);
      $("span", playBtn).textContent = playing ? "Stop the beat" : "Play a beat";
      if (playing) { step = 0; nextT = ac.currentTime + 0.05; timer = setInterval(schedule, 25); } else clearInterval(timer);
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden && playing) playBtn.click(); });

    var cv = $("#scope"), ctx = cv.getContext("2d"), lvl = $("#scopeLvl");
    var W = 1, H = 1, buf, ph = 0, vis = true, raf = 0;
    var size = function () { var d = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth || 1; H = cv.clientHeight || 1; cv.width = W * d | 0; cv.height = H * d | 0; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(cv); else window.addEventListener("resize", size);
    var frame = function () {
      ph += 0.03;
      ctx.fillStyle = "rgba(10,8,32,.4)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1; ctx.beginPath();
      for (var i = 1; i < 10; i++) { var x = (W * i / 10 | 0) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (var j = 1; j < 6; j++) { var y = (H * j / 6 | 0) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      var n = Math.ceil(W / 2) + 1, ys = new Float32Array(n), peak = 0;
      if (analyser) {
        if (!buf) buf = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buf);
        var z = 0; for (var k0 = 1; k0 < buf.length / 2; k0++) if (buf[k0 - 1] < 0 && buf[k0] >= 0) { z = k0; break; }
        for (var k = 0; k < n; k++) { var v = buf[z + (k * (buf.length / 2) / n | 0)] || 0; ys[k] = v; peak = Math.max(peak, Math.abs(v)); }
      }
      var idle = peak < 0.01;
      if (idle) for (var q = 0; q < n; q++) ys[q] = Math.sin(q * 0.045 + ph) * 0.04 + Math.sin(q * 0.013 - ph * 0.6) * 0.03;
      var grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#F7C9D0"); grad.addColorStop(0.5, "#D9B8F2"); grad.addColorStop(1, "#9FB6FF");
      ctx.beginPath();
      for (var m = 0; m < n; m++) { var px = m * 2, py = H / 2 - ys[m] * H * 0.42; m ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.strokeStyle = grad; ctx.lineWidth = idle ? 1.5 : 2.4; ctx.shadowColor = "rgba(242,184,192,.8)"; ctx.shadowBlur = idle ? 6 : 16;
      ctx.stroke(); ctx.shadowBlur = 0;
      lvl.textContent = idle ? "idle" : (20 * Math.log10(peak)).toFixed(1) + " dB";
      if (vis) raf = requestAnimationFrame(frame);
    };
    if (IO) new IntersectionObserver(function (es) {
      vis = es[0].isIntersecting; cancelAnimationFrame(raf); if (vis) raf = requestAnimationFrame(frame);
    }).observe(cv);
    else raf = requestAnimationFrame(frame);
  }

  /* ---------- contact form (opens the visitor's mail app) ---------- */
  var form = $("#form");
  if (form) {
    var EMAIL = "buildyourdreamwebsitedotcom@gmail.com";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form, note = $("#note"), ok = /^\S+@\S+\.\S+$/;
      var name = f.elements.name.value.trim(), email = f.elements.email.value.trim(), msg = f.elements.msg.value.trim(), type = f.elements.type.value;
      if (!name || !ok.test(email) || !msg) {
        note.className = "form__note err";
        note.textContent = !name ? "Add your name." : !ok.test(email) ? "That email doesn't look right." : "Write a short message.";
        (!name ? f.elements.name : !ok.test(email) ? f.elements.email : f.elements.msg).focus();
        return;
      }
      location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(type + " enquiry from " + name) +
        "&body=" + encodeURIComponent(msg + "\n\n" + name + " (" + email + ")");
      note.className = "form__note"; note.textContent = "Opening your mail app…";
    });
  }
})();
