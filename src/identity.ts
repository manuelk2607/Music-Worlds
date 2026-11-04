/** Adapter boundary for a future tested Worlds Hub OIDC client. No token/cookie is shared across Workers. */
export interface VerifiedHubIdentity {issuer:string;subject:string;authTime:number;sessionId:string}
export interface HubOIDCAdapter {
  begin(input:{redirectURI:string;state:string;nonce:string;pkceChallenge:string}):Promise<URL>;
  callback(input:{code:string;state:string;redirectURI:string}):Promise<VerifiedHubIdentity>;
  revokeLocalSession(sessionId:string):Promise<void>;
}
export interface IdentityLinkStore {
  /** Requires explicit consent and fresh proof of both the existing local session and central identity. */
  link(input:{localProfileId:string;hub:VerifiedHubIdentity;localProofId:string;centralProofId:string}):Promise<void>;
}
/** A future central profile can carry this validated preference without shared cookies. */
export interface HubLanguagePreference {language:'de'|'en';updatedAt:string}
export const hubAuthenticationStatus={enabled:false,reason:'OIDC issuer/client registration and real linking/logout acceptance are not available yet.'} as const;
