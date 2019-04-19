const express = require('express')
const app = express();
const db = require('./db.js');
const sp = require('./sp.js');

app.use(express.static('web'));


app.get('/sr/org', (req, res)=> {
    db.org_list(req.query.name, (e, row)=> {
        if (e) return res.json({ code:1, msg:e.message });
        res.json({ code:0, data:row });
    });
});


app.get('/sr/msglist', (req, res)=> {
    sp.msglist('MzA3NTcwOTIwNg==');
    res.json({ code:0, msg:'ok' });
});


module.exports = {
    start(port) {
        app.listen(port);
        console.log('http://localhost:'+ port);
    },
};