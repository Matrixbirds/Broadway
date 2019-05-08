export const error = (args) => {
  console.error(args)
  console.trace()
}

export const assert = (conditions) => {
  if (!conditions) {
    error(conditions)
  }
}

export class Stream {
  constructor (url, buffer) {
    this.url = url
    this.buffer = buffer
  }

  readAll (progress, complete) {
    const xhr = new XMLHttpRequest()
    let async = true
    xhr.open("GET", this.url, async)
    xhr.responseType = "arraybuffer"
    if (progress) {
      xhr.onprogress = function (event) {
        progress(xhr.response, event.loaded, event.total)
      }
    }
    xhr.onreadystatechange = function (event) {
      if (xhr.readyState === 4) {
        complete(xhr.response)
      }
    }
    xhr.send(null)
  }
}

export class Size {
  constructor(w, h) {
    this.w = w
    this.h = h
  }

  toString () {
    return `(${this.w}, ${this.h})`
  }

  getHalfSize () {
    return new Size(this.w >>> 1, this.h >>> 1)
  }

  length () {
    return this.w * this.h
  }
}

let subCount = 0

export class Bytestream {
  constructor(arrayBuffer, start, length) {
    this.bytes = new Uint8Array(arrayBuffer);
    this.start = start || 0;
    this._pos = this.start;
    this.end = (start + length) || this.bytes.length;
  }

  get length() {
    return this.end - this.start;
  }

  get position() {
    return this.pos;
  }

  get remaining() {
    return this.end - this.pos;
  }

  get pos() {
    return this._pos
  }

  set pos (newVal) {
    this._pos = newVal
    // console.log("this._pos ", this._pos)
  }

  readU8Array(length) {
    if (this.pos > this.end - length)
      return null;
    const res = this.bytes.subarray(this.pos, this.pos + length);
    this.pos += length;
    return res;
  }

  readU32Array (rows, cols, names) {
    cols = cols || 1;
    if (this.pos > this.end - (rows * cols) * 4)
      return null;
    if (cols == 1) {
      const array = new Uint32Array(rows);
      for (let i = 0; i < rows; i++) {
        array[i] = this.readU32();
      }
      return array;
    } else {
      const array = new Array(rows);
      for (let i = 0; i < rows; i++) {
        let row = null;
        if (names) {
          row = {};
          for (let j = 0; j < cols; j++) {
            row[names[j]] = this.readU32();
          }
        } else {
          row = new Uint32Array(cols);
          for (let j = 0; j < cols; j++) {
            row[j] = this.readU32();
          }
        }
        array[i] = row;
      }
      return array;
    }
  }
  read8() {
    return this.readU8() << 24 >> 24;
  }
  readU8() {
    if (this.pos >= this.end)
      return null;
    return this.bytes[this.pos++];
  }

  read16() {
    return this.readU16() << 16 >> 16;
  }

  readU16() {
    if (this.pos >= this.end - 1)
      return null;
    const res = this.bytes[this.pos + 0] << 8 | this.bytes[this.pos + 1];
    this.pos += 2;
    return res;
  }

  read24() {
    return this.readU24() << 8 >> 8;
  }

  readU24() {
    const pos = this.pos;
    const bytes = this.bytes;
    if (pos > this.end - 3)
      return null;
    const res = bytes[pos + 0] << 16 | bytes[pos + 1] << 8 | bytes[pos + 2];
    this.pos += 3;
    return res;
  }

  peek32(advance) {
    const pos = this.pos;
    const bytes = this.bytes;
    if (pos > this.end - 4)
      return null;
    const res = bytes[pos + 0] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3];
    if (advance) {
      this.pos += 4;
    }
    return res;
  }

  read32() {
    return this.peek32(true);
  }

  readU32() {
    return this.peek32(true) >>> 0;
  }

  read4CC() {
    const pos = this.pos;
    if (pos > this.end - 4)
      return null;
    let res = "";
    for (let i = 0; i < 4; i++) {
      res += String.fromCharCode(this.bytes[pos + i]);
    }
    this.pos += 4;
    return res;
  }

  readFP16() {
    return this.read32() / 65536;
  }

  readFP8() {
    return this.read16() / 256;
  }

  readISO639() {
    const bits = this.readU16();
    let res = "";
    for (let i = 0; i < 3; i++) {
      const c = (bits >>> (2 - i) * 5) & 0x1f;
      res += String.fromCharCode(c + 0x60);
    }
    return res;
  }

  readUTF8 (length) {
    let res = "";
    for (let i = 0; i < length; i++) {
      res += String.fromCharCode(this.readU8());
    }
    return res;
  }

  readPString (max) {
    const len = this.readU8();
    assert (len <= max);
    let res = this.readUTF8(len);
    this.reserved(max - len - 1, 0);
    return res;
  }

  skip (length) {
    this.seek(this.pos + length)
  }

  reserved (length, value) {
    for (let i = 0; i < length; i++) {
      assert (this.readU8() == value);
    }
  }

  seek (index) {
    if (index < 0 || index > this.end) {
      error("Index out of bounds (bounds: [0, " + this.end + "], index: " + index + ").");
      return null
    }
    this.pos = index;
  }


  subStream (start, length) {
    subCount++
    console.log("buffer ", this.bytes.buffer, start, length)
    console.log("subcount ", subCount)
    return new Bytestream(this.bytes.buffer, start, length);
  }
}