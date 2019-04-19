const mitmproxy = require('node-mitmproxy');
const through = require('through2');
const zlib = require('zlib');
const url = require('url');
const sp = require('./sp.js');

const Wx = 'weixin.qq.com';

module.exports = {
    start
};


function isGzip(res) {
    var contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
}


function start(port) {
    mitmproxy.createProxy({
        sslConnectInterceptor(req, cltSocket, head) {
            cltSocket.on('error', (e)=> {
                console.log(e.message);
            });
            if (req.url.indexOf(Wx) >= 0) return true;
            return true;
        },

        requestInterceptor(opt, req, res, ssl, next) {
            // console.log('cookie:', opt.headers.cookie);
            // res.end('Hello node-mitmproxy!');
            if (opt.hostname.indexOf(Wx)>=0) {
                console.log('>>>>', opt.hostname, opt.port);
                req.wxhost = opt.hostname;
            }
            req.hostname = opt.hostname;
            next();
        },

        responseInterceptor(req, res, proxyReq, proxyRes, ssl, next) {
            function display(chunk, enc, callback) {
                console.log(chunk.toString());
                callback();
            }

            let show_body = 0;
            // let type = proxyRes.headers['content-type'];

            if (req.wxhost) {
                console.log('] https://'+ req.hostname + req.url);
                let udata = url.parse(req.url, true);
                let biz = udata.query.__biz;
                if (biz) {
                    sp.saveSession(biz, req.headers, udata.query);
                }

                if (req.url.indexOf('/mp/homepage?') >= 0) {
                    // 采集公众号列表
                    // console.log(udata.query);
                    biz && sp.home(biz);
                    // show_body = 1;
                }
                else if (req.url.indexOf('/s?') >= 0) {
                    // 内容
                }
                else if (req.url.indexOf('/mp/profile_ext?') >= 0) {
                    // 历史记录??
                    // show_body = 1;
                    biz && sp.home(biz);
                }
            }

            if (show_body) {
                if (isGzip(proxyRes)) {
                    proxyRes.pipe(new zlib.Gunzip()).pipe(through(display))
                        .pipe(new zlib.Gzip()).pipe(res);
                } else {
                    proxyRes.pipe(through(display)).pipe(res);
                }
            } else {
                proxyRes.pipe(res);
            }

            next();
        },

        port: port,

        caCertPath: __dirname +'/../cert/ca.crt',
        caKeyPath: __dirname +'/../cert/ca.key.pem',
    });
}