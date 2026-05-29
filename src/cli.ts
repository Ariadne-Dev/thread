#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { analyzeDiff } from "./analyze.js";
import { formatJson, formatMarkdown, formatText } from "./format.js";
import { parseUnifiedDiff } from "./parse-diff.js";

type OutputFormat = "text" | "markdown" | "json";

function usage(): never {
  console.error(`thread — explain git diffs for learning and review (offline, no API)

Usage:
  thread explain [options]

Options:
  --staged          Use git diff --staged (default: unstaged)
  --range A...B     Compare branches or commits (e.g. main...HEAD)
  --file PATH       Read diff from a patch file
  --title TEXT      Heading for the output
  --format FORMAT   text | markdown | json (default: text)
  --help            Show this help

Examples:
  thread explain
  thread explain --staged
  thread explain --range main...HEAD
  git diff main...HEAD | thread explain
  thread explain --file changes.patch --format markdown
`);
  process.exit(argsIncludeHelp() ? 0 : 1);
}

function argsIncludeHelp(): boolean {
  return process.argv.includes("--help") || process.argv.includes("-h");
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (c) => chunks.push(c as Buffer));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function parseArgs(argv: string[]) {
  let staged = false;
  let range: string | undefined;
  let file: string | undefined;
  let title: string | undefined;
  let format: OutputFormat = "text";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--staged":
        staged = true;
        break;
      case "--range":
        range = argv[++i];
        if (!range) usage();
        break;
      case "--file":
        file = argv[++i];
        if (!file) usage();
        break;
      case "--title":
        title = argv[++i];
        if (!title) usage();
        break;
      case "--format":
        format = argv[++i] as OutputFormat;
        if (!["text", "markdown", "json"].includes(format)) usage();
        break;
      case "--help":
      case "-h":
        usage();
        break;
      default:
        if (arg.startsWith("-")) usage();
        positional.push(arg);
    }
  }

  return { staged, range, file, title, format, positional };
}

async function loadDiff(opts: ReturnType<typeof parseArgs>): Promise<string> {
  if (opts.file) {
    return readFileSync(opts.file, "utf8");
  }

  const stdinIsTTY = process.stdin.isTTY;
  if (!stdinIsTTY) {
    const piped = await readStdin();
    if (piped.trim()) return piped;
  }

  if (opts.range) {
    return runGit(["diff", opts.range]);
  }

  return runGit(opts.staged ? ["diff", "--staged"] : ["diff"]);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] !== "explain") {
    if (argsIncludeHelp()) usage();
    console.error('Expected command "explain". Run thread explain --help');
    process.exit(1);
  }

  const opts = parseArgs(argv.slice(1));
  const raw = await loadDiff(opts);

  if (!raw.trim()) {
    console.log("No diff to explain. Make some changes or pass a patch via --file or stdin.");
    return;
  }

  const files = parseUnifiedDiff(raw);
  const analysis = analyzeDiff(files);

  const heading = opts.title ?? (opts.range ? `Diff: ${opts.range}` : "Diff explanation");

  switch (opts.format) {
    case "markdown":
      console.log(formatMarkdown(analysis, heading));
      break;
    case "json":
      console.log(formatJson(analysis, heading));
      break;
    default:
      console.log(formatText(analysis, heading));
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
