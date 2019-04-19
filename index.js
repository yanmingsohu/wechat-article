const proxy = require('./lib/proxy.js');
const yaml = require('js-yaml');
const fs = require('fs');
const db = require('./lib/db.js');
const sv = require('./lib/service.js');

const conf = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));

db.init(conf.mysql);
proxy.start(conf.proxy_port);
sv.start(conf.http_port);