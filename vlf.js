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
    "postgres://postgres:1234@localhost/test", {
    dialect: "postgres",
    schema: 'public',
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
    schema: 'public' // specify the schema name here as well
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
    schema: 'public' // specify the schema name here as well
});

Chunk.destroy({
    where: {},
    truncate: true
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
            res.status(201).json({
                // want to get the file id here
                fileId: file.id
            });
        } catch (error) {
            console.error(error);
        }
        console.log("After the try catch block");

        console.log("Returning 201 here");
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating file');
    }
});

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

        console.log(`Inside chunks fileId ${fileId}, chunkId, ${chunkId}, chunkNumber ${chunkNumber} `);

        const chunkPath = path.join(__dirname, 'chunks', chunkId);

        // Save the chunk to disk
        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(chunkPath, {
                flags: 'a'
            });
            writeStream.write(chunkData);  // <-- Write the data to the stream
            req.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Create a new record in the database
        await Chunk.create({
            id: chunkId,
            fileid: fileId,
            chunknumber: chunkNumber
        });

        const file = await File.findByPk(fileId);
        file.uploadedChunks++;
        if (file.uploadedChunks === file.totalChunks) {
            // All chunks have been uploaded, reassemble the file
            const chunks = await Chunk.findAll({
                where: {
                    fileId
                },
                order: [
                    ['chunknumber', 'ASC']
                ]
            });
            const filePath = path.join(__dirname, 'uploads', fileId.toString());
            await reassemble(chunks, filePath);
            await File.update({
                uploadedChunks: file.totalChunks
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
        console.error(error);
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
                fileid:fileId
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
            console.error(error);
            res.status(500).send('Error reassembling file');
        }
    } catch (error) {
        console.error(error);
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
            readStream.on('end', resolve);
            readStream.on('error', reject);
        });
    }
    writeStream.end();
}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});