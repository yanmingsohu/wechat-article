const net = require('net');
const url = require('url');
const zlib = require('zlib');
const { Transform } = require('stream');

const log = console;
const server = net.createServer(newClient);
server.listen(80);
log.log('Proxy Start 80');


class LogTxt extends Transform {
    constructor(options) {
        super(options);
        this.writableObjectMode = true;
    }

    _transform(chunk, encoding, callback) {
        log.log(chunk.toString());
        this.push(chunk);
        callback();
    }
}


class LogTxtGzip extends Transform {
    constructor(options) {
        super(options);
        this.gzip = zlib.createGunzip();
        this.writableObjectMode = true;
        this.gzip.on('data', (ud)=> {
            log.log(ud.toString());
        });
    }

    _transform(chunk, encoding, callback) {
        log.log(chunk.toString());
        this.gzip.write(chunk);
        this.push(chunk);
        callback();
    }
}


function newClient(client) {
    client.on('end', ()=> {
        // log.debug("client out");
    });

    client.on('error', (err)=> {
        log.error("Client Err", err.message);
    });

    client.once('data', (data)=> {
        log.info("-------------------------------->");
        let header = data.toString();
        log.info(header);
        let req_url = /[A-Z]+\s+([^\s]+)\s+HTTP/.exec(header)[1];
        let host, port;

        if (req_url.indexOf('://') < 0) {
            let i = req_url.split(':');
            if (i.length > 1) {
                host = i[0];
                port = i[1];
            } else {
                host = i[0];
                port = 80;
            }
        } else {
            let urldata = url.parse(req_url);
            host = urldata.hostname;
            port = urldata.port || 80;
        }

        let isMeizu = host.indexOf('meizu.com') >= 0;
        let isConnect = header.startsWith('CONNECT');
        // let isGzip = header.indexOf('gzip') > 0;
        if (isMeizu) {
            client.destroy();
            return;
        }

        // log.info("Proxy", host, port);
        proxyTo(isConnect ? null : data, client, host, port, LogTxt);
    });
}


function findBody(data) {
    const CR = '\r'.charCodeAt(0);
    const LF = '\n'.charCodeAt(0);
    let st = 0;
    for (let i=0; i<data.length; ++i) {
        switch (st) {
            case 0:
            case 2:
                if (data[i] == CR) ++st;
                else st = 0;
                break;

            case 1:
            case 3:
                if (data[i] == LF) ++st;
                else st = 0;
                break;

            default:
                st = 0;
                break;
        }
        if (st == 4) return i+1;
    }
    return -1;
}


function proxyTo(first_block, clientSocket, host, port, Log) {
    var targetSocket = net.createConnection(port, host, function() {
        if (first_block) {
            targetSocket.write(first_block);
        } else {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        }
        // clientSocket.pipe(new Log()).pipe(targetSocket);
        // targetSocket.pipe(new Log()).pipe(clientSocket);
        clientSocket.pipe(targetSocket);
        targetSocket.pipe(clientSocket);
    });

    targetSocket.on('end', function() {
        clientSocket.end();
        // log.info("Host end", host, port);
    });

    targetSocket.on('error', (err)=> {
        log.error('Target Err', err.message);
    });
}
