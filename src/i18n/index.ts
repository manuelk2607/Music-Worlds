import {de,type MessageKey} from './de';
import {en} from './en';
export const locales=['de','en'] as const;
export type Locale=typeof locales[number];
const messages={de,en};
export function localeFrom(value:unknown,fallback:Locale='de'):Locale{
  const code=String(value||'').trim().toLowerCase().split(/[-_]/)[0];return code==='en'?'en':code==='de'?'de':fallback;
}
export function t(locale:Locale,key:MessageKey,values:Record<string,string|number>={}):string{
  return messages[locale][key].replace(/\{(\w+)\}/g,(_,name:string)=>String(values[name]??`{${name}}`));
}
export function isMessageKey(value:string):value is MessageKey{return Object.hasOwn(de,value);}
export function number(locale:Locale,value:number,options?:Intl.NumberFormatOptions){return new Intl.NumberFormat(locale,options).format(value);}
export function date(locale:Locale,value:string|number|Date,options:Intl.DateTimeFormatOptions={dateStyle:'medium',timeStyle:'short'}){return new Intl.DateTimeFormat(locale,options).format(new Date(value));}
type PathKind='home'|'games'|'about';
export const localePath=(path:string,locale:Locale)=>{const kind:PathKind=path==='/spiele'||path==='/en/games'?'games':path==='/ueber'||path==='/en/about'?'about':'home';return locale==='en'?(kind==='games'?'/en/games':kind==='about'?'/en/about':'/en'):(kind==='games'?'/spiele':kind==='about'?'/ueber':'/');};
export const localeFromPath=(path:string):Locale=>path==='/en'||path.startsWith('/en/')?'en':'de';
