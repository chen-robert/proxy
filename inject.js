window.onload = function(){
  const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;
  const hostName = (hostNameRegex.exec(window.location.href)[0]);

  const cleanUrl = function(url){
    //Load from external
    if(url.indexOf(window.location.host) == -1){
     return ("https://" + window.location.host + "/" + url);
    //Load from relative path
    }
    return ("https://" + window.location.host + "/" + hostName + url.substring(url.indexOf(window.location.host) + window.location.host.length));
  }
  function reloadElements(elemName){
    const scriptList = Array.from(document.getElementsByTagName(elemName));
    
    
    const makeScript = function(src){
      const script = document.createElement(elemName);
      
      if(elemName === "script"){
        script.src = src;
      }else if(elemName === "link"){
        script.href = src;
        script.rel = "stylesheet";
      }
      document.head.appendChild(script);
    }
    scriptList.forEach((script) => {
      const url = script.src || script.href;
      if(url !== undefined && url !== ""){
          makeScript(cleanUrl(url));
      }
    });
  }
  
  reloadElements("script");
  reloadElements("link");
}