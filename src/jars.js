const fs = require("fs");
const request = require("request");
const FileCookieStore = require("tough-cookie-filestore");


const tmpdir = `${__rootdir}/tmp`;
if (!fs.existsSync(tmpdir)) fs.mkdirSync(tmpdir);

const cache = {}
const getRequest = name => {
  if(cache[name]) return cache[name];
  
  const logFile = `${tmpdir}/${name}.json`;
  if(!fs.existsSync(logFile)) {
    // Create empty file
    fs.closeSync(fs.openSync(logFile, 'w'));
  }
  
  cache[name] = request.defaults({ jar: request.jar(new FileCookieStore(logFile))});
  return cache[name];
}


module.exports = getRequest;
