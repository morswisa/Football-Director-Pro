import { spawnSync } from "node:child_process";

function run(label, command, args = []) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const output = [result.stdout, result.stderr].filter(Boolean).join("").trim();
  const ok = result.status === 0;
  return { label, command: [command, ...args].join(" "), ok, output };
}

const checks = [
  run("Java runtime", "java", ["-version"]),
  run("Java home", "/usr/libexec/java_home", ["-V"]),
  run("Xcode selected path", "xcode-select", ["-p"]),
  run("Xcode build", "xcodebuild", ["-version"]),
  run("Capacitor Android doctor", "npx", ["cap", "doctor", "android"]),
  run("Capacitor iOS doctor", "npx", ["cap", "doctor", "ios"]),
];

let failed = false;
for (const check of checks) {
  const mark = check.ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${check.label}: ${check.command}`);
  if (check.output) {
    console.log(check.output.split("\n").map((line) => `  ${line}`).join("\n"));
  }
  if (!check.ok) failed = true;
}

if (failed) {
  console.error("\nNative binary builds are not ready. Install/configure the failed toolchain items, then rerun npm run mobile:toolchain.");
  process.exit(1);
}

console.log("\nNative toolchain checks passed. You can run npm run mobile:build:android and npm run mobile:build:ios.");
