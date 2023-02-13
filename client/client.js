const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CHUNK_SIZE = 1024 * 1024; // 1 MB

async function uploadFile(filePath) {
  // Open the file
  const fileStream = fs.createReadStream(filePath);

  // Get the file size
  const {
    size
  } = fs.statSync(filePath);

  // Calculate the total number of chunks
  const totalChunks = Math.ceil(size / CHUNK_SIZE);

  // Generate a unique ID for the file
  const fileId = Date.now().toString();

  // Upload the file in chunks
  let chunkNumber = 0;
  while (true) {
    // Read the next chunk from the file
    const chunk = await readChunk(fileStream, CHUNK_SIZE);

    // Stop if we've reached the end of the file
    if (!chunk) {
      break;
    }

    // Upload the chunk to the server
    await uploadChunk(fileId, chunkNumber, totalChunks, chunk);

    // Move on to the next chunk
    chunkNumber++;
  }

  // Reassemble the file on the server
  await reassembleFile(fileId, totalChunks);

  console.log('File uploaded successfully');
}

async function readChunk(fileStream, size) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(size);
    let bytesRead = 0;

    fileStream.on('data', (data) => {
      data.copy(buffer, bytesRead);
      bytesRead += data.length;
      if (bytesRead >= size) {
        fileStream.pause();
        resolve(buffer);
      }
    });

    fileStream.on('end', () => {
      resolve(bytesRead > 0 ? buffer.slice(0, bytesRead) : null);
    });

    fileStream.on('error', (err) => {
      reject(err);
    });
  });
}

async function uploadChunk(fileId, chunkNumber, totalChunks, chunk) {
  const url = 'http://localhost:3004/chunks';

  const data = {
    fileId: fileId,
    chunkNumber: chunkNumber,
    totalChunks: totalChunks,
  };

  const headers = {
    'Content-Type': 'application/octet-stream',
  };

  await axios.post(url, chunk, {
    params: data,
    headers: headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

async function reassembleFile(fileId, totalChunks) {
  const url = 'http://localhost:3004/reassemble';

  const data = {
    fileId: fileId,
    totalChunks: totalChunks,
  };

  await axios.post(url, data);
}

// Usage example
const filePath = path.join(__dirname, 'earth.mp4');
uploadFile(filePath);