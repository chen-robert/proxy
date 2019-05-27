/* global window, document, injectedCrypto, XMLHttpRequest, HTMLElement */

if (!window.injectedScriptRunOnce) {
  window.injectedScriptRunOnce = ":)";
  (function() {
    const extension = "/";
    const href =
      window.location.origin +
      extension +
      injectedCrypto.decode(
        window.location.pathname.substring(extension.length)
      );
    const origin = href.substring(
      0,
      href.indexOf("/", href.indexOf("://") + 3)
    );
    const pathname = href.substring(
      origin.length,
      href.includes("?") ? href.indexOf("?") : href.length
    );
    const host = origin.substring(origin.indexOf("://") + 3);

    const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;

    let searchStr = href;
    if (searchStr.charAt(searchStr.length - 1) !== "/") searchStr += "/";

    // Includes protocol (https://)
    const hostName = hostNameRegex.exec(searchStr)[0];
    const protocol = href.startsWith("http://") ? "http://" : "https://";

    const isEncoded = url => url.startsWith(origin) && injectedCrypto.isEncoded(url.substring((origin + "/").length))
    const remakeElem = elem => {
      const cleanedProps = [
        "src",
        "data-original",
        "href",
        "action",
        "codebase"
      ];
      cleanedProps.forEach(
        prop => {
          if(elem[prop] && !isEncoded(elem[prop])){
            elem[prop] = cleanUrl(elem[prop]);
          }
        }
      );

      if (elem.srcset) {
        const srcsetArr = elem.srcset.split(" ");
        // Hack
        const next = srcsetArr
          .map(part => (part.includes("/") && !part.startsWith(origin) ? cleanUrl(part) : part))
          .join(" ");
        if(elem.srcset !== next) elem.srcset = next;
      }
      if (elem.style && elem.style.cssText) {
        /*
          Minor cleaning of style urls. 
          
          Remove single and double quotes that may surround the url, e.g. "https://google.com/img.png"
          Also remove backslashes as a hack to fix escaped characters in css variable declarations. 
            e.g. --yt-channel-banner: url(http\:\/\/...)
        */
        const clean = url => url.replace(/('|"|\\)/g, "");
        
        const encoded = elem.style.cssText.replace(/(?<=url\().*?(?=\))/gi, url => {
            url = clean(url);
            return isEncoded(url) ? url : cleanUrl(url)
          }
        );
        
        if(clean(elem.style.cssText) !== clean(encoded)) {
          elem.style.cssText = encoded;
        }
      }
      return elem;
    };

    const cleanUrl = url => {      
      // If data url, don't proxy
      if (url.startsWith("data:"))return url;
      
      return origin + extension + cleanUrlPath(url);
    };
    const cleanUrlPath = url => {
      const finUrl = cleanUrlBase(url);
      return injectedCrypto.encode(
        finUrl.substring(origin.length + extension.length)
      );
    };
    const cleanUrlBase = function(url) {
      const originalUrl = url;

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

    const observerOptions = {
      childList: true,
      attributes: true,
      subtree: true //Omit or set to false to observe only changes to the parent node.
    }

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => remakeElem(mutation.target));
    });
    observer.observe(document, observerOptions);
    
    
    setInterval(() => {
      const newTitle = window.__title || "ProxyJS";
      if(document.title !== newTitle) document.title = newTitle;
    }, 100);

    {
      const oldFn = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (...args) => oldFn(cleanUrl(args[0]), ...args.slice(1));
    }
    XMLHttpRequest.prototype._open = XMLHttpRequest.prototype.open;

    const myOpen = function(method, url, async = true, user, password) {
      this._open(method, cleanUrl(url), async, user, password);
    };
    // ensure all XMLHttpRequests use our custom open method
    XMLHttpRequest.prototype.open = myOpen;
    
    const remakeHTMLFn = fnName => {
      const oriFn = HTMLElement.prototype[fnName];
      HTMLElement.prototype[fnName] = function() {
        arguments = Array.from(arguments).map(elem => {
          if (elem instanceof HTMLElement && elem.dataset.used !== "true") {
            remakeElem(elem);
          }
          return elem;
        });
        oriFn.call(this, ...arguments);
      };
    };

    ["appendChild", "insertBefore"].forEach(remakeHTMLFn);

    window._history = {
      pushState: (state, page, url) => window.history.pushState(state, page, cleanUrl(url))
    };
    window._location = (function() {
      const origin = hostName;
      const href = pathname.substring(extension.length);
      const host = hostName.replace(/(https:\/\/|http:\/\/|\/)/g, "");
      const pathnameFake = href.substring(
        href.indexOf("/", href.indexOf(host))
      );
      const hostname = host.split(":")[0];
      const port = "";
      const protocol = "https:";
      
      return {
        origin,
        href,
        host,
        pathname: pathnameFake,
        hostname,
        port,
        protocol,
        replace: (...args) => console.log(args),
        assign: url => window.location.assign(cleanUrl(url)),
        search: "",
        hash: ""
      };      
    })();
    document._location = window._location;
  })();
}
