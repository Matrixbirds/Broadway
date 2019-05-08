import { EventEmitter } from 'events';
import io from 'socket.io-client'

export default class Adapter {
  constructor (url) {
    this.url = url
    this.events = new EventEmitter()
  }

  async connect () {
    this.socket = io(`${this.url}`, {
      transports: ['websocket'],
      upgrade:false
    })

    const events = 
    [
      'connect',
      'event',
      'disconnect',
      'chat message',
      'data'
    ];
    
    events.forEach((eventName) => {
      this.socket.on(eventName, (evt) => {
        this.events.emit(eventName, evt)
      })
    })
  }

  on(eventName, callback) {
    this.events.on(eventName, callback)
  }

  emit(eventName, evt) {
    this.socket.emit(eventName, evt)
  }
}