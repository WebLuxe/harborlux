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

  /* ---------- headings rise word by word (split into masked words) ---------- */
  if (!reduce) {
    $$("main .h1, main .h2, main .h3, .site__body h3").forEach(function (h) {
      if (h.closest(".hero")) return;
      var i = 0;
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
              var wd = document.createElement("span"), wi = document.createElement("span");
              wd.className = "wd"; wi.className = "wi"; wi.style.setProperty("--i", i++); wi.textContent = p;
              wd.appendChild(wi); frag.appendChild(wd);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== "BR") {
            if (n.classList.contains("hl")) n.classList.add("sh-hl");
            walk(n);
          }
        });
      };
      if (!h.getAttribute("aria-label")) h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
      walk(h);
      $$(".wd", h).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
      h.classList.add("sh");
      if (!h.hasAttribute("data-reveal")) h.setAttribute("data-reveal", "");
    });
  }

  /* ---------- reveal on scroll ---------- */
  var rev = $$("[data-reveal]");
  if (!IO || reduce) rev.forEach(function (el) { el.classList.add("in"); });
  else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });
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
      if (window.DG && window.DG.measure) window.DG.measure();
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
        document.documentElement.classList.add("lock");
      });
    });
    var close = function () { modal.close(); };
    $(".modal__x", modal).addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    modal.addEventListener("close", function () {
      var v = $("video", mMedia); if (v) v.pause();
      document.documentElement.classList.remove("lock");
    });
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

  /* =========================================================
     SNAP SCROLL: one wheel tick / swipe / key = one screen, eased.
     Stops come from the real layout: every section, plus cut points
     inside sections taller than the screen (so whole cards fit).
     ========================================================= */
  var html = document.documentElement;
  var DG = window.DG = window.DG || {};
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var CUTS = ".tile, .pcard, .site, .trace li, .also article, .board, .gcard, .clip, .sec-head, .contact > *, .kit > *, .split > *, .me > *, .about > *, .music > *, .sq > *, .links, .form, .tiles, .grid-work";
  var snap = { stops: [0], target: 0, raf: 0, p: 1, how: "", endAt: 0 };
  var maxY = function () { return Math.max(0, html.scrollHeight - innerHeight); };
  var docTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
  var locked = function () { return html.classList.contains("loading") || html.classList.contains("intro") || html.classList.contains("lock") || html.classList.contains("arriving"); };
  var moving = function () { return snap.p < 1; };

  // safety net for odd window sizes: a section a little taller than the window is scaled down just enough to fit
  function fit() {
    if (!window.CSS || !CSS.supports("zoom", "0.9")) return;
    var H = innerHeight;
    $$("main > section, .site").forEach(function (el) {
      if (el.classList.contains("hero") || el.classList.contains("sec--sites")) return;
      var kids = Array.prototype.slice.call(el.children).filter(function (c) { return !/absolute|fixed/.test(getComputedStyle(c).position); });
      kids.forEach(function (c) { c.style.zoom = ""; });
      var h = el.offsetHeight;
      if (h <= H + 2 || h > H * 1.34) return;
      var cs = getComputedStyle(el), pads = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var z = Math.max(0.74, (H - pads - 2) / (h - pads));
      kids.forEach(function (c) { c.style.zoom = z.toFixed(3); });
    });
  }

  function measure() {
    var H = innerHeight, max = maxY(), out = [];
    var nav = $("#nav"), off = (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 14;
    var blocks = $$("main > *").concat($$(".foot")).filter(function (el) {
      return el.offsetHeight > 0 && !/fixed|absolute/.test(getComputedStyle(el).position) && el.tagName !== "DIALOG";
    });
    blocks.forEach(function (b) {
      var top = docTop(b), h = b.offsetHeight, last = top + h - H;
      out.push([top, 0]);
      if (h <= H + 12) return;
      // taller than the screen: step through it, starting each screen at the top of a card or row where one fits
      var seen = {}, cuts = [];
      $$(CUTS, b).forEach(function (c) {
        if (!c.offsetHeight) return;
        var y = Math.round(docTop(c) - (c.matches(".site") ? 0 : off));
        if (!seen[y]) { seen[y] = 1; cuts.push(y); }
      });
      cuts.sort(function (x, y) { return x - y; });
      var at = top;
      for (var g = 0; g < 40 && last - at > 12; g++) {
        if (last <= at + H - off + 2) { at = last; out.push([at, 1]); break; }
        var fitC = cuts.filter(function (c) { return c > at + H * 0.34 && c <= at + H - off + 2 && c <= last + 12; });
        at = fitC.length ? fitC[fitC.length - 1] : Math.min(at + H - off, last);
        if (last - at < H * 0.22) at = last;
        out.push([at, 1]);
      }
    });
    out.sort(function (x, y) { return x[0] - y[0]; });
    var stops = [];
    out.forEach(function (o) {
      var y = clamp(Math.round(o[0]), 0, max), gap = stops.length ? y - stops[stops.length - 1] : 1e9;
      if (gap > H * 0.22) stops.push(y);
    });
    if (!stops.length) stops.push(0);
    if (max - stops[stops.length - 1] > H * 0.1) stops.push(max); else if (stops.length > 1) stops[stops.length - 1] = max;
    if (stops[0] !== 0) stops.unshift(0);
    snap.stops = stops;
    return stops;
  }
  var nearest = function (y) { return snap.stops.reduce(function (a, b) { return Math.abs(b - y) < Math.abs(a - y) ? b : a; }, snap.stops[0]); };

  var EASE = {
    wheel: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },   // cubic in-out
    touch: function (p) { return 1 - Math.pow(1 - p, 4); },                                       // quart out
    fix: function (p) { return 1 - (1 - p) * (1 - p); }
  };
  function scrollToY(y, how) {
    how = how || "wheel";
    var from = window.scrollY, dist = Math.abs(y - from);
    snap.target = y; snap.how = how;
    cancelAnimationFrame(snap.raf);
    if (dist < 1) { snap.p = 1; return; }
    var screens = dist / innerHeight;
    var dur = 1000 * (how === "touch" ? clamp(0.6 + screens * 0.3, 0.65, 1.2) : how === "fix" ? 0.55 : clamp(0.85 + screens * 0.32, 0.95, 1.6));
    var ease = EASE[how] || EASE.wheel, t0 = performance.now();
    snap.p = 0;
    var f = function (now) {
      var p = Math.min(1, (now - t0) / dur);
      snap.p = p;
      window.scrollTo(0, from + (y - from) * ease(p));
      if (p < 1) snap.raf = requestAnimationFrame(f); else snap.endAt = performance.now();
    };
    snap.raf = requestAnimationFrame(f);
  }
  function step(dir, how) {
    if (locked()) return false;
    if (moving() && snap.p < (snap.how === "touch" ? 0.55 : 0.8)) return false;
    var base = moving() ? snap.target : window.scrollY, next = null;
    if (dir > 0) { for (var i = 0; i < snap.stops.length; i++) if (snap.stops[i] > base + 4) { next = snap.stops[i]; break; } }
    else { for (var j = snap.stops.length - 1; j >= 0; j--) if (snap.stops[j] < base - 4) { next = snap.stops[j]; break; } }
    if (next === null) return false;
    scrollToY(next, how);
    return true;
  }
  DG.measure = function () { fit(); measure(); };
  DG.go = step;
  DG.stops = function () { return snap.stops.slice(); };
  DG.scrollTo = function (y, how) { scrollToY(clamp(y, 0, maxY()), how); };

  if (!reduce) {
    html.classList.add("snap");
    var inOverlay = function (t) { return t && t.closest && t.closest("dialog[open]"); };
    var inField = function (t) { return t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable); };

    // wheel + trackpad: a trackpad keeps sending a fading tail after the fingers lift; that tail is not a new scroll
    var wLast = 0, wAbs = 0;
    addEventListener("wheel", function (e) {
      if (e.ctrlKey || inOverlay(e.target)) return;
      if (e.target.closest && e.target.closest(".reel") && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = performance.now(), abs = Math.abs(e.deltaY), gap = now - wLast, prev = wAbs;
      wLast = now; wAbs = abs;
      if (locked() || abs < 2 || Math.abs(e.deltaX) > abs) return;
      if (moving() && snap.p < 0.8) return;
      var fresh = gap > 130 || abs > prev * 1.5 + 6 || (abs >= 80 && !moving() && now - snap.endAt > 260);
      if (!fresh) return;
      step(e.deltaY > 0 ? 1 : -1, "wheel");
    }, { passive: false });

    // touch: a swipe starts the move straight away
    var t0 = null;
    addEventListener("touchstart", function (e) {
      t0 = e.touches.length === 1 && !inOverlay(e.target) && !inField(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, done: false } : null;
    }, { passive: true });
    addEventListener("touchmove", function (e) {
      if (!t0 || t0.done || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - t0.x, dy = e.touches[0].clientY - t0.y;
      if (Math.abs(dy) < 22 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
      t0.done = true; step(dy < 0 ? 1 : -1, "touch");
    }, { passive: true });
    addEventListener("touchend", function () { t0 = null; }, { passive: true });
    addEventListener("touchcancel", function () { t0 = null; }, { passive: true });

    addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || inField(e.target) || inOverlay(e.target) || inOverlay(document.activeElement)) return;
      var k = e.key, onBtn = e.target.closest && e.target.closest("button, a, [tabindex], summary"), dir = 0;
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey && !onBtn)) dir = 1;
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey && !onBtn)) dir = -1;
      else if (k === "Home") { e.preventDefault(); if (!locked()) scrollToY(0); return; }
      else if (k === "End") { e.preventDefault(); if (!locked()) scrollToY(snap.stops[snap.stops.length - 1]); return; }
      if (!dir) return;
      if ($("#kit") && /^[asdfgh]$/i.test(k)) return;
      e.preventDefault(); step(dir, "wheel");
    });

    // anything else that moves the page (tabbing, find-in-page, scrollbar) settles on the nearest screen
    var idle = 0;
    addEventListener("scroll", function () {
      clearTimeout(idle);
      idle = setTimeout(function () {
        if (locked() || moving() || inField(document.activeElement)) return;
        var n = nearest(window.scrollY); if (Math.abs(n - window.scrollY) > 2) scrollToY(n, "fix");
      }, 170);
    }, { passive: true });
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || a.classList.contains("skip")) return;
      var t = document.querySelector(a.getAttribute("href")); if (!t) return;
      e.preventDefault(); scrollToY(nearest(docTop(t)));
    });

    var rz = 0, lastW = innerWidth, lastH = innerHeight;
    var remeasure = function () { fit(); measure(); if (!locked() && !moving()) window.scrollTo(0, nearest(window.scrollY)); };
    addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        // phones fire resize when the address bar moves: only a real change of size re-lays the page out
        if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120 && matchMedia("(pointer: coarse)").matches) return;
        lastW = innerWidth; lastH = innerHeight; remeasure();
      }, 220);
    });
    addEventListener("load", function () { setTimeout(remeasure, 60); });
    addEventListener("dg:intro", function () { setTimeout(remeasure, 30); });
    if (document.fonts) document.fonts.ready.then(function () { fit(); measure(); });
    fit(); measure();

    // slim progress line on the right edge
    var pg = document.createElement("div"); pg.className = "pg"; pg.setAttribute("aria-hidden", "true"); pg.innerHTML = "<i></i>";
    document.body.appendChild(pg);
    var pgi = pg.firstChild;
    var paintPg = function () { pgi.style.transform = "scaleY(" + (window.scrollY / (maxY() || 1)).toFixed(4) + ")"; };
    addEventListener("scroll", paintPg, { passive: true }); paintPg();
  } else {
    fit();
  }

  /* scroll cue on the hero */
  var cue = $(".cue");
  if (cue) cue.addEventListener("click", function () { if (!step(1, "wheel")) window.scrollBy(0, innerHeight); });
})();
