import beginner from './beginner.js';
import folk from './folk.js';
import fiddle from './fiddle.js';
import classical from './classical.js';
import holidayHymns from './holiday-hymns.js';
import rockBlues from './rock-blues.js';
import technique from './technique.js';
import aiAdded from './ai-added.js';

/**
 * Built-in song library. Every melody is public domain (traditional, or by
 * composers whose works are out of copyright) or an original riff/exercise
 * written for this app. Arrangements are simplified single-line transcriptions.
 */
export const BUILTIN_SONGS = [
  ...beginner,
  ...folk,
  ...fiddle,
  ...classical,
  ...holidayHymns,
  ...rockBlues,
  ...technique,
  ...aiAdded,
].map(s => ({ ...s, source: 'builtin' }));

export const GENRES = [
  'Beginner', 'Folk', 'World', 'Celtic', 'Old-Time', 'Bluegrass', 'Classical',
  'Rock & Metal', 'Blues & Jazz', 'Hymns', 'Holiday', 'Technique',
];
