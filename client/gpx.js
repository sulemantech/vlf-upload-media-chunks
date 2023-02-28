const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function uploadGpxFile(filePath) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;

  const headers = {
    "Content-Type": "application/octet-stream",
    "X-File-Name": fileName,
    "Content-Length": fileSize,
  };

  const dataStream = fs.createReadStream(filePath);

  try {
    console.log(`Calling /uploadgpx/${fileName}`);
    const response = await axios({
      method: "post",
      url: `http://localhost:3005/uploadgpx/${fileName}`,
      headers: headers,
      data: dataStream,
    });

    console.log(response.data.message);
  } catch (error) {
    console.error(error.message);
  }
}

// Example usage:
const gpxFileName = "sample.gpx";
const gpxFilePath = path.join(__dirname, gpxFileName);

uploadGpxFile(gpxFilePath);
