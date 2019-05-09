const fs = require("fs");

const logdir = `${__rootdir}/logs`;
if (!fs.existsSync(logdir)) fs.mkdirSync(logdir);

const log = (id, text) => {
  const date = new Date().toISOString().replace('T', ' ').substr(0, 19);
  fs.appendFile(`${logdir}/${id}`, `${date} | ${text}\n`, (err) => err && console.log(`Failed to append ${text} to ${id}`));
}


module.exports = log;
