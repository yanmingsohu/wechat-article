const mysql = require('mysql');


module.exports = {
    init,
    log,
    add_org,
    org_exists,
    org_list,
    insert_msg,
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

    dbpool.query(s, [msg.join(' ')], (e, r, m)=> {
        if (e) {
            console.error(e);
        }
        console.info(msg);
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