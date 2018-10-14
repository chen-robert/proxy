if(!window.injectedScriptRunOnce){
  window.injectedScriptRunOnce = ":)";
  (function(){
    const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;
    let searchStr = window.location.href;
    if(searchStr.charAt(searchStr.length - 1) != "/")searchStr += "/";

    // Includes protocol (https://)
    const hostName = (hostNameRegex.exec(searchStr)[0]);
    const protocol = window.location.href.indexOf("http://") == -1? "https://": "http://";

    const cleanUrl = function(url){
      const originalUrl = url;
      
      // If data url, don't proxy
      if(url.startsWith("data:")) return url;
      
      // Urls of form `//website.com/resource`
      if(url.startsWith("//")){
        return (protocol + window.location.host + "/" + (hostName.includes("https")? "https://": "http://") + url.substring(2));
      }
      // Urls of form `index.js` (note NOT `/index.js`)
      if(!url.includes("/")){
        const loc = window.location.pathname;
        const dir = loc.substring(0, loc.lastIndexOf('/'));
        
        return protocol + window.location.host + dir + "/" + url;
      }
      
      if(url.startsWith(window.location.origin)){
        url = url.substring(window.location.origin.length);
        if(url.charAt(0) === "/")url = url.substring(1);
      }
      
      
      // Urls of form `https://website.com/data.js`
      if(url.startsWith("http://") || url.startsWith("https://")) return protocol + window.location.host + "/" + url;
      // Urls of form `/index.js`
      if(url.charAt(0) === "/"){
        return (protocol + window.location.host + "/" + hostName + url);
      }
      //Load from relative path
      return (protocol + window.location.host + "/" + hostName + "/" + url);
    }
    function reloadAllElements(){
      //List of elements to remake
      const remakeList = ["img", "a", "form", "iframe", "frame", "source", "object"];
      function reloadElements(elemName){
        const scriptList = Array.from(document.getElementsByTagName(elemName));
        
        const makeScript = function(src, link){
          const script = document.createElement(elemName);
          script.dataset.used = "true";
          
          if(elemName === "script"){
            script.src = src;
          }else if(elemName === "link"){
            script.href = src;
            script.rel = link.rel;
            if(link.getAttribute("as")) script.as = link.getAttribute("as");        
          }
          document.head.appendChild(script);
        }
        const remakeElem = (elem) => {
          const cleanedProps = ["src", "data-original", "href", "action", "codebase"];
          cleanedProps.forEach((prop) => elem[prop] && (elem[prop] = cleanUrl(elem[prop])));
          
          if(elem["srcset"]){
            const srcsetArr = elem["srcset"].split(" ");
            //Hack
            elem["srcset"] = srcsetArr.map((part) => part.includes("/")? cleanUrl(part): part).join(" ");
          }
        }
        scriptList.forEach((script) => {
          if(script.dataset.used === "true") return;
          script.dataset.used = "true";
          
          const url = script.src || script.href || script.action || script.srcset;
          if(url !== undefined && url !== ""){
            const cleanedUrl = cleanUrl(url);
            console.debug(`Loading ${cleanedUrl}`);
            if(remakeList.includes(elemName)){
              remakeElem(script);
            }else{
              makeScript(cleanedUrl, script);
            }
          }else{
            if(elemName === "script"){
              const newScriptTag = document.createElement('script');
              newScriptTag.dataset.used = "true";
              newScriptTag.innerHTML = script.innerHTML;
              document.head.appendChild(newScriptTag);          
            }
          }
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
    window.addEventListener("load", () => {
      reloadAllElements();
      console.log("Finished proxying");
      document.getElementById("injected-loading-screen").style.display = "none";
      document.body.style.overflow = "";
      setInterval(reloadAllElements, 1000);
    });

    XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;

    var myOpen = function(method, url, async=true, user, password) {
      console.log(url, cleanUrl(url));
      //call original
      this.realOpen (method, cleanUrl(url), async, user, password);
    }  
    //ensure all XMLHttpRequests use our custom open method
    XMLHttpRequest.prototype.open = myOpen;
  })();
}