jQuery(function($) {

const do_method = {
    login,
};

let z = 0;
const jwindow = $(window);
$('#login').fadeIn();
$('dialog').each(function() {
    init_dialog($(this));
});

$('#start').click(start);
$('#show_log').click(show_log);


function start(e) {
    $.get('/sr/start', function(r) {
        alert(r.msg);
    });
}


function show_log(e) {
    let time = 0;
    let dia = show_dialog(e, '#log_template');
    let vm = new Vue({ 
        el: dia.find('table')[0], 
        data: {list:[]},
    });

    let tid = setInterval(update, 1000);
    dia.on('close', function() {
        vm.$destroy();
        clearInterval(tid);
    });

    let form = dia.find('form').submit((i)=> {
        ajax_form(form, (ret)=> {
            vm.$data.list.unshift.apply(vm.$data.list, ret.data);
            ret.data.forEach((r)=> {
                time = Math.max(new Date(r.td).getTime(), time);
            });
        });
        return false;
    });
    update();

    function update() {
        form.find('[name=begin]').val(time);
        form.submit();
    }
}


function alert() {
    let a = [];
    for (let i=0; i<arguments.length; ++i) {
        a[i] = arguments[i];
    }
    window.alert(a.join(' '));
}


function login(ret) {
    $('#mainmenu').fadeIn();
    $('#login').fadeOut();
}


function show_dialog(event, selector) {
    let html = $(selector).html();
    let dis = $(html).appendTo(document.body)
        .offset({ left: event.pageX, top: event.pageY })
        .fadeIn();
    init_dialog(dis);
    return dis;
}


$('#show_org_list').click(function(e) {
    let org = show_dialog(e, '#org_list_template');
    let vbind = new Vue({ 
        el: org.find('table')[0], 
        data: {list:[]},
        methods: {
            changeState(e) {
                let i = e.srcElement;
                let biz = i.getAttribute('biz');
                console.log(biz, i.checked, this);
                $.get('/sr/change_state', {biz: biz, chk: i.checked}, function(msg) {
                    if (msg.code) alert(msg.msg);
                });
            },

            openArticle(e) {
                openArticleDialog(e, e.srcElement.getAttribute('biz'));
            },
        },
    });
    org.on('close', function() {
        vbind.$destroy();
    });

    let form = org.find('form').submit((i)=> {
        ajax_form(form, (ret)=> {
            vbind.$data.list = ret.data;
        });
        return false;
    });
    form.submit();
});


function openArticleDialog(e, biz) {
    let art = show_dialog(e, '#art_list_template');
    let vm = new Vue({ 
        el: art.find('table')[0], 
        data: {list:[]},
        methods: {
            openContent(e) {
                let el = e.srcElement;
                openContentDialog(e, el.getAttribute('biz'), 
                    el.getAttribute('sn'),
                    el.getAttribute('url'));
            },
        },
    });
    art.on('close', function() {
        vm.$destroy();
    });

    let form = art.find('form').submit((i)=> {
        ajax_form(form, (ret)=> {
            vm.$data.list = ret.data;
        });
        return false;
    });
    form.find('[name=biz]').val(biz);
    form.submit();
}


function openContentDialog(e, biz, sn, url) {
    let cnt = show_dialog(e, '#art_content_template');
    cnt.find('[name=url]').val(url);
    cnt.find('.content').attr('src', 
        '/sr/article_content?biz='+ biz +'&sn='+ sn);
}


$('form[class*=ajax]').submit(function() {
    let form = $(this);
    let do_name = form.attr('do');
    let fo_fn;

    if (do_name) {
        fo_fn = do_method[do_name];
        if (typeof fo_fn != 'function') {
            alert(do_name, '不是有效的 do_method 函数');
            return;
        }
    }
    ajax_form(form, fo_fn);
    return false;
});


function ajax_form(form, cb) {
    $.ajax({
        url : form.attr('action'), 
        data: form.serialize(),
        type: form.attr('method'),

        success(ret) {
            if (ret.code == 0 && cb) {
                cb(ret);
                return;
            }
            alert(ret.msg);
        },

        error(xml, text, err) {
            alert(text || err && err.message);
        }
    });
}

    
function init_dialog(dia) {
    let handle = dia.find('.handle');
    // let dia = thiz.parent('dialog');
    let x, y, dx, dy;
    let offset = {};
    dia.css('z-index', z);

    handle.mousedown(function(e) {
        x = e.screenX;
        y = e.screenY;
        let of = dia.offset();
        dx = of.left;
        dy = of.top;
        jwindow.on('mousemove', move);
        handle.addClass('catch');
    });

    dia.click(()=> {
        dia.css('z-index', z++);
    });

    handle.mouseup(over);
    dia.find('.close').click(close);

    function close() {
        over();
        dia.trigger('close');
        dia.fadeOut(function() {
            dia.remove();
        });
    }

    function over() {
        jwindow.off('mousemove', move);
        handle.removeClass('catch');
    }
    
    function move(e) {
        offset.left = dx + e.screenX - x;
        offset.top  = dy + e.screenY - y;
        // console.log(ox, oy);
        dia.offset(offset);
    }
}

});