const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const {
    Sequelize,
    DataTypes
} = require('sequelize');

const {
    v4: uuidv4
} = require('uuid');
//
const 
    db = require('./config/db');

const User = require('./models/usermangement/user');
const Role = require('./models/usermangement/role')
const UserRole = require('./models/usermangement/userRole');

//require('./models/usermangement/userAssociation');

const port = 3005;

const app = express();
var options = {
    inflate: true,
    limit: '10mb',
    type: '*/*'
};

app.use(express.raw(options));

// Define a catch-all error handling middleware
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    const isApiRequest = req.originalUrl.startsWith('/api/');
    if (isApiRequest) {
        res.status(500).json({
            error: 'Something went wrong'
        });
    } else {
        res.status(500).send('Oops, something went wrong!');
    }
}


//app.use(errorHandler)
// Or, force Sequelize to drop and recreate the table
db.sequelize.sync({
    force: true
});

function deleteFilesInDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
}
app.get('/test/:name/:size/:totalChunks', (req, res) => {
    const {
        name,
        size,
        totalChunks
    } = req.params;
    res.send(`Hello, World! name: ${name} size: ${size} totalChunks: ${totalChunks}`);
});


// Create a new file upload
app.post('/files/:name/:size/:totalChunks', async (req, res) => {
    try {
        const {
            name,
            size,
            totalChunks
        } = req.params;

        //delete files in chunks
        deleteFilesInDirectory(path.join(__dirname, 'chunks'));

        const myUUID = uuidv4();

        console.log(`name: ${name} sized: ${size} totalChunks: ${totalChunks}`);
        try {
            const file = await File.create({
                id: myUUID,
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

// Upload a file chunk
app.post('/chunks/:id/:fileId/:chunkNumber', async (req, res) => {
    try {

        var bodyChunk = JSON.parse(req.body).chunkData;

        //console.log("chunks data is: " + chunkData);
        const {
            fileId,
            chunkNumber
        } = req.params;

        const chunkId = req.params.id;
        if (!chunkId || (typeof chunkId !== 'string' && typeof chunkId !== 'number')) {
            res.status(400).send('Invalid chunk ID');
            return;
        }

        //let chunkDataDecoded = Buffer.from(chunkData, 'base64');
        let chunkDataDecoded = Buffer.from(bodyChunk.data);
        //let chunkDataDecoded = Buffer.from(req.body);

        const chunkPath = path.join(__dirname, 'chunks', chunkId + "_" + fileId);

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
        File.update({
                uploadedchunks: chunkNumber
            }, {
                where: {
                    id: fileId
                }
            })
            .then(() => {
                console.log('uploadedchunks updated successfully');
            })
            .catch((error) => {
                console.error('Error updating uploadedchunks record:', error);
            });

        const file = await File.findByPk(fileId);
        //file.uploadedchunks++;

        console.log(`file.uploadedchunks: ${file.uploadedchunks}, file.totalchunks ${file.totalchunks}`);


        res.send('Chunk uploaded successfully');
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
        const file = await File.findOne({
            where: {
                id: fileId
            }
        });
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
        const filePath = path.join(__dirname, 'uploads', fileId.toString() + ".mp4");
        try {
            await reassemble(fileId, chunks, filePath);
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
//delete file
app.delete('/files/:fileId', async (req, res) => {
    try {
        const {
            fileId
        } = req.params;

        // Find the file in the database
        const file = await File.findOne({
            where: {
                id: fileId
            }
        });
        if (!file) {
            res.status(404).json({
                error: `File with ID ${fileId} not found`
            });
            return;
        }

        // Delete the file from the database
        await file.destroy();

        // Delete all the chunks for this file from the filesystem
        const chunkPaths = await Chunk.findAll({
            where: {
                fileId
            },
            attributes: ['id'],
            raw: true,
        }).then((chunks) =>
            chunks.map((chunk) => path.join(__dirname, 'chunks', `${chunk.id}_${fileId}`))
        );

        chunkPaths.forEach((chunkPath) => {
            fs.unlink(chunkPath, (err) => {
                if (err) {
                    console.error(`Error deleting chunk file: ${chunkPath}`, err);
                } else {
                    console.log(`Chunk file deleted: ${chunkPath}`);
                }
            });
        });

        res.json({
            message: `File with ID ${fileId} and all associated chunks deleted successfully`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error deleting file'
        });
    }
});

//delete chunk
app.delete('/chunks/:id/:fileId', async (req, res) => {
    try {
        const {
            id,
            fileId
        } = req.params;

        // Find the chunk in the database
        const chunk = await Chunk.findOne({
            where: {
                id,
                fileId
            }
        });
        if (!chunk) {
            res.status(404).json({
                error: `Chunk with ID ${id} and file ID ${fileId} not found`
            });
            return;
        }

        // Delete the chunk from the database
        await chunk.destroy();

        // Delete the chunk file from the filesystem
        const chunkPath = path.join(__dirname, 'chunks', `${id}_${fileId}`);
        fs.unlink(chunkPath, (err) => {
            if (err) {
                console.error(`Error deleting chunk file: ${chunkPath}`, err);
                res.status(500).json({
                    error: `Error deleting chunk file: ${chunkPath}`
                });
            } else {
                console.log(`Chunk file deleted: ${chunkPath}`);
                res.json({
                    message: `Chunk with ID ${id} and file ID ${fileId} deleted successfully`
                });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error deleting chunk'
        });
    }
});

async function reassemble(fileId, chunks, filePath) {
    const writeStream = fs.createWriteStream(filePath);
    for (const chunk of chunks) {
        const chunkPath = path.join(__dirname, 'chunks', chunk.id + "_" + fileId);
        const readStream = fs.createReadStream(chunkPath);
        await new Promise((resolve, reject) => {
            readStream.pipe(writeStream, {
                end: false
            });
            readStream.on('end', () => {
                //console.log('File read stream ended');
                resolve();
            });
            readStream.on('error', (error) => {
                console.error('Error reading file:', error);
                reject(error);
            });
        });
    }
    writeStream.end();

    // delete all rows from the Chunk table first
    deleteAllRows();

}

async function deleteAllRows() {
    try {
        // delete all rows from the Chunk table first
        await Chunk.destroy({
            truncate: true,
            schema: 'common'
        });
        console.log('All rows deleted from Chunk table');

        // then delete all rows from the File table
        await File.destroy({
            truncate: true,
            schema: 'common'
        });
        console.log('All rows deleted from File table');
    } catch (error) {
        console.error(error);
    }
}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});