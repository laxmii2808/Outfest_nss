const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: "*" }
})
app.use(cors())
app.use(express.json())
app.use("/videos", express.static("storage/events"))
mongoose.connect("mongodb://127.0.0.1:27017/surveillance")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err.message))

const cameraRoutes = require("./routes/cameraRoutes")(io)
app.use("/api/cameras", cameraRoutes)

const streamService = require("./services/streamService")

io.on("connection", (socket) => {

  console.log("Client connected:", socket.id)

  socket.on("addCamera", ({ cameraId, rtspUrl }) => {

    if (!cameraId || !rtspUrl) {
      console.log("Invalid camera data")
      return
    }

    streamService.startCamera(cameraId, rtspUrl, io)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

server.listen(5000, () => {
  console.log("Backend running on port 5000")
})
