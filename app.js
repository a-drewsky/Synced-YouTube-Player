
//SETUP
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

//list of connections
let socketList = {};

//queue of videoId's and titles
let videoQueue = [];
//END SETUP


//SOCKET CONNECTION
io.sockets.on('connection', function (socket) {

    //socket setup
    console.log("socket connected: " + socket.id);

    socketList[socket.id] = socket;


    if (host !== null) socket.emit('isStarted', { isStarted: true, userCount: getUserCount(), videoTitle: videoQueue[0].title });
    else socket.emit('isStarted', { isStarted: false });

    socket.joined = false;

    //remove socket and check host
    socket.on('disconnect', function () {
        delete socketList[socket.id];
        console.log("socket disconnected: " + socket.id);
        if (host === socket) {
            host = null;
            for (let socketID in socketList) {
                if (socketID != socket.id) socketList[socketID].emit('hostDisconnected');
            }
            setNewHost();
            return;
        }
        updateUserList();
    });


    //if host exists, get host time for socket
    //else set init video and set socket as host
    //launch player
    socket.on('startOrJoin', function (data) {
        if (data.username === null || data.username == "") {
            socket.emit('invalidUsername');
            return;
        } else {
            socket.username = data.username;
        }

        if (host === null) {
            let vidId = parseYouTubeUrl(data.url);
            if (vidId == false) {
                socket.emit('invalidUrl');
                return;
            }
            socket.joined = true;
            host = socket;
            videoQueue.push({ videoId: vidId, title: null });
            socket.emit('startVideo', { videoId: videoQueue[0].videoId });
            for (let socketID in socketList) {
                if (socketID != socket.id) socketList[socketID].emit('hostChosen', { userCount: getUserCount(), videoTitle: videoQueue[0].title });
            }
        } else {
            socket.joined = true;
            socket.emit('loadQueue', videoQueue);
            startFromHostTime(socket.id);
        }
        updateUserList();
    });


    socket.on('checkHostPaused', function () {
        if (socket.id == host.id) {
            host.emit('textPlay');
            for (let socketID in socketList) {
                if (socketID != socket.id && socketList[socketID].joined) socketList[socketID].emit('pauseVideo');
            }
        }
    });


    //start video from time recieved by host
    socket.on('recievedHostTime', function (data) {
        if (!socket.joined) return;
        socketList[data.socketId].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state, videoId: videoQueue[0].videoId });
    });


    //start video for all at time recieved by host
    socket.on('recievedHostTimeForAll', function (data) {
        if (!socket.joined) return;
        for (let socketID in socketList) {
            if (socketID != host.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: data.state, videoId: videoQueue[0].videoId });
        }
    });


    socket.on('playPauseAll', function () {
        host.emit('playPauseHost');
    });


    socket.on('syncVideo', function (data) {
        if (host.id != socket.id){
            startFromHostTime(socket.id);
            host.emit('textPause');
        } 
        else {
            for (let socketID in socketList) {
                if (socketID != socket.id && socketList[socketID].joined) socketList[socketID].emit('startVideo', { time: data.time, timeStamp: data.timeStamp, state: 1 });
            }
        }
    });


    //shift queue and load next video for host
    socket.on('loadNextVideo', function () {

        if (videoQueue.length > 1) {
            videoQueue.shift();
            host.emit('loadNextVideoForHost', { videoId: videoQueue[0].videoId });

            for (let socketID in socketList) {
                if (socketList[socketID].joined) socketList[socketID].emit('loadQueue', videoQueue);
            }
        }

    });


    //add a video to the queue and send update to all
    socket.on('addToQueue', function (data) {
        if (!socket.joined) return;
        let vidId = parseYouTubeUrl(data.url);
        if (vidId == false) {
            socket.emit('invalidQueueUrl');
            return;
        } else {
            videoQueue.push({ videoId: vidId, title: data.title });
            if (videoQueue.length > 1) {
                for (let socketID in socketList) {
                    if (socketList[socketID].joined) socketList[socketID].emit('videoAddedToQueue', data.title);
                }
            } else {
                host.emit('loadNextVideoForHost', { videoId: videoQueue[0].videoId });
            }
        }
    });

    socket.on('takeHost', function () {
        if (socket.id == host.id) return;
        host = socket;
        host.emit('getHostTime', "all");
        updateUserList();
    });

});
//END SOCKET CONNECTION


//HELPER METHODS
function updateUserList() {
    for (let socketID in socketList) {
        if (socketList[socketID].joined) {

            let userList = [];
            for (let socketID2 in socketList) {
                if (socketList[socketID2].joined) userList.push({ name: socketList[socketID2].username, host: socketID2 == host.id, self: socketID == socketID2 });
            }

            socketList[socketID].emit('initUserList', userList);
        }
    }
}

function startFromHostTime(socketId) {
    host.emit('getHostTime', socketId);
}

function setNewHost() {
    for (let socketID in socketList) {
        if (socketList[socketID].joined) {
            host = socketList[socketID];
            host.emit('getHostTime', "all");
            updateUserList();
            return
        }
    }

    videoQueue = [];
}

function parseYouTubeUrl(url) {
    var regExp = /^https?\:\/\/(?:www\.youtube(?:\-nocookie)?\.com\/|m\.youtube\.com\/|youtube\.com\/)?(?:ytscreeningroom\?vi?=|youtu\.be\/|vi?\/|user\/.+\/u\/\w{1,2}\/|embed\/|watch\?(?:.*\&)?vi?=|\&vi?=|\?(?:.*\&)?vi?=)([^#\&\?\n\/<>"']*)/i;
    var match = url.match(regExp);
    return (match && match[1].length == 11) ? match[1] : false;
}

function getUserCount() {
    let count = 0;
    for (let socketID in socketList) {
        if (socketList[socketID].joined) count++;
    }
    return count;
}
//END HELPER METHODS