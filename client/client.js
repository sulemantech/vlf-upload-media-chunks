const axios = require('axios');
const fs = require('fs');

const CHUNK_SIZE = 1024 * 512; // 1MB chunks
const filePath = 'earth.mp4';

// read the file into a buffer
const fileBuffer = fs.readFileSync(filePath);

// calculate the number of chunks
const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);

// send each chunk to the server
for (let i = 1; i < totalChunks; i++) {
  // get the chunk data and create the metadata payload
  const chunkData = fileBuffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  const metadata = {
    filename: 'earth.mp4',
    chunkNumber: i,
    chunkIndex: i,
    totalChunks,
    data: chunkData.toString('base64'),
  };

  // send the chunk to the server using axios
  axios.post('http://localhost:3004/chunks', metadata)
    .then((response) => {
      console.log(`Chunk ${i + 1} of ${totalChunks} uploaded successfully`);
    })
    .catch((error) => {
      console.error(`Error uploading chunk ${i + 1}: ${error.message}`);
    });
}


/*const axios = require('axios');
const fs = require('fs');

// Define the file to be sent
const filePath = 'earth.mp4';

// Define the options for the POST request
const config = {
  headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename=${filePath}`
  }
};

// Send the request
const fileStream = fs.createReadStream(filePath);
axios.post('http://localhost:3005/uploads', fileStream, config)
  .then(response => {
    console.log(`Status: ${response.status}`);
    console.log(`Data: ${response.data}`);
  })
  .catch(error => {
    console.error(error);
  });
*/

/*const axios = require('axios');
const fs = require('fs');

const file = fs.readFileSync('./earth.mp4');
const chunkSize = 64 * 1024; // 64 KB
var chunks = Math.ceil(file.length / chunkSize);
chunks = 1;
async function uploadFile(file, chunkSize) {
  let promises = [];

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const chunk = file.slice(start, end);

    promises.push(axios.post('http://localhost:3005/chunks', {
      file: {
        name: 'earth.mp4',
        data: chunk,
        chunkSize
      }
    }));
  }

  try {
    const responses = await Promise.all(promises);
    console.log('File uploaded successfully!');
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

uploadFile(file, chunkSize);
*/

/*const request = require('request');
const fs = require('fs');

const options = {
  url: 'http://localhost:3005/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  json: true,
  body: {
    file: {
      name: 'example.txt',
      data: fs.readFileSync('./example.txt').toString('base64'),
    },
  },
};

request(options, (error, response, body) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log(body);
});*/


/*const axios = require('axios');
const fs = require('fs');

const file = {
  name: 'example.txt',
  data: fs.readFileSync('./example.txt').toString('base64'),
};

axios.post('http://localhost:3005/upload', { file })
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error);
  });

*/
/*const fs = require('fs');
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
uploadFile(filePath);*/