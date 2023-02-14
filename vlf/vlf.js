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

const port = 3005;

const app = express();
app.use(bodyParser.json());

// Set up Sequelize models for File and Chunk
const File = sequelize.define('File', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    totalChunks: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uploadedChunks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
});

const Chunk = sequelize.define('Chunk', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    fileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Files',
            key: 'id'
        }
    },
    chunkNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

// Create a new file upload
app.post('/files', async (req, res) => {
    try {
        const {
            name,
            size,
            totalChunks
        } = req.body;
        const file = await File.create({
            name,
            size,
            totalChunks
        });
        res.status(201).json({
            fileId: file.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating file');
    }
});

// Upload a file chunk
app.post('/chunks/:id', async (req, res) => {
    try {
        const chunkId = req.params.id;
        const {
            fileId,
            chunkNumber
        } = req.body;
        const chunkPath = path.join(__dirname, 'chunks', chunkId);

        // Save the chunk to disk
        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(chunkPath, {
                flags: 'a'
            });
            req.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Create a new record in the database
        await Chunk.create({
            id: chunkId,
            fileId,
            chunkNumber
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
                    ['chunkNumber', 'ASC']
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
app.post('/files/:id/reassemble', async (req, res) => {
    try {
        const fileId = req.params.id;
        const chunks = await Chunk.findAll({
            where: {
                fileId
            },
            order: [
                ['chunkNumber', 'ASC']
            ]
        });
        const filePath = path.join(__dirname, 'uploads', fileId.toString());
        await reassemble(chunks, filePath);
        res.send('File reassembled successfully');
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