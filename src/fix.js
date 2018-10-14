const cheerio = require("cheerio");

const fixHTML = (html, url) => {
  const $ = cheerio.load(html);

  const href = url;
  const origin = href.substring(0, href.indexOf("/", href.indexOf("://") + 3));
  let pathname = href.substring(
    origin.length,
    href.includes("?") ? href.indexOf("?") : href.length
  );
  if (!pathname.endsWith("/")) pathname += "/";
  const host = origin.substring(origin.indexOf("://") + 3);

  const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;

  let searchStr = href;
  if (searchStr.charAt(searchStr.length - 1) != "/") searchStr += "/";

  // Includes protocol (https://)
  const hostName = hostNameRegex.exec(searchStr)[0];
  const protocol = href.startsWith("http://") ? "http://" : "https://";

  const cleanUrl = function(url) {
    const originalUrl = url;

    // If data url, don't proxy
    if (url.startsWith("data:")) return url;

    // Urls of form `//website.com/resource`
    if (url.startsWith("//")) {
      return (
        protocol +
        host +
        "/" +
        (hostName.includes("https") ? "https://" : "http://") +
        url.substring(2)
      );
    }
    // Urls of form `index.js` (note NOT `/index.js`)
    if (!url.includes("/")) {
      const loc = pathname;
      const dir = loc.substring(0, loc.lastIndexOf("/"));

      return protocol + host + dir + "/" + url;
    }

    if (url.startsWith(origin)) {
      url = url.substring(origin.length);
      if (url.charAt(0) === "/") url = url.substring(1);
    }

    // Urls of form `https://website.com/data.js`
    if (url.startsWith("http://") || url.startsWith("https://"))
      return protocol + host + "/" + url;
    // Urls of form `/index.js`
    if (url.charAt(0) === "/") {
      return protocol + host + "/" + hostName + url;
    }
    //Load from relative path
    return protocol + host + "/" + hostName + "/" + url;
  };
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
      };
      scriptList.each((i, script) => {
        const $script = $(script);
        $script.attr("data-used", "true");

        remakeElem($script);
      });
    }

    reloadElements("script");
    reloadElements("link");

    reloadElements("source");
    reloadElements("iframe");
    reloadElements("object");
    reloadElements("img");
    reloadElements("a");
    reloadElements("form");
  }
  reloadAllElements();
  return $.html();
};

module.exports = fixHTML;
