import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = "http://127.0.0.1:3300";

test("local server smoke test: API responds and rejects unsafe profile IDs", async () => {
  const child = spawn(process.execPath, ["app/server.mjs"], {
    cwd: root,
    stdio: "ignore",
  });

  try {
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      if (child.exitCode !== null) {
        throw new Error(`server exited before ready (code ${child.exitCode})`);
      }
      try {
        const response = await fetch(`${baseUrl}/api/system`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await delay(250);
    }
    assert.equal(ready, true, "server did not become ready within 10 seconds");

    const systemResponse = await fetch(`${baseUrl}/api/system`);
    assert.equal(systemResponse.status, 200);
    const system = await systemResponse.json();
    assert.equal(typeof system.profilesCount, "number");
    assert.equal(typeof system.proxiesCount, "number");

    const rejectedOrigin = await fetch(`${baseUrl}/api/system`, {
      headers: { Origin: "https://attacker.invalid" },
    });
    assert.equal(rejectedOrigin.status, 403);

    const unsafeProfile = await fetch(`${baseUrl}/api/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "../outside", nombre: "unsafe" }),
    });
    assert.equal(unsafeProfile.status, 400);
    assert.match((await unsafeProfile.json()).error, /ID de perfil inválido/);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), delay(2000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
});
