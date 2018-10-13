const PORT = process.env.PORT || 3000;

const compression = require("compression");
const iconv = require("iconv-lite");
const express = require('express');
const request = require("request").defaults({jar: true});
const bodyParser = require('body-parser');

const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.text());
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
  res.send("It's a proxy!");
});

app.get("/*", (req, res) => {
  let url = (req.originalUrl).substring("/".length);
  
  // Hack for stuff like http://localhost:3000/https:/reddit.com/map
  if(url.indexOf("//") === -1){
    url = url.replace("/", "//");
  }
  
  console.log(`GET ${url}`)
  
  const userAgent = req.headers["user-agent"];
  const headers = {
    "User-Agent": userAgent
  }
  request({url, headers, encoding: null}, (error, response, body) => {
    if (error) {
      res.send("Invalid url " + url);
      return;
    }
    
    if (response.headers['content-type'] !== undefined) {
      res.setHeader("Content-Type", response.headers['content-type']);
      
      if(response.headers["content-type"].indexOf("text/html") > -1){
        const contentRegex = /(?<=charset=)[^\s]*/i
        
        const regexMatches = contentRegex.exec(response.headers["content-type"]);
        if(regexMatches !== null){
          let htmlContent = iconv.decode(body, regexMatches[0]);
          
          const headRegex = /<head.*?>/i;
          const match = headRegex.exec(htmlContent);
          
          let index;
          if(match === null){
            index = 0;
          } else{
            index = match.index + match[0].length;
          }
          
          const injectedScript = `\n<script>${fs.readFileSync(__dirname + "/inject.js", "utf8")}</script>\n`;
          const newHtml = htmlContent.substring(0, index) + injectedScript + htmlContent.substring(index);
          return res.send(newHtml);
        }
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
    json: contentType.indexOf("json") !== -1,
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
