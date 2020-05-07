const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users')

const app = express()

//express creates behind the scenes but we need access for server by socket io that is the reason created separately  
const server = http.createServer(app)

//gave access of server to the socket
const io = socketio(server)

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname,'../public')

//To use static page
app.use(express.static(publicDirectoryPath))


//server (emit) -> client (receive) - countUpdated
//client (emit) -> server (receive) - increment

//three ways of emiting the message or sending data
//socket.emit() -> send to that particular client
//socket.broadcast.emit() -> send to everyone else except that client
//io.emit() -> send to everyone  



io.on('connection', (socket) => {
    console.log('New web socket connection!')

    socket.on('join', ({username, room }, callback) => {
        const {error, user} = addUser({
            id: socket.id,
            username,
            room
        })
        if(error){
            return callback(error)
        }

        socket.join(room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
        //scket.emit (sending event to specific socket/ client), io.emit (), socket.broadcast.emit
        //io.to.emit (sending event to all the clients limiting to the chat room), socket.broadcast.to.emit (sending event to specific client but limiting to chat room)
    })

    socket.on('sendMessage', (message, callback) => {

        const user = getUser(socket.id)

        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        io.to(user.room).emit('message',generateMessage(user.username,message))
        callback()

    })
    
    socket.on('sendlocation', (coords, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message',generateMessage('Admin',`${user.username} has left!`)) 
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            }) 
        }
    })
})



server.listen(port, () => {
    console.log(`Server up and running on ${port}!`)
})