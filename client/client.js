
//SETUP
let socket = io();


let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


let player;
let iframe;
function onYouTubeIframeAPIReady() {

  if (window.innerWidth < 992) {
    player = new YT.Player('player', {
      height: window.innerWidth*0.75,
      width: window.innerWidth,
      videoId: 'H45U4FL_pQM',
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
    return;
  }

  player = new YT.Player('player', {
    height: 2 * (window.innerHeight / 3),
    width: 2 * (window.innerWidth / 3),
    videoId: 'H45U4FL_pQM',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}
//END SETUP


//ELEMENTS
let txtIsStarted = document.getElementById('txtIsStarted');
let initUrlWrapper = document.getElementById('initUrlWrapper');
let initUrl = document.getElementById("initUrl");
let errorMessage = document.getElementById("errorMessage");
let queueErrorMessage = document.getElementById("queueErrorMessage");
let tbVidTitle = document.getElementById("tbVidTitle");
let tbVidUrl = document.getElementById("tbVidUrl");
let queueBox = document.getElementById("queueBox");
let initLabelWrapper = document.getElementById("initLabelWrapper");
let txtInitLabel = document.getElementById("txtInitLabel");
let queuBoxWrapper = document.getElementById("queuBoxWrapper");
let playerDiv;
//END ELEMENTS


//CONNECTION
let setPause = false;
let loading = false;
let starting = false;
let settingTime = false;
let timeToSet = null;
let timeStamp = null;
let recievedPause = false;

socket.on('isStarted', function (data) {
  if (data.isStarted) {
    txtIsStarted.innerText = "Join";
    initLabelWrapper.classList.remove('d-none');
    if (data.userCount == 1) txtInitLabel.innerText = "1 user watching";
    else txtInitLabel.innerText = data.userCount + " users watching";

  }
  else {
    txtIsStarted.innerText = "Start";
    initUrlWrapper.classList.remove('d-none');
  }
});

socket.on('loadQueue', function (data) {
  for (let i = 1; i < data.length; i++) {
    let titleDiv = document.createElement('h5');
    titleDiv.classList = "mt-2 ml-4"
    titleDiv.innerText = data[i].title;
    queueBox.appendChild(titleDiv);
  }
});

socket.on('startVideo', function (data) {
  if (player.loadVideoById) {
    queuBoxWrapper.classList.remove("d-none");
    if (!data.state) {
      starting = true;
      if (data.videoId) {
        player.loadVideoById(data.videoId, 0);
        loading = true;
      }
      startVideo();
    } else {
      if (data.videoId) {
        player.loadVideoById(data.videoId, 0);
        loading = true;
      }
      if (data.state != 1) setPause = true;
      timeToSet = data.time;
      timeStamp = data.timeStamp;
      startVideo();
    }
  }
});

socket.on('hostChosen', function (data) {
  initUrlWrapper.classList.add('d-none');
  initLabelWrapper.classList.remove('d-none');
  txtIsStarted.innerText = "Join";
  if (data.userCount == 1) txtInitLabel.innerText = "1 user watching";
  else txtInitLabel.innerText = data.userCount + " users watching";
});

socket.on('hostDisconnected', function () {
  initUrlWrapper.classList.remove('d-none');
  initLabelWrapper.classList.add('d-none');
  txtIsStarted.innerText = "Start";
});

socket.on('invalidUrl', function () {
  errorMessage.innerText = "Invalid URL";
});

socket.on('invalidQueueUrl', function () {
  queueErrorMessage.innerText = "Invalid URL";
  tbVidTitle.value = "";
  tbVidUrl.value = "";
});

socket.on('videoAddedToQueue', function (data) {
  tbVidTitle.value = "";
  tbVidUrl.value = "";
  let titleDiv = document.createElement('h5');
  titleDiv.classList = "mt-2 ml-4"
  titleDiv.innerText = data;
  queueBox.appendChild(titleDiv);
});

socket.on('queueShifted', function () {
  queueBox.removeChild(queueBox.childNodes[0]);
});

socket.on('pauseVideo', function () {
  recievedPause = true;
  player.pauseVideo();
});

socket.on('loadNextVideoForHost', function (data) {
  loading = true;
  player.loadVideoById(data.videoId, 0);
  socket.emit('hostLoadedVideo', Date.now());
});


socket.on('getHostTime', function (data) {
  if (data == "all") {
    socket.emit('recievedHostTimeForAll', { time: player.getCurrentTime(), timeStamp: Date.now(), state: player.getPlayerState() });
  } else {
    socket.emit('recievedHostTime', { socketId: data, time: player.getCurrentTime(), timeStamp: Date.now(), state: player.getPlayerState() });
  }
});
//END CONNECTION


//CONTROLS
function onPlayerReady(event) {

}

function onPlayerStateChange(event) {

  if (event.data == YT.PlayerState.PAUSED) {
    if (!recievedPause && !loading) socket.emit('pauseVideo');
    else {
      recievedPause = false;
      loading = false;
    }
  }

  if (event.data == YT.PlayerState.PLAYING) {
    if (setPause) {
      player.pauseVideo();
    }
    if (loading) {
      loading = false;
    }
    if (timeToSet) {
      let diffence = (Date.now() - timeStamp) / 1000;
      let curTime = timeToSet + diffence;
      player.seekTo(curTime, true);
      timeToSet = null;
      if (!setPause) settingTime = true;
      else setPause = false;
      return;
    }
    if (!starting && !settingTime) {
      socket.emit('playVideo', { time: player.getCurrentTime(), timeStamp: Date.now() });
      return;
    }
    starting = false;
    settingTime = false;
  }

  if (event.data == YT.PlayerState.ENDED) {
    socket.emit('loadNextVideo');
  }
}

function startOrJoin() {
  errorMessage.innerText = "";
  socket.emit('startOrJoin', initUrl.value);
}



function skipVideo() {
  socket.emit('loadNextVideo');
}

function addToQueue() {
  queueErrorMessage.innerText = "";
  let title = tbVidTitle.value;
  let url = tbVidUrl.value;

  socket.emit('addToQueue', { url: url, title: title });
}
//END CONTROLS


//ACTIONS
function startVideo() {
  player.seekTo(0, true);
  player.playVideo();
  player.setVolume(100);
  document.getElementById('playerWrapper').classList.remove('d-none');
  document.getElementById('initWrapper').classList.add('d-none');
  playerDiv = document.getElementById("player");

}
//END ACTIONS


//MOUSE EVENTS
let yPrev, xPrev

let yBar = document.getElementById("ySizeBar");

yBar.addEventListener('mousedown', function (e) {
  e.preventDefault();
  yPrev = e.clientY;
  window.addEventListener('mousemove', reSize);
});

window.addEventListener('mouseup', function (e) {
  window.removeEventListener('mousemove', reSize);
});

window.addEventListener('mouseout', function (e) {
  window.removeEventListener('mousemove', reSize);
});

function reSize(e) {
  if ((playerDiv.offsetHeight <= 50 && (e.clientY - yPrev) < 0) || (playerDiv.offsetHeight >= 800 && (e.clientY - yPrev) > 0)) return;
  player.setSize((playerDiv.offsetHeight + (e.clientY - yPrev)) * (window.innerWidth / window.innerHeight), playerDiv.offsetHeight + (e.clientY - yPrev));
  yPrev = e.clientY;
}
//END MOUSE EVENTS