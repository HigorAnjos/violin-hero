#!/usr/bin/env node
// MCP server for registering songs into the Violin Hero built-in library.
//
// Songs added through this server land in src/songs/library/ai-added.js —
// never in the hand-curated genre files — so additions are easy to spot in
// a diff and easy to review before (optionally) moving a tune into one of
// the curated files by hand. remove_song only ever touches that same file.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { parseABC } from '../src/songs/abc-parser.js';
import { buildChart } from '../src/songs/song-model.js';
import { BUILTIN_SONGS, GENRES } from '../src/songs/library/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_DIR = path.join(__dirname, '..', 'src', 'songs', 'library');
const AI_ADDED_PATH = path.join(LIBRARY_DIR, 'ai-added.js');
const INDEX_PATH = path.join(LIBRARY_DIR, 'index.js');
const TUNING_KEY = 'violin-standard'; // standard GDAE — the library's default arrangement tuning

const AI_ADDED_HEADER = `// Songs added through the song-registration MCP server (mcp-songs/).
// Each entry is machine-generated and bounded by @song markers so the
// server can find and remove it later — don't hand-edit the markers.
// Review a tune here, then move it into a curated genre file whenever ready.
export default [
];
`;

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function escapeForTemplateLiteral(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function unescapeFromTemplateLiteral(s) {
  return s.replace(/\\\$\{/g, '${').replace(/\\`/g, '`').replace(/\\\\/g, '\\');
}

function readAiAdded() {
  if (!existsSync(AI_ADDED_PATH)) return AI_ADDED_HEADER;
  return readFileSync(AI_ADDED_PATH, 'utf8');
}

/** Every entry add_song has written, parsed back out of its @song-marked block. */
function parseAiAddedEntries(text) {
  const entries = [];
  const re = /\/\/ @song:([a-z0-9-]+)\n\{ id: '([^']*)', genre: '([^']*)', abc: `([\s\S]*?)` \},\n\/\/ @song:\1:end\n/g;
  let m;
  while ((m = re.exec(text))) {
    entries.push({ id: m[2], genre: m[3], abc: unescapeFromTemplateLiteral(m[4]), source: 'ai-added' });
  }
  return entries;
}

function allKnownIds() {
  return new Set([...BUILTIN_SONGS.map(s => s.id), ...parseAiAddedEntries(readAiAdded()).map(e => e.id)]);
}

/** Parse + chart a tune, throwing a short, specific message on anything invalid. */
function validate(abc) {
  const parsed = parseABC(abc);
  if (!parsed.title) throw new Error('Missing a T: (title) line');
  if (!parsed.notes || parsed.notes.length < 2) throw new Error('Tune has fewer than 2 notes');
  const chart = buildChart(parsed, TUNING_KEY);
  return { parsed, chart };
}

function ensureIndexImportsAiAdded() {
  let text = readFileSync(INDEX_PATH, 'utf8');
  if (text.includes("from './ai-added.js'")) return;
  text = text.replace(
    "import technique from './technique.js';",
    "import technique from './technique.js';\nimport aiAdded from './ai-added.js';"
  );
  text = text.replace(
    '  ...technique,\n].map(',
    '  ...technique,\n  ...aiAdded,\n].map('
  );
  writeFileSync(INDEX_PATH, text);
}

function addSongToLibrary({ id, genre, abc }) {
  if (!existsSync(AI_ADDED_PATH)) writeFileSync(AI_ADDED_PATH, AI_ADDED_HEADER);
  ensureIndexImportsAiAdded();
  const entry = `// @song:${id}\n{ id: '${id}', genre: '${genre}', abc: \`${escapeForTemplateLiteral(abc)}\` },\n// @song:${id}:end\n`;
  const text = readFileSync(AI_ADDED_PATH, 'utf8');
  const marker = '];\n';
  const idx = text.lastIndexOf(marker);
  if (idx === -1) throw new Error('ai-added.js is malformed (no closing "];")');
  writeFileSync(AI_ADDED_PATH, text.slice(0, idx) + entry + text.slice(idx));
}

function removeSongFromLibrary(id) {
  const text = readFileSync(AI_ADDED_PATH, 'utf8');
  const start = text.indexOf(`// @song:${id}\n`);
  const endMarker = `// @song:${id}:end\n`;
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1) {
    if (BUILTIN_SONGS.some(s => s.id === id)) {
      throw new Error(`"${id}" is in a curated library file — this tool only removes AI-added songs. Edit the file by hand.`);
    }
    throw new Error(`No AI-added song with id "${id}"`);
  }
  writeFileSync(AI_ADDED_PATH, text.slice(0, start) + text.slice(end + endMarker.length));
}

function uniqueId(title) {
  const base = slug(title) || 'tune';
  const known = allKnownIds();
  if (!known.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!known.has(candidate)) return candidate;
  }
}

// ───────────────────────────── Server ─────────────────────────────

const server = new McpServer({ name: 'violin-hero-songs', version: '1.0.0' });

server.registerTool(
  'list_songs',
  {
    title: 'List songs',
    description: 'List songs in the Violin Hero library (built-in + AI-added), with title/composer/genre/key/meter. Use to check what already exists before adding a new tune. Also returns the valid genre names for add_song.',
    inputSchema: {
      genre: z.string().optional().describe('Filter to this exact genre'),
      query: z.string().optional().describe('Case-insensitive substring match against title/composer'),
    },
  },
  async ({ genre, query }) => {
    const all = [
      ...BUILTIN_SONGS.map(s => ({ ...s, source: s.source || 'builtin' })),
      ...parseAiAddedEntries(readAiAdded()),
    ];

    const rows = [];
    for (const s of all) {
      let meta;
      try {
        meta = parseABC(s.abc);
      } catch {
        continue;
      }
      if (genre && s.genre !== genre) continue;
      if (query) {
        const hay = `${meta.title} ${meta.composer || ''}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) continue;
      }
      rows.push({
        id: s.id, source: s.source, genre: s.genre, title: meta.title,
        composer: meta.composer || meta.origin || '', key: meta.key?.label, meter: meta.meter?.text,
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ count: rows.length, genres: GENRES, songs: rows }, null, 2),
      }],
    };
  }
);

server.registerTool(
  'validate_song',
  {
    title: 'Validate a tune',
    description: 'Parse an ABC notation tune and report its metadata (title, composer, key, meter, tempo, note count, difficulty) or the parse error, WITHOUT adding it to the library. Use before add_song to catch mistakes.',
    inputSchema: {
      abc: z.string().describe('ABC notation for one tune (must include X:, T:, M:, L:, K: headers)'),
    },
  },
  async ({ abc }) => {
    try {
      const { parsed, chart } = validate(abc);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: true,
            title: parsed.title,
            composer: parsed.composer || parsed.origin || null,
            key: parsed.key.label,
            meter: parsed.meter.text,
            tempo: Math.round(parsed.tempo),
            notes: chart.notes.length,
            phrases: chart.phrases.length,
            difficulty: chart.difficulty.label,
            maxPosition: chart.maxPosition,
            suggestedId: uniqueId(parsed.title),
          }, null, 2),
        }],
      };
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ valid: false, error: err.message }, null, 2) }], isError: true };
    }
  }
);

server.registerTool(
  'add_song',
  {
    title: 'Add a song to the library',
    description: 'Validate an ABC tune and add it to the Violin Hero built-in library (src/songs/library/ai-added.js), so it ships with the app for every player. One tune per call. Call list_songs first to check the valid genre names and avoid adding a duplicate.',
    inputSchema: {
      abc: z.string().describe('ABC notation for one tune (must include X:, T:, M:, L:, K: headers)'),
      genre: z.string().describe('One of the existing genre names — see list_songs for the current list'),
    },
  },
  async ({ abc, genre }) => {
    if (!GENRES.includes(genre)) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Unknown genre "${genre}". Valid genres: ${GENRES.join(', ')}` }, null, 2) }],
        isError: true,
      };
    }
    let parsed, chart;
    try {
      ({ parsed, chart } = validate(abc));
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }, null, 2) }], isError: true };
    }
    const id = uniqueId(parsed.title);
    addSongToLibrary({ id, genre, abc });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          added: true, id, title: parsed.title, genre,
          notes: chart.notes.length, difficulty: chart.difficulty.label,
          file: path.relative(path.join(__dirname, '..'), AI_ADDED_PATH),
        }, null, 2),
      }],
    };
  }
);

server.registerTool(
  'remove_song',
  {
    title: 'Remove an AI-added song',
    description: 'Remove a song previously added with add_song, by id. Refuses to touch songs from the curated library files.',
    inputSchema: {
      id: z.string().describe('The song id returned by add_song'),
    },
  },
  async ({ id }) => {
    try {
      removeSongFromLibrary(id);
      return { content: [{ type: 'text', text: JSON.stringify({ removed: true, id }, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }, null, 2) }], isError: true };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
