(function(exports) {
  exports.encode = text =>
    text
      .split("/")
      .map(elem => encodeURIComponent(`a${elem}`))
      .join("/");
  exports.decode = cipher =>
    cipher
      .split("/")
      .map(elem => decodeURIComponent(elem.substring(1)))
      .join("/");
})(typeof exports === "undefined" ? (window.injectedCrypto = {}) : exports);
