// Unit-tests the local LLM models preload bridge validation: modelGetAll and
// modelGetActiveDownloads return arrays from main, so the boundary must accept
// arrays (not only plain objects) or the renderer inventory always looks empty.
const test: typeof import("node:test") = require("node:test");

const assert: typeof import("node:assert/strict") = require("node:assert/strict");

const {
  createLocalLlmModelsBridge,
}: typeof import("../../src/preload/localLlmModelsBridge.ts") = require("../../src/preload/localLlmModelsBridge.ts");

const {
  localLlmChannels,
}: typeof import("../../src/contracts/localLlmModels.ts") = require("../../src/contracts/localLlmModels.ts");

import type { IpcRendererLike } from "../../src/preload/ipcTransport.ts";

function bridgeFor(invoke: IpcRendererLike["invoke"]) {
  const ipc: IpcRendererLike = {
    invoke,
    send() {},
    on() {
      return undefined;
    },
    removeListener() {
      return undefined;
    },
  };

  return createLocalLlmModelsBridge(ipc);
}

test("modelGetAll accepts an array of model status rows", async () => {
  const rows = [
    {
      id: "gemma-4-e4b-it-qat-q4_0",
      name: "Gemma 4 E4B QAT",
      isDownloaded: true,
    },
  ];
  const api = bridgeFor(async (channel) => {
    assert.equal(channel, localLlmChannels.modelGetAll);

    return rows;
  });

  assert.deepEqual(await api.modelGetAll(), rows);
});

test("modelGetActiveDownloads accepts an array of download rows", async () => {
  const rows = [
    {
      modelType: "llm",
      modelId: "gemma-4-e4b-it-qat-q4_0",
      phase: "downloading",
      progress: 10,
      downloadedBytes: 1,
      totalBytes: 10,
      sequence: 1,
    },
  ];
  const api = bridgeFor(async (channel) => {
    assert.equal(channel, localLlmChannels.modelGetActiveDownloads);

    return rows;
  });

  assert.deepEqual(await api.modelGetActiveDownloads(), rows);
});

test("modelGetAll and modelGetActiveDownloads reject non-array responses", async () => {
  const getAll = bridgeFor(async () => ({ id: "not-an-array" }));
  await assert.rejects(getAll.modelGetAll(), /Unexpected response shape from model-get-all/);

  const getDownloads = bridgeFor(async () => ({ modelId: "not-an-array" }));
  await assert.rejects(
    getDownloads.modelGetActiveDownloads(),
    /Unexpected response shape from model-get-active-downloads/
  );
});

test("object-shaped LLM results still pass through passthroughInvoke", async () => {
  const result = { success: true, path: "/models/x.gguf" };
  const api = bridgeFor(async (channel) => {
    assert.equal(channel, localLlmChannels.modelDownload);

    return result;
  });

  assert.deepEqual(await api.modelDownload("gemma-4-e4b-it-qat-q4_0"), result);
});
