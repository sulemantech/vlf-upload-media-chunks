const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const {
    Sequelize,
    DataTypes
} = require('sequelize');

// Sequelize setup, need to remove it
const sequelize = new Sequelize(
    "postgres://postgres:root@localhost:5432/uploads", {
    dialect: "postgres",
    schema: 'common',
    dialectOptions: {
        ssl: false,
    },
    define: {
        timestamps: false,
    },
}
);

const port = 3005;

const app = express();
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

// Define a catch-all error handling middleware
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    const isApiRequest = req.originalUrl.startsWith('/api/');
    if (isApiRequest) {
        res.status(500).json({ error: 'Something went wrong' });
    } else {
        res.status(500).send('Oops, something went wrong!');
    }
}


// Set up Sequelize models for File and Chunk
const File = sequelize.define('file', {
    /*id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },*/
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    totalchunks: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uploadedchunks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    // options
    schema: 'common' // specify the schema name here as well
});

const Chunk = sequelize.define('chunk', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    fileid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Files',
            key: 'id'
        }
    },
    chunknumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    // options
    schema: 'common' // specify the schema name here as well
});

app.use(errorHandler)

// Create a new file upload
app.post('/files', async (req, res) => {
    try {
        const {
            name,
            size,
            totalChunks
        } = req.body;

        console.log(`name: ${name} sized: ${size} totalChunks: ${totalChunks}`);
        try {
            const file = await File.create({
                name,
                size,
                totalchunks: totalChunks
            });
            console.log("File uploaded successfully");
            res.status(201).json({
                fileId: file.id
            });
        } catch (error) {
            console.error(error.message);
        }
        //console.log("After the try catch block");
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating file');
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload a file chunk
app.post('/chunks/:id', async (req, res) => {
    try {
        const chunkId = req.params.id;
        if (!chunkId || (typeof chunkId !== 'string' && typeof chunkId !== 'number')) {
            res.status(400).send('Invalid chunk ID');
            return;
        }

        const {
            fileId,
            chunkNumber,
            chunkData
        } = req.body;


        let chunkDataDecoded = Buffer.from(chunkData, 'base64');

        const chunkPath = path.join(__dirname, 'chunks', chunkId);

        console.log(`Inside chunks fileId ${fileId}, chunkId, ${chunkId}, chunkNumber ${chunkNumber} `);

        console.log(`Writing chunk ${chunkNumber} to disk at path: ${chunkPath}`);
        const writeStream = fs.createWriteStream(chunkPath, {
            flags: 'w'
        });

        writeStream.on('finish', () => {
            console.log(`Chunk ${chunkNumber} written to disk`);
            resolve();
        });

        writeStream.on('error', (err) => {
            console.error(`Error writing chunk ${chunkNumber}:`, err);
            reject(err);
        });

        writeStream.write(chunkDataDecoded);

        // Create a new record in the database
        await Chunk.create({
            id: chunkId,
            fileid: fileId,
            chunknumber: chunkNumber
        });
        // Update a record with ID 1
        File.update({ uploadedchunks: chunkNumber }, { where: { id: fileId } })
            .then(() => {
                console.log('uploadedchunks updated successfully');
            })
            .catch((error) => {
                console.error('Error updating uploadedchunks record:', error);
            });

        const file = await File.findByPk(fileId);
        file.uploadedchunks++;

        console.log(`file.uploadedchunks: ${file.uploadedchunks}, file.totalchunks ${file.totalchunks}`);

        if (file.uploadedchunks === file.totalchunks) {
            // All chunks have been uploaded, reassemble the file
            const chunks = await Chunk.findAll({
                where: {
                    fileid: fileId,
                },
                order: [
                    ['chunknumber', 'ASC']
                ]
            });
            const fileExtension = '.mp4'; // Example file extension
            const fileWithExt = fileId.toString() + fileExtension;

            console.log(`fileWithExt:  ${fileWithExt}`);

            const filePath = path.join(__dirname, 'uploads', fileWithExt);

            await reassemble(chunks, filePath);

            await File.update({
                uploadedchunks: file.totalChunks
            }, {
                where: {
                    id: fileId
                }
            });
            res.send('File uploaded successfully');
        } else {
            res.send('Chunk uploaded successfully');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error uploading chunk');
    }
});

// Reassemble file from chunks
app.post('/reassemble/:id', async (req, res) => {
    try {
        console.log("inside reassemble action")
        const fileId = req.params.id;
        if (!fileId || (typeof fileId !== 'string' && typeof fileId !== 'number')) {
            res.status(400).send('Invalid file ID');
            return;
        }

        const file = await File.findOne({ where: { id: fileId } });
        if (!file) {
            res.status(404).send('File not found');
            return;
        }
        console.log(`Inside reassemble fileId is ${fileId}`)
        const chunks = await Chunk.findAll({
            where: {
                fileid: fileId
            },
            order: [
                ['chunknumber', 'ASC']
            ]
        });

        if (chunks.length === 0) {
            res.status(404).send('No chunks found for this file');
            return;
        }
        const filePath = path.join(__dirname, 'uploads', fileId.toString());
        try {
            await reassemble(chunks, filePath);
            res.send('File reassembled successfully');
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Error reassembling file');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error reassembling file');
    }
});

async function reassemble(chunks, filePath) {
    const writeStream = fs.createWriteStream(filePath);
    for (const chunk of chunks) {
        const chunkPath = path.join(__dirname, 'chunks', chunk.id);
        const readStream = fs.createReadStream(chunkPath);
        await new Promise((resolve, reject) => {
            readStream.pipe(writeStream, {
                end: false
            });
            readStream.on('end', () => {
                console.log('File read stream ended');
                resolve();
              });
              readStream.on('error', (error) => {
                console.error('Error reading file:', error);
                reject(error);
              });
        });
    }
    writeStream.end();
   
    File.truncate({ cascade: true })
        .then(() => {
            console.log('Table truncated successfully');
        })
        .catch((error) => {
            console.error('Error truncating table:', error);
        });
}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});