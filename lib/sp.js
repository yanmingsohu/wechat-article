const url = require('url');
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const db = require('./db.js');
const qu = require('./queue.js');


module.exports = {
    init,
    saveSession,
    home,
    parseInfo,
    msglist,
    msg_content,
};


// TODO: 与公众号机构绑定
const session_names = ['cookie', 'q-ua2', 'q-guid', 'q-auth', 
    /*'referer'*/, 'user-agent', 'x-wechat-key', 'x-wechat-uin'];
const parm_names = ['session_us', 'pass_ticket', 'appmsg_token'];
const session = {};
// 全局参数
let pass_ticket;


function init(cb) {
    db.revert_session(session, cb);
}


function saveSession(biz, h, q) {
    if (!biz) throw new Error('biz null');
    let fail = 0;
    let sess = session[biz];
    if (!sess) {
        sess = session[biz] = { h:{}, q:{}, up:-1 };
    }

    session_names.forEach((v)=> {
        if (h[v]) sess.h[v] = h[v];
    });
    parm_names.forEach((v)=> {
        if (q[v]) sess.q[v] = q[v];
    });
    pass_ticket = q.pass_ticket;

    if (fail == 0) {
        sess.up = Date.now();
        db.log("Update Session", biz, sess.h.cookie);
        db.save_session(biz, sess);
    }
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
    if (nickname) {
        db.add_org(biz, nickname, desc);
    } else {
        db.log(biz, "获取机构信息失败");
        console.log(html);
    }
}


function msglist(biz, begin = 0, _over) {
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
            db.log(biz, ret.errmsg, ret.ret);
            return;
        }

        let general_msg_list = JSON.parse(ret.general_msg_list);
        let mi = -1;
        // 有 n 条重复认为不需要继续读取列表
        let msg_exists = 0;
        nextMsg();

        function nextMsg(e, exists) {
            if (e) return db.log(e);
            if (exists) ++msg_exists;

            if (++mi < general_msg_list.list.length) {
                const m = general_msg_list.list[mi];
                const minfo = m.app_msg_ext_info;
                if (!minfo) {
                    return nextMsg();
                }
                console.log(biz, minfo.title);
                const murl = __href(minfo.content_url);
                if (murl == '') {
                    return nextMsg();
                }
                const sn = url.parse(murl, true).query.sn;
                const dt = new Date(m.comm_msg_info.datetime);

                db.insert_msg(biz, dt, minfo.title, sn, minfo.digest, murl, nextMsg);
            } 
            else if (ret.can_msg_continue && msg_exists < 3) {
                console.log("Next page");
                msglist(biz, ret.next_offset, _over);
            } 
            else {
                console.log('No more news', biz);
                _over && _over();
            }
        }
    }); 
}


function msg_content(sn, url) {
    // let r = __url(url, {});
    let r = {
        hostname: 'mp.weixin.qq.com',
        port: 80,
        protocol: 'http:',
        path: url,
        method: 'get',
        headers: {},
    };
    __get(r, (err, data)=> {
        if (err) return db.log('Get content', err, url);
        db.update_content(sn, data);
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
    let sess = session[parm.__biz];
    if (sess) {
        parm_names.forEach((v)=> {
            if (sess.q[v]) parm[v] = sess.q[v];
        });
    }
    parm.pass_ticket = pass_ticket;
    let ret = {
        hostname: 'mp.weixin.qq.com',
        port: 80,
        protocol: 'http:',
        path: path +'?'+ querystring.stringify(parm),
        method: 'get',
        headers: {},
    };
    if (sess) {
        session_names.forEach((v)=> {
            if (sess.h[v]) ret.headers[v] = sess.h[v];
        });
    }
    return ret;
}


function __get(urldata, cb) {
    qu.add(function(over) {
        let ht = urldata.protocol == 'https:' ? https : http;
        let req = ht.request(urldata, (res)=> {
            let bufs = [];
            
            res.on('data', (chunk) => {
                bufs.push(chunk);
            });

            res.on('end', () => {
                if (res.statusCode == 200) {
                    let data = Buffer.concat(bufs);
                    cb(null, data);
                } else if (res.statusCode == 301) {
                    console.log("Jump to", res.headers.location);
                    let ud = url.parse(res.headers.location);
                    ud.headers = urldata.headers;
                    __get(ud, cb);
                } else {
                    cb(new Error(res.statusMessage +' '+ res.statusCode));
                }
                over();
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            cb(e);
            over();
        });
        // req.write(postData);
        req.end();
    });
}