#!/usr/bin/env node
/**
 * Local OBS bridge for Bunny Invitational 2.
 *
 * Why this exists
 * ---------------
 * The overlay director (/staff/overlay) is hosted on Vercel over HTTPS. A page
 * on an HTTPS origin is not allowed to open an insecure WebSocket to
 * ws://127.0.0.1:4455 (mixed content), and OBS's own browser source has the same
 * restriction. So the director page can never reach OBS directly.
 *
 * This script runs next to OBS on the streaming PC. It reads the public live
 * overlay state (the same state the /obs browser source renders) and mirrors it
 * onto OBS scenes and sources:
 *
 *   view "race" | "scoreboard" | "groups"
 *     | "pause" | "slides" | "ending" -> scene "Uma"
 *   view "matchup"              -> scene "Cast"
 *   view "gates"                  -> scene left alone: the gates strip only
 *                                    appears once "race" already owns Uma, so
 *                                    a gates press never moves OBS
 *   activeCategory  -> that category's source on in every toggle scene, and all
 *                      the other category sources off. Uma uses Sprint / Mile /
 *                      Medium / Long / Dirt, and Medium Audio follows Medium.
 *                      Cast uses Sprint 2 / Mile 2 / Medium 2 / Long 2 / Dirt 2,
 *                      and Medium Audio follows Medium 2. Medium Audio turns off
 *                      for every other distance. A distance change cuts that
 *                      audio straight across: the next distance is put back to
 *                      its resting volume while it is still hidden, then every
 *                      distance source flips in one parallel batch. Medium
 *                      includes Medium Audio. There is no fade, so the handoff
 *                      is not silent and the two distances are not left up
 *                      together. Switching Uma and Cast on the same distance
 *                      does not touch audio. Re-applied after a scene switch
 *                      so the scene's saved default does not replace the
 *                      distance already on air.
 *
 * Usage (streaming PC):
 *   set APP_URL=https://your-app.vercel.app
 *   set OBS_PASSWORD=your-obs-websocket-password
 *   node scripts/obs-bridge.mjs
 *
 * Config (all optional):
 *   APP_URL               base URL of the deployed app (default http://localhost:3000)
 *   OBS_STATE_URL         full live-state URL; overrides APP_URL
 *   OBS_URL               obs-websocket URL (default ws://127.0.0.1:4455)
 *   OBS_PASSWORD          obs-websocket password (Tools -> WebSocket Server Settings)
 *   OBS_SCENE_MAP         JSON view -> scene (default: race -> Uma, everything else -> Cast)
 *   OBS_CATEGORY_SOURCES  JSON scene -> category -> source names. A flat
 *                         category -> source map still applies to every scene.
 *   OBS_TOGGLE_SCENES     JSON array of scenes to toggle sources in
 *   OBS_POLL_MS           state poll interval (default 750)
 *   OBS_AUDIO_FADE_MS     distance-change audio fade (default 0, a hard cut).
 *                         A positive value fades the old distance out before
 *                         the new one in, which leaves a gap.
 *
 * Flags:
 *   --once                sync one state, then exit (handy for a quick check)
 */

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const DEFAULT_SCENE_MAP = {
  race: "Uma",
  matchup: "Cast",
  scoreboard: "Uma",
  groups: "Uma",
  pause: "Uma",
  slides: "Uma",
  ending: "Uma",
};
export const DEFAULT_CATEGORY_SOURCES = {
  Uma: {
    sprint: ["Sprint"],
    mile: ["Mile"],
    medium: ["Medium", "Medium Audio"],
    long: ["Long"],
    dirt: ["Dirt"],
  },
  Cast: {
    sprint: ["Sprint 2"],
    mile: ["Mile 2"],
    medium: ["Medium 2", "Medium Audio"],
    long: ["Long 2"],
    dirt: ["Dirt 2"],
  },
};

/** Per-scene maps win. A flat category map still applies to every scene. */
export function sourcesForScene(categorySources, sceneName) {
  const sample = Object.values(categorySources ?? {})[0];
  const perScene = sample != null && typeof sample === "object" && !Array.isArray(sample);
  if (!perScene) return categorySources ?? {};
  return categorySources[sceneName] ?? {};
}

export class ObsError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ObsError";
    this.code = code;
  }
}

/** obs-websocket v5 auth: base64(sha256(base64(sha256(password + salt)) + challenge)). */
export function authString(password, salt, challenge) {
  const secret = createHash("sha256").update(password + salt).digest("base64");
  return createHash("sha256").update(secret + challenge).digest("base64");
}

