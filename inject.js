const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;
let searchStr = window.location.href;
if(searchStr.charAt(searchStr.length - 1) != "/")searchStr += "/";

// Includes protocol (https://)
const hostName = (hostNameRegex.exec(searchStr)[0]);
const protocol = window.location.href.indexOf("http://") == -1? "https://": "http://";

const cleanUrl = function(url){
  //Load from external
  if(url.indexOf(window.location.host) == -1){
    if(url.indexOf("http://") === -1 && url.indexOf("https://") === -1){
      if(url[0] !== "/") url = "/" + url;
      url = hostName + url;
    }
   return (protocol + window.location.host + "/" + url);
  }
  
  url = url.substring(window.location.origin.length);
  
  //Load from relative path
  return (protocol + window.location.host + "/" + hostName + url);
}

function reloadAllElements(){
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
    scriptList.forEach((script) => {
      if(script.id === "proxy-injected-script") return;
      if(script.dataset.used === "true") return;
      script.dataset.used = "true";
      
      const url = script.src || script.href || script.action;
      if(url !== undefined && url !== ""){
        const cleanedUrl = cleanUrl(url);
        console.debug(`Loading ${cleanedUrl}`);
        if(elemName === "img"){
          //If starts with data url, don't proxy
          if(url.indexOf("data:") === 0) return;
          script.src = cleanedUrl;
        }else if(elemName === "a"){
          script.href = cleanedUrl;
        }else if(elemName === "form"){
          script.action = cleanedUrl;
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
  reloadElements("img");
  reloadElements("link");
  reloadElements("a");
  reloadElements("form");
}
window.addEventListener("load", () => reloadAllElements() || console.log("Finished proxying") || setInterval(reloadAllElements, 10000));

XMLHttpRequest.prototype.realOpen = XMLHttpRequest.prototype.open;

var myOpen = function(method, url, async, user, password) {
  console.log(cleanUrl(url));
  //call original
  this.realOpen (method, cleanUrl(url), async, user, password);
}  
//ensure all XMLHttpRequests use our custom open method
XMLHttpRequest.prototype.open = myOpen;