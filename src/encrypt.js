(function(exports) {
  if(typeof window === "undefined") {
    aesjs = require("aes-js");
  }
  let fallback = "__default_secret"
  if(typeof window !== "undefined") { 
    document.cookie.split(";").forEach(val => {
      parts = val.split("=");
      if(parts[0] === "_key") {
        fallback = parts[1]
      }
    });
  }
  const MAC = "AUTH";
  const getKey = secret => aesjs.utils.hex.toBytes(secret || fallback);
  exports.encode = (text, secret) => {
    const key = getKey(secret);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key);
    return text
      .split("/")
      .map(elem => aesjs.utils.hex.fromBytes(aesCtr.encrypt(aesjs.utils.utf8.toBytes(MAC + elem))))
      .join("/");
  }
  exports.decode = (cipher, secret) => {
    const key = getKey(secret);
    const aesCtr = new aesjs.ModeOfOperation.ctr(key);
    return cipher
      .split("/")
      .map(elem => {
        const decoded = aesjs.utils.utf8.fromBytes(aesCtr.decrypt(aesjs.utils.hex.toBytes(elem)))
        if(decoded.substring(0, MAC.length) !== MAC) {
          throw "Invalid MAC"; 
        }
        return decoded.substring(MAC.length);
      })
      .join("/");
    }
})(typeof exports === "undefined" ? (window.injectedCrypto = {}) : exports);
