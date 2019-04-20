const express = require('express')
const app = express();
const db = require('./db.js');
const sp = require('./sp.js');
const qu = require('./queue.js');
const moment = require('moment');

app.use(express.static('web'));


app.post('/login', (req, res)=> {
    res.json({ code:0, msg: '登录成功' });
});


app.post('/logout', (req, res)=> {
    res.json({ code:0, msg: '登出成功' });
});


app.get('/sr/org', (req, res)=> {
    db.org_list(req.query.name, (e, row)=> {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, data:row });
    });
});


app.get('/sr/start', (req, res)=> {
    db.log("开始任务");
    db.org_list_down((e, row)=> {
        if (e) return res.json({ code:1, msg:e.message });
        row.forEach(function(r) {
            sp.msglist(r.biz, 0, function() {
                downMsg(r.biz);
            });
        });
        res.json({ code:0, msg: row.length +'个机构等待同步' });
    });

    function downMsg(biz) {
        db.get_article_from(biz, (e, rows)=> {
            if (e) return db.log(e);
            rows.forEach(function(r) {
                sp.msg_content(r.sn, r.url);
            });
        });
    }
});


app.get('/sr/log', (req, res)=> {
    let begin = moment(new Date(parseInt(req.query.begin)))
        .format('YYYY-MM-DD HH:mm:ss');
    db.get_log(begin, (e, r)=> {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, data:r });
    });
});


app.get('/sr/change_state', (req, res)=> {
    let st = req.query.chk == 'true' ? 2:1;
    db.change_state(req.query.biz, st, function(e, r) {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, msg: '完成' });
    });
});


app.get('/sr/get_article', (req, res)=> {
    db.get_article_page(req.query.biz, req.query.pn, function(e, r) {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, data:r });
    });
});


app.get('/sr/article_content', (req, res)=> {
    db.get_atricel_content(req.query.biz, req.query.sn, (e, r)=> {
        if (e) return res.end(e.message);
        if (r[0]) {
            res.end(r[0].html);
        } else {
            res.end('文章内容为空');
        }
    });
});


app.get('/sr/queuewait', (req, res)=> {
    res.json({ code:0, msg:'wait '+ qu.size() })
});


module.exports = {
    start(port) {
        app.listen(port);
        console.log('http://localhost:'+ port);
    },
};