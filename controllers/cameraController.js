const streamService = require("../services/streamService")

exports.addCamera = (req, res, io) => {

  const { cameraId, rtspUrl } = req.body

  if (!cameraId || !rtspUrl) {
    return res.status(400).json({ message: "cameraId and rtspUrl required" })
  }

  streamService.startCamera(cameraId, rtspUrl, io)

  res.json({ message: "Camera started successfully" })
}
