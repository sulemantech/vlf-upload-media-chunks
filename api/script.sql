Drop TABLE common.files;
Drop TABLE common.chunks;

CREATE TABLE common.Files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  totalChunks INTEGER NOT NULL,
  uploadedChunks INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE common.Chunks (
  chunkid SERIAL PRIMARY KEY,
  id VARCHAR(255) NOT NULL,
  fileId INTEGER NOT NULL REFERENCES common.files(id),
  chunkNumber INTEGER NOT NULL
);