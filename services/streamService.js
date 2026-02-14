const ffmpeg = require("fluent-ffmpeg")
const path = require("path")
const fs = require("fs")
const chokidar = require("chokidar")
const inferenceService = require("./interferenceService")
const Event = require("../models/Event")

exports.startCamera = (cameraId, rtspUrl, io) => {

  const tempDir = path.join(__dirname, "../storage/temp")
  const eventDir = path.join(__dirname, "../storage/events", cameraId)

  if (!fs.existsSync(eventDir)) {
    fs.mkdirSync(eventDir, { recursive: true })
  }

  ffmpeg(rtspUrl)
    .inputOptions("-rtsp_transport tcp")
    .outputOptions([
      "-c copy",
      "-f segment",
      "-segment_time 5",
      "-reset_timestamps 1"
    ])
    .output(path.join(tempDir, `${cameraId}_%03d.mp4`))
    .on("start", () => console.log(`Camera ${cameraId} started`))
    .on("error", err => console.log("FFmpeg error:", err))
    .run()

  const watcher = chokidar.watch(tempDir, { ignoreInitial: true })

  watcher.on("add", async filePath => {

    if (!filePath.includes(cameraId)) return

    const result = await inferenceService.predict(filePath)

    if (result.label === 1) {

      const fileName = `${Date.now()}.mp4`
      const finalPath = path.join(eventDir, fileName)

      fs.renameSync(filePath, finalPath)

      const stats = fs.statSync(finalPath)

      const event = await Event.create({
        cameraId: cameraId,
        confidence: result.confidence || 0.9,
        label: "suspicious",
        duration: 5,
        fileName: fileName,
        filePath: finalPath,
        fileSize: stats.size
      })

      io.emit("suspiciousAlert", event)

      console.log("Suspicious event stored")

    } else {
      fs.unlinkSync(filePath)
    }
  })
}
