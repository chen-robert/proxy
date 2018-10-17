const iconv = require("iconv-lite");
const fs = require("fs");

const { fixCSS, fixHTML } = require(`${__dirname}/fix.js`);

const copiedHeaders = ["user-agent", "content-type"];

const processCSS = (req, response, body, originalUrl) => {
  const contentRegex = /(?<=charset=)[^\s]*/i;

  let regexMatches = contentRegex.exec(response.headers["content-type"]);
  if (regexMatches == null) regexMatches = ["utf-8"];

  const css = iconv.decode(body, regexMatches[0]);

  return fixCSS(
    css,
    `${req.protocol}://${req.get("host")}/${atob(originalUrl)}`
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
  const injectedScript = `\n<script data-used="true">${fs.readFileSync(
    `${__dirname}/inject.js`,
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
    `${req.protocol}://${req.get("host")}/${atob(originalUrl)}`
  );
};
const proxy = (method, request) => (req, res) => {
  const errorUrl = url => {
    res.status(404);
    return res.send(`Invalid url ${url}`);
  };
  let queryUrl = req.originalUrl.substring("/".length);
  const parts = queryUrl.split("?");
  if (parts.length === 2) {
    try {
      queryUrl = btoa(`${atob(parts[0])}?${parts[1]}`);
    } catch (e) {
      return errorUrl(queryUrl);
    }
    return res.redirect(`/${queryUrl}`);
  }

  let url;
  try {
    url = atob(queryUrl);
  } catch (e) {
    return errorUrl(queryUrl);
  }

  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = `https://${url}`;
    return res.redirect(btoa(url));
  }

  console.log(`${method} ${url}`);

  let headers = {};
  copiedHeaders.forEach(key => {
    const header = req.headers[key];
    if (header) {
      headers = { ...headers, [key]: header };
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
      return res.redirect(btoa(response.request.uri.href));
    }

    if (response.headers["content-encoding"]) {
      res.setHeader("Content-Encoding", response.headers["content-encoding"]);
    }
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
        return res.send(processCSS(req, response, body, queryUrl));
      }
    }
    return res.send(new Buffer(body));
  });
};

module.exports = proxy;
