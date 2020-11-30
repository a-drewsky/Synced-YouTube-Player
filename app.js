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

let videoQueue = [];

console.log("ID: " + parseYouTubeUrl("black"));

io.sockets.on('connection', function (socket) {

    console.log("socket connected: " + socket.id);
    console.log(host);

    socketList[socket.id] = socket;

    socket.joined = false;

    if (host !== null) socket.emit('isStarted', true); //send socketlist size
    else socket.emit('isStarted', false);

    socket.on('disconnect', function () {
        delete socketList[socket.id];
        console.log("socket disconnected: " + socket.id);
        if (host === socket) {
            host = null;
            for (let socketID in socketList) {
                if (socketID != socket.id) socketList[socketID].emit('hostDisconnected');
            }
            for (let socketID in socketList) {
                if (socketID != socket.id && socketList[socketID].joined) {
                    host = socketList[socketID];
                    console.log(host.id);
                    setNewHost();
                    return
                }
            }
            videoQueue = [];
        }
    });

    socket.on('startOrJoin', function (data) {
        if (host === null) {
            let vidId = parseYouTubeUrl(data);
            if (vidId == false) {
                socket.emit('invalidUrl');
                return;
            }
            socket.joined = true;
            host = socket;
            videoQueue.push({videoId: vidId, title: null});
            socket.emit('startVideo', { videoId:videoQueue[0].videoId });
            for (let socketID in socketList) {
                if (socketID != socket.id) socketList[socketID].emit('hostChosen');
            }
        } else {
            socket.joined = true;
            socket.emit('loadQueue', videoQueue);
            startFromHostTime(socket.id);
        }

    });

    socket.on('recievedHostTime', function (data) {
        socketList[data.socketId].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state, videoId: videoQueue[0].videoId });
    });

    socket.on('recievedHostTimeForAll', function (data) {
        for (let socketID in socketList) {
            if (socketID != host.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state, videoId: videoQueue[0].videoId });
        }
    });

    socket.on('pauseVideo', function () {
        for (let socketID in socketList) {
            if (socketID != socket.id && socketList[socketID].joined) socketList[socketID].emit('pauseVideo');
        }
    });

    socket.on('playVideo', function (data) {
        for (let socketID in socketList) {
            if (socketID != socket.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: 1 });
        }
    });

    socket.on('hostLoadedVideo', function (data) {
        for (let socketID in socketList) {
            if (socketID != host.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { videoId: videoQueue[0], time: 0, timeStap: data, state: 1 });
        }
    });

    socket.on('loadNextVideo', function () {
        videoQueue.shift();
        for (let socketID in socketList) {
            if (socketList[socketID].joined) socketList[socketID].emit('queueShifted');
        }
        
        if(videoQueue.length>0) host.emit('loadNextVideoForHost', { videoId: videoQueue[0].videoId });

    });

    socket.on('addToQueue', function (data) {
        let vidId = parseYouTubeUrl(data.url);
        if (vidId == false) {
            socket.emit('invalidQueueUrl');
            return;
        } else {
            videoQueue.push({videoId: vidId, title: data.title});
            if(videoQueue.length>1){
                for (let socketID in socketList) {
                    if (socketList[socketID].joined) socketList[socketID].emit('videoAddedToQueue', data.title);
                }
            } else {
                host.emit('loadNextVideoForHost', { videoId: videoQueue[0].videoId });
            }

        }
    });

});

function startFromHostTime(socketId) {
    host.emit('getHostTime', socketId);
}

function setNewHost() {
    host.emit('getHostTime', "all");
}

function parseYouTubeUrl(url) {
    var regExp = /^https?\:\/\/(?:www\.youtube(?:\-nocookie)?\.com\/|m\.youtube\.com\/|youtube\.com\/)?(?:ytscreeningroom\?vi?=|youtu\.be\/|vi?\/|user\/.+\/u\/\w{1,2}\/|embed\/|watch\?(?:.*\&)?vi?=|\&vi?=|\?(?:.*\&)?vi?=)([^#\&\?\n\/<>"']*)/i;
    var match = url.match(regExp);
    return (match && match[1].length == 11) ? match[1] : false;
}