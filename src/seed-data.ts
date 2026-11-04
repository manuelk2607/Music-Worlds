import type { Contribution } from './domain';
const titles=['Bohemian Rhapsody','Dancing Queen','Billie Jean','Take On Me','Imagine','Smells Like Teen Spirit','Around the World','Für Elise'];
const data:[string,string,string,number,string,string,string][]=[
 ['Queen','A Night at the Opera','Rock',1975,'rock','de','Dieser Titel verbindet eine ungewöhnliche Rhapsodie mit einem böhmischen Adjektiv. Die britische Band ist für ihre vielstimmigen Gesänge bekannt.'],
 ['ABBA','Arrival','Pop',1976,'pop','de','Gesucht ist ein königlicher Titel für die Tanzfläche. Die schwedische Gruppe besteht aus zwei Frauen und zwei Männern.'],
 ['Michael Jackson','Thriller','Pop',1982,'pop','de','Der Titel ist ein weiblicher Vor- und Nachname. Das Stück gehört zum Album mit dem englischen Wort für einen spannenden Film.'],
 ['a-ha','Hunting High and Low','Pop',1985,'pop','de','Ein norwegisches Trio, ein sehr hoher Refrain und ein Video, das Zeichnung mit realen Menschen verbindet.'],
 ['John Lennon','Imagine','Pop',1971,'pop','de','Ein einzelnes englisches Wort fordert zum Vorstellen auf. Gesucht ist ein Solostück eines ehemaligen Beatles.'],
 ['Nirvana','Nevermind','Rock',1991,'rock','de','Der Titel spricht vom Geruch eines jugendlichen Geistes. Dieses Trio machte Grunge weltweit bekannt.'],
 ['Daft Punk','Homework','Electronic',1997,'electronic','de','Ein französisches Duo schickt uns mit diesem englischen Titel einmal um den Globus.'],
 ['Ludwig van Beethoven','','Klassik',1810,'classical','de','Eine kurze Widmung an eine Frau gibt diesem bekannten Klavierstück seinen Namen. Der Komponist lebte zuletzt in Wien.']
];
export const seedContributions:Contribution[]=data.map(([artist,album,genre,year,category,language,prompt],i)=>({
  song:{title:titles[i],artists:[artist],album,genre,year,language,source:`https://musicbrainz.org/search?query=${encodeURIComponent(titles[i]+' '+artist)}&type=recording&method=indexed`},
  kind:'original_hint',prompt,hint:`Interpret: ${artist}`,alternatives:titles.filter((_,j)=>j!==i).slice(0,3),aliases:[],
  category:category as Contribution['category'],difficulty:'easy',
  rights:{basis:'original_content',holder:'Music-Worlds',license:'CC0-1.0 (nur selbst formulierter Hinweis)',source:'https://music-worlds.maki26.workers.dev/',
    evidence:'Für Music-Worlds am 04.11.2026 neu formulierter sachlicher Hinweis. Keine Songtextpassage, kein Audio, keine übernommenen Beschreibungen. Prüfung: Hinweistext und Metadaten getrennt.',uses:['display']},gameConfig:{mode:'guess-song'}
}));
