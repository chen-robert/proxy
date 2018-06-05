const PORT = process.env.PORT || 3000;

const compression = require("compression");
const express = require('express');
const request = require("request");

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
    }
    res.send(new Buffer(body));
  });

}); 

//Universal redirect
app.get("*", (req, res) => {
  res.redirect("/");
});
