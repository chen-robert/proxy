const concat = require("concat-stream");

const utils = {};
utils.dataParser = (req, res, next) => {
  req.pipe(
    concat(data => {
      req.body = data;
      next();
    })
  );
};
utils.forceSSL = (req, res, next) => {
  // Don't redirect in development
  if (
    process.env.NODE_ENV === "production" &&
    req.header("x-forwarded-proto") !== "https"
  ) {
    res.redirect(`https://${req.header("host") + req.url}`);
  } else {
    next();
  }
};

global.atob = str => {
  const oriStr = decodeURIComponent(str).trim();
  if (
    !/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(
      oriStr
    )
  )
    throw "Invalid Encoding";
  return Buffer.from(oriStr, "base64").toString();
};
global.btoa = str => encodeURIComponent(Buffer.from(str).toString("base64"));

module.exports = utils;
