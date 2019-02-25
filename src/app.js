const PORT = process.env.PORT || 3000;

const compression = require("compression");
const crypto = require("crypto");
const express = require("express");
const request = require("request").defaults({ jar: true });

const proxy = require(`${__dirname}/proxy.js`);
const util = require(`${__dirname}/util.js`);

const app = express();
app.enable("trust proxy");
app.use(util.dataParser);
app.use(compression());
app.use(require("cookie-parser")());
app.use(util.forceSSL);

app.get("/auth/:token", (req, res) => {
  if(req.params.token === "proxy") res.cookie("authid", crypto.randomBytes(40).toString('hex'), { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true});
  
  res.redirect("/");
});

app.use((req, res, next) => {
  if(!req.cookies.authid){
    return res.redirect("https://bsd405.org");
  }
  next();
});

app.get("/encrypt.js", (req, res) => {
  res.sendFile(`${__dirname}/encrypt.js`);
});
app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/client/index.html`);
});

app.get("/*", proxy("GET", request));
app.post("/*", proxy("POST", request));

// Redirect all other requests to home page
app.get("*", (req, res) => res.redirect("/"));

const http = require("http").Server(app);

http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
