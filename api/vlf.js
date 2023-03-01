const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const sequelize = require('./database/sequelize');

require('dotenv').config()


/*const {
    Sequelize,
    DataTypes
} = require('sequelize');
*/

const {
    v4: uuidv4
} = require('uuid');

const File = require('./models/file')(sequelize);
const Chunk = require('./models/chunk')(sequelize);

// Associate models
File.hasMany(Chunk, { foreignKey: 'fileid' });
Chunk.belongsTo(File, { foreignKey: 'fileid' });

const port = 3005;

const app = express();

app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

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


// Set up Sequelize models for File and Chunk
// const File = sequelize.define('file', {
//     id: {
//         type: DataTypes.UUID,
//         primaryKey: true,
//         allowNull: false
//     },
//     name: {
//         type: DataTypes.STRING,
//         allowNull: false
//     },
//     size: {
//         type: DataTypes.BIGINT,
//         allowNull: false
//     },
//     totalchunks: {
//         type: DataTypes.INTEGER,
//         allowNull: false
//     },
//     uploadedchunks: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         defaultValue: 0
//     }
// }, {
//     // options
//     schema: 'common' // specify the schema name here as well
// });

// const Chunk = sequelize.define('chunk', {
//     id: {
//         type: DataTypes.STRING,
//         primaryKey: true
//     },
//     fileid: {
//         type: DataTypes.UUID,
//         allowNull: false,
//         // references: {
//         //     model: 'Files',
//         //     key: 'id'
//         // }
//     },
//     chunknumber: {
//         type: DataTypes.INTEGER,
//         allowNull: false
//     }
// }, {
//     // options
//     schema: 'common' // specify the schema name here as well
// });


//app.use(errorHandler)
// Or, force Sequelize to drop and recreate the table
sequelize.sync({
    force: true
});

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

//   jwt.verify(token, process.env.MY_SECRET_KEY, (err, user) => {
//     if (err) return res.sendStatus(403);
//     req.user = user;
//     next();
//   });
jwt.verify("token", "token", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
    
}

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
app.get('/test/:name/:size/:totalChunks', authenticate, (req, res) => {
    const {
        name,
        size,
        totalChunks
    } = req.params;
    res.send(`Hello, World! name: ${name} size: ${size} totalChunks: ${totalChunks}`);
});


// Create a new file upload
app.post('/files/:name/:size/:totalChunks',authenticate, async (req, res) => {
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

// Delete a file and all of its chunks
app.delete('/files/:fileId', authenticate, async (req, res) => {
    try {
      const { fileId } = req.params;
  
      // Delete all chunks associated with the file
      const chunks = await Chunk.findAll({ where: { fileId } });
  
      for (const chunk of chunks) {
        const chunkPath = path.join(__dirname, 'chunks', `${chunk.id}_${fileId}`);
  
        await fs.promises.unlink(chunkPath);
  
        await chunk.destroy();
      }
  
      // Delete the file record
      const file = await File.findByPk(fileId);
  
      if (!file) {
        return res.status(404).send('File not found');
      }
  
      await file.destroy();
  
      res.send('File and chunks deleted successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error deleting file and chunks');
    }
  });
  
// Upload a file chunk
app.post('/chunks/:id/:fileId/:chunkNumber',authenticate, async (req, res) => {
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

// Delete a file chunk
app.delete('/chunks/:id/:fileId/:chunkNumber', authenticate, async (req, res) => {
    try {
        const { fileId, chunkNumber } = req.params;
        const chunkId = req.params.id;

        if (!chunkId || (typeof chunkId !== 'string' && typeof chunkId !== 'number')) {
            res.status(400).send('Invalid chunk ID');
            return;
        }

        const chunkPath = path.join(__dirname, 'chunks', `${chunkId}_${fileId}`);

        console.log(`Deleting chunk ${chunkNumber} at path: ${chunkPath}`);
        fs.unlink(chunkPath, (err) => {
            if (err) {
                console.error(`Error deleting chunk ${chunkNumber}:`, err);
                res.status(500).send(`Error deleting chunk ${chunkNumber}`);
                return;
            }
            console.log(`Chunk ${chunkNumber} deleted successfully`);

            // Delete the record from the database
            Chunk.destroy({
                where: {
                    id: chunkId,
                    fileid: fileId,
                    chunknumber: chunkNumber
                }
            })
            .then(() => {
                console.log(`Chunk ${chunkNumber} record deleted from database`);
            })
            .catch((error) => {
                console.error(`Error deleting chunk ${chunkNumber} record from database:`, error);
            });

            res.send(`Chunk ${chunkNumber} deleted successfully`);
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error deleting chunk');
    }
});


// Reassemble file from chunks
app.post('/reassemble/:id', authenticate, async (req, res) => {
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
    await Chunk.destroy({ truncate: true, schema: 'common' });
    console.log('All rows deleted from Chunk table');

    // then delete all rows from the File table
    await File.destroy({ truncate: true, schema: 'common' });
    console.log('All rows deleted from File table');

}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
