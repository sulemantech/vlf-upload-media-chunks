const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL of the server
const BASE_URL = 'http://localhost:3005';

// Upload a chunk of a file
async function uploadChunk(fileId, chunkNumber, totalChunks, chunkData) {
    const response = await axios.post(`${BASE_URL}/chunks`, {
        fileId: fileId,
        chunkNumber: chunkNumber,
        totalChunks: totalChunks,
        chunkData: chunkData.toString('base64'),
    });

    return response.data;
}

// Reassemble the chunks of a file
async function reassembleFile(fileId) {
    const response = await axios.post(`${BASE_URL}/files/${fileId}/reassemble`);
    return response.data;
}

// Upload a large file in chunks
async function uploadLargeFile(filePath) {
    // Set the chunk size to 1 MB
    const CHUNK_SIZE = 1 * 1024 * 1024;

    const fileData = fs.readFileSync(filePath);
    const fileSize = fileData.length;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    // Upload the chunks in parallel
    const uploadPromises = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min((i + 1) * CHUNK_SIZE, fileSize);
        const chunkData = fileData.slice(start, end);
        uploadPromises.push(uploadChunk(fileId, i + 1, totalChunks, chunkData));
    }

    await Promise.all(uploadPromises);

    // Reassemble the file
    await reassembleFile(fileId);
}

async function uploadLargeFile(filePath) {
    // Set the chunk size to 1 MB
    const CHUNK_SIZE = 1 * 1024 * 1024;

    const fileData = fs.readFileSync(filePath);
    const fileSize = fileData.length;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    console.log(`fileSize: ${fileSize} totalChunks: ${totalChunks}`)

    // Create a file on the server to store the chunks
    const response = await axios.post(`${BASE_URL}/files`, {
        name: path.basename(filePath),
        size: fileSize,
        totalChunks: totalChunks,
    });
    console.log("response.data.id: " + response.data.fileId)
    const fileId = response.data.fileId;

    // Upload the chunks in parallel
    const uploadPromises = [];

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min((i + 1) * CHUNK_SIZE, fileSize);
        const chunkData = fileData.slice(start, end);
        uploadPromises.push(uploadChunk(fileId, i, totalChunks, chunkData));
    }

    await Promise.all(uploadPromises);

    // Reassemble the file
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
        console.error(error);
    }
})();