export function parseJsonEnv(raw, fallback, label, log = console) {
  if (raw == null || String(raw).trim() === "") return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") throw new Error("expected a JSON object or array");
    if (Array.isArray(parsed) !== Array.isArray(fallback)) throw new Error("unexpected shape");
    return parsed;
  } catch (err) {
    log.warn(`[obs-bridge] ${label} is not valid JSON — using defaults (${err.message})`);
    return fallback;
  }
}

export function loadConfig(env = process.env) {
  const appUrl = String(env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const sceneMap = parseJsonEnv(env.OBS_SCENE_MAP, DEFAULT_SCENE_MAP, "OBS_SCENE_MAP");
  const categorySources = parseJsonEnv(
    env.OBS_CATEGORY_SOURCES,
    DEFAULT_CATEGORY_SOURCES,
    "OBS_CATEGORY_SOURCES",
  );
  const defaultScenes = [...new Set(Object.values(sceneMap).filter((name) => typeof name === "string"))];
  const toggleScenes = parseJsonEnv(env.OBS_TOGGLE_SCENES, defaultScenes, "OBS_TOGGLE_SCENES");
  const fadeRaw = env.OBS_AUDIO_FADE_MS;
  const fadeParsed = fadeRaw == null || String(fadeRaw).trim() === "" ? 0 : Number(fadeRaw);
  return {
    stateUrl: env.OBS_STATE_URL || `${appUrl}/api/overlay/live`,
    obsUrl: env.OBS_URL || "ws://127.0.0.1:4455",
    obsPassword: env.OBS_PASSWORD || "",
    sceneMap,
    categorySources,
    toggleScenes,
    pollMs: Math.max(100, Number(env.OBS_POLL_MS) || 750),
    audioFadeMs: Number.isFinite(fadeParsed) ? Math.max(0, fadeParsed) : 0,
  };
}

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

/**
 * Minimal obs-websocket v5 client (JSON protocol over WebSocket).
 * Uses the global WebSocket from Node 22+, so the bridge needs no dependencies.
 */
export class ObsClient {
  constructor({ url, password = "", WebSocketImpl = globalThis.WebSocket, callTimeoutMs = 5000 }) {
    if (typeof WebSocketImpl !== "function") {
      throw new Error("No WebSocket available — run Node 22+ or pass WebSocketImpl.");
    }
    this.url = url;
    this.password = password;
    this.WebSocketImpl = WebSocketImpl;
    this.callTimeoutMs = callTimeoutMs;
    this.identified = false;
    this.ws = null;
    this.ready = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  connect() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve(this);
      };

      const ws = new this.WebSocketImpl(this.url, "obswebsocket.json");
      this.ws = ws;

      ws.addEventListener("message", (event) => {
        let message;
        try {
          message = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
        } catch {
          return;
        }
        if (message.op === 0) {
          try {
            this.sendIdentify(message.d ?? {});
          } catch (err) {
            done(err);
          }
          return;
        }
        if (message.op === 2) {
          this.identified = true;
          done();
          return;
        }
        if (message.op === 7) this.settleRequest(message.d ?? {});
      });

      ws.addEventListener("error", () => {
        done(new Error(`WebSocket error connecting to ${this.url}`));
        this.rejectPending(new Error("OBS WebSocket errored"));
      });

      ws.addEventListener("close", (event) => {
        this.identified = false;
        done(new Error(`OBS WebSocket closed (code ${event?.code ?? "?"}) before identifying`));
        this.rejectPending(new Error("OBS WebSocket closed"));
      });
    });
    return this.ready;
  }

  sendIdentify(hello) {
    const payload = { rpcVersion: 1, eventSubscriptions: 0 };
    const auth = hello.authentication;
    if (auth?.challenge && auth?.salt) {
      if (!this.password) {
        const err = new Error(
          "OBS requires a password — set OBS_PASSWORD (OBS -> Tools -> WebSocket Server Settings).",
        );
        err.fatal = true;
        throw err;
      }
      payload.authentication = authString(this.password, auth.salt, auth.challenge);
    }
    this.ws.send(JSON.stringify({ op: 1, d: payload }));
  }

  settleRequest(d) {
    const entry = this.pending.get(d.requestId);
    if (!entry) return;
    this.pending.delete(d.requestId);
    clearTimeout(entry.timer);
    const status = d.requestStatus ?? {};
    if (status.result === false) {
      entry.reject(new ObsError(`${d.requestType} failed: ${status.comment ?? status.code}`, status.code));
    } else {
      entry.resolve(d.responseData ?? {});
    }
  }

  call(requestType, requestData = {}) {
    if (!this.identified || !this.ws) {
      return Promise.reject(new Error("OBS WebSocket is not connected"));
    }
    const requestId = `bunvi-${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new ObsError(`${requestType} timed out`, -1));
      }, this.callTimeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(err);
      }
    });
  }

  rejectPending(err) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    this.pending.clear();
  }

  close() {
    this.identified = false;
    this.rejectPending(new Error("OBS WebSocket closed"));
    try {
      this.ws?.close();
    } catch {
      /* already gone */
    }
  }
}

export function newBridgeState() {
  return { indexes: new Map(), warned: new Set(), lastScene: null, lastCategory: null, volumes: new Map() };
}

function warnOnce(state, log, key, message) {
  if (state.warned.has(key)) return;
  state.warned.add(key);
  log.warn(`[obs-bridge] ${message}`);
}

/** Reads the director's on-air state. /api/overlay/live is public, so no auth here. */
export async function readState(fetchImpl, config) {
  const separator = config.stateUrl.includes("?") ? "&" : "?";
  const res = await fetchImpl(`${config.stateUrl}${separator}t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`live state returned ${res.status}`);
  const json = await res.json();
  const overlay = json?.overlay;
  if (!overlay || typeof overlay !== "object") throw new Error("live state has no overlay");
  return {
    view: typeof overlay.view === "string" ? overlay.view : "matchup",
    category: typeof overlay.activeCategory === "string" ? overlay.activeCategory : "",
    visible: overlay.visible !== false,
  };
}

