/** Shared with the guest web app so both halves look like one product. */
export const theme = {
  navy: '#16265E',
  navyDeep: '#0E1A44',
  lime: '#C9F23F',
  limeInk: '#1A2707',

  paper: '#F2F3F7',
  surface: '#FFFFFF',
  surface2: '#E8EAF0',
  ink: '#131A33',
  ink2: '#666D87',
  ink3: '#9AA0B4',
  rule: '#E3E6EE',

  ok: '#1B7F4C',
  warn: '#B5761B',
  danger: '#B3261E',
};

/**
 * Formatted by hand rather than with toLocaleString: Hermes on Android
 * ships a reduced Intl, and asking it for a specific locale can throw at
 * runtime — which crashes the screen rather than showing a wrong number.
 */
export const amount = (value: number | string) => {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const [whole, cents] = Math.abs(safe).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${safe < 0 ? '-' : ''}${grouped}.${cents}`;
};

/** For the screen. The printer gets `amount()` instead — see printer.ts. */
export const peso = (value: number | string) => '\u20B1' + amount(value);

/** "4 min" / "1 h 12 min" — how long a table has been waiting. */
export const sinceLabel = (iso: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
};
