'use strict'
const io = require('socket.io')()
const fs = require('fs')
const path = require('path')
const resolve = path.resolve
const mp4 = resolve(__dirname, '../Player/mozilla_story.mp4')


let start = 0
let end = 512
let sending = false
const sendVideo = (socket) => {
        const stream = fs.createReadStream(mp4, {
            start, end
        })
        console.log("createReadStream, " , mp4)
        stream.on("readable", () => {
            const data = stream.read()
            console.log(`readable: ${data}`)
            io.emit("data", data)
        })

        stream.on("end", () => {
            console.log("read flush")
        })
        console.log("[file chunk] len: " + stream.length)
        io.emit("sending")
}


io.on('connection', (socket) => {
    console.log("[socket.io] connectiong")
    socket.on('chat message', (msg) => {
        if (msg === 'connect') {
            sendVideo(socket)
        }
        console.log('message: ' + msg)
        io.emit('chat message', msg)
    })
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
    //io.emit('chat message', 'msg')
    //io.emit('connect', true)
})

io.listen(3000)
console.log('listening on *:3000')
