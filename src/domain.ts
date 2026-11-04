import { z } from 'zod';
import {normalizeExternalMedia} from './media-providers';
import type {Locale} from './i18n';
import type {MessageKey} from './i18n/de';

export class AppError extends Error {
  constructor(public status:number,public key:MessageKey,public values:Record<string,string|number>={}){super(key);}
}
export const ensure=(ok:unknown,key:MessageKey,status=400):asserts ok=>{
  if(!ok)throw new AppError(status,key);
};
export const normalized = (s: string) => s.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('de');
const text = (max: number) => z.string().trim().min(1).max(max);
export const rightsBases = ['external_embed','external_link','original_content','licensed_content','public_domain','rights_unverified'] as const;
export {safeURL,youtube} from './urls';
import {safeURL} from './urls';
const url = z.string().max(1500).transform((s, ctx) => {
  try { return safeURL(s); } catch { ctx.addIssue({code:'custom',message:'error.url'}); return z.NEVER; }
});
export const contributionSchema = z.object({
  song: z.object({title:text(180), artists:z.array(text(100)).min(1).max(8), album:z.string().trim().max(180).default(''),
    year:z.number().int().min(1000).max(new Date().getUTCFullYear()+1).optional(), genre:text(60), language:z.string().trim().max(30).default(''),
    musicbrainzId:z.string().uuid().optional(), source:url}),
  kind:z.enum(['original_hint','lyrics','audio']), prompt:text(3000), hint:z.string().trim().max(300).default(''),
  alternatives:z.array(text(180)).length(3), aliases:z.array(text(180)).max(10).default([]),
  difficulty:z.enum(['easy','medium','hard']), category:z.enum(['pop','rock','electronic','classical','mixed']),
  rights:z.object({basis:z.enum(rightsBases),holder:text(200),license:z.string().trim().max(300).default(''),
    source:url, evidence:z.string().trim().max(3000).default(''), uses:z.array(z.enum(['display','stream','embed','link'])).max(4),
    expires:z.iso.datetime().optional()}),
  media:z.object({provider:z.enum(['youtube','external_link']).default('youtube'),url, start:z.number().int().min(0).max(86400).default(0),end:z.number().int().max(86400).optional(),official:z.boolean()}).optional(),
  gameConfig:z.object({mode:z.literal('guess-song').default('guess-song')}).default({mode:'guess-song'})
}).strict().superRefine((v,c) => {
  const answers=[v.song.title,...v.alternatives].map(normalized);
  if(new Set(answers).size !== 4 || v.alternatives.some(a => v.aliases.map(normalized).includes(normalized(a))))
    c.addIssue({code:'custom',message:'error.answersUnique'});
  if(v.kind==='original_hint' && v.rights.basis!=='original_content')
    c.addIssue({code:'custom',message:'error.originalRights'});
  if(v.media) { try { normalizeExternalMedia(v.media); } catch(e) { c.addIssue({code:'custom',message:(e as Error).message}); } }
});
export type Contribution = z.infer<typeof contributionSchema>;
export type Review = {status:'pending'|'approved'|'blocked'|'withdrawn'; reviewer?:string; reason?:string; evidenceChecked?:boolean; mediaChecked?:boolean; reviewedAt?:string;operationId?:string};
export function canPublish(c:Contribution, review:Review, now=Date.now()) {
  if(review.status!=='approved' || !review.reviewer || !review.reason || !review.evidenceChecked || !review.reviewedAt) return false;
  const r=c.rights;
  if(r.expires && Date.parse(r.expires)<=now) return false;
  if(r.basis==='rights_unverified' || !r.holder || !r.evidence) return false;
  if(c.media&&(!c.media.official||!review.mediaChecked))return false;
  if(c.kind==='original_hint') return r.basis==='original_content' && r.uses.includes('display');
  if(c.kind==='lyrics') return ['original_content','licensed_content','public_domain'].includes(r.basis) && r.uses.includes('display');
  // Audio file publishing is deliberately disabled until private storage and licence acceptance tests pass.
  return false;
}
export const profileSchema=z.object({name:text(40),theme:z.enum(['dark','light']).default('dark'),language:z.enum(['de','en']).default('de') satisfies z.ZodType<Locale>}).strict();
export type Task = {id:string; contribution:Contribution;revision?:number};
