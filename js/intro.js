/* =========================================================
   Doorgesh — arrival: loader, intro film + music, flash hand-off
   into the harbour hero, page wipes, cursor, magnetic buttons.
   ========================================================= */
(function () {
  "use strict";
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var EXTRA = window.DG_EXTRA || (window.DG_EXTRA = []);
  var E = { io: "cubic-bezier(.87,0,.13,1)", out: "cubic-bezier(.16,1,.3,1)", "in": "cubic-bezier(.55,0,1,.45)" };
  var PAGE_NAMES = { "": "Home", "index.html": "Home", "work.html": "Builds", "sound.html": "Sound", "about.html": "About", "web.html": "Websites", "contact.html": "Contact" };
  var safePlay = function (m) { try { var p = m.play(); if (p && p.catch) p.catch(function () {}); return p; } catch (e) { return null; } };

  /* ---------- page wipe ---------- */
  var wipe = $("#wipe"), bars = wipe ? $$("i", wipe) : [], wlabel = wipe ? $("span", wipe) : null;
  function label(t) {
    wlabel.innerHTML = "";
    t.split("").forEach(function (c) { var b = document.createElement("b"); b.textContent = c === " " ? " " : c; wlabel.appendChild(b); });
    return $$("b", wlabel);
  }
  if (wipe && html.classList.contains("arriving")) {
    var ch = label(ss.get("dg-wipe") || ""); ss.del("dg-wipe");
    ch.forEach(function (c, i) { c.animate([{ transform: "translateY(0)" }, { transform: "translateY(-120%)" }], { duration: 450, delay: 50 + i * 30, easing: E["in"], fill: "forwards" }); });
    bars.forEach(function (b, i) { b.style.transformOrigin = "50% 0%"; b.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 800, delay: 200 + i * 60, easing: E.io, fill: "forwards" }); });
    setTimeout(function () {
      html.classList.remove("arriving");
      bars.concat(ch).forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); });
      wlabel.innerHTML = "";
    }, 1300);
  }
  var normPath = function (p) { return p.replace(/index\.html$/, ""); };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || !wipe || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname) || url.hash || normPath(url.pathname) === normPath(location.pathname)) return;
    e.preventDefault();
    var name = PAGE_NAMES[url.pathname.split("/").pop()] || "";
    ss.set("dg-wipe", name);
    var ch = label(name);
    wipe.style.visibility = "visible";
    bars.forEach(function (b, i) { b.style.transformOrigin = "50% 100%"; b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 620, delay: i * 55, easing: E.io, fill: "forwards" }); });
    ch.forEach(function (c, i) { c.animate([{ transform: "translateY(120%)" }, { transform: "translateY(0)" }], { duration: 500, delay: 350 + i * 30, easing: E.out, fill: "both" }); });
    setTimeout(function () { location.href = url.href; }, 900);
  });
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted || !wipe) return;
    bars.forEach(function (b) { b.getAnimations().forEach(function (a) { a.cancel(); }); });
    wipe.style.visibility = ""; html.classList.remove("arriving");
  });

  /* ---------- intro film + music (home, first visit) ---------- */
  var film = html.classList.contains("filming") ? $("#film") : null;
  var flash = $("#flash");
  var HIT = 9.76;                       // where the big hit sits in the track
  var music = null, musicReady = Promise.resolve(false), soundOK = false, muted = false;
  var startHero = function () { if (window.DG_HERO) window.DG_HERO.start(); };
  var endFilm = function () { if (film) film.remove(); html.classList.remove("filming"); };

  if (film && reduce) { endFilm(); film = null; startHero(); }
  if (film) {
    var vid = $("video", film), skip = $(".film__skip", film), snd = $(".film__snd", film);
    var conn = navigator.connection || {};
    var lite = conn.saveData || /2g|3g/.test(conn.effectiveType || "") || Math.max(innerWidth, innerHeight) < 900;
    vid.src = "assets/video/intro-" + (innerHeight > innerWidth ? "portrait" : "landscape") + (lite ? "-lite" : "") + ".mp4";
    vid.load();
    var fp = { p: 0 }; EXTRA.push(fp);
    var buf = function () { try { if (vid.duration && vid.buffered.length) fp.p = Math.max(fp.p, vid.buffered.end(vid.buffered.length - 1) / vid.duration); } catch (e) {} };
    vid.addEventListener("progress", buf);
    vid.addEventListener("canplaythrough", function () { fp.p = 1; }, { once: true });
    vid.addEventListener("error", function () { fp.p = 1; }, { once: true });
    setTimeout(function () { fp.p = 1; }, 8000);

    try { muted = localStorage.getItem("dg-mute") === "1"; } catch (e) {}
    try {
      music = new Audio(); music.preload = "auto"; music.volume = 0.85;
      var mp = { p: 0 }; EXTRA.push(mp);
      musicReady = fetch("assets/audio/intro.mp3").then(function (r) { return r.ok ? r.blob() : Promise.reject(); })
        .then(function (b) { music.src = URL.createObjectURL(b); return true; })
        .catch(function () { music = null; return false; })
        .then(function (ok) { mp.p = 1; return ok; });
      setTimeout(function () { mp.p = 1; }, 5000);
    } catch (e) { music = null; }
  }
  var unlock = function () {            // must run inside the tap itself so phones allow sound later
    if (!music) return;
    var p = safePlay(music);
    if (p && p.then) p.then(function () { if (!music.dataset.live) music.pause(); }).catch(function () {});
  };
  function playMusic(clock) {
    if (!music || !soundOK || muted) return;
    var go = function () {
      if (!music || !soundOK || muted) return;
      music.dataset.live = "1";
      try { music.currentTime = Math.max(0, clock()); } catch (e) {}
      music.volume = 0.85;
      safePlay(music);
    };
    if (music.getAttribute("src")) go(); else musicReady.then(function (ok) { if (ok) go(); });
  }
  function askTap() {
    return new Promise(function (res) {
      var L = $("#loader");
      if (!L || !music || muted) return res();
      var btn = document.createElement("p");
      btn.className = "loader__start";
      btn.innerHTML = "<b>" + (matchMedia("(pointer: coarse)").matches ? "Tap" : "Click") + " to start</b><span>Sound on</span>";
      L.appendChild(btn); L.classList.add("ask");
      var done = false, timer;
      var go = function (sound) {
        if (done) return; done = true;
        removeEventListener("pointerdown", tap, true); removeEventListener("keydown", key, true); clearTimeout(timer);
        if (sound) { soundOK = true; unlock(); }
        L.classList.remove("ask"); L.classList.add("asked");
        res();
      };
      var tap = function () { go(true); };
      var key = function (e) { if (!e.metaKey && !e.ctrlKey && !e.altKey) go(true); };
      addEventListener("pointerdown", tap, true); addEventListener("keydown", key, true);
      timer = setTimeout(function () { go(false); }, 8000);
    });
  }
  function soundButton(btn, clock) {
    if (!music) { btn.remove(); return; }
    var paint = function () { var on = soundOK && !muted; btn.textContent = on ? "Sound on" : "Sound off"; btn.setAttribute("aria-pressed", on); };
    paint();
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (soundOK && !muted) { muted = true; music.pause(); }
      else { muted = false; soundOK = true; unlock(); playMusic(clock); }
      try { localStorage.setItem("dg-mute", muted ? "1" : "0"); } catch (err) {}
      paint();
    });
  }

  var filmStart = null;
  function startFilm() {
    if (filmStart) return filmStart;
    var answer, finished = false, rolling = false;
    filmStart = new Promise(function (r) { answer = r; });
    var fallback = function () {
      if (finished) return; finished = true; answer("page");
      endFilm(); startHero();
    };
    var finish = function () {
      if (finished) return; finished = true; answer("film");
      // skipped early: jump the track to just before its big hit so it still lands on the cut
      if (music && music.dataset.live && !music.paused && vid.duration && vid.currentTime < vid.duration - 0.4) { try { music.currentTime = HIT - 0.56; } catch (e) {} }
      // the film holds its last frame and the flash peaks exactly on the track's hit
      var t0 = performance.now(), hasBeat = music && music.dataset.live && !music.paused;
      var wait = function () {
        var late = performance.now() - t0 > 1200;
        if (!late && hasBeat && music.currentTime < HIT - 0.15) { requestAnimationFrame(wait); return; }
        flash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "cubic-bezier(.5,0,.9,.4)", fill: "forwards" }).onfinish = function () {
          vid.pause(); endFilm();
          var out = function () { flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }); };
          if (window.DG_HERO) { var once = false; window.DG_HERO.start(function () { if (!once) { once = true; requestAnimationFrame(out); } }); setTimeout(function () { if (!once) { once = true; out(); } }, 2800); }
          else out();
        };
      };
      wait();
    };
    // phones taller than the film: fill the bars above and below with the film's own colours
    var ambient = function () {
      var c = $(".film__amb", film);
      if (!c || !vid.videoWidth || innerWidth / innerHeight > (vid.videoWidth / vid.videoHeight) * 0.985) return;
      c.width = 18; c.height = 32;
      var x = c.getContext("2d"); c.classList.add("on");
      var draw = function () {
        if (finished) return;
        try { x.drawImage(vid, 0, 0, c.width, c.height); } catch (e) {}
        if (vid.requestVideoFrameCallback) vid.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
      };
      draw();
    };
    var roll = function () {
      if (rolling || finished) return; rolling = true;
      film.classList.add("on"); ambient(); answer("film");
      playMusic(function () { return vid.currentTime; });
      soundButton(snd, function () { return vid.currentTime; });
      setTimeout(function () { film.classList.add("ui"); }, 1200);
    };
    // the music follows the picture: if the film stops to buffer, the track waits and picks up at the same spot
    var stalled = false;
    var live = function () { return music && music.dataset.live && !finished && !muted; };
    vid.addEventListener("waiting", function () { if (live()) { stalled = true; music.pause(); } });
    vid.addEventListener("playing", function () { if (stalled && live()) { stalled = false; playMusic(function () { return vid.currentTime; }); } });
    vid.addEventListener("timeupdate", function () {
      if (!vid.duration) return;
      if (live() && !music.paused && !stalled && Math.abs(music.currentTime - vid.currentTime) > 0.3) { try { music.currentTime = vid.currentTime; } catch (e) {} }
      if (vid.currentTime > vid.duration - 0.12) finish();
    });
    vid.addEventListener("ended", finish);
    vid.addEventListener("error", fallback, { once: true });
    vid.addEventListener("playing", roll, { once: true });
    skip.addEventListener("click", finish);
    var pr = safePlay(vid);
    if (pr && pr.catch) pr.catch(fallback);
    setTimeout(function () { if (rolling || finished) return; if (vid.paused || vid.readyState < 3) fallback(); else roll(); }, 2500);
    return filmStart;
  }

  /* ---------- loader ---------- */
  var L = $("#loader");
  if (L && html.classList.contains("loading") && !reduce) runLoader();
  else {
    if (L) L.remove();
    html.classList.remove("loading");
    if (film) { endFilm(); startHero(); }
  }
  if (!reduce) ss.set("dg-seen", "1");

  function runLoader() {
    try { scrollTo(0, 0); } catch (e) {}
    var num = $(".loader__num", L), msg = $(".loader__msg", L);
    var t0 = performance.now(), MIN = 1500, MAX = 9000;
    var fontsOk = false, loadOk = document.readyState === "complete";
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { fontsOk = true; });
    addEventListener("load", function () { loadOk = true; });
    var imgs = $$("img").filter(function (i) { return i.loading !== "lazy" && i.getAttribute("src"); });
    var shown = 0, last = t0, lastV = -1;
    var msgs = ["Loading the drive", "Tuning the amps", "Charging the ions", "Warming up the kit"];
    (function tick(now) {
      var el = now - t0, dt = Math.min(now - last, 100) / 1000; last = now;
      var parts = [fontsOk ? 1 : 0, loadOk ? 1 : 0, imgs.length ? imgs.filter(function (i) { return i.complete; }).length / imgs.length : 1]
        .concat(EXTRA.map(function (x) { return Math.min(1, x.p || 0); }));
      var real = parts.reduce(function (a, b) { return a + b; }, 0) / parts.length;
      var creep = 64 * (1 - Math.exp(-el / 3000));              // never sits still while things download
      var target = Math.min(Math.max(real * 100, creep), (el / MIN) * 100, 99);
      if ((real >= 1 && el >= MIN) || el > MAX) target = 100;
      var gap = target - shown;
      if (gap > 0) shown += Math.min(gap, clamp(gap * 4.2, 9, 80) * dt);
      var v = Math.min(100, Math.floor(shown + 0.5));
      if (v !== lastV) {
        lastV = v;
        L.style.setProperty("--lp", v + "%");
        num.textContent = String(v).padStart(3, "0");
        msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor(v / 26))];
      }
      if (v < 100) return requestAnimationFrame(tick);
      setTimeout(leave, 340);
    })(t0);

    function leave() {
      var gate = film
        ? Promise.race([askTap().then(startFilm), new Promise(function (r) { setTimeout(function () { r("page"); }, 14000); })])
        : Promise.resolve("page");
      gate.then(function (mode) {
        var toFilm = mode === "film";
        L.classList.add("done", toFilm ? "to-film" : "to-page");
        setTimeout(function () { L.remove(); html.classList.remove("loading"); }, toFilm ? 950 : 1500);
      });
    }
  }

  /* ---------- cursor + magnetic buttons (mouse only) ---------- */
  if (fine && !reduce) {
    var cur = document.createElement("div");
    cur.className = "cursor hide"; cur.setAttribute("aria-hidden", "true");
    cur.innerHTML = "<i></i><b></b>";
    document.body.appendChild(cur);
    var lab = $("b", cur), tx = -100, ty = -100, cx = -100, cy = -100, running = false;
    var loop = function () {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = "translate(" + cx + "px," + cy + "px)";
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(loop); else running = false;
    };
    addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY; cur.classList.remove("hide");
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () { cur.classList.add("hide"); });
    addEventListener("pointerdown", function () { cur.classList.add("down"); });
    addEventListener("pointerup", function () { cur.classList.remove("down"); });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest("[data-cursor], a, button, label, .card");
      cur.classList.toggle("big", !!t);
      lab.textContent = t ? (t.getAttribute("data-cursor") || "") : "";
    });
    $$(".btn, .rbtn").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
})();
