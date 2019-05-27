const iconv = require("iconv-lite");
const fs = require("fs");

const crypto = require(`${__dirname}/encrypt`);
const log = require(`${__dirname}/log`);

const { fixCSS, fixJS, fixHTML } = require(`${__dirname}/fix.js`);


const processScript = (req, response, body, originalUrl, fixFn, secret) => {
  const contentRegex = /(?<=charset=)[^\s]*/i;

  let regexMatches = contentRegex.exec(response.headers["content-type"]);
  if (regexMatches == null) regexMatches = ["utf-8"];

  const script = iconv.decode(body, regexMatches[0]);
  return fixFn(
    script,
    `${req.protocol}://${req.get("host")}/${crypto.decode(originalUrl, secret)}`,
    secret
  );
};
const processHTML = (req, response, body, originalUrl, secret) => {
  const contentRegex = /(?<=charset=)[^\s]*/i;

  let regexMatches = contentRegex.exec(response.headers["content-type"]);
  if (regexMatches == null) regexMatches = ["utf-8"];

  const htmlContent = iconv.decode(body, regexMatches[0]);

  const headRegex = /<head.*?>/i;
  const bodyRegex = /<body.*?>/i;
  const headMatch = headRegex.exec(htmlContent);
  const bodyMatch = bodyRegex.exec(htmlContent);

  const headIndex = headMatch ? headMatch.index + headMatch[0].length : 0;
  const bodyIndex = bodyMatch ? bodyMatch.index + bodyMatch[0].length : 0;
  const injectedScript = `\n<script src="/aes.js" data-used="true"></script><script src="/encrypt.js" data-used="true"></script><script id="injected-proxyjs-script" data-used="true">
  window.__title = "Physics Tutorial";
  ${fs.readFileSync(
    `${__dirname}/client/inject.js`,
    "utf8"
  )}
  </script>\n`;
  /*        const injectedHeader = `\n${fs.readFileSync(
    __dirname + "/loading.html",
    "utf8"
  )}\n`;
  */
  const injectedHeader = "";

  const newHtml =
    htmlContent.substring(0, headIndex) +
    injectedScript +
    htmlContent.substring(headIndex, bodyIndex) +
    injectedHeader +
    htmlContent.substring(bodyIndex);
  return fixHTML(
    newHtml,
    `${req.protocol}://${req.get("host")}/${crypto.decode(originalUrl, secret)}`,
    secret
  );
};

const copiedHeaders = ["user-agent", "content-type", "range", "authorization"];
const proxy = (method, getRequestFn) => (req, res) => {
  const id = req.cookies.authid;
  const secret = req.cookies._key;

  const extension = "/";
  const errorUrl = url => {
    res.status(404);
    return res.send(`Invalid url ${url}`);
  };
  let queryUrl = req.originalUrl.substring("/".length);
  const parts = queryUrl.split("?");
  if (parts.length === 2) {
    try {
      queryUrl = crypto.encode(`${crypto.decode(parts[0], secret)}?${parts[1]}`, secret);
    } catch (e) {
      return errorUrl(queryUrl);
    }
    return res.redirect(`${extension}${queryUrl}`);
  }

  let url;
  try {
    url = crypto.decode(queryUrl, secret);
  } catch (e) {
    log(id, `Failed to decode ${queryUrl}`)
    return errorUrl(queryUrl);
  }
  
  log(id, "Used secret " + secret)
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `https://${url}`;
    log(id, `Redirected to ${url}`)
    if(crypto.decode(crypto.encode(url, secret), secret) !== url){
      console.log("Crypto decode failed");
      console.log(`Original was ${url} but encoded became ${crypto.decode(crypto.encode(url, secret), secret)}`);
    }
    return res.redirect(extension + crypto.encode(url, secret));
  }
  
  log(id, `${method} ${url}`);

  let headers = {};
  copiedHeaders.forEach(key => {
    const header = req.headers[key];
    if (header) {
      headers = { ...headers, [key]: header };
      if (key === "range") {
        req.headers["Accept-Encoding"] = "gzip, deflate, br";
      }
    }
  });
  
  // Copy custom "x-" headers, e.g. X-Fingerprint
  Object.keys(req.headers).forEach(header => {
    if(header.startsWith("x-")) {
      copiedHeaders[header] = req.headers[header];
    }
  });

  let options = {
    method,
    headers,
    url,
    encoding: null
  };
  if (req.body.length !== 0) {
    options = { ...options, body: req.body };
  }

  getRequestFn(req.cookies.authid)(options, (error, response, body) => {
    if (error) return errorUrl(url);
    if (response.request.uri.href !== url) {
      return res.redirect(extension + crypto.encode(response.request.uri.href, secret));
    }

    if (response.headers["content-encoding"]) {
      res.setHeader("Content-Encoding", response.headers["content-encoding"]);
    }
    if (response.headers.location) {
      res.setHeader(
        "Location",
        `${req.protocol}://${req.get("host")}/${crypto.encode(response.headers.location, secret)}`
      );
    }

    const responseContentType = response.headers["content-type"];
    if (responseContentType !== undefined) {
      if (responseContentType.includes("charset: UTF-8")) {
        res.status(404);
        return res.end();
      }
      res.setHeader("Content-Type", responseContentType);
      if (responseContentType.includes("text/html")) {
        return res.send(processHTML(req, response, body, queryUrl, secret));
      }
      if (responseContentType.includes("text/css")) {
        return res.send(processScript(req, response, body, queryUrl, fixCSS, secret));
      }
      if (responseContentType.includes("application/javascript")) {
        return res.send(processScript(req, response, body, queryUrl, fixJS, secret));
      }
      if (responseContentType.includes("image/x-icon") || responseContentType.includes("image/vnd.microsoft.icon")){
        return res.redirect("/favicon.ico");
      }
    }
    return res.send(new Buffer(body));
  });
};

module.exports = proxy;
