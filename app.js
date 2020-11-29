let express = require('express');
let app = express();
let serv = require('http').Server(app);
let io = require('socket.io')(serv, {});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

console.log("server started");

let host = null;

let socketList = {};

io.sockets.on('connection', function (socket) {

    console.log("socket connected: " + socket.id);
    console.log(host);

    socketList[socket.id] = socket;

    socket.joined = false;

    if (host !== null) socket.emit('isStarted', true);
    else socket.emit('isStarted', false);
    
    socket.on('disconnect', function () {
        delete socketList[socket.id];
        console.log("socket disconnected: " + socket.id);
        if (host === socket) {
            console.log(host.id);
            host = null;
            for(let socketID in socketList){
                if(socketID !=socket.id && socketList[socketID].joined){
                    host = socketList[socketID];
                    console.log(host.id);
                    setNewHost();
                    return
                } 
            }
            for(let socketID in socketList){
                if(socketID !=socket.id) socketList[socketID].emit('hostDisconnected');
            }
        }
    });

    socket.on('startOrJoin', function () {
        socket.joined = true;
        if (host === null) {
            host = socket;
            socket.emit('startVideo');
            for(let socketID in socketList){
                if(socketID !=socket.id) socketList[socketID].emit('hostChosen');
            }
        } else {
            startFromHostTime(socket.id);
        }

    });

    socket.on('recievedHostTime', function(data){
        socketList[data.socketId].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state});
    });

    socket.on('recievedHostTimeForAll', function(data){
        for(let socketID in socketList){
            if(socketID !=host.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state});
        }
    });

    socket.on('pauseVideo', function(){
        for(let socketID in socketList){
            if(socketID !=socket.id && socketList[socketID].joined) socketList[socketID].emit('pauseVideo');
        }
    });

    socket.on('playVideo', function(data){
        for(let socketID in socketList){
            if(socketID !=socket.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: 1});
        }
    });

});

function startFromHostTime(socketId){
    host.emit('getHostTime', socketId);
}

function setNewHost(){
    host.emit('getHostTime', "all");
}