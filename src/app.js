const PORT = process.env.PORT || 3000;

const compression = require("compression");
const iconv = require("iconv-lite");
const express = require('express');
const request = require("request").defaults({jar: true});

const fs = require("fs");

const app = express();
const concat = require('concat-stream');
app.use(function(req, res, next){
  req.pipe(concat(function(data){
    req.body = data;
    next();
  }));
});
app.use(compression());
const http = require('http').Server(app);

http.listen(PORT, () => console.log(`Listening on port ${PORT}`));

app.use((req, res, next) => {
  // Don't redirect in development
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host') + req.url}`);
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/*", (req, res) => {
  let url = (req.originalUrl).substring("/".length);
  
  // Hack for stuff like http://localhost:3000/https:/reddit.com/map
  if(url.indexOf("//") === -1){
    url = url.replace("/", "//");
  }
  
  if(!url.startsWith("https://") && !url.startsWith("http://")){
    url = "/https://" + url;
    return res.redirect(url);
  }
  
  console.log(`GET ${url}`)
  
  const userAgent = req.headers["user-agent"];
  const headers = {
    "User-Agent": userAgent
  }
  request({url, headers, encoding: null}, (error, response, body) => {
    if (error) {
      res.send(`/*\nInvalid url ${url}\n*/`);
      return;
    }
    if(response.request.uri.href !== url){
      return res.redirect("/" + response.request.uri.href);
    }
    
    if(response.headers["content-encoding"]) res.setHeader("Content-Encoding", response.headers["content-encoding"]);
    
    if (response.headers['content-type'] !== undefined) {
      res.setHeader("Content-Type", response.headers['content-type']);
      
      if(response.headers["content-type"].indexOf("text/html") > -1){
        const contentRegex = /(?<=charset=)[^\s]*/i
        
        let regexMatches = contentRegex.exec(response.headers["content-type"]);
        if(regexMatches == null) regexMatches = ["utf-8"];
        
        let htmlContent = iconv.decode(body, regexMatches[0]);
        
        const headRegex = /<head.*?>/i;
        const bodyRegex = /<body.*?>/i;
        const headMatch = headRegex.exec(htmlContent);
        const bodyMatch = bodyRegex.exec(htmlContent);
        
        const headIndex = headMatch? headMatch.index + headMatch[0].length: 0;
        const bodyIndex = bodyMatch? bodyMatch.index + bodyMatch[0].length: 0;
        const injectedScript = `\n<script data-used="true">${fs.readFileSync(__dirname + "/inject.js", "utf8")}</script>\n`;
        const injectedHeader = `\n${fs.readFileSync(__dirname + "/loading.html", "utf8")}\n`;
        
        const newHtml = htmlContent.substring(0, headIndex) + injectedScript + htmlContent.substring(headIndex, bodyIndex) + injectedHeader + htmlContent.substring(bodyIndex);
        return res.send(newHtml);
      }
    }
    res.send(new Buffer(body));
  });
}); 

app.post("/*", (req, res) => {
  const url = (req.originalUrl).substring("/".length);
  
  console.log(`POST ${url}`);
  
  const userAgent = req.headers["user-agent"];  
  const contentType = req.headers['content-type'];
  const headers = {
    "Content-Type": contentType,
    "User-Agent": userAgent
  };
  const options = {
    method: "post",
    body: req.body,
    headers,
    url: url
  }
  request(options, (err, response, body) => {
    if (err) {
      res.send("Invalid url " + url);
      return;
    }
    
    res.send(body);
  });
});

//Universal redirect
app.get("*", (req, res) => {
  res.redirect("/");
});
