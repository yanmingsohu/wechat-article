const express = require('express')
const app = express();
const db = require('./db.js');
const sp = require('./sp.js');
const qu = require('./queue.js');

app.use(express.static('web'));


app.get('/sr/org', (req, res)=> {
    db.org_list(req.query.name, (e, row)=> {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, data:row });
    });
});


app.get('/sr/start', (req, res)=> {
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


app.get('/sr/queuewait', (req, res)=> {
    res.join({ code:0, msg:'wait '+ qu.size() })
});


module.exports = {
    start(port) {
        app.listen(port);
        console.log('http://localhost:'+ port);
    },
};