export function safeURL(value: string): string {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !u.hostname.includes('.') ||
      /(^localhost$|\.local$|\.internal$|^\d+\.\d+\.\d+\.\d+$|[:\[\]])/i.test(u.hostname))
    throw new Error('Nur öffentliche HTTPS-Links ohne Zugangsdaten sind erlaubt.');
  return u.href;
}
export function youtube(value: string, start = 0, end?: number) {
  const u = new URL(safeURL(value));
  let id = '';
  if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
  else if (['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))
    id = u.pathname === '/watch' ? u.searchParams.get('v') || '' : /^\/(embed|shorts)\/([^/]+)$/.exec(u.pathname)?.[2] || '';
  if (!/^[\w-]{11}$/.test(id)) throw new Error('Keine gültige YouTube-Video-URL.');
  if (!Number.isInteger(start) || start < 0 || start > 86400 || (end !== undefined && (!Number.isInteger(end) || end <= start || end > 86400)))
    throw new Error('Start- und Endzeit sind ungültig.');
  const query = new URLSearchParams({controls:'1',playsinline:'1',start:String(start),enablejsapi:'1'});
  if (end !== undefined) query.set('end',String(end));
  return { provider:'youtube' as const, id, url:`https://www.youtube.com/watch?v=${id}`, embed:`https://www.youtube.com/embed/${id}?${query}` };
}
