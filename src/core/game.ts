import { AppError, normalized, type Task } from '../domain';
import { musicRound, musicPoint, musicHelp, type MusicTask } from './ported-quiz';
import type {MessageKey} from '../i18n/de';

export type Player={id:string;name:string;score:number;joined:number};
type Round={task:Task;choices:{id:string;text:string}[];correctId:string;answers:Record<string,string>;deadline:number};
export type Room={code:string;version:number;host:string;players:Player[];phase:'lobby'|'voting'|'reveal'|'finished';match:string;
  settings:{rounds:number;seconds:number;answerType:'choice'|'text';category:string}; deck:Task[];roundIndex:number;round?:Round;
  played:string[];history:{match:string;scores:Player[]}[];expires:number};
export const fail=(ok:unknown,key:MessageKey,status=409,values:Record<string,string|number>={})=>{if(!ok)throw new AppError(status,key,values);};
export const shuffle=<T>(a:T[]):T[]=>{
  const copy=[...a]; for(let i=copy.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;
};
const portable=(t:Task):MusicTask=>({id:t.id,kind:'text',language:t.contribution.song.language||'und',prompt:t.contribution.prompt,
  answer:t.contribution.song.title,alternatives:t.contribution.alternatives as [string,string,string],
  hint:t.contribution.hint,album:t.contribution.song.album,rights:{basis:t.contribution.rights.basis==='public_domain'?'public-domain':t.contribution.rights.basis==='licensed_content'?'licensed':'original',evidence:t.contribution.rights.evidence}});
export function createRoom(code:string,id:string,name:string,now=Date.now()):Room{
  return {code,version:1,host:id,players:[{id,name,score:0,joined:now}],phase:'lobby',match:crypto.randomUUID(),
    settings:{rounds:3,seconds:30,answerType:'choice',category:'mixed'},deck:[],roundIndex:-1,played:[],history:[],expires:now+86400000};
}
export function reveal(r:Room){
  if(r.phase!=='voting'||!r.round)return;
  for(const p of r.players){const answer=r.round.answers[p.id];if(!answer)continue;
    p.score+=r.settings.answerType==='choice'?musicPoint(r.round.correctId,answer):Number([r.round.task.contribution.song.title,...r.round.task.contribution.aliases].map(normalized).includes(normalized(answer)));}
  r.phase='reveal';
}
export function tick(r:Room,now=Date.now()){if(r.phase==='voting'&&r.round&&now>=r.round.deadline){reveal(r);return true;}return false;}
function next(r:Room,now:number){
  r.roundIndex++;
  if(r.roundIndex>=r.deck.length){r.phase='finished';r.history.push({match:r.match,scores:structuredClone(r.players)});r.history=r.history.slice(-10);return;}
  const task=r.deck[r.roundIndex];const prepared=musicRound(portable(task),shuffle,()=>crypto.randomUUID());
  r.round={task,choices:prepared.choices,correctId:prepared.correctId,answers:{},deadline:now+r.settings.seconds*1000};
  r.played.push(task.id);r.phase='voting';
}
export type Action={action:string;match?:string;round?:number;answer?:string;settings?:Room['settings']};
export function act(r:Room,id:string,a:Action,pool:Task[]=[],now=Date.now()){
  const p=r.players.find(p=>p.id===id);fail(p,'error.member',403);
  if(a.action==='leave'){
    r.players=r.players.filter(p=>p.id!==id);if(r.host===id)r.host=r.players[0]?.id||'';
    if(r.phase==='voting'&&r.players.every(p=>r.round?.answers[p.id]!==undefined))reveal(r);return;
  }
  if(a.action==='answer'){
    fail(r.phase==='voting'&&r.round,'error.roundClosed');
    fail(now<r.round!.deadline,'error.deadline');
    fail(a.match===r.match&&a.round===r.roundIndex,'error.staleRound');
    fail(!Object.hasOwn(r.round!.answers,id),'error.alreadyAnswered');
    fail(typeof a.answer==='string'&&a.answer.trim().length>0&&a.answer.length<=180,'error.answerInvalid',400);
    if(r.settings.answerType==='choice')fail(r.round!.choices.some(c=>c.id===a.answer),'error.choiceInvalid',400);
    r.round!.answers[id]=a.answer!;
    if(r.players.every(p=>Object.hasOwn(r.round!.answers,p.id)))reveal(r);return;
  }
  fail(r.host===id,'error.hostOnly',403);
  if(a.action==='settings'){
    fail(r.phase==='lobby','error.settingsLobby');
    const s=a.settings;fail(s&&Number.isInteger(s.rounds)&&s.rounds>=1&&s.rounds<=10&&[15,30,45,60].includes(s.seconds)&&['choice','text'].includes(s.answerType)&&['mixed','pop','rock','electronic','classical'].includes(s.category),'error.settingsInvalid',400);
    r.settings=s!;return;
  }
  if(a.action==='start'){
    fail(r.phase==='lobby','error.gameRunning');
    const available=pool.filter(t=>!r.played.includes(t.id)&&(r.settings.category==='mixed'||t.contribution.category===r.settings.category));
    fail(available.length>=r.settings.rounds,'error.available',409,{count:available.length});
    r.deck=shuffle(available).slice(0,r.settings.rounds);r.match=crypto.randomUUID();r.roundIndex=-1;r.players.forEach(p=>p.score=0);next(r,now);return;
  }
  fail(a.match===r.match,'error.staleGame');
  if(a.action==='next'){fail(r.phase==='reveal'&&a.round===r.roundIndex,'error.roundIncomplete');next(r,now);return;}
  if(a.action==='rematch'){fail(r.phase==='finished','error.gameNotFinished');r.phase='lobby';r.round=undefined;r.deck=[];return;}
  throw new AppError(400,'error.actionUnknown');
}
export function join(r:Room,id:string,name:string,now=Date.now()){
  if(r.players.some(p=>p.id===id))return;
  fail(r.phase==='lobby','error.joinLobby');fail(r.players.length<10,'error.roomFull');
  r.players.push({id,name,score:0,joined:now});
}
export function view(r:Room,id:string,now=Date.now()){
  fail(r.players.some(p=>p.id===id),'error.member',403);
  const round=r.round,shown=r.phase==='reveal'||r.phase==='finished',c=round?.task.contribution;
  return {code:r.code,version:r.version,host:r.host,players:r.players,phase:r.phase,match:r.match,settings:r.settings,
    roundIndex:r.roundIndex,serverTime:now,history:r.history,remaining:r.settings.rounds-r.roundIndex-1,
    round:round&&c?{prompt:c.prompt,kind:c.kind,language:c.song.language||'und',choices:r.settings.answerType==='choice'?round.choices:[],deadline:round.deadline,
      answered:Object.keys(round.answers),myAnswer:round.answers[id],help:musicHelp(portable(round.task),2),
      solution:shown?{contributionId:round.task.id,title:c.song.title,artists:c.song.artists,source:c.song.source,correctId:round.correctId}:null,
      // External player titles can reveal answers: media is offered only after the answer phase.
      media:shown?c.media:null}:null};
}
