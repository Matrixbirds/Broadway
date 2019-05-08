import Track from './track'
import {assert} from '../utils'

export default class MP4Reader {
  constructor (stream) {
    this.stream = stream
    this.tracks = {}
  }

  readBoxes (stream, parent) {
    while (stream.peek32()) {
      const child = this.readBox(stream);
      if (child.type in parent) {
        const old = parent[child.type];
        if (!Array.isArray(old)) {
          parent[child.type] = [old];
        }
        parent[child.type].push(child);
      } else {
        parent[child.type] = child;
      }
    }
    console.log("readBoxes parent ", parent)
  }
  
  readBox (stream) {
    const box = { offset: stream.position };

    function readHeader() {
      box.size = stream.readU32();
      box.type = stream.read4CC();
      // console.log("readHeader ", box)
    }

    function readFullHeader() {
      box.version = stream.readU8();
      box.flags = stream.readU24();
    }

    function remainingBytes() {
      console.log("box.size ", box.size, stream.position, box.offset)
      return box.size - (stream.position - box.offset);
    }

    function skipRemainingBytes () {
      stream.skip(remainingBytes());
    }

    const readRemainingBoxes = () => {
      console.log("stream.position ", stream.position, remainingBytes())
      const subStream = stream.subStream(stream.position, remainingBytes());
      console.log("subStream ", subStream, subStream.length)
      this.readBoxes(subStream, box);
      stream.skip(subStream.length);
    };

    readHeader();

    let count = 0
    switch (box.type) {
      case 'ftyp':
        box.name = "File Type Box";
        box.majorBrand = stream.read4CC();
        box.minorVersion = stream.readU32();
        box.compatibleBrands = new Array((box.size - 16) / 4);
        for (let i = 0; i < box.compatibleBrands.length; i++) {
          box.compatibleBrands[i] = stream.read4CC();
        }
        break;
      case 'moov':
        box.name = "Movie Box";
        readRemainingBoxes();
        break;
      case 'mvhd':
        box.name = "Movie Header Box";
        readFullHeader();
        assert (box.version == 0);
        box.creationTime = stream.readU32();
        box.modificationTime = stream.readU32();
        box.timeScale = stream.readU32();
        box.duration = stream.readU32();
        box.rate = stream.readFP16();
        box.volume = stream.readFP8();
        stream.skip(10);
        box.matrix = stream.readU32Array(9);
        stream.skip(6 * 4);
        box.nextTrackId = stream.readU32();
        break;
      case 'trak':
        box.name = "Track Box";
        readRemainingBoxes();
        this.tracks[box.tkhd.trackId] = new Track(this, box);
        break;
      case 'tkhd':
        box.name = "Track Header Box";
        readFullHeader();
        assert (box.version == 0);
        box.creationTime = stream.readU32();
        box.modificationTime = stream.readU32();
        box.trackId = stream.readU32();
        stream.skip(4);
        box.duration = stream.readU32();
        stream.skip(8);
        box.layer = stream.readU16();
        box.alternateGroup = stream.readU16();
        box.volume = stream.readFP8();
        stream.skip(2);
        box.matrix = stream.readU32Array(9);
        box.width = stream.readFP16();
        box.height = stream.readFP16();
        break;
      case 'mdia':
        box.name = "Media Box";
        readRemainingBoxes();
        break;
      case 'mdhd':
        box.name = "Media Header Box";
        readFullHeader();
        assert (box.version == 0);
        box.creationTime = stream.readU32();
        box.modificationTime = stream.readU32();
        box.timeScale = stream.readU32();
        box.duration = stream.readU32();
        box.language = stream.readISO639();
        stream.skip(2);
        break;
      case 'hdlr':
        box.name = "Handler Reference Box";
        readFullHeader();
        stream.skip(4);
        box.handlerType = stream.read4CC();
        stream.skip(4 * 3);
        var bytesLeft = box.size - 32;
        if (bytesLeft > 0) {
          box.name = stream.readUTF8(bytesLeft);
        }
        break;
      case 'minf':
        box.name = "Media Information Box";
        readRemainingBoxes();
        break;
      case 'stbl':
        box.name = "Sample Table Box";
        readRemainingBoxes();
        break;
      case 'stsd':
        box.name = "Sample Description Box";
        readFullHeader();
        box.sd = [];
        var entries = stream.readU32();
        readRemainingBoxes();
        break;
      case 'avc1':
        stream.reserved(6, 0);
        box.dataReferenceIndex = stream.readU16();
        assert (stream.readU16() == 0); // Version
        assert (stream.readU16() == 0); // Revision Level
        stream.readU32(); // Vendor
        stream.readU32(); // Temporal Quality
        stream.readU32(); // Spatial Quality
        box.width = stream.readU16();
        box.height = stream.readU16();
        box.horizontalResolution = stream.readFP16();
        box.verticalResolution = stream.readFP16();
        assert (stream.readU32() == 0); // Reserved
        box.frameCount = stream.readU16();
        box.compressorName = stream.readPString(32);
        box.depth = stream.readU16();
        assert (stream.readU16() == 0xFFFF); // Color Table Id
        readRemainingBoxes();
        break;
      case 'mp4a':
        stream.reserved(6, 0);
        box.dataReferenceIndex = stream.readU16();
        box.version = stream.readU16();
        stream.skip(2);
        stream.skip(4);
        box.channelCount = stream.readU16();
        box.sampleSize = stream.readU16();
        box.compressionId = stream.readU16();
        box.packetSize = stream.readU16();
        box.sampleRate = stream.readU32() >>> 16;

        // TODO: Parse other version levels.
        assert (box.version == 0);
        readRemainingBoxes();
        break;
      case 'esds':
        box.name = "Elementary Stream Descriptor";
        readFullHeader();
        // TODO: Do we really need to parse this?
        skipRemainingBytes();
        break;
      case 'avcC':
        box.name = "AVC Configuration Box";
        box.configurationVersion = stream.readU8();
        box.avcProfileIndication = stream.readU8();
        box.profileCompatibility = stream.readU8();
        box.avcLevelIndication = stream.readU8();
        box.lengthSizeMinusOne = stream.readU8() & 3;
        assert (box.lengthSizeMinusOne == 3, "TODO");
        count = stream.readU8() & 31;
        box.sps = [];
        for (let i = 0; i < count; i++) {
          box.sps.push(stream.readU8Array(stream.readU16()));
        }
        count = stream.readU8() & 31;
        box.pps = [];
        for (let i = 0; i < count; i++) {
          box.pps.push(stream.readU8Array(stream.readU16()));
        }
        skipRemainingBytes();
        break;
      case 'btrt':
        box.name = "Bit Rate Box";
        box.bufferSizeDb = stream.readU32();
        box.maxBitrate = stream.readU32();
        box.avgBitrate = stream.readU32();
        break;
      case 'stts':
        box.name = "Decoding Time to Sample Box";
        readFullHeader();
        box.table = stream.readU32Array(stream.readU32(), 2, ["count", "delta"]);
        break;
      case 'stss':
        box.name = "Sync Sample Box";
        readFullHeader();
        box.samples = stream.readU32Array(stream.readU32());
        break;
      case 'stsc':
        box.name = "Sample to Chunk Box";
        readFullHeader();
        box.table = stream.readU32Array(stream.readU32(), 3,
          ["firstChunk", "samplesPerChunk", "sampleDescriptionId"]);
        break;
      case 'stsz':
        box.name = "Sample Size Box";
        readFullHeader();
        box.sampleSize = stream.readU32();
        count = stream.readU32();
        if (box.sampleSize == 0) {
          box.table = stream.readU32Array(count);
        }
        break;
      case 'stco':
        box.name = "Chunk Offset Box";
        readFullHeader();
        box.table = stream.readU32Array(stream.readU32());
        break;
      case 'smhd':
        box.name = "Sound Media Header Box";
        readFullHeader();
        box.balance = stream.readFP8();
        stream.reserved(2, 0);
        break;
      case 'mdat':
        box.name = "Media Data Box";
        assert (box.size >= 8, "Cannot parse large media data yet.");
        box.data = stream.readU8Array(remainingBytes());
        break;
      default:
        skipRemainingBytes();
        break;
    };
    return box;
  }

  read() {
    var start = (new Date).getTime();
    this.file = {};
    this.readBoxes(this.stream, this.file);
    console.info("Parsed stream in " + ((new Date).getTime() - start) + " ms");
  }

  traceSamples() {
    let video = this.tracks[1];
    let audio = this.tracks[2];

    console.info("Video Samples: " + video.getSampleCount());
    console.info("Audio Samples: " + audio.getSampleCount());

    let vi = 0;
    let ai = 0;

    for (let i = 0; i < 100; i++) {
      const vo = video.sampleToOffset(vi);
      const ao = audio.sampleToOffset(ai);

      const vs = video.sampleToSize(vi, 1);
      const as = audio.sampleToSize(ai, 1);

      if (vo < ao) {
        console.info("V Sample " + vi + " Offset : " + vo + ", Size : " + vs);
        vi ++;
      } else {
        console.info("A Sample " + ai + " Offset : " + ao + ", Size : " + as);
        ai ++;
      }
    }
  }
}