/**
 * Maps source name (lowercased) -> scene item, walking into groups.
 * Groups are scenes in OBS, and SetSceneItemEnabled accepts a group name as
 * sceneName, so the owner name travels with each entry.
 */
async function sceneIndex(obs, sceneName, state, log) {
  const cached = state.indexes.get(sceneName);
  if (cached) return cached;

  const index = new Map();
  async function walk(listName, depth) {
    const res = await obs.call("GetSceneItemList", { sceneName: listName });
    for (const item of res.sceneItems ?? []) {
      const name = typeof item.sourceName === "string" ? item.sourceName : "";
      if (!name) continue;
      index.set(name.toLowerCase(), {
        id: item.sceneItemId,
        enabled: item.sceneItemEnabled !== false,
        owner: listName,
      });
      const isGroup = item.isGroup === true || item.sourceType === "OBS_SOURCE_TYPE_SCENE";
      if (isGroup && depth < 4) {
        try {
          await walk(name, depth + 1);
        } catch (err) {
          warnOnce(state, log, `group:${name}`, `could not read group "${name}": ${err.message}`);
        }
      }
    }
  }

  await walk(sceneName, 0);
  state.indexes.set(sceneName, index);
  return index;
}

/** Source names for one distance, across every toggle scene. Medium includes Medium Audio. */
export function categorySourceNames(categorySources, toggleScenes, category) {
  const names = [];
  const seen = new Set();
  for (const sceneName of toggleScenes ?? []) {
    const list = sourcesForScene(categorySources, sceneName)[category];
    const items = Array.isArray(list) ? list : list ? [list] : [];
    for (const name of items) {
      if (typeof name !== "string" || !name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

const AUDIO_FADE_STEPS = 8;

async function rememberVolume(obs, state, name) {
  if (!state.volumes) state.volumes = new Map();
  if (state.volumes.has(name)) return state.volumes.get(name);
  let current = null;
  try {
    const res = await obs.call("GetInputVolume", { inputName: name });
    current = typeof res.inputVolumeMul === "number" ? res.inputVolumeMul : null;
  } catch {
    return null;
  }
  if (current == null) return null;
  const resting = current > 0.001 ? current : 1;
  state.volumes.set(name, resting);
  return resting;
}

async function writeVolume(obs, name, mul) {
  try {
    await obs.call("SetInputVolume", { inputName: name, inputVolumeMul: mul });
    return true;
  } catch {
    return false;
  }
}

/** Fades distance audio. Scene changes on the same distance do not call this. */
export async function fadeCategoryAudio(obs, state, names, direction, fadeMs) {
  if (!fadeMs || !names?.length) return;
  const stepMs = Math.max(16, Math.round(fadeMs / AUDIO_FADE_STEPS));
  await Promise.all(
    names.map(async (name) => {
      const resting = await rememberVolume(obs, state, name);
      if (resting == null) return;
      const from = direction === "out" ? resting : 0;
      const to = direction === "out" ? 0 : resting;
      if (!(await writeVolume(obs, name, from))) return;
      for (let step = 1; step <= AUDIO_FADE_STEPS; step += 1) {
        const mul = from + (to - from) * (step / AUDIO_FADE_STEPS);
        if (!(await writeVolume(obs, name, mul))) return;
        if (step < AUDIO_FADE_STEPS) await sleep(stepMs);
      }
    }),
  );
}

async function silenceCategoryAudio(obs, state, names) {
  await Promise.all(
    names.map(async (name) => {
      if ((await rememberVolume(obs, state, name)) == null) return;
      await writeVolume(obs, name, 0);
    }),
  );
}

/** Puts audio inputs back to the level they had before any fade. Hidden sources stay hidden. */
async function restoreCategoryAudio(obs, state, names) {
  await Promise.all(
    names.map(async (name) => {
      const resting = await rememberVolume(obs, state, name);
      if (resting == null) return;
      await writeVolume(obs, name, resting);
    }),
  );
}

export async function applyCategory(obs, config, state, category, log = console) {
  const jobs = [];
  for (const sceneName of config.toggleScenes) {
    const index = await sceneIndex(obs, sceneName, state, log);
    for (const [name, sources] of Object.entries(sourcesForScene(config.categorySources, sceneName))) {
      const want = name === category;
      const list = Array.isArray(sources) ? sources : [sources];
      for (const sourceName of list) {
        if (typeof sourceName !== "string" || !sourceName) continue;
        const item = index.get(sourceName.toLowerCase());
        if (!item) {
          warnOnce(
            state,
            log,
            `source:${sceneName}:${sourceName}`,
            `source "${sourceName}" is not in scene "${sceneName}" — check OBS_CATEGORY_SOURCES`,
          );
          continue;
        }
        if (item.enabled === want) continue;
        jobs.push(
          (async () => {
            try {
              await obs.call("SetSceneItemEnabled", {
                sceneName: item.owner,
                sceneItemId: item.id,
                sceneItemEnabled: want,
              });
            } catch (err) {
              state.indexes.delete(sceneName);
              if (err?.code === 600) {
                warnOnce(
                  state,
                  log,
                  `gone:${sceneName}:${sourceName}`,
                  `source "${sourceName}" vanished from scene "${sceneName}"`,
                );
                return 0;
              }
              throw err;
            }
            item.enabled = want;
            return 1;
          })(),
        );
      }
    }
  }
  const counts = await Promise.all(jobs);
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function applyState(obs, config, state, wanted, log) {
  if (!wanted.visible) {
    if (state.lastScene !== null || state.lastCategory !== null) {
      log.info("[obs-bridge] overlay is hidden — leaving OBS alone");
    }
    state.lastScene = null;
    state.lastCategory = null;
    return;
  }

  const sceneName = config.sceneMap[wanted.view];
  let sceneChanged = false;
  if (typeof sceneName === "string" && sceneName && sceneName !== state.lastScene) {
    if (state.scenes && !state.scenes.has(sceneName)) {
      warnOnce(state, log, `scene:${sceneName}`, `scene "${sceneName}" does not exist in OBS — check OBS_SCENE_MAP`);
    } else {
      const current = await obs.call("GetCurrentProgramScene");
      if (current.currentProgramSceneName !== sceneName) {
        await obs.call("SetCurrentProgramScene", { sceneName });
        log.info(`[obs-bridge] scene -> "${sceneName}" (view "${wanted.view}")`);
      }
      state.lastScene = sceneName;
      sceneChanged = true;
    }
  }

  // A scene switch restores that scene's saved source visibility (often Mile).
  // Re-apply the distance already on air so Show Race does not change it.
  // Audio changes only when the distance changes, not when Uma and Cast swap.
  if (wanted.category && (sceneChanged || wanted.category !== state.lastCategory)) {
    const categoryChanged = state.lastCategory != null && wanted.category !== state.lastCategory;
    if (sceneChanged) {
      for (const name of config.toggleScenes) state.indexes.delete(name);
    }
    const fadeMs = config.audioFadeMs ?? 0;
    const next = categoryChanged
      ? categorySourceNames(config.categorySources, config.toggleScenes, wanted.category)
      : [];
    if (categoryChanged && fadeMs > 0) {
      const previous = categorySourceNames(config.categorySources, config.toggleScenes, state.lastCategory);
      log.info(`[obs-bridge] audio fade ${state.lastCategory} -> ${wanted.category}`);
      await fadeCategoryAudio(obs, state, previous, "out", fadeMs);
      await silenceCategoryAudio(obs, state, next);
    } else if (categoryChanged) {
      // Volume is restored while the next distance is still hidden, then every
      // source flips together. The old distance is not ducked first, and the
      // new one is not brought up from silence afterwards.
      log.info(`[obs-bridge] audio cut ${state.lastCategory} -> ${wanted.category}`);
      await restoreCategoryAudio(obs, state, next);
    }
    const toggled = await applyCategory(obs, config, state, wanted.category, log);
    if (categoryChanged && fadeMs > 0) await fadeCategoryAudio(obs, state, next, "in", fadeMs);
    log.info(`[obs-bridge] category -> "${wanted.category}" (${toggled} source${toggled === 1 ? "" : "s"} changed)`);
    state.lastCategory = wanted.category;
  }
}

export async function runSession(obs, config, state, opts = {}) {
  const log = opts.log ?? console;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const pollMs = opts.pollMs ?? config.pollMs;
  const signal = opts.signal;

  const scenes = await obs.call("GetSceneList");
  const sceneNames = new Set((scenes.scenes ?? []).map((scene) => scene.sceneName));
  state.scenes = sceneNames;
  for (const name of [...Object.values(config.sceneMap), ...config.toggleScenes]) {
    if (typeof name === "string" && name && !sceneNames.has(name)) {
      warnOnce(state, log, `scene:${name}`, `scene "${name}" does not exist in OBS — check your env config`);
    }
  }

  let stateFailures = 0;
  let obsFailures = 0;

  while (!signal?.aborted) {
    let wanted = null;
    try {
      wanted = await readState(fetchImpl, config);
      stateFailures = 0;
    } catch (err) {
      stateFailures += 1;
      if (stateFailures === 1 || stateFailures % 20 === 0) {
        log.warn(`[obs-bridge] cannot read the director state: ${err?.message ?? err}`);
      }
    }

    if (wanted) {
      try {
        await applyState(obs, config, state, wanted, log);
        obsFailures = 0;
      } catch (err) {
        obsFailures += 1;
        log.warn(`[obs-bridge] OBS command failed: ${err?.message ?? err}`);
        if (obsFailures >= 3) throw new Error(`OBS is not responding (${err?.message ?? err})`);
      }
    }

    if (opts.once) return;
    await sleep(pollMs, signal);
  }
}

export async function runBridge(config, opts = {}) {
  const log = opts.log ?? console;
  const state = newBridgeState();
  const reconnectMs = opts.reconnectMs ?? 3000;

  while (!opts.signal?.aborted) {
    const obs = new ObsClient({
      url: config.obsUrl,
      password: config.obsPassword,
      WebSocketImpl: opts.WebSocketImpl,
    });
    try {
      await obs.connect();
      log.info(`[obs-bridge] connected to ${config.obsUrl}`);
      await runSession(obs, config, state, { ...opts, log });
      if (opts.once) return;
    } catch (err) {
      if (opts.signal?.aborted) return;
      if (err?.fatal) throw err;
      if (opts.once) throw err;
      log.warn(`[obs-bridge] ${err?.message ?? err} — retrying in ${Math.round(reconnectMs / 1000)}s`);
    } finally {
      obs.close();
    }
    if (opts.once) return;
    state.indexes.clear();
    state.lastScene = null;
    state.lastCategory = null;
    await sleep(reconnectMs, opts.signal);
  }
}

async function main() {
  const once = process.argv.includes("--once");
  const config = loadConfig();
  const controller = new AbortController();
  const stop = () => {
    console.log("\n[obs-bridge] stopping…");
    controller.abort();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  console.log(`[obs-bridge] state: ${config.stateUrl}`);
  console.log(`[obs-bridge] OBS:   ${config.obsUrl}`);
  console.log(
    `[obs-bridge] scenes: ${JSON.stringify(config.sceneMap)} · toggling in ${JSON.stringify(config.toggleScenes)}`,
  );

  try {
    await runBridge(config, { signal: controller.signal, once });
  } catch (err) {
    console.error(`[obs-bridge] ${err?.message ?? err}`);
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
