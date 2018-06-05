const PORT = process.env.PORT || 3000;

const compression = require("compression");
const iconv = require("iconv-lite");
const express = require('express');
const request = require("request");

const fs = require("fs");

const app = express();
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
  const url = (req.originalUrl).substring("/".length);
  
  console.log(`Attempting to proxy to ${url}`)

  request({url, encoding: null}, (error, response, body) => {
    if (error) {
      res.status(404);
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
          
          const headRegex = /<head.*?/i;
          const match = headRegex.exec(htmlContent);
          
          if(match.index > -1){
            const injectedScript = `<script>${fs.readFileSync(__dirname + "/inject.js", "utf8")}</script>`;
            const newHtml = htmlContent.substring(0, match.index) + injectedScript + htmlContent.substring(match.index);
            return res.send(newHtml);
          }
        }
      }
    }
    res.send(new Buffer(body));
  });

}); 

//Universal redirect
app.get("*", (req, res) => {
  res.redirect("/");
});
