import {safeURL,youtube} from './urls';

export type ExternalProviderId='youtube'|'external_link';
export type ExternalMediaReference={provider?:ExternalProviderId;url:string;start?:number;end?:number};
export type ExternalPlaybackSource=ReturnType<typeof youtube>|{provider:'external_link';url:string};
export interface ExternalMediaProvider {
  readonly id:ExternalProviderId;
  readonly revealsTitle:boolean;
  normalize(reference:ExternalMediaReference):ExternalPlaybackSource;
}
/** Provider-specific normalization lives here; the game engine never selects a provider. */
export const externalMediaProviders:Record<ExternalProviderId,ExternalMediaProvider>={
  youtube:{id:'youtube',revealsTitle:true,normalize:r=>youtube(r.url,r.start??0,r.end)},
  external_link:{id:'external_link',revealsTitle:true,normalize:r=>({provider:'external_link',url:safeURL(r.url)})}
};
export function normalizeExternalMedia(reference:ExternalMediaReference):ExternalPlaybackSource{
  const provider=externalMediaProviders[reference.provider??'youtube'];
  if(!provider)throw new Error('error.mediaProvider');
  return provider.normalize(reference);
}

/** Future licensed playback must authorize this complete scope before creating a short-lived source. */
export interface PrivatePlaybackRequest {
  assetId:string;contributionId:string;contributionRevision:number;reviewOperationId:string;
  viewerId:string;roomCode:string;matchId:string;roundIndex:number;
}
export interface AuthorizedPrivatePlaybackAdapter {
  resolve(request:PrivatePlaybackRequest):Promise<{url:string;expiresAt:string;mime:string}>;
  revoke(assetId:string):Promise<void>;
}
