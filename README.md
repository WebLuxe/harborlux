# Doorgesh — Claim Your Summit

Multi-page portfolio for Doorgesh (Zenn Prxd), in the "Harborlux" rainy-harbour style.

Live: https://webluxe.github.io/harborlux/

| Page | File |
|---|---|
| Home (cinematic intro hero + highlights) | `index.html` |
| Builds (filters + detail pop-ups) | `work.html` |
| Sound (playable drum kit + scope) | `sound.html` |
| About (photo deck + roadmap) | `about.html` |
| Websites | `web.html` |
| Contact (mail form) | `contact.html` |
| Not found | `404.html` |

Shared styles are in `css/site.css` and shared behaviour in `js/site.js`. The home hero's own styles and intro timeline are inline in `index.html`. First visit to Home: loader (DOORGESH fills 000→100) → "Click to start · Sound on" → the intro film with its synthwave track (Skip / Sound buttons) → flash → the black doors open into the rainy-harbour hero. Moving between pages uses the neon bar wipe with the page name. Styles for all of this are in `css/intro.css`, behaviour in `js/intro.js`.

The intro plays once per browser session (a refresh replays it); visitors who prefer reduced motion get the final frame straight away.

Plain HTML/CSS/JS — no build step. Open `index.html` through any static server (or GitHub Pages).
