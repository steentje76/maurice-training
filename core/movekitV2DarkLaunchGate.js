(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else if(root)root.MoveKitV2DarkLaunchGate=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
/*
 * TK504 MoveKit V2 - dark-launch SERVER-AUTHORIZATION gate (pure, DISABLED BY DEFAULT).
 *
 * The only way this gate reports enabled:true is when ALL hold:
 *  - the host injected a verifyServerGrant() function (server/broker-side signature
 *    check; this module never trusts the grant payload by itself),
 *  - verifyServerGrant(grant) returns exactly boolean true,
 *  - grant is a plain data object: issuer 'tk-server', scope 'movekit_v2_tk_catalog_picker',
 *    accountId === getAccountId() (re-read on EVERY check -> account switch fails closed),
 *    expiresAtMs in the future and not further than MAX_TTL_MS away.
 *
 * It never reads localStorage, window, URL, cookies, globals or devtools-settable
 * flags, so none of those can enable it. It grants no media, writes nothing, and
 * does not authorize pending/unapproved identities (that is the eligibility gate's
 * job and is independent of this flag).
 */
const SCOPE = 'movekit_v2_tk_catalog_picker';
const ISSUER = 'tk-server';
const MAX_TTL_MS = 15 * 60 * 1000;

const REASON = Object.freeze({
  ENABLED: 'ENABLED_SERVER_AUTHORIZED',
  DEFAULT: 'DISABLED_BY_DEFAULT',
  NO_VERIFIER: 'DISABLED_NO_SERVER_VERIFIER',
  NO_GRANT: 'DISABLED_NO_GRANT',
  BAD_GRANT: 'DISABLED_MALFORMED_GRANT',
  UNVERIFIED: 'DISABLED_GRANT_NOT_VERIFIED',
  ACCOUNT: 'DISABLED_ACCOUNT_MISMATCH',
  EXPIRED: 'DISABLED_GRANT_EXPIRED',
  TTL: 'DISABLED_GRANT_TTL_TOO_LONG',
  ERROR: 'DISABLED_GATE_ERROR'
});

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function plain(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}
function own(o, k) {
  if (!hasOwn(o, k)) return undefined;
  const d = Object.getOwnPropertyDescriptor(o, k);
  return d && hasOwn(d, 'value') ? d.value : undefined;
}
function off(reason) {
  return Object.freeze({ enabled: false, reason });
}

function create(opts) {
  const o = plain(opts) ? opts : {};
  const verify = own(o, 'verifyServerGrant');
  const getAccountId = own(o, 'getAccountId');
  const nowFn = own(o, 'now');
  const configured = typeof verify === 'function' && typeof getAccountId === 'function';

  function check(grant) {
    if (!configured) return off(typeof verify === 'function' ? REASON.DEFAULT : REASON.NO_VERIFIER);
    try {
      if (grant === undefined || grant === null) return off(REASON.NO_GRANT);
      if (!plain(grant)) return off(REASON.BAD_GRANT);
      const issuer = own(grant, 'issuer'), scope = own(grant, 'scope');
      const accountId = own(grant, 'accountId'), exp = own(grant, 'expiresAtMs');
      if (issuer !== ISSUER || scope !== SCOPE || typeof accountId !== 'string' ||
        !accountId || typeof exp !== 'number' || !Number.isFinite(exp)) return off(REASON.BAD_GRANT);
      const current = getAccountId();
      if (typeof current !== 'string' || !current || current !== accountId) return off(REASON.ACCOUNT);
      const now = typeof nowFn === 'function' ? nowFn() : Date.now();
      if (typeof now !== 'number' || !Number.isFinite(now) || exp <= now) return off(REASON.EXPIRED);
      if (exp - now > MAX_TTL_MS) return off(REASON.TTL);
      // Verify last, on a frozen copy, so the verifier cannot be handed a mutable object.
      const copy = Object.freeze({ issuer, scope, accountId, expiresAtMs: exp });
      if (verify(copy) !== true) return off(REASON.UNVERIFIED);
      return Object.freeze({ enabled: true, reason: REASON.ENABLED });
    } catch (_e) {
      return off(REASON.ERROR);
    }
  }
  return Object.freeze({ check, configured });
}

return Object.freeze({
  create, REASON, SCOPE, ISSUER, MAX_TTL_MS,
  // Compile-time facts, not toggles.
  DEFAULT_ENABLED: false,
  PENDING_EXECUTION_PERMITTED: false
});
});
