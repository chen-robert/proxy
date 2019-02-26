const iconv = require("iconv-lite");
const fs = require("fs");

const crypto = require(`${__dirname}/encrypt`);

const { fixCSS, fixJS, fixHTML } = require(`${__dirname}/fix.js`);

const copiedHeaders = ["user-agent", "content-type", "range"];

const processScript = (req, response, body, originalUrl, fixFn) => {
  const contentRegex = /(?<=charset=)[^\s]*/i;

  let regexMatches = contentRegex.exec(response.headers["content-type"]);
  if (regexMatches == null) regexMatches = ["utf-8"];

  const script = iconv.decode(body, regexMatches[0]);

  return fixFn(
    script,
    `${req.protocol}://${req.get("host")}/${crypto.decode(originalUrl)}`
  );
};
const processHTML = (req, response, body, originalUrl) => {
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
  const injectedScript = `\n<script src="/encrypt.js" data-used="true"></script><script id="injected-proxyjs-script" data-used="true">${fs.readFileSync(
    `${__dirname}/client/inject.js`,
    "utf8"
  )}</script>\n`;
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
    `${req.protocol}://${req.get("host")}/${crypto.decode(originalUrl)}`
  );
};
const proxy = (method, request) => (req, res) => {
  const extension = "/";
  const errorUrl = url => {
    res.status(404);
    return res.send(`Invalid url ${url}`);
  };
  let queryUrl = req.originalUrl.substring("/".length);
  const parts = queryUrl.split("?");
  if (parts.length === 2) {
    try {
      queryUrl = crypto.encode(`${crypto.decode(parts[0])}?${parts[1]}`);
    } catch (e) {
      return errorUrl(queryUrl);
    }
    return res.redirect(`${extension}${queryUrl}`);
  }

  let url;
  try {
    url = crypto.decode(queryUrl);
  } catch (e) {
    return errorUrl(queryUrl);
  }

  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `https://${url}`;
    return res.redirect(extension + crypto.encode(url));
  }

  console.log(`${method} ${url}`);

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

  let options = {
    method,
    headers,
    url,
    encoding: null
  };
  if (req.body.length !== 0) {
    options = { ...options, body: req.body };
  }

  request(options, (error, response, body) => {
    if (error) return errorUrl(url);
    if (response.request.uri.href !== url) {
    console.log(response.headers);
      return res.redirect(extension + crypto.encode(response.request.uri.href));
    }

    const copiedHeaders = ["content-encoding"];
    copiedHeaders.forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    if (response.headers.location) {
      res.setHeader(
        "Location",
        `${req.protocol}://${req.get("host")}/${response.headers.location}`
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
        return res.send(processHTML(req, response, body, queryUrl));
      }
      if (responseContentType.includes("text/css")) {
        return res.send(processScript(req, response, body, queryUrl, fixCSS));
      }
      if (responseContentType.includes("application/javascript")) {
        return res.send(processScript(req, response, body, queryUrl, fixJS));
      }
    }
    return res.send(new Buffer(body));
  });
};

module.exports = proxy;
