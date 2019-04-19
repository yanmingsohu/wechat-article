const mysql = require('mysql');


module.exports = {
    init,
    log,
    add_org,
    org_exists,
    org_list,
    org_list_down,
    insert_msg,
    get_article_from,
    update_content,
    save_session,
    revert_session,
};


let dbpool;


function init(mysqlconf) {
    dbpool = mysql.createPool(mysqlconf);
}


function log() {
    let msg = [];
    for (let i=0, l=arguments.length; i<l; ++i) {
        msg[i] = arguments[i];
    }
    const s = 'Insert Into log(msg) values (?)';
    const p = [msg.join(' ')];

    dbpool.query(s, p, (e, r, m)=> {
        if (e) {
            console.error(e);
        }
        console.info(p[0]);
    });
}


function add_org(biz, name, desc) {
    const s = 'Insert Into organization(`name`, `desc`, `biz`) values (?,?,?)';
    dbpool.query(s, [name, desc, biz], (err, row, meta)=> {
        if (err) return log(err);
    });
}


function org_exists(biz, cb) {
    if (!biz) return cb(new Error("biz is null"));
    const s = 'select count(1) r from organization where biz=?';
    dbpool.query(s, [biz], (err, row)=> {
        if (err) return cb(err);
        cb(null, row[0].r);
    });
}


function org_list(name, cb) {
    let s = 'Select * From organization Where state != 0';
    let p = [];
    if (name) {
        s += ' And `name` Like ?';
        p.push('%'+ name +'%');
    }
    dbpool.query(s, p, cb);
}


function org_list_down(cb) {
    let s = 'Select name, biz From organization Where state = 2';
    dbpool.query(s, null, cb);
}


function insert_msg(biz, wxtime, title, sn, digest, url, cb) {
    const s = 'Insert Into article(biz, wxtime, title, sn, digest, url)'
        +' Values (?,?,?, ?,?,?)';
    const p = [biz, wxtime, title, sn, digest, url];

    dbpool.query(s, p, (e, r)=> {
        if (e) {
            if (e.code == 'ER_DUP_ENTRY') {
                cb(null, true);
            } else {
                cb(e);
            }
        } else {
            cb(null, false);
        }
    });
}


function get_article_from(biz, cb) {
    const s = 'SELECT url, sn FROM wxmsg.article Where html Is Null;';
    dbpool.query(s, null, cb);
}


function update_content(sn, html) {
    const s = 'Update article Set html = ? Where sn = ?';
    dbpool.query(s, [html, sn], (e, r)=> {
        if (e) return log(e);
        console.log("Update content", sn);
    });
}


function save_session(biz, sess) {
    const s = 'INSERT INTO session(biz, session) VALUES (?,?)'
        +' ON DUPLICATE KEY UPDATE session=?;';
    const str = JSON.stringify(sess);

    dbpool.query(s, [biz, str, str], (e, r)=> {
        if (e) log(e);
    });
}


function revert_session(session, cb) {
    const s = 'Select biz, session From session';
    dbpool.query(s, null, (e, r)=> {
        if (e) return cb(e);
        r.forEach(function(d) {
            session[d.biz] = JSON.parse(d.session);
        });
        cb(null, session);
    });
}