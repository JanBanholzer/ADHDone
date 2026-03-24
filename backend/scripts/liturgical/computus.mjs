/**
 * Gregorian Easter (Western) and related Roman-rite moveable dates.
 * Easter: Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 */

/** @param {number} y */
export function easterSundayUtc(y) {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

/** @param {Date} d @param {number} n */
export function addDaysUtc(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Civil date in local calendar from UTC noon (avoids DST edge cases when run in any TZ). */
/** @param {Date} utc */
export function utcToCivilDate(utc) {
  const y = utc.getUTCFullYear();
  const m = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  return { y, m, day, iso: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/** First Sunday of Advent: Sunday in range Nov 27–Dec 3 (inclusive). */
/** @param {number} year */
export function firstSundayOfAdvent(year) {
  const candidates = [
    [11, 27],
    [11, 28],
    [11, 29],
    [11, 30],
    [12, 1],
    [12, 2],
    [12, 3],
  ];
  for (const [month, day] of candidates) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() === 0) return d;
  }
  throw new Error(`No Advent Sunday in ${year}`);
}

/** Feast of the Baptism of the Lord: Sunday after 6 January (GRC); if Epiphany is Sunday, following Sunday. */
/** @param {number} year */
export function baptismOfTheLord(year) {
  const epiphany = new Date(Date.UTC(year, 0, 6));
  const dow = epiphany.getUTCDay();
  if (dow === 0) return addDaysUtc(epiphany, 7);
  let d = addDaysUtc(epiphany, 7 - dow);
  return d;
}

/** Our Lord Jesus Christ, King of the Universe: Sunday before First Sunday of Advent. */
/** @param {number} year */
export function christTheKing(year) {
  const adv = firstSundayOfAdvent(year);
  return addDaysUtc(adv, -7);
}

/**
 * Holy Family: Sunday within Dec 26–31; if none, 30 December (GRC).
 * @param {number} year
 */
export function holyFamily(year) {
  for (let day = 26; day <= 31; day++) {
    const d = new Date(Date.UTC(year, 11, day));
    if (d.getUTCDay() === 0) return d;
  }
  return new Date(Date.UTC(year, 11, 30));
}

/** @param {number} year */
export function moveableForYear(year) {
  const easter = easterSundayUtc(year);
  return {
    easter,
    ashWednesday: addDaysUtc(easter, -46),
    palmSunday: addDaysUtc(easter, -7),
    holyThursday: addDaysUtc(easter, -3),
    goodFriday: addDaysUtc(easter, -2),
    holySaturday: addDaysUtc(easter, -1),
    divineMercySunday: addDaysUtc(easter, 7),
    ascension: addDaysUtc(easter, 39),
    pentecost: addDaysUtc(easter, 49),
    maryMotherOfTheChurch: addDaysUtc(easter, 50),
    trinity: addDaysUtc(easter, 56),
    corpusChristi: addDaysUtc(easter, 60),
    sacredHeart: addDaysUtc(easter, 61),
    immaculateHeart: addDaysUtc(easter, 62),
  };
}
