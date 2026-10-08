// Flodesk universal loader: the snippet from Flodesk's embed code, unchanged, wrapped so it
// runs on demand. gate.js calls loadFlodesk() the first time the email gate renders, so
// Flodesk is not contacted on any other page view. Kept in its own file (not inline) so the
// Content-Security-Policy needs no inline-script hash.
//
// The snippet defines window.fd as a queue that accepts fd('form', …) calls before
// https://assets.flodesk.com/universal(.mjs|.js) has arrived; Flodesk replays the queue
// on load, so a form can be mounted immediately after calling this.

let loaded = false;

export function loadFlodesk() {
  if (loaded) return;
  loaded = true;
  (function(w, d, t, h, s, n) {
    w.FlodeskObject = n;
    var fn = function() {
      (w[n].q = w[n].q || []).push(arguments);
    };
    w[n] = w[n] || fn;
    var f = d.getElementsByTagName(t)[0];
    var v = '?v=' + Math.floor(new Date().getTime() / (120 * 1000)) * 60;
    var sm = d.createElement(t);
    sm.async = true;
    sm.type = 'module';
    sm.src = h + s + '.mjs' + v;
    f.parentNode.insertBefore(sm, f);
    var sn = d.createElement(t);
    sn.async = true;
    sn.noModule = true;
    sn.src = h + s + '.js' + v;
    f.parentNode.insertBefore(sn, f);
  })(window, document, 'script', 'https://assets.flodesk.com', '/universal', 'fd');
}
