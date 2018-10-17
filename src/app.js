const PORT = process.env.PORT || 3000;

const compression = require("compression");
const express = require("express");
const request = require("request").defaults({ jar: true });

const proxy = require(`${__dirname}/proxy.js`);
const util = require(`${__dirname}/util.js`);

const app = express();
app.enable("trust proxy");
app.use(util.dataParser);
app.use(compression());
app.use(util.forceSSL);

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.get("/*", proxy("GET", request));
app.post("/*", proxy("POST", request));

// Redirect all other requests to home page
app.get("*", (req, res) => res.redirect("/"));

const http = require("http").Server(app);

http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
