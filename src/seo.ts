import {localeFromPath,localePath,t,type Locale} from './i18n';
import type {MessageKey} from './i18n/de';

type PageKind='home'|'games'|'about';
type Page={locale:Locale;kind:PageKind;title:string;description:string;heading:string;text:string};
const page=(locale:Locale,kind:PageKind):Page=>({locale,kind,title:t(locale,`seo.${kind}Title` as MessageKey),description:t(locale,`seo.${kind}Description` as MessageKey),heading:t(locale,`seo.${kind}Heading` as MessageKey),text:t(locale,`seo.${kind}Text` as MessageKey)});
export const publicPages:Record<string,Page>={'/':page('de','home'),'/spiele':page('de','games'),'/ueber':page('de','about'),'/en':page('en','home'),'/en/games':page('en','games'),'/en/about':page('en','about')};
// The owner requested indexing for landing pages only; both locale variants are the same landing-page scope.
export const indexablePage=(path:string,enabled:boolean)=>enabled&&(path==='/'||path==='/en');
const escapeAttribute=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function seoHTML(template:string,path:string,origin:string,indexing:boolean){
  const page=publicPages[path],canonical=origin+localePath(path,page.locale),allowed=indexablePage(path,indexing),robots=allowed?'index,follow':'noindex,nofollow';
  const deURL=origin+localePath(path,'de'),enURL=origin+localePath(path,'en');
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'WebApplication',name:'Music-Worlds',url:canonical,applicationCategory:'GameApplication',operatingSystem:'Web',inLanguage:page.locale,description:page.description}).replaceAll('<','\\u003c');
  return template.replace('<html lang="de"',`<html lang="${page.locale}"`)
    .replace(/<title>.*?<\/title>/s,`<title>${escapeAttribute(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${escapeAttribute(page.description)}">`)
    .replace(/<meta name="robots" content="[^"]*">/,`<meta name="robots" content="${robots}">`)
    .replace('</head>',`<meta name="mw-index-root" content="${allowed}"><meta name="mw-ssr-language" content="${page.locale}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="de" href="${deURL}"><link rel="alternate" hreflang="en" href="${enURL}"><link rel="alternate" hreflang="x-default" href="${deURL}"><meta property="og:type" content="website"><meta property="og:site_name" content="Music-Worlds"><meta property="og:locale" content="${page.locale==='de'?'de_DE':'en_US'}"><meta property="og:title" content="${escapeAttribute(page.title)}"><meta property="og:description" content="${escapeAttribute(page.description)}"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${structured}</script></head>`)
    .replace('<main id="main" tabindex="-1"></main>',`<main id="main" tabindex="-1"><section class="page-title"><h1>${page.heading}</h1><p>${page.text}</p><a class="button primary" href="${localePath('/',page.locale)}#spielen">${t(page.locale,'nav.play')} ↗</a></section></main>`);
}
export const requestedLocale=(path:string,header:string|null)=>publicPages[path]?.locale??localeFromPath(path||header||'');
