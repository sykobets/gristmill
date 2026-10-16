// Diarization must receive 16 kHz mono; meeting mixes are 24 kHz and need resampling.
const test: typeof import("node:test") = require("node:test");

const assert: typeof import("node:assert/strict") = require("node:assert/strict");

const fs: typeof import("node:fs") = require("node:fs");

const os: typeof import("node:os") = require("node:os");

const path: typeof import("node:path") = require("node:path");

const {
  readWavFormat,
  needsDiarizationResample,
}: typeof import("../../src/helpers/wavFormat.ts") = require("../../src/helpers/wavFormat.ts");

function writeWav(dir: string, name: string, sampleRate: number, channels: number) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(0, 40);
  const file = path.join(dir, name);
  fs.writeFileSync(file, header);

  return file;
}

test("a 24 kHz meeting mix needs resampling before diarization", (t: import("node:test").TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gristmill-wav-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const mix = readWavFormat(writeWav(dir, "mix.wav", 24000, 1));
  assert.deepEqual(mix, { channels: 1, sampleRate: 24000 });
  assert.equal(needsDiarizationResample(mix), true);

  const stereo = readWavFormat(writeWav(dir, "stereo.wav", 16000, 2));
  assert.equal(needsDiarizationResample(stereo), true);

  const ready = readWavFormat(writeWav(dir, "ready.wav", 16000, 1));
  assert.equal(needsDiarizationResample(ready), false);
});

test("a non-WAV file is treated as needing conversion", (t: import("node:test").TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gristmill-wav-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "x.ogg");
  fs.writeFileSync(file, "OggS-not-a-wav");

  assert.equal(readWavFormat(file), null);
  assert.equal(needsDiarizationResample(null), true);
});
