import { cp, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const root = resolve(import.meta.dirname, "..");
const origin = "https://github.com/chaoxu/recurscent-web.git";
const sourceRemote = "https://github.com/chaoxu/recurscent-web.git";
const sourceRef = "refs/heads/main";
const canonicalUrl = "https://recurscent.com/";

const { values } = parseArgs({
  options: {
    "prepare-only": { type: "boolean", default: false },
    reason: { type: "string", default: "Recurscent production website release" },
  },
});

function run(args: string[], cwd = root, capture = false): string {
  const result = Bun.spawnSync(args, { cwd, stdout: capture ? "pipe" : "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) throw new Error(`Command failed: ${args[0]} ${args[1] ?? ""} (${result.exitCode})`);
  return capture ? result.stdout!.toString().trim() : "";
}

function git(...args: string[]): string {
  return run(["git", ...args], root, true);
}

if ((await readFile("/etc/lab-host", "utf8")).trim() !== "saturn") {
  throw new Error("Publish recurscent-web from saturn.");
}
if (!/^\/nix\/store\/[a-z0-9]{32}-bun-[^/]+\/bin\/bun$/.test(await realpath(process.execPath))) {
  throw new Error("Run this adapter with Fleet Infra's locked Bun.");
}
if (!values.reason?.trim() || values.reason.length > 256) {
  throw new Error("Supply a short release reason.");
}

const cleanHead = () => {
  if (git("status", "--porcelain", "--untracked-files=all")) {
    throw new Error("Commit all intended source changes before publishing.");
  }
  if (git("symbolic-ref", "--short", "HEAD") !== "main") {
    throw new Error("Production releases must use main.");
  }
  if (git("remote", "get-url", "origin") !== origin) {
    throw new Error("Origin remote does not match the registered repository.");
  }
  const commit = git("rev-parse", "HEAD");
  if (!/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error("Expected a full Git source commit.");
  }
  const remoteHead = git("ls-remote", "origin", sourceRef).split(/\s+/)[0];
  if (remoteHead !== commit) {
    throw new Error("Push main before publishing. The release must equal origin/main.");
  }
  return commit;
};

const commit = cleanHead();
const outputRoot = join(root, "output");
await mkdir(outputRoot, { recursive: true });
const stage = await mkdtemp(join(outputRoot, "public-release-"));
const source = join(stage, "source");
const artifact = join(source, "dist");
const retained = join(root, "dist-public");
let worktree = false;

try {
  run(["git", "worktree", "add", "--detach", source, commit]);
  worktree = true;
  run([process.execPath, "run", "scripts/build.ts"], source);

  const files: string[] = [];
  for await (const path of new Bun.Glob("**/*").scan({
    cwd: artifact,
    dot: true,
    onlyFiles: true,
    followSymlinks: false,
  })) {
    files.push(path);
  }
  files.sort();
  if (!files.includes("index.html") || files.includes("release.json")) {
    throw new Error("The public build has an unexpected entrypoint or release manifest.");
  }

  const hashes: Record<string, string> = {};
  for (const path of files) {
    const file = join(artifact, path);
    if (!(await stat(file)).isFile()) throw new Error(`Unexpected artifact entry: ${path}`);
    hashes[path] = Bun.CryptoHasher.hash("sha256", new Uint8Array(await Bun.file(file).arrayBuffer()), "hex");
  }

  await writeFile(
    join(artifact, "release.json"),
    JSON.stringify(
      {
        schema: "fleet-static-release.v1",
        target: "recurscent",
        canonical_url: canonicalUrl,
        source: { remote: sourceRemote, ref: sourceRef, commit },
        files,
        sha256: hashes,
      },
      null,
      2,
    ) + "\n",
  );

  if (cleanHead() !== commit) {
    throw new Error("Source changed while the release was building. Run the adapter again.");
  }

  await rm(retained, { recursive: true, force: true });
  await cp(artifact, retained, { recursive: true, errorOnExist: true, force: false });
  console.log(`Prepared ${retained} from ${commit}`);

  if (!values["prepare-only"]) {
    run([
      "fleet-pages",
      "publish",
      "--target",
      "recurscent",
      "--slug",
      "recurscent",
      "--source",
      retained,
      "--source-remote",
      sourceRemote,
      "--source-ref",
      sourceRef,
      "--source-commit",
      commit,
      "--reason",
      values.reason,
      "--public",
    ]);
  }
} finally {
  if (worktree) run(["git", "worktree", "remove", "--force", source]);
  await rm(stage, { recursive: true });
}
