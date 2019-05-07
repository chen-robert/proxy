(function(exports) {
  exports.encode = text =>
    text
      .split("/")
      .map(elem => encodeURIComponent(btoa(`asdf${elem}`)))
      .join("/");
  exports.decode = cipher =>
    cipher
      .split("/")
      .map(elem => atob(decodeURIComponent(elem)).substring(4))
      .join("/");
})(typeof exports === "undefined" ? (window.injectedCrypto = {}) : exports);
