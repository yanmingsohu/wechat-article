const url = require('url');
const http = require('http');
const querystring = require('querystring');
const db = require('./db.js');


module.exports = {
    saveHeader,
    saveParm,
    home,
    parseInfo,
    msglist,
};


const session_names = ['cookie', 'q-ua2', 'q-guid', 'q-auth', 
    'referer', 'user-agent', 'x-wechat-key', 'x-wechat-uin'];
const session = {};
const parm_names = ['session_us', 'pass_ticket', 'appmsg_token'];
const query_parm = {};
let last_update = 0;


function saveHeader(h) {
    // console.log(h);
    session_names.forEach((v)=> {
        if (h[v]) session[v] = h[v];
    });
    last_update = Date.now();
}


function saveParm(q) {
    parm_names.forEach((v)=> {
        if (q[v]) query_parm[v] = q[v];
    });
    // console.log(query_parm)
    last_update = Date.now();
}


function home(biz) {
    db.org_exists(biz, (err, count)=> {
        if (err) return db.log(err);
        if (count > 0) return;

        let r = __url('/mp/profile_ext', { 
            action      : 'home',
            __biz       : biz,
            subscene    : 0,
            devicetype  : 'android-27',
            version     : '2700033',
            lang        : 'zh_CN',
            nettype     : 'WIFI',
            a8scene     : 7,
            wx_header   : 1,
        });

        __get(r, (err, data)=> {
            if (err) {
                db.log('get home fail', err.message);
                return;
            }
            parseInfo(biz, data.toString());
        }); 
    });
}


function parseInfo(biz, html) {
    let nickname = __tag_body('profile_nickname', html);
    let desc = __tag_body('profile_desc', html);
    // console.log('New org:', nickname, desc);
    if (nickname && desc) {
        db.add_org(biz, nickname, desc);
    } else {
        db.log("获取机构信息失败");
    }
}


function msglist(biz, begin = 0) {
    let r = __url('/mp/profile_ext', { 
        action      : 'getmsg',
        __biz       : biz,
        subscene    : 0,
        devicetype  : 'android-27',
        version     : '2700033',
        lang        : 'zh_CN',
        nettype     : 'WIFI',
        a8scene     : 7,
        wx_header   : 1,
        f           : 'json',
        offset      : begin,
        count       : 10,
    });

    __get(r, (err, data)=> {
        if (err) {
            db.log('get home fail', err.message);
            return;
        }
        
        let ret = JSON.parse(data);
        // console.log(ret);
        if (ret.ret != 0) {
            db.log(ret.errmsg, ret.ret);
            return;
        }

        let general_msg_list = JSON.parse(ret.general_msg_list);
        let mi = -1;
        let msg_exists = 0;
        nextMsg();

        function nextMsg(e, exists) {
            if (e) return db.log(e);
            if (exists) ++msg_exists;

            if (++mi < general_msg_list.list.length) {
                const m = general_msg_list.list[mi];
                const minfo = m.app_msg_ext_info;
                const murl = __href(minfo.content_url);
                const sn = url.parse(murl, true).query.sn;
                const dt = new Date(m.comm_msg_info.datetime);
                console.log(m, murl);
                db.insert_msg(biz, dt, minfo.title, sn, minfo.digest, murl, nextMsg);
            } 
            else if (ret.can_msg_continue && msg_exists < 3) {
                console.log("Next page");
                msglist(biz, ret.next_offset);
            } 
            else {
                console.log('No more news', biz);
            }
        }
    }); 
}


function __href(url) {
    return url.replace(/&amp;/g, "&");
}


function __tag_body(classOrId, html, begin=0) {
    let c = html.indexOf(classOrId, begin);
    if (c > begin) {
        let a = html.indexOf('>', c);
        if (a > c) {
            let b = html.indexOf('<', a);
            if (b > a) {
                return html.substring(a+1, b).trim();
            }
        }
    }
    return null;
}


function __url(path, parm) {
    parm_names.forEach((v)=> {
        if (query_parm[v]) parm[v] = query_parm[v];
    });
    let ret = {
        hostname: 'mp.weixin.qq.com',
        port: 80,
        protocol: 'http:',
        path: path +'?'+ querystring.stringify(parm),
        method: 'get',
        headers: {},
    };
    session_names.forEach((v)=> {
        if (session[v]) ret.headers[v] = session[v];
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