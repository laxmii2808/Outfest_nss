const express = require("express")

module.exports = (io) => {

  const router = express.Router()
  const controller = require("../controllers/cameraController")

  router.post("/add", (req, res) => {
    controller.addCamera(req, res, io)
  })

  return router
}
