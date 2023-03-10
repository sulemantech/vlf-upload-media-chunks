const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL of the server
const BASE_URL = 'http://localhost:3005';

// Upload a chunk of a file
async function uploadChunk(fileId, chunkNumber, totalChunks, chunkData) {
   
    const config = {
        headers: {
            'Content-Type': 'application/octet-stream'
        }
    };
    
    //const chunkBuffer = Buffer.from(chunkData);

    const response = await axios.post(
        `${BASE_URL}/chunks/${chunkNumber}/${fileId}/${totalChunks}`, {
            chunkData: chunkData
        },
        config
    );

    return response.data;
}

// Reassemble the chunks of a file
async function reassembleFile(fileId) {
    const response = await axios.post(`${BASE_URL}/reassemble/${fileId}`);
    return response.data;
}


async function uploadLargeFile(filePath) {
    // Set the chunk size to 1 MB
    const CHUNK_SIZE = 1 * 1024 * 1024;

    const fileData = fs.readFileSync(filePath);
    const fileSize = fileData.length;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(`fileSize: ${fileSize} totalChunks: ${totalChunks}`)

    // Create a file on the server to store the chunks
    /*const response = await axios.post(`${BASE_URL}/files`, {
        name: path.basename(filePath),
        size: fileSize,
        totalChunks: totalChunks,
    });*/

    console.log(`${BASE_URL}/files/${path.basename(filePath)}/${fileSize}/${totalChunks}`);

    const response = await axios.post(`${BASE_URL}/files/${path.basename(filePath)}/${fileSize}/${totalChunks}`);

    console.log("response.data.id: " + response.data.fileId)
    const fileId = response.data.fileId;

    // Upload the chunks in parallel
    const uploadPromises = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min((i + 1) * CHUNK_SIZE, fileSize);
        //const chunkData = fileData.slice(start, end);
        const chunkData = Buffer.alloc(end - start); // create a new buffer with the correct size
        fileData.copy(chunkData, 0, start, end); // copy the data from the file buffer to the chunk buffer
        console.log(`Chunk starts at: ${start} and ends at: ${end}`);
        //const data = Buffer.from([0xFF, 0x02]); // Create a buffer object with two bytes of data
        uploadPromises.push(uploadChunk(fileId, i + 1, totalChunks, chunkData));
    }

    await Promise.all(uploadPromises);

    console.log("calling reassemble now.");
    // Reassemble the file chunks
    await reassembleFile(fileId);

}

// Test the API
(async () => {
    try {
        // Upload a large file
        const filePath = path.join(__dirname, 'earth.mp4');
        await uploadLargeFile(filePath);
        console.log('File uploaded successfully');
    } catch (error) {
        console.error(error.message);
    }
})();
