/* Cerebrawl forwarder core: pure, dependency-free (UMD: window.CerebrawlGo + module.exports).
 * Shared hostile-input vectors live in forwarder/vectors.json; the TS publisher
 * in launcher/ validates against the same file. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CerebrawlGo = Object.assign(root.CerebrawlGo || {}, api);
})(typeof window !== "undefined" ? window : undefined, function () {
  "use strict";

  // Scheme is lowercase only; host is a single DNS label under trycloudflare.com;
  // nothing may follow the host except an optional single trailing slash.
  var BASE_RE = /^https:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.trycloudflare\.com\/?$/i;
  var PIN_RE = /^[0-9]{1,10}$/;

  function validateBase(base) {
    if (typeof base !== "string") return null;
    // Strict raw-string check first; URL() alone is too lenient (strips tabs/newlines,
    // normalizes backslashes, accepts userinfo and ports).
    if (base.slice(0, 8) !== "https://") return null; // scheme must be lowercase (regex is /i for the host)
    var m = BASE_RE.exec(base);
    if (!m) return null;
    var expected = "https://" + m[1].toLowerCase() + ".trycloudflare.com";
    var u;
    try { u = new URL(base); } catch (e) { return null; }
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash) return null;
    if (u.pathname !== "/" && u.pathname !== "") return null;
    if (u.origin !== expected) return null;
    return expected;
  }

  function parseAddress(text) {
    var json;
    try { json = JSON.parse(text); } catch (e) { return { active: false }; }
    if (json === null || typeof json !== "object" || Array.isArray(json)) return { active: false };
    if (json.active !== true) return { active: false };
    var base = validateBase(json.base);
    if (!base) return { active: false };
    return { active: true, base: base };
  }

  function parsePin(hash) {
    if (typeof hash !== "string") return null;
    var s = hash.charAt(0) === "#" ? hash.slice(1) : hash;
    return PIN_RE.test(s) ? s : null;
  }

  function buildTarget(base, pin) {
    return base + "/join" + (pin ? "?pin=" + pin : "");
  }

  return {
    parseAddress: parseAddress,
    validateBase: validateBase,
    parsePin: parsePin,
    buildTarget: buildTarget
  };
});
