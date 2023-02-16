import { Controller, Post, Body, HttpException, HttpStatus, Param } from '@nestjs/common';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { getConnection } from 'typeorm';
import { Chunk } from './chunk.entity';
import { File } from './file.entity';

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

@Controller()
export class UploadController {
  @Post('/files')
  async createFile(@Body() body: { name: string, size: number, totalChunks: number }): Promise<{ fileId: number }> {
    try {
      const { name, size, totalChunks } = body;

      const file = new File();
      file.name = name;
      file.size = size;
      file.totalChunks = totalChunks;

      const connection = getConnection();
      const fileRepository = connection.getRepository(File);
      const savedFile = await fileRepository.save(file);

      return { fileId: savedFile.id };
    } catch (error) {
      console.error(error);
      throw new HttpException('Error creating file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/chunks/:id')
  async uploadChunk(
    @Body() body: { fileId: number, chunkNumber: number, chunkData: string },
    @Param('id') chunkId: string
  ): Promise<void> {
    try {
      if (!chunkId || (typeof chunkId !== 'string' && typeof chunkId !== 'number')) {
        throw new HttpException('Invalid chunk ID', HttpStatus.BAD_REQUEST);
      }

      const { fileId, chunkNumber, chunkData } = body;

      const chunkPath = path.join(__dirname, 'chunks', chunkId);

      // Save the chunk to disk
      await new Promise((resolve, reject) => {
        const writeStream = createWriteStream(chunkPath, {
          flags: 'a'
        });
        writeStream.write(chunkData);  // <-- Write the data to the stream
        req.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Create a new record in the database
      const connection = getConnection();
      const chunkRepository = connection.getRepository(Chunk);
      const chunk = new Chunk();
      chunk.id = chunkId;
      chunk.fileId = fileId;
      chunk.chunkNumber = chunkNumber;
      await chunkRepository.save(chunk);

      const fileRepository = connection.getRepository(File);
      const file = await fileRepository.findOne({ where: { id: fileId } });
      file.uploadedChunks++;
      if (file.uploadedChunks === file.totalChunks) {
        // All chunks have been uploaded, reassemble the file
        const chunks = await chunkRepository.find({
          where: {
            fileId
          },
          order: {
            chunkNumber: 'ASC'
          }
        });
        const filePath = path.join(__dirname, 'uploads', fileId.toString());
        await reassemble(chunks, filePath);
        await fileRepository.update({ id: fileId }, { uploadedChunks: file.totalChunks });
      }
    } catch (error) {
      console.error(error);
      throw new HttpException('Error uploading chunk', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

async function reassemble(chunks: Chunk[], filePath: string): Promise<void> {
  // Sort the chunks by their sequence number
  chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

  // Open a write stream to the output file
  const writeStream = fs.createWriteStream(filePath);

  // Iterate over the chunks and write them to the output file
  for (const chunk of chunks) {
    const chunkPath = path.join(__dirname, 'chunks', chunk.id.toString());
    const chunkData = await fs.promises.readFile(chunkPath);
    writeStream.write(chunkData);
  }

  // Close the write stream
  writeStream.end();
}