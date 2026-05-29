export type LineKind = "add" | "del" | "ctx";

export interface DiffLine {
  kind: LineKind;
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  hunks: DiffHunk[];
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
}

export function parseUnifiedDiff(raw: string): DiffFile[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;

  const pushFile = () => {
    if (current) {
      if (currentHunk) current.hunks.push(currentHunk);
      files.push(current);
    }
    current = null;
    currentHunk = null;
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      pushFile();
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      current = {
        oldPath: match?.[1] ?? null,
        newPath: match?.[2] ?? null,
        hunks: [],
        isNew: false,
        isDeleted: false,
        isRename: false,
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith("new file mode")) {
      current.isNew = true;
      continue;
    }
    if (line.startsWith("deleted file mode")) {
      current.isDeleted = true;
      continue;
    }
    if (line.startsWith("rename from ")) {
      current.isRename = true;
      current.oldPath = line.slice("rename from ".length);
      continue;
    }
    if (line.startsWith("rename to ")) {
      current.newPath = line.slice("rename to ".length);
      continue;
    }
    if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) {
      continue;
    }
    if (line.startsWith("@@")) {
      if (currentHunk) current.hunks.push(currentHunk);
      currentHunk = { header: line, lines: [] };
      continue;
    }
    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({ kind: "add", text: line.slice(1) });
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({ kind: "del", text: line.slice(1) });
    } else if (line.startsWith(" ") || line === "") {
      currentHunk.lines.push({ kind: "ctx", text: line.startsWith(" ") ? line.slice(1) : line });
    }
  }

  pushFile();
  return files.filter((f) => f.newPath || f.oldPath);
}

export function filePath(file: DiffFile): string {
  return file.newPath ?? file.oldPath ?? "unknown";
}

export function countLines(file: DiffFile): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === "add") added++;
      if (line.kind === "del") removed++;
    }
  }
  return { added, removed };
}

export function allChangedLines(file: DiffFile): string {
  return file.hunks
    .flatMap((h) => h.lines.filter((l) => l.kind !== "ctx").map((l) => l.text))
    .join("\n");
}
