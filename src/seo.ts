export const publicPages:Record<string,{title:string;description:string;heading:string;text:string}>={
  '/':{title:'Music-Worlds — Dein Sound. Eure Runde.',description:'Musik entdecken, eigene Songhinweise beitragen und gemeinsam Errate das Lied spielen.',heading:'Gute Musik. Noch bessere Runden.',text:'Music-Worlds verbindet Freunde und Familie mit Musikspielen. Erstelle einen Spielraum, teile den Einladungslink und errate Songtitel anhand selbst formulierter Hinweise.'},
  '/spiele':{title:'Errate das Lied — Musikspiele | Music-Worlds',description:'So spielt ihr Errate das Lied: eigene Songhinweise, Multiple Choice oder freie Antworten, private Räume und ein Punkt pro richtigem Titel.',heading:'Errate das Lied',text:'Ein selbst formulierter Hinweis führt zu einem Songtitel. Spielt allein oder mit bis zu zehn Personen. Die Spielleitung wählt Runden, Zeitlimit und Antwortform. Jede richtige Antwort zählt einen Punkt. Alle Antworten werden serverseitig geprüft und gemeinsam aufgelöst.'},
  '/ueber':{title:'Über Music-Worlds — Musik, Quellen und Rechte',description:'Eine unabhängige Musikspielplattform im Worlds-Ökosystem. Informationen zu eigenen Hinweisen, Rechteprüfung, externen Quellen und Datenschutz.',heading:'Musik verbindet. Spielen auch.',text:'Music-Worlds ist eine eigenständige Plattform für Musikspiele. Beiträge werden vor Veröffentlichung geprüft. Es werden keine fremden Audiospuren extrahiert. Geschützte Originaltexte und Audio benötigen dokumentierte Rechte. Worlds Hub bleibt von lokalen Spielständen und Berechtigungen getrennt.'}
};
// The owner explicitly requested search indexing for the landing page only.
export const indexablePage=(path:string,enabled:boolean)=>enabled&&path==='/';
export function seoHTML(template:string,path:string,origin:string,indexing:boolean){
  const page=publicPages[path],canonical=origin+path,allowed=indexablePage(path,indexing),robots=allowed?'index,follow':'noindex,nofollow';
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'WebApplication',name:'Music-Worlds',url:origin+'/',applicationCategory:'GameApplication',operatingSystem:'Web',inLanguage:'de',description:page.description}).replaceAll('<','\\u003c');
  return template.replace(/<title>.*?<\/title>/s,`<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${page.description}">`)
    .replace(/<meta name="robots" content="[^"]*">/,`<meta name="robots" content="${robots}">`)
    .replace('</head>',`<meta name="mw-index-root" content="${allowed}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Music-Worlds"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${structured}</script></head>`)
    .replace('<main id="main" tabindex="-1"></main>',`<main id="main" tabindex="-1"><section class="page-title"><h1>${page.heading}</h1><p>${page.text}</p><a class="button primary" href="/#spielen">Spielen ↗</a></section></main>`);
}
