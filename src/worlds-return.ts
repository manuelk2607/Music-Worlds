const key = 'mw-worlds-return';
const lifetime = 15 * 60_000;

function validDestination(fragment: string) {
  return fragment === '#spielen' || fragment === '#beitragen' || fragment === '#moderation' ||
    (fragment.length === 14 && /^#raum\/[A-Z2-9]{8}$/.test(fragment));
}

export function rememberWorldsReturn(storage: Pick<Storage, 'setItem'>, fragment: string, now = Date.now()) {
  if (validDestination(fragment)) storage.setItem(key, `${now}:${fragment}`);
}

export function takeWorldsReturn(storage: Pick<Storage, 'getItem' | 'removeItem'>, now = Date.now()) {
  const saved = storage.getItem(key);
  if (!saved) return null;
  storage.removeItem(key);
  const separator = saved.indexOf(':');
  if (separator < 1) return null;
  const savedAt = Number(saved.slice(0, separator));
  const fragment = saved.slice(separator + 1);
  return Number.isSafeInteger(savedAt) && savedAt <= now && now - savedAt < lifetime && validDestination(fragment)
    ? fragment : null;
}
