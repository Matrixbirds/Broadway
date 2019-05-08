import Player from './player'
import {Bytestream, Size} from './utils'
import MP4Reader from './media/mp4-reader'

export default class MP4Player {
  constructor(stream, useWorkers, webgl, render) {
    this.stream = stream;
    this.useWorkers = useWorkers;
    this.webgl = webgl;
    this.render = render;

    this.statistics = {
      videoStartTime: 0,
      videoPictureCounter: 0,
      windowStartTime: 0,
      windowPictureCounter: 0,
      fps: 0,
      fpsMin: 1000,
      fpsMax: -1000,
      webGLTextureUploadTime: 0,
    };

    this.onStatisticsUpdated = function () {};

    this.avc = new Player({
      useWorker: useWorkers,
      reuseMemory: true,
      webgl: webgl,
      size: {
        width: 640,
        height: 368
      }
    });
    
    this.webgl = this.avc.webgl;
    
    this.avc.onPictureDecoded = () => {
      this.updateStatistics()
    };

    // this.avc.onRenderFrameComplete = ({data, infos}) => {
    //   console.log(" data ", data, infos)
    // }
    
    this.canvas = this.avc.canvas;

    this.fps = 1
  }

  updateStatistics() {
    const reader = this.reader;
    const video = reader.tracks[1];
    const s = this.statistics;
    s.videoPictureCounter += 1;
    s.windowPictureCounter += 1;
    const now = Date.now();
    if (!s.videoStartTime) {
      s.videoStartTime = now;
    }
    const videoElapsedTime = now - s.videoStartTime;
    s.elapsed = videoElapsedTime / 1000;
    if (videoElapsedTime < 1000) {
      return;
    }

    if (!s.windowStartTime) {
      s.windowStartTime = now;
      return;
    } else if ((now - s.windowStartTime) > 1000) {
      const windowElapsedTime = now - s.windowStartTime;
      const fps = (s.windowPictureCounter / windowElapsedTime) * 1000;
      s.windowStartTime = now;
      s.windowPictureCounter = 0;

      if (fps < s.fpsMin) s.fpsMin = fps;
      if (fps > s.fpsMax) s.fpsMax = fps;
      s.fps = fps;
    }

    const fps = (s.videoPictureCounter / videoElapsedTime) * 1000;
    s.fpsSinceStart = fps;
    s.totallySampleCount = video.getSampleCount()
    this.onStatisticsUpdated(this.statistics);
    return;
  }

  readAll(callback) {
    // setTimeout(() => {
    //   console.info("MP4Player::readAll()");
    //   const bytestream = new Bytestream(this.stream.buffer)
    //   console.log("bytestream ", bytestream)
    //   this.reader = new MP4Reader(bytestream)
    //   this.reader.read()
    //   console.log("this.reader ", this.reader)
    //   const video = this.reader.tracks[1]
    //   this.size = new Size(video.trak.tkhd.width, video.trak.tkhd.height);
    //   console.info("MP4Player::readAll(), length: " +  this.reader.stream.length);
    //   if (callback) callback()
    // })
    this.stream.readAll(null, (buffer) => {
      // console.log("this.stream ", this.stream)
      this.reader = new MP4Reader(new Bytestream(buffer));
      // console.log("this.reader ", this.reader)
      this.reader.read();
      const video = this.reader.tracks[1];
      this.size = new Size(video.trak.tkhd.width, video.trak.tkhd.height);
      // console.info("MP4Player::readAll(), length: " +  this.reader.stream.length);
      if (callback) callback();
    });
  }

  set fps (frameRate) {
    this._fps = frameRate
    console.log("set fps as " + this._fps)
  }

  get fps () {
    return this._fps
  }

  play() {
    const reader = this.reader;

    if (!reader) {
      console.log("reader is empty")
      this.readAll(this.play.bind(this))
      return
    };

    const video = reader.tracks[1];
    const audio = reader.tracks[2];

    console.log("reader ", reader)

    const avc = reader.tracks[1].trak.mdia.minf.stbl.stsd.avc1.avcC;
    const sps = avc.sps[0];
    const pps = avc.pps[0];

    /* Decode Sequence & Picture Parameter Sets */
    this.avc.decode(sps);
    this.avc.decode(pps);

    /* Decode Pictures */
    let pic = 0;
    setTimeout(function decodePictures() {
      const avc = this.avc;
      video.getSampleNALUnits(pic).forEach(function (nal) {
        avc.decode(nal);
      });
      pic++
      if (pic < video.getSampleCount()) {
        setTimeout(decodePictures.bind(this), 1000 / this.fps);
      };
    }.bind(this), 1000 / this.fps);
  }
}