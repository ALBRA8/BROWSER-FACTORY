import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../app/server.mjs", import.meta.url), "utf8");

test("profile IDs are restricted before persistence and launch", () => {
  assert.match(server, /function isSafeProfileId\(id\)/);
  assert.match(server, /if \(!isSafeProfileId\(id\)\)/);
  assert.match(server, /ID de perfil inválido/);
});

test("proxy API responses redact raw connection strings and passwords", () => {
  assert.match(server, /const safeProxies = getProxies\(\)\.map\(\(\{ pass, raw, \.\.\.proxy \}\)/);
  assert.match(server, /const \{ pass, raw, \.\.\.safeProxy \} = proxyRecord/);
});

test("generated proxy extension encodes configuration as JavaScript literals", () => {
  assert.match(server, /scheme: \$\{JSON\.stringify\(proxyConfig\.protocolo/);
  assert.match(server, /host: \$\{JSON\.stringify\(proxyConfig\.host\)/);
  assert.match(server, /username: \$\{JSON\.stringify\(proxyConfig\.user/);
  assert.match(server, /password: \$\{JSON\.stringify\(proxyConfig\.pass/);
});

test("new proxy catalog is initialized empty", () => {
  assert.match(server, /JSON\.stringify\(\[\], null, 2\)/);
});

test("external browser origins are rejected", () => {
  assert.match(server, /Origen no permitido/);
  assert.match(server, /Preflight no permitido/);
});

test("static file serving blocks path traversal attempts", () => {
  assert.match(server, /const staticRoot = path\.resolve\(__dirname\)/);
  assert.match(server, /!resolvedFile\.startsWith\(staticRoot \+ path\.sep\)/);
  assert.match(server, /Ruta no permitida/);
});

test("request bodies are size-limited", () => {
  assert.match(server, /const MAX_BODY_BYTES = 1024 \* 1024/);
  assert.match(server, /function readBody\(req\)/);
  assert.match(server, /Cuerpo de la petición demasiado grande/);
});

test("profile-scoped endpoints validate the ID before touching disk or processes", () => {
  const scoped = [
    ...server.matchAll(/const (\w+)Match = pathname\.match\(\^?[^;]*\)/g),
  ];
  assert.ok(scoped.length >= 4, "expected scoped routes (close/assign/published/launch)");
  assert.match(server, /\/assign-video\$/);
  assert.match(server, /\/mark-published\$/);
  assert.match(server, /\/close\$/);
  assert.match(server, /\/launch\$/);
  const validationCount = (server.match(/if \(!isSafeProfileId\(id\)\)/g) || []).length;
  assert.ok(validationCount >= 4, "each scoped route must validate the profile ID");
});

test("video thumbnails only serve whitelisted video extensions", () => {
  assert.match(server, /const VIDEO_EXTS = new Set\(/);
  assert.match(server, /if \(!src \|\| !VIDEO_EXTS\.has\(ext\)\)/);
  assert.match(server, /Archivo de video inválido/);
});

test("launch targets are restricted to the known network list", () => {
  assert.match(server, /const validTargets = \[\.\.\.REDES, "mobile", "all", "login"\]/);
  assert.match(server, /const REDES = \["facebook", "instagram", "whatsapp", "tiktok", "youtube", "x", "telegram"\]/);
});

test("native file dialog is Windows-only", () => {
  assert.match(server, /El diálogo nativo solo está disponible en Windows/);
});
