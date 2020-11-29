
//SETUP
let socket = io();


let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


let player;
let iframe;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: 2 * (window.innerHeight / 3),
    width: 2 * (window.innerWidth / 3),
    videoId: 'H45U4FL_pQM',
    playerVars: { 'controls': 0, 'disablekb': 1 },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

//ELEMENTS
let txtIsStarted = document.getElementById('txtIsStarted');
let initUrlWrapper = document.getElementById('initUrlWrapper');
let playerDiv;
//END ELEMENTS


//TIME BAR
setInterval(function () {

  let curTime = player.getCurrentTime() / player.getDuration() * 1000;

  let scrolling = curTime < document.getElementById('time').value || curTime - 1 - 1000 / player.getDuration() > document.getElementById('time').value;

  if (!scrolling) document.getElementById('time').value = player.getCurrentTime() / player.getDuration() * 1000;
}, 1000);
//END TIME BAR


//CONNECTION
let settingPaused = false;
let setPause = false;
let loading = false;
let starting = false;
let settingTime = false;
let timeToSet = null;
let timeStamp = null;
let recievedPause = false;

socket.on('isStarted', function (data) {
  if (data) txtIsStarted.innerText = "Join";
  else{
    txtIsStarted.innerText = "Start";
    initUrlWrapper.classList.remove('d-none');
  } 
});

socket.on('hostChosen', function () {
  initUrlWrapper.classList.add('d-none');
  txtIsStarted.innerText = "Join";
});

socket.on('hostDisconnected', function () {
  initUrlWrapper.classList.remove('d-none');
  txtIsStarted.innerText = "Start";
});

socket.on('pauseVideo', function () {
  recievedPause = true;
  player.pauseVideo();
});

socket.on('startVideo', function (data) {
  if (!data) {
    starting = true;
    startVideo();
  }else {
    if(data.state!=1) setPause = true;
    timeToSet = data.time;
    timeStamp = data.timeStamp;
    startVideo();
  }
});

socket.on('getHostTime', function (data) {
  if(data=="all"){
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
    if (!recievedPause) socket.emit('pauseVideo');
    else recievedPause = false;
  }

  if (event.data == YT.PlayerState.PLAYING) {
    if(setPause){
      player.pauseVideo();
      setPause = false;
      settingPaused = true;
    }
    if (loading) {
      document.getElementById('time').value = 0;
      loading = false;
    }
    if (timeToSet) {
      let diffence = (Date.now() - timeStamp) / 1000;
      let curTime = timeToSet + diffence;
      console.log(diffence);
      player.seekTo(curTime, true);
      document.getElementById('time').value = curTime / player.getDuration() * 1000;
      timeToSet = null;
      if(!settingPaused)settingTime = true;
      else settingPaused = false;
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
    loading = true;
    player.loadVideoById("nYIbDAW950s", 0);
    //broadcast command to load new video
  }


}

function startOrJoin() {
  socket.emit('startOrJoin');
}

function setTime() {
  var val = document.getElementById('time').value;
  player.seekTo(val / 1000 * player.getDuration(), true);
}

function skipVideo() {

}

function addToQueue() {

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