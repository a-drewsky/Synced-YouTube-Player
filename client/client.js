
//SETUP
console.log("version 1.0.0");

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
      height: window.innerWidth * 0.5625,
      width: window.innerWidth,
      videoId: 'H45U4FL_pQM',
      events: {
        'onStateChange': onPlayerStateChange,
        'onPlaybackRateChange': onPlayerRateChange
      }
    });
    return;
  }

  player = new YT.Player('player', {
    height: 2 * (window.innerHeight / 3),
    width: 2 * (window.innerWidth / 3),
    videoId: 'H45U4FL_pQM',
    events: {
      'onStateChange': onPlayerStateChange,
      'onPlaybackRateChange': onPlayerRateChange
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
let username = document.getElementById("username");
let userBox = document.getElementById("userBox");
let btnPlayPauseAll = document.getElementById("btnPlayPauseAll");
let playerDiv;
//END ELEMENTS


//CONNECTION
let setPause = false;
let loading = false;
let timeToSet = null;
let timeStamp = null;
let settingTime = false;

let hostEmit = false;

//Ui
socket.on('isStarted', function (data) {

  document.getElementById('playerWrapper').classList.add('d-none');
  document.getElementById('initWrapper').classList.remove('d-none');
  queuBoxWrapper.classList.add("d-none");

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

socket.on('initUserList', function (data) {

  userBox.innerHTML = "";

  document.getElementById('nameWrapper').classList.add('d-none');

  for (let i in data) {
    console.log(data[i].self)
    let nameItem = document.createElement('div');
    nameItem.classList = "row mb-2 ml-1 p-0";
    let circleContainer = document.createElement('div');
    circleContainer.classList = "col-1  p-2";
    if (!data[i].host && data[i].self) {
      let circle = document.createElement('div');
      circle.classList = "greenCircle p-0 align-middle";
      circleContainer.appendChild(circle);
    }
    else if (data[i].host && !data[i].self) {
      let circle = document.createElement('div');
      circle.classList = "orangeCircle p-0 align-middle";
      circleContainer.appendChild(circle);
    }
    else if (data[i].host && data[i].self) {
      let circle = document.createElement('div');
      circle.classList = "redCircle p-0 align-middle";
      circleContainer.appendChild(circle);
    }
    nameItem.appendChild(circleContainer);
    let nameItemText = document.createElement('div');
    nameItemText.innerText = data[i].name;
    nameItemText.classList = "col-10 p-0";
    nameItem.appendChild(nameItemText);
    userBox.appendChild(nameItem);

  }
});

socket.on('loadQueue', function (data) {
  queueBox.innerHTML = "";
  for (let i = 1; i < data.length; i++) {
    let titleDiv = document.createElement('h5');
    titleDiv.classList = "mt-2 ml-4"
    titleDiv.innerText = data[i].title;
    queueBox.appendChild(titleDiv);
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

socket.on('invalidUsername', function () {
  errorMessage.innerText = "Invalid Username";
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

socket.on('textPlay', function(){
  btnPlayPauseAll.innerText = "Play All";
});

socket.on('textPause', function(){
  btnPlayPauseAll.innerText = "Pause All";
});


//Sync
socket.on('startVideo', function (data) {
  btnPlayPauseAll.innerText = "Pause All";
  if (player.loadVideoById) {
    if (data.videoId) {
      player.loadVideoById(data.videoId, 0);
      loading = true;
    }
    if (data.state) {
      if (data.state != 1) setPause = true;
    }
    if (data.time) {
      timeToSet = data.time;
      timeStamp = data.timeStamp;
    }
    startVideo();
  }
});

socket.on('pauseVideo', function () {
  btnPlayPauseAll.innerText = "Play All";
  player.pauseVideo();
});

socket.on('playPauseHost', function () {
  if (player.getPlayerState() == 1) {
    player.pauseVideo();
    btnPlayPauseAll.innerText = "Play All";
  } else {
    player.playVideo();
    btnPlayPauseAll.innerText = "Pause All";
  }
});

socket.on('loadNextVideoForHost', function (data) {
  loading = true;
  player.loadVideoById(data.videoId, 0);
  hostEmit = true;
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


function onPlayerStateChange(event) {

  if (event.data == YT.PlayerState.PAUSED) {
    settingTime = false;
    socket.emit('checkHostPaused');
  }

  if (event.data == YT.PlayerState.PLAYING) {

    if (hostEmit) {
      socket.emit('recievedHostTimeForAll', { time: 0, timeStamp: Date.now(), state: 1 });
      hostEmit = false;
    }

    console.log("loading: " + loading);
    console.log("settingTime: " + settingTime);

    if (!loading && !settingTime) {
      socket.emit('syncVideo', { time: player.getCurrentTime(), timeStamp: Date.now });
      return;
    }

    settingTime = false;
    loading = false;
    if (setPause) {
      player.pauseVideo();
      btnPlayPauseAll.innerText = "Play All";
    }
    setPause = false;

    if (timeToSet) {
      let diffence = (Date.now() - timeStamp) / 1000;
      let curTime = timeToSet + diffence;
      player.seekTo(curTime, true);
      settingTime = true;
    }
    timeToSet = null;
    timeStamp = null;
  }

  if (event.data == YT.PlayerState.ENDED) {
    socket.emit('loadNextVideo');
  }
}

function onPlayerRateChange(event) {
  player.setPlaybackRate(1);
}

function startOrJoin() {
  errorMessage.innerText = "";
  socket.emit('startOrJoin', { url: initUrl.value, username: username.value });
}

function takeHost() {
  socket.emit('takeHost');
}

function skipVideo() {
  socket.emit('loadNextVideo');
}

function playPauseAll() {
  socket.emit('playPauseAll');
}

function addToQueue() {
  queueErrorMessage.innerText = "";
  let title = tbVidTitle.value;
  let url = tbVidUrl.value;
  if (title === null || title == "") title = "Video";
  socket.emit('addToQueue', { url: url, title: title });
}
//END CONTROLS


//ACTIONS
function startVideo() {
  player.playVideo();
  document.getElementById('playerWrapper').classList.remove('d-none');
  document.getElementById('initWrapper').classList.add('d-none');
  queuBoxWrapper.classList.remove("d-none");
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