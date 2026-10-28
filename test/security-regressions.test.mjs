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
