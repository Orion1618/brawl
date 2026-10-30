/* Cerebrawl forwarder driver. DOM writes use hidden / textContent only (never innerHTML). */
(function (root) {
  "use strict";
  var Core = (typeof module === "object" && module.exports && typeof require === "function")
    ? require("./forwarder-core.js") : root.CerebrawlGo;

  var TIMEOUT_MS = 8000;
  var MSG_INACTIVE = "When your instructor starts class, this page will send you in. Try again in a minute.";
  var MSG_ERROR = "We couldn't check right now. Check your connection, then try again in a minute.";

  function run(doc, fetchFn, loc, nowMs, opts) {
    var timeoutMs = (opts && opts.timeoutMs) || TIMEOUT_MS;
    var connecting = doc.getElementById("connecting");
    var idle = doc.getElementById("idle");
    var detail = doc.getElementById("idle-detail");
    var retry = doc.getElementById("retry");

    function showConnecting() {
      connecting.hidden = false;
      idle.hidden = true;
    }
    function showIdle(message) {
      detail.textContent = message;
      connecting.hidden = true;
      idle.hidden = false;
    }

    // Assignment (not addEventListener) so repeated runs never stack handlers.
    retry.onclick = function () { run(doc, fetchFn, loc, undefined, opts); };
    showConnecting();

    var timer;
    var timeout = new Promise(function (_resolve, reject) {
      timer = setTimeout(function () { reject(new Error("timeout")); }, timeoutMs);
    });
    var req;
    try {
      req = Promise.resolve(fetchFn("address.json?t=" + (nowMs === undefined ? Date.now() : nowMs), { cache: "no-store" }))
        .then(function (res) {
          if (!res || !res.ok) throw new Error("bad response");
          return res.text();
        });
    } catch (e) { req = Promise.reject(e); }

    return Promise.race([req, timeout]).then(function (text) {
      clearTimeout(timer);
      var rec = Core.parseAddress(text);
      if (!rec.active) {
        showIdle(MSG_INACTIVE);
        return "inactive";
      }
      loc.replace(Core.buildTarget(rec.base, Core.parsePin(loc.hash)));
      return "redirect";
    }).catch(function () {
      clearTimeout(timer);
      showIdle(MSG_ERROR);
      return "error";
    });
  }

  var api = { run: run };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CerebrawlGoDriver = api;

  if (root && root.document) {
    root.document.addEventListener("DOMContentLoaded", function () {
      run(root.document, root.fetch.bind(root), root.location);
    });
  }
})(typeof window !== "undefined" ? window : undefined);
