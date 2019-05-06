import WebGLCanvas from './yuv-canvas'

const nowValue = Decoder.nowValue

export default class Player {
  constructor (parOptions) {
    this._config = parOptions || {};
    
    this.render = true;
    if (this._config.render === false){
      this.render = false;
    };
    
    this.nowValue = nowValue;
    
    this._config.workerFile = this._config.workerFile || "Decoder.js";
    if (this._config.preserveDrawingBuffer){
      this._config.contextOptions = this._config.contextOptions || {};
      this._config.contextOptions.preserveDrawingBuffer = true;
    };
    
    let webgl = "auto";
    if (this._config.webgl === true) {
      webgl = true;
    } else if (this._config.webgl === false) {
      webgl = false;
    };
    
    if (webgl == "auto") {
      webgl = true;
      try{
        if (!window.WebGLRenderingContext) {
          // the browser doesn't even know what WebGL is
          webgl = false;
        } else {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext("webgl");
          if (!ctx) {
            // browser supports WebGL but initialization failed.
            webgl = false;
          };
        };
      } catch (e) {
        webgl = false;
      };
    };
    
    this.webgl = webgl;
    
    // choose functions
    if (this.webgl) {
      this.createCanvasObj = this.createCanvasWebGL;
      this.renderFrame = this.renderFrameWebGL;
    } else {
      this.createCanvasObj = this.createCanvasRGB;
      this.renderFrame = this.renderFrameRGB;
    };
    
    
    let lastWidth;
    let lastHeight;
    var onPictureDecoded = (buffer, width, height, infos) => {
      this.onPictureDecoded(buffer, width, height, infos);
      
      let startTime = nowValue();
      
      if (!buffer || !this.render) {
        return;
      };
      
      this.renderFrame({
        canvasObj: this.canvasObj,
        data: buffer,
        width: width,
        height: height
      });
      
      if (this.onRenderFrameComplete){
        this.onRenderFrameComplete({
          data: buffer,
          width: width,
          height: height,
          infos: infos,
          canvasObj: this.canvasObj
        });
      };
      
    };
    
    // provide size
    
    if (!this._config.size){
      this._config.size = {};
    };
    this._config.size.width = this._config.size.width || 200;
    this._config.size.height = this._config.size.height || 200;
    
    if (this._config.useWorker){
      var worker = new Worker(this._config.workerFile);
      this.worker = worker;
      worker.addEventListener('message', (e) => {
        var data = e.data;
        if (data.consoleLog){
          console.log(data.consoleLog);
          return;
        };
        
        onPictureDecoded.call(this, new Uint8Array(data.buf, 0, data.length), data.width, data.height, data.infos);
        
      }, false);
      
      worker.postMessage({type: "Broadway.js - Worker init", options: {
        rgb: !webgl,
        memsize: this.memsize,
        reuseMemory: this._config.reuseMemory ? true : false
      }});
      
      if (this._config.transferMemory){
        this.decode = function(parData, parInfo){
          // no copy
          // instead we are transfering the ownership of the buffer
          // dangerous!!!
          
          worker.postMessage({buf: parData.buffer, offset: parData.byteOffset, length: parData.length, info: parInfo}, [parData.buffer]); // Send data to our worker.
        };
        
      } else {
        this.decode = function(parData, parInfo){
          // Copy the sample so that we only do a structured clone of the
          // region of interest
          var copyU8 = new Uint8Array(parData.length);
          copyU8.set( parData, 0, parData.length );
          worker.postMessage({buf: copyU8.buffer, offset: 0, length: parData.length, info: parInfo}, [copyU8.buffer]); // Send data to our worker.
        };
      };
      
      if (this._config.reuseMemory) {
        this.recycleMemory = function(parArray){
          //this.beforeRecycle();
          worker.postMessage({reuse: parArray.buffer}, [parArray.buffer]); // Send data to our worker.
          //this.afterRecycle();
        };
      }
    } else {
      
      this.decoder = new Decoder({
        rgb: !webgl
      });
      this.decoder.onPictureDecoded = onPictureDecoded;

      this.decode = (parData, parInfo) => {
        this.decoder.decode(parData, parInfo);
      };
      
    };
    
    
    
    if (this.render){
      this.canvasObj = this.createCanvasObj({
        contextOptions: this._config.contextOptions
      });
      this.canvas = this.canvasObj.canvas;
    };

    this.domNode = this.canvas;
    
    lastWidth = this._config.size.width;
    lastHeight = this._config.size.height;
  }

  onPictureDecoded (buffer, width, height, infos) {}

  recycleMemory (buf) {}

  createCanvasWebGL (options) {
    const canvasObj = this._createBasicCanvasObj(options)
    canvasObj.contextOptions = options.contextOptions
    return canvasObj
  }

  createCanvasRGB (options) {
    const canvasObj = this._createBasicCanvasObj(options)
    return canvasObj
  }

  _createBasicCanvasObj (options) {
    options = options || {}
    const obj = {}
    let width = options.width
    if (!width) {
      width = this._config.size.width
    }
    let height = options.height
    if (!height) {
      height = this._config.size.height
    }
    obj.canvas = document.createElement("canvas")
    obj.canvas.width = width
    obj.canvas.height = height
    obj.canvas.style.backgroundColor = "#0D0E1B"

    return obj
  }

  renderFrameWebGL (options) {
    const canvasObj = options.canvasObj

    const width = options.width || canvasObj.canvas.width
    const height = options.height || canvasObj.canvas.height

    if (canvasObj.canvas.width !== width || canvasObj.canvas.height !== height || !canvasObj.webGLCanvas) {
      canvasObj.canvas.width = width;
      canvasObj.canvas.height = height;
      canvasObj.webGLCanvas = new WebGLCanvas({
        canvas: canvasObj.canvas,
        contextOptions: canvasObj.contextOptions,
        width: width,
        height: height
      });
    }
    const ylen = width * height;
    const uvlen = (width / 2) * (height / 2);
      
    canvasObj.webGLCanvas.drawNextOutputPicture({
      yData: options.data.subarray(0, ylen),
      uData: options.data.subarray(ylen, ylen + uvlen),
      vData: options.data.subarray(ylen + uvlen, ylen + uvlen + uvlen)
    });
    this.recycleMemory(options.data);
  }

  renderFrameRGB (options) {
    const canvasObj = options.canvasObj;

    const width = options.width || canvasObj.canvas.width;
    const height = options.height || canvasObj.canvas.height;
    
    if (canvasObj.canvas.width !== width || canvasObj.canvas.height !== height){
      canvasObj.canvas.width = width;
      canvasObj.canvas.height = height;
    };
    
    let ctx = canvasObj.ctx;
    let imgData = canvasObj.imgData;

    if (!ctx){
      canvasObj.ctx = canvasObj.canvas.getContext('2d');
      ctx = canvasObj.ctx;

      canvasObj.imgData = ctx.createImageData(width, height);
      imgData = canvasObj.imgData;
    };

    imgData.data.set(options.data);
    ctx.putImageData(imgData, 0, 0);
    this.recycleMemory(options.data);
  }

}