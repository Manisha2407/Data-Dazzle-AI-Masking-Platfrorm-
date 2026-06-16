import fs from 'fs';

const MAGIC_BYTES = {
  pdf:  { bytes: [0x25, 0x50, 0x44, 0x46], ext: '.pdf' },
  docx: { bytes: [0x50, 0x4B, 0x03, 0x04], ext: '.docx' },
  txt:  { bytes: null,                      ext: '.txt' },
};

const readFirstBytes = (filePath, count) => {
  const buffer = Buffer.alloc(count);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, count, 0);   // offset -> write in buffer from ind 0,  pos --> read from this ind of file
  fs.closeSync(fd);
  return buffer;
};

const isValidPdf = (buffer) =>
  MAGIC_BYTES.pdf.bytes.every((byte, i) => buffer[i] === byte);

const isValidDocx = (buffer) =>
  MAGIC_BYTES.docx.bytes.every((byte, i) => buffer[i] === byte);

const isValidTxt = (filePath) => {
  const content = fs.readFileSync(filePath);
  for (const byte of content) {
    if (byte === 0x00) return false;
  }
  return true;
};

const validateFileSignature = (filePath, declaredExt) => {
  const ext = declaredExt.toLowerCase();

  if (ext === '.txt') {
    return isValidTxt(filePath);
  }

  const buffer = readFirstBytes(filePath, 4);

  if (ext === '.pdf')  return isValidPdf(buffer);
  if (ext === '.docx') return isValidDocx(buffer);

  return false;
};

export default validateFileSignature;