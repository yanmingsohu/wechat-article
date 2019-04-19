module.exports = {
    add,
    size,
};


const s = [];
let wait = 1000;
let state = 0;


// fn: Function(over())
function add(fn) {
    s.push(fn);
    if (state == 0) start();
}


function start() {
    console.log('.Q ', s.length);
    state = 1;
    if (s.length > 0) {
        fn = s.pop();
        let noerr = 0;
        let overcall = 0;
        try {
            fn(function() {
                if (overcall) return;
                overcall = 1;
                setTimeout(start, wait + wait * Math.random());
            });
            noerr = 1;
        } finally {
            if (!noerr) start();
        }
    } else {
        state = 0;
    }
}


function size() {
    return s.length;
}