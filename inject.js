window.onload = function(){
  function reloadElements(elemName){
    const scriptList = Array.from(document.getElementsByTagName(elemName));
    
    const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;
    const hostName = (hostNameRegex.exec(window.location.href)[0]);
    
    const makeScript = function(src){
      const script = document.createElement(elemName);
      
      if(elemName === "script"){
        script.src = src;
      }else if(elemName === "link"){
        script.href = src;
        script.rel = "stylesheet";
      }
      
      
      document.head.appendChild(script);
      
      console.log(src);
    }
    scriptList.forEach((script) => {
      const url = script.src || script.href;
      if(url !== undefined && url !== ""){
        //Load from external
        if(url.indexOf(window.location.host) == -1){
          makeScript("https://" + window.location.host + "/" + url);
        //Load from relative path
        }else{
          makeScript("https://" + window.location.host + "/" + hostName + url.substring(url.indexOf(window.location.host) + window.location.host.length));
          
        }
      }
    });
  }
  
  reloadElements("script");
  reloadElements("link");
}