// WAV header inspection for the local diarization input contract.
import fs from "fs";

export interface WavFormat {
  sampleRate: number;
  channels: number;
}

// sherpa-onnx diarization only accepts 16 kHz mono input.
export const DIARIZATION_SAMPLE_RATE = 16000;

// Reads the fmt chunk of a RIFF/WAVE file; null when the header is not WAV.
export function readWavFormat(filePath: string): WavFormat | null {
  const fd = fs.openSync(filePath, "r");

  try {
    const header = Buffer.alloc(4096);
    const length = fs.readSync(fd, header, 0, header.length, 0);

    if (length < 12 || header.toString("ascii", 0, 4) !== "RIFF") return null;

    if (header.toString("ascii", 8, 12) !== "WAVE") return null;
    let offset = 12;

    while (offset + 8 <= length) {
      const id = header.toString("ascii", offset, offset + 4);
      const size = header.readUInt32LE(offset + 4);

      if (id === "fmt " && offset + 16 <= length) {
        return {
          channels: header.readUInt16LE(offset + 10),
          sampleRate: header.readUInt32LE(offset + 12),
        };
      }

      offset += 8 + size + (size % 2);
    }

    return null;
  } finally {
    fs.closeSync(fd);
  }
}

export function needsDiarizationResample(format: WavFormat | null): boolean {
  return !format || format.sampleRate !== DIARIZATION_SAMPLE_RATE || format.channels !== 1;
}
