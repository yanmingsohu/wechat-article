const url = require('url');
const http = require('http');
const querystring = require('querystring');


module.exports = {
    saveHeader,
    home,
};


const session_names = ['cookie', 'q-ua2', 'q-guid', 'q-auth'];
const session = {};


function saveHeader(h) {
    console.log(h);
    session_names.forEach((v)=> {
        session[v] = h[v];
    });
}


function home(biz) {
    let r = __url('/mp/profile_ext', { action:'home' });
    __get(r, (err, data)=> {
        if (err) {
            console.log('get home fail', err.message);
            return;
        }
        let html = data.toString();
        let nickname = __tag_body('profile_nickname', html);
        let desc = __tag_body('profile_desc', html);
        if (nickname && desc) {
            console.log(nickname, desc);
        }
    });
}


function msglist(biz) {
}


function __tag_body(classOrId, html, begin=0) {
    let c = html.indexOf(classOrId, begin);
    if (c > begin) {
        let a = html.indexOf('>', c);
        if (a > begin) {
            let b = html.indexOf('<', a);
            if (b > a) {
                return html.substring(a+1, b).trim();
            }
        }
    }
    return null;
}


function __url(path, parm) {
    let ret = {
        hostname: 'mp.weixin.qq.com',
        port: 80,
        protocol: 'http:',
        path: path +'?'+ querystring.stringify(parm),
        method: 'get',
        headers: {},
    };
    session_names.forEach((v)=> {
        ret.headers[v] = session[v];
    });
    return ret;
}


function __get(urldata, cb) {
    let req = http.request(urldata, (res)=> {
        let bufs = [];
        
        res.on('data', (chunk) => {
            bufs.push(chunk);
        });

        res.on('end', () => {
            if (res.statusCode == 200) {
                let data = Buffer.concat(bufs);
                cb(null, data);
            } else {
                cb(new Error(res.statusMessage));
            }
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        cb(e);
    });
    // req.write(postData);
    req.end();
}