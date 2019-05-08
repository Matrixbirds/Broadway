import MP4Player from './mp4-player'
import {Stream} from './utils'

import Adapter from './adapter'

class Broadway {
  constructor(div) {
    const src = div.attributes.src ? div.attributes.src.value : undefined;
    const width = div.attributes.width ? div.attributes.width.value : 640;
    const height = div.attributes.height ? div.attributes.height.value : 480;

    const controls = document.createElement('div');
    controls.setAttribute('style', "z-index: 100; position: absolute; bottom: 0px; background-color: rgba(0,0,0,0.8); height: 30px; width: 100%; text-align: left;");
    this.info = document.createElement('div');
    this.info.setAttribute('style', "font-size: 14px; font-weight: bold; padding: 6px; color: lime;");
    controls.appendChild(this.info);
    div.appendChild(controls);
    
    const useWorkers = div.attributes.workers ? div.attributes.workers.value == "true" : false;
    const render = div.attributes.render ? div.attributes.render.value == "true" : false;
    
    let webgl = "auto";
    if (div.attributes.webgl){
      if (div.attributes.webgl.value == "true"){
        webgl = true;
      };
      if (div.attributes.webgl.value == "false"){
        webgl = false;
      };
    };
    
    const infoStrPre = "Click canvas to load and play - ";
    let infoStr = "";
    if (useWorkers){
      infoStr += "worker thread ";
    }else{
      infoStr += "main thread ";
    };

    this.player = new MP4Player(new Stream(src), useWorkers, webgl, render);
    this.player.fps = div.attributes.frameRate ? div.attributes.frameRate.value : 1
    this.canvas = this.player.canvas;
    this.canvas.onclick = function () {
      this.play();
    }.bind(this);
    div.appendChild(this.canvas);
    
    
    infoStr += " - webgl: " + this.player.webgl;
    this.info.innerHTML = infoStrPre + infoStr;
    

    this.score = null;
    this.player.onStatisticsUpdated = (statistics) => {
      if (statistics.videoPictureCounter % 10 != 0) {
        return;
      }
      let info = "";
      if (statistics.fps) {
        info += " fps: " + statistics.fps.toFixed(2);
      }
      if (statistics.fpsSinceStart) {
        info += " avg: " + statistics.fpsSinceStart.toFixed(2);
      }
      const scoreCutoff = 1200;
      if (statistics.videoPictureCounter < scoreCutoff) {
        this.score = scoreCutoff - statistics.videoPictureCounter;
      } else if (statistics.videoPictureCounter == scoreCutoff) {
        this.score = statistics.fpsSinceStart.toFixed(2);
      }
      // info += " score: " + this.score;

      this.info.innerHTML = infoStr + info;
    }
  }

  play() {
    this.player.play();
  }
}

function load() {
  var nodes = document.querySelectorAll('div.broadway');
  for (var i = 0; i < nodes.length; i++) {
    var broadway = new Broadway(nodes[i]);
    broadway.play();
  }
}

window.addEventListener("DOMContentLoaded", (evt) => {
  load()
  const adapter = new Adapter('ws://localhost:8080')
  adapter.on("connect", (evt) => {
    adapter.emit('chat message', 'connect')
  })
  adapter.on("disconnect", (evt) => {
    console.log("disconnect", evt)
  })
  adapter.on("chat message", (evt) => {
    // adapter.emit('chat message', evt)
  })
  adapter.on("data", (buffer) => {
    console.log("buffer >>>>>>>> ", buffer)
  })
  adapter.connect().then(() => {
  })
  loadBuf()
  console.log("[page load]")
})