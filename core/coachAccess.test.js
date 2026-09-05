'use strict';
const assert = require('assert');
const CoachAccessCore = require('./coachAccess.js');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

const activeRel = { id: 'r1', coach_user_id: 'coach1', athlete_user_id: 'ath1', status: 'active' };
const pendingRel = { id: 'r2', coach_user_id: 'coach1', athlete_user_id: 'ath2', status: 'pending' };
const revokedRel = { id: 'r3', coach_user_id: 'coach1', athlete_user_id: 'ath3', status: 'revoked' };
const rels = [activeRel, pendingRel, revokedRel];

t('SCOPES bevat exact de 3 gedocumenteerde scopes, in de juiste privacy-volgorde', () => {
  assert.deepStrictEqual(CoachAccessCore.SCOPES, ['TRAINING_CORE', 'RECOVERY_HEALTH', 'WOMENS_PERFORMANCE']);
});

t('hasActiveRelationship: true voor actieve relatie', () => {
  assert.strictEqual(CoachAccessCore.hasActiveRelationship('coach1', 'ath1', rels), true);
});
t('hasActiveRelationship: false voor pending (adversarial)', () => {
  assert.strictEqual(CoachAccessCore.hasActiveRelationship('coach1', 'ath2', rels), false);
});
t('hasActiveRelationship: false voor revoked (adversarial)', () => {
  assert.strictEqual(CoachAccessCore.hasActiveRelationship('coach1', 'ath3', rels), false);
});
t('hasActiveRelationship: false voor niet-bestaande relatie (adversarial)', () => {
  assert.strictEqual(CoachAccessCore.hasActiveRelationship('coach1', 'stranger', rels), false);
});

t('hasScope: false wanneer scope-rij ontbreekt ondanks actieve relatie (default-uit, KERN privacyregel)', () => {
  const scopeRows = []; // geen enkele scope geactiveerd
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath1', 'RECOVERY_HEALTH', rels, scopeRows), false);
});
t('hasScope: true wanneer scope expliciet enabled=true is gekoppeld aan de juiste relationship_id', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: true }];
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath1', 'TRAINING_CORE', rels, scopeRows), true);
});
t('hasScope: false wanneer enabled=false (adversarial -- niet alleen aanwezigheid telt)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: false }];
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath1', 'TRAINING_CORE', rels, scopeRows), false);
});
t('hasScope: false bij pending relatie zelfs met scope-rij (adversarial)', () => {
  const scopeRows = [{ relationship_id: 'r2', scope: 'TRAINING_CORE', enabled: true }];
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath2', 'TRAINING_CORE', rels, scopeRows), false);
});
t('hasScope: false voor onbekend scope-type (adversarial)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: true }];
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath1', 'MEDICAL_RECORDS', rels, scopeRows), false);
});
t('hasScope: scope voor andere relationship_id lekt niet naar deze relatie (adversarial cross-relationship-check)', () => {
  const scopeRows = [{ relationship_id: 'r3', scope: 'RECOVERY_HEALTH', enabled: true }]; // hoort bij revoked r3
  assert.strictEqual(CoachAccessCore.hasScope('coach1', 'ath1', 'RECOVERY_HEALTH', rels, scopeRows), false);
});

t('canViewRecoveryHealth/canViewWomensPerformance: allebei false zonder expliciete scope (geen impliciete toegang, KERN privacyregel)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'TRAINING_CORE', enabled: true }];
  assert.strictEqual(CoachAccessCore.canViewRecoveryHealth('coach1', 'ath1', rels, scopeRows), false);
  assert.strictEqual(CoachAccessCore.canViewWomensPerformance('coach1', 'ath1', rels, scopeRows), false);
});
t('canViewWomensPerformance blijft apart van RECOVERY_HEALTH (adversarial -- geen scope-bundeling)', () => {
  const scopeRows = [{ relationship_id: 'r1', scope: 'RECOVERY_HEALTH', enabled: true }];
  assert.strictEqual(CoachAccessCore.canViewRecoveryHealth('coach1', 'ath1', rels, scopeRows), true);
  assert.strictEqual(CoachAccessCore.canViewWomensPerformance('coach1', 'ath1', rels, scopeRows), false);
});

t('canActivateRelationship: alleen de athlete mag een pending relatie activeren', () => {
  assert.strictEqual(CoachAccessCore.canActivateRelationship('ath2', pendingRel), true);
});
t('canActivateRelationship: coach kan niet zelf activeren (adversarial -- zelf-elevatie-preventie)', () => {
  assert.strictEqual(CoachAccessCore.canActivateRelationship('coach1', pendingRel), false);
});
t('canActivateRelationship: false op een reeds actieve relatie', () => {
  assert.strictEqual(CoachAccessCore.canActivateRelationship('ath1', activeRel), false);
});

t('canRevokeRelationship: beide partijen mogen revoken', () => {
  assert.strictEqual(CoachAccessCore.canRevokeRelationship('coach1', activeRel), true);
  assert.strictEqual(CoachAccessCore.canRevokeRelationship('ath1', activeRel), true);
});
t('canRevokeRelationship: derde partij mag niet revoken (adversarial)', () => {
  assert.strictEqual(CoachAccessCore.canRevokeRelationship('stranger', activeRel), false);
});
t('canRevokeRelationship: false op een reeds revoked relatie', () => {
  assert.strictEqual(CoachAccessCore.canRevokeRelationship('coach1', revokedRel), false);
});

t('canModifyScope: alleen de athlete mag scopes wijzigen (KERN privacyregel -- coach kan zichzelf geen toegang geven)', () => {
  assert.strictEqual(CoachAccessCore.canModifyScope('ath1', activeRel), true);
  assert.strictEqual(CoachAccessCore.canModifyScope('coach1', activeRel), false);
});

console.log(`CoachAccessCore: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
