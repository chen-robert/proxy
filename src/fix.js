const cheerio = require("cheerio");

const crypto = require(`${__dirname}/encrypt`);

const fixCSS = (css, baseUrl, secret) => {
  const cleanUrl = cleanUrlFn(baseUrl, secret);

  return css.replace(/(?<=url\().*?(?=\))/gi, url =>
    cleanUrl(url.replace(/('|")/g, ""))
  );
};

const fixJS = (js, baseUrl, secret) => {
  js = js.replace(/window\.location/g, "window._location");
  js = js.replace(/window\.history/g, "window._history");
  return js;
};

const cleanUrlFn = (baseUrl, secret) => {
  const href = baseUrl;
  const origin = href.substring(0, href.indexOf("/", href.indexOf("://") + 3));
  let pathname = href.substring(
    origin.length,
    href.includes("?") ? href.indexOf("?") : href.length
  );
  if (!pathname.endsWith("/")) pathname += "/";
  const host = origin.substring(origin.indexOf("://") + 3);

  const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;

  let searchStr = href;
  if (searchStr.charAt(searchStr.length - 1) !== "/") searchStr += "/";

  // Includes protocol (https://)
  const hostName = hostNameRegex.exec(searchStr)[0];
  const protocol = href.startsWith("http://") ? "http://" : "https://";

  const cleanUrlBase = function(url) {
    const originalUrl = url;

    // If data url, don't proxy
    if (url.startsWith("data:")) return url;

    // Urls of form `//website.com/resource`
    if (url.startsWith("//")) {
      return `${protocol + host}/${
        hostName.includes("https") ? "https://" : "http://"
      }${url.substring(2)}`;
    }
    // Urls of form `index.js` (note NOT `/index.js`)
    if (!url.includes("/")) {
      const loc = pathname;
      const dir = loc.substring(0, loc.lastIndexOf("/"));

      return `${protocol + host + dir}/${url}`;
    }

    if (url.startsWith(origin)) {
      url = url.substring(origin.length);
      if (url.charAt(0) === "/") url = url.substring(1);
    }

    // Urls of form `https://website.com/data.js`
    if (url.startsWith("http://") || url.startsWith("https://"))
      return `${protocol + host}/${url}`;
    // Urls of form `/index.js`
    if (url.charAt(0) === "/") {
      return `${protocol + host}/${hostName}${url}`;
    }
    // Load from relative path
    return `${protocol + host}/${hostName}/${url}`;
  };
  return url => {
    const finUrl = cleanUrlBase(url);
    if (finUrl.startsWith("data:")) return finUrl;

    if (!finUrl.startsWith(origin)) {
      console.error(`${url} failed to decode properly as ${finUrl}`);
    }

    return `${origin}/${crypto.encode(
      finUrl.substring(origin.length + "/".length), secret
    )}`;
  };
};

const fixHTML = (html, url, secret) => {
  const $ = cheerio.load(html);
  $("title").attr("data-old-title", $("title").text());

  const cleanUrl = cleanUrlFn(url, secret);

  function reloadAllElements() {
    function reloadElements(elemName) {
      const scriptList = $(elemName);

      const remakeElem = $elem => {
        const cleanProp = prop => {
          if ($elem.attr(prop)) {
            const propArr = $elem.attr(prop).split(" ");
            const newVal = propArr
              .map(
                part =>
                  part.includes(".") || part.includes("/")
                    ? cleanUrl(part)
                    : part
              )
              .join(" ");
            // Hack
            $elem.attr(prop, newVal);
          }
        };
        const cleanedProps = [
          "src",
          "srcset",
          "data-original",
          "href",
          "action",
          "codebase"
        ];
        
        // Skip parsing favicon.ico
        if($elem.attr("rel") !== undefined && $elem.attr("rel").split(" ").includes("icon")) {
          $elem.remove();
          return;
        }
        
        cleanedProps.forEach(cleanProp);

        if ($elem.attr("style")) {
          $elem.attr("style", fixCSS($elem.attr("style"), url, secret));
        }

        switch ($elem[0].name) {
          case "style":
            $elem.text(fixCSS($elem.html(), url, secret));
            break;
          case "script":
            if ($elem.attr("id") === "injected-proxyjs-script") break;
            $elem.text(fixJS($elem.html(), url, secret));
            break;
        }

        // Remove integrity attributes because it messes with our injections
        if ($elem.attr("integrity")) {
          $elem.attr("integrity", null);
        }
      };
      scriptList.each((i, script) => {
        const $script = $(script);
        if ($script.attr("data-used") === "true") {
          return;
        }
        $script.attr("data-used", "true");

        remakeElem($script);
      });
    }

    reloadElements("*");
  }
  reloadAllElements();
  $("head").append(`<link rel="icon" href="/favicon.ico" />`);
  return $.html();
};

module.exports = { fixCSS, fixJS, fixHTML };
