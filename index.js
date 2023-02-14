const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const Sequelize = require('sequelize');
const fs = require('fs');
const morgan = require('morgan');

const port = 3004;
const path = require('path');

app.use(express.json({
    limit: '500mb'
}));
app.use(bodyParser.json({
    limit: '500mb'
}));
app.use(bodyParser.urlencoded({
    limit: '500mb',
    extended: true
}));

app.use(express.json({
    limit: '500mb'
}));

// Sequelize setup, need to remove it
const sequelize = new Sequelize(
    "postgres://postgres:root@localhost:5433/uploads", {
        dialect: "postgres",
        dialectOptions: {
            ssl: false,
        },
        define: {
            timestamps: false,
        },
    }
);

const Chunk = sequelize.define("chunk", {
    chunkid: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
    },
    fileid: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    chunknumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    totalchunks: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
});

app.post('/uploads', (req, res) => {
    const filePath = './uploads/file.mp4';
    const fileStream = fs.createWriteStream(filePath);
    req.on('data', chunk => {
        fileStream.write(chunk);
    });
    req.on('end', () => {
        fileStream.end();
        res.status(200).send('File uploaded successfully!');
    });
});

app.post('/chunks', async (req, res) => {

    console.log('Inside req.body:' + req.body);
    const {
        filename,
        chunkIndex,
        totalChunks,
        data
    } = req.body;

    console.log(`Inside chunks filename: ${filename} , chunkIndex: ${chunkIndex}, totalChunks: ${totalChunks}`);

    // Store the chunk in the Postgres database
    await Chunk.create({
        chunkid: chunkIndex,
        fileid: filename,
        chunknumber: chunkIndex,
        totalchunks: totalChunks,
    });


    const filePath = `./uploads/${filename}`;
    const fileStream = fs.createWriteStream(filePath, {
        flags: 'a'
    });

    // write the chunk data to the file stream
    fileStream.write(data, 'base64', () => {
        // check if this is the last chunk
        if (chunkIndex === totalChunks - 1) {
            // close the file stream and send a response to the client
            fileStream.end();
            res.status(200).send('File uploaded successfully!');
        }
    });
});


app.post('/upload', (req, res) => {

    console.log('Received file upload request:', req.body);
    const file = req.body.file;
    const filePath = path.join(__dirname, `/uploads/${file.name}`);

    fs.writeFile(filePath, file.data, {
        encoding: 'base64'
    }, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send('File uploaded successfully!');
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

app.get('/download/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, `/uploads/${fileName}`);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            return res.status(404).send('File not found');
        }
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(data);
    });
});

/*
// Sequelize setup
const sequelize = new Sequelize('postgres://postgres:root@localhost:5433/uploads', {
    dialect: 'postgres',
    dialectOptions: {
        ssl: false,
    },
    define: {
        timestamps: false,
    },
});

const Chunk = sequelize.define('chunk', {
    chunkId: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
    },
    fileId: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    chunkNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    totalChunks: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
});

// Express setup
app.use(bodyParser.json());
//app.use(cors());

app.use(express.json({
    limit: '500mb'
}));
app.use(express.urlencoded({
    limit: '500mb'
}));

// Validate chunk data
function validateChunkData(data) {
    if (!data || !data.fileId || !data.chunkNumber || !data.totalChunks) {
        throw new Error('Missing required field(s)');
    }
    if (typeof data.fileId !== 'string' || typeof data.chunkNumber !== 'number' || typeof data.totalChunks !== 'number') {
        throw new Error('Invalid data type(s)');
    }
    if (data.chunkNumber >= data.totalChunks) {
        throw new Error('Invalid chunk number');
    }
}

// Validate reassembly data
function validateReassemblyData(data) {
    if (!data || !data.fileId || !data.totalChunks) {
        throw new Error('Missing required field(s)');
    }
    if (typeof data.fileId !== 'string' || typeof data.totalChunks !== 'number') {
        throw new Error('Invalid data type(s)');
    }
}

// Endpoint for uploading a chunk
app.post('/chunks', async (req, res) => {

    const {
        chunkId,
        fileId,
        chunkNumber,
        totalChunks
    } = req.body;
    console.log(`Inside chunks chunkId: ${chunkId} , fileId: ${fileId}, chunkNumber: ${chunkNumber}, totalChunks: ${totalChunks}`);

    chunkId = `${req.body.fileId}_chunk_${req.body.chunkNumber}`;

    //validateChunkData(req.body);

    // Store the chunk in the Postgres database
    await Chunk.create({
        chunkId: chunkId,
        fileId: req.body.fileId,
        chunkNumber: req.body.chunkNumber,
        totalChunks: req.body.totalChunks,
    });

    // Write the chunk to the file system
    const filePath = path.join(__dirname, 'uploads', chunkId);
    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
        res.send('Chunk uploaded');
    });

    writeStream.on('error', (err) => {
        console.error(err);
        res.status(500).send('Error uploading chunk');
    });
});

// Endpoint for reassembling the chunks into the original file
app.post('/reassemble', async (req, res) => {
    console.log(req);
    validateReassemblyData(req.body);

    const fileId = req.body.fileId;
    const totalChunks = req.body.totalChunks;

    // Get all of the chunks for the specified file ID
    const chunks = await Chunk.findAll({
        where: {
            fileId: fileId,
        },
        order: [
            ['chunkNumber', 'ASC']
        ],
    });
    if (chunks.length === 0) {
        throw new Error('File not found');
    }

    // Check that all of the chunks have been uploaded
    if (chunks.length != totalChunks) {
        return res.status(400).send('Not all chunks have been uploaded');
    }

    // Reassemble the chunks into the original file
    const writeStream = fs.createWriteStream(`${fileId}.mp4`);
    for (let i = 0; i < totalChunks; i++) {
        const chunkId = `${fileId}_chunk_${i}`;
        const filePath = path.join(__dirname, 'uploads', chunkId);
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(writeStream);

        readStream.on('error', (err) => {
            console.error(err);
            res.status(500).send('Error reassembling file');
        });
    }

    writeStream.on('finish', () => {
        res.send('File reassembled');
    });

    writeStream.on('error', (err) => {
        console.error(err);
        res.status(500).send('Error reassembling file');
    });
});

app.listen(3004, () => {
    console.log('Listening on port 3004');
});*/