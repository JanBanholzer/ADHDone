/**
 * Evangelizo Reader API — use from the mobile/web app (or a thin BFF) for daily saints.
 * Database keeps only liturgical feast dates (see liturgical_* tables).
 *
 * Docs: https://feed.evangelizo.org/v2/reader.php
 * Dates must be within ~30 days of "today" (server rule).
 *
 * @example
 * import { fetchReader, saintDetailUrl, formatReaderDate } from './evangelizo-reader.mjs';
 * const ymd = formatReaderDate(new Date());
 * const html = await fetchReader({ dateYmd: ymd, type: 'saint', lang: 'AM' });
 */

const READER = 'https://feed.evangelizo.org/v2/reader.php';

/** @param {Date} d */
export function formatReaderDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * @param {{ dateYmd: string, type: string, lang?: string, content?: string }} q
 */
export function readerUrl(q) {
  const u = new URL(READER);
  u.searchParams.set('date', q.dateYmd);
  u.searchParams.set('type', q.type);
  u.searchParams.set('lang', q.lang ?? 'AM');
  if (q.content) u.searchParams.set('content', q.content);
  return u.toString();
}

/**
 * @param {{ dateYmd: string, type: string, lang?: string, content?: string }} q
 * @param {RequestInit} [init]
 */
export async function fetchReader(q, init) {
  const res = await fetch(readerUrl(q), {
    ...init,
    headers: {
      'user-agent': 'ADHDone/1.0 (liturgical; evangelizo reader)',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Evangelizo reader ${res.status}`);
  return res.text();
}

/** @param {string} saintUuid @param {string} [lang='AM'] */
export function saintDetailUrl(saintUuid, lang = 'AM') {
  return `https://feed.evangelizo.org/v2/display_saint.php?id=${encodeURIComponent(saintUuid)}&language=${encodeURIComponent(lang)}`;
}
