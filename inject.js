window.onload = function(){
  const scriptList = Array.from(document.getElementsByTagName("script"));
  
  const hostNameRegex = /(?<=\/)http(s)?:\/\/.*?(?=\/)/i;
  const hostName = (hostNameRegex.exec(window.location.href)[0]);
  
  const makeScript = function(src){
    const script = document.createElement("script");
    script.src = src;
    
    document.head.appendChild(script);
  }
  scriptList.forEach((script) => {
    if(script.src !== ""){
      //Load from external
      if(script.src.indexOf(window.location.host) == -1){
        makeScript("https://" + window.location.host + "/" + script.src);
      //Load from relative path
      }else{
        makeScript("https://" + window.location.host + "/" + hostName + script.src.substring(script.src.indexOf(window.location.host) + window.location.host.length));
        
      }
    }
  });
}