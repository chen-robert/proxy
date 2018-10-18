const cheerio = require("cheerio");

const fixCSS = (css, url) => {
  const cleanUrl = cleanUrlFn(url);

  return css.replace(/(?<=url\().*?(?=\))/gi, url =>
    cleanUrl(url.replace(/('|")/g, ""))
  );
};

const fixJS = (js) => {
  return js.replace(/window\.location/, "window._location");
};

const cleanUrlFn = baseUrl => {
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

    return `${origin}/${btoa(finUrl.substring(origin.length + "/".length))}`;
  };
};

const fixHTML = (html, url) => {
  const $ = cheerio.load(html);
  $("title").attr("data-old-title", $("title").text());
  $("title").text("ProxyJS");

  const cleanUrl = cleanUrlFn(url);

  function reloadAllElements() {
    function reloadElements(elemName) {
      const scriptList = $(elemName);

      const remakeElem = $elem => {
        const cleanProp = prop => {
          if ($elem.attr(prop)) {
            const propArr = $elem.attr(prop).split(" ");
            // Hack
            $elem.attr(
              prop,
              propArr
                .map(
                  part =>
                    part.includes(".") || part.includes("/")
                      ? cleanUrl(part)
                      : part
                )
                .join(" ")
            );
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
        cleanedProps.forEach(cleanProp);

        if ($elem.attr("style")) {
          $elem.attr("style", fixCSS($elem.attr("style"), url));
        }

        switch ($elem[0].name){
          case "style":
            $elem.text(fixCSS($elem.html(), url));
            break;
          case "script":
            if($elem.attr("id") === "injected-proxyjs-script")break;
            $elem.text(fixJS($elem.html()));
            break;
        }

        // Remove integrity attributes because it messes with our injections
        if ($elem.attr("integrity")) {
          $elem.attr("integrity", null);
        }
      };
      scriptList.each((i, script) => {
        const $script = $(script);
        $script.attr("data-used", "true");

        remakeElem($script);
      });
    }

    reloadElements("*");
  }
  reloadAllElements();
  return $.html();
};

module.exports = { fixCSS, fixJS, fixHTML };
