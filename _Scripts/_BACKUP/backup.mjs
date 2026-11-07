#!/usr/bin/env node
/**
 * 1) Writes the directory trees of `src/` and `public/` to `src/structure.md`.
 * 2) Copies `src/` + the project root files to `.backups/backup-YYYYMMDDHHMMSS[-suffix]/`.
 *    With the argument `ALL`, `public/` is copied as well (required when ALL is set).
 *    `--structure-only`: only write `structure.md`, no backup folder.
 *
 * npm: `npm run backup` · optional Suffix: `npm run backup -- vor-refactor`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const srcDir = path.join(root, 'src');
const publicDir = path.join(root, 'public');
const structureFile = path.join(srcDir, 'structure.md');
const backupsRoot = path.join(root, '.backups');

/** Game + build configuration in the repo root (without node_modules/dist). */
const ROOT_SNAPSHOT_FILES = [
  'index.html',
  'style.css',
  'vite.config.js',
  'package.json',
  'package-lock.json',
  'README.md',
  'favicon.ico',
];

/**
 * @param {string} raw
 * @returns {string}
 */
function sanitizeSuffix(raw) {
  const t = raw.trim().replace(/\s+/g, '-');
  const safe = t.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^-+|-+$/g, '');
  return safe.slice(0, 80);
}

/**
 * @param {string} absRoot absolute path to the folder
 * @param {string} label root line without slash, e.g. `src` or `public`
 * @returns {string}
 */
function formatDirTree(absRoot, label) {
  const lines = [`${label}/`];

  /**
   * @param {string} relDir
   * @param {string} prefix
   */
  function walk(relDir, prefix) {
    const abs = path.join(absRoot, relDir);
    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    entries.forEach((entry, i) => {
      const isLast = i === entries.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const childRel = relDir ? path.join(relDir, entry.name) : entry.name;
      const suffix = entry.isDirectory() ? '/' : '';
      lines.push(prefix + branch + entry.name + suffix);
      if (entry.isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(childRel, nextPrefix);
      }
    });
  }

  walk('', '');
  return lines.join('\n');
}

/**
 * @param {string} absDir
 * @returns {boolean}
 */
function isPublicDirPresent(absDir) {
  return fs.existsSync(absDir) && fs.statSync(absDir).isDirectory();
}

function parseArgs(argv) {
  const tokens = argv.slice(2);
  const structureOnly = tokens.includes('--structure-only');
  const rest = tokens.filter((t) => t !== '--structure-only');

  let includePublic = false;
  let labelParts = rest;

  if (rest.length > 0 && rest[0].toUpperCase() === 'ALL') {
    includePublic = true;
    labelParts = rest.slice(1);
  }

  const labelRaw = labelParts.join('-').trim();
  const suffix = labelRaw ? sanitizeSuffix(labelRaw) : '';

  return { includePublic, suffix, structureOnly };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function timestampFolderBase() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  const h = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const s = pad2(d.getSeconds());
  return `${y}${mo}${da}${h}${mi}${s}`;
}

function main() {
  const { includePublic, suffix, structureOnly } = parseArgs(process.argv);

  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    console.error('backup: `src/` is missing or not a directory.');
    process.exit(1);
  }

  if (includePublic && (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory())) {
    console.error('backup: `ALL` requires `public/`, but the folder is missing.');
    process.exit(1);
  }

  const srcTree = formatDirTree(srcDir, 'src');
  const iso = new Date().toISOString();
  /** @type {string[]} */
  const mdParts = [
    '# `src/` — directory tree',
    '',
    `_Generated automatically by \`_Scripts/_BACKUP/backup.mjs\` (${iso})._`,
    '',
    '```',
    srcTree,
    '```',
    '',
  ];

  if (isPublicDirPresent(publicDir)) {
    const publicTree = formatDirTree(publicDir, 'public');
    mdParts.push(
      '# `public/` — directory tree',
      '',
      '```',
      publicTree,
      '```',
      '',
    );
  }

  const md = mdParts.join('\n');

  fs.writeFileSync(structureFile, md, 'utf8');

  console.log(
    `structure.md updated (tree: src/${isPublicDirPresent(publicDir) ? ' + public/' : ''}).`,
  );

  if (structureOnly) {
    console.log('(--structure-only: no backup folder.)');
    return;
  }

  const ts = timestampFolderBase();
  const folderName = suffix ? `backup-${ts}-${suffix}` : `backup-${ts}`;
  const destRoot = path.join(backupsRoot, folderName);

  fs.mkdirSync(backupsRoot, { recursive: true });
  fs.mkdirSync(destRoot, { recursive: true });
  fs.cpSync(srcDir, path.join(destRoot, 'src'), { recursive: true });
  if (includePublic) {
    fs.cpSync(publicDir, path.join(destRoot, 'public'), { recursive: true });
  }

  let copiedRoot = 0;
  for (const name of ROOT_SNAPSHOT_FILES) {
    const srcPath = path.join(root, name);
    if (!fs.existsSync(srcPath)) continue;
    fs.cpSync(srcPath, path.join(destRoot, name));
    copiedRoot += 1;
  }

  console.log(`Backup: ${path.relative(root, destRoot)}`);
  console.log(`(src/ + ${copiedRoot} file(s) in the project root.)`);
  if (includePublic) console.log('(incl. public/)');
}

main();
