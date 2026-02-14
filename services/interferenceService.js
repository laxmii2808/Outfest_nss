const axios = require("axios")
const fs = require("fs")
const FormData = require("form-data")

exports.predict = async (videoPath) => {

  const form = new FormData()
  form.append("video", fs.createReadStream(videoPath))

  try {
    const response = await axios.post(
      "http://localhost:8000/predict",
      form,
      { headers: form.getHeaders() }
    )

    return response.data

  } catch (err) {
    console.log("ML error:", err.message)
    return { label: 0, confidence: 0 }
  }
}
