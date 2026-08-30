/* ==========================================================================
 * TrainingKompas — ORGANIZATION CORE  (F11.1, MS-F11-01)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: het canonieke, client-side gespiegelde autorisatiecontract voor het
 * organisatie/membership-model. Bouwt voort op het bestaande GYM-RLS-
 * SCOPING-001-fundament (organizations/memberships/teams/training_groups,
 * MS-F1-01) -- geen tweede autorisatiesysteem. Dit is EXPLICIET NIET
 * hetzelfde model als het legacy gyms/users.gym_id-systeem (zie
 * docs/F11_EXISTING_ORGANIZATION_ARCHITECTURE_AUDIT.md) -- die twee blijven
 * bewust gescheiden in deze sprint.
 *
 * ROLMODEL: owner > admin/staff > member. Rol != automatisch data-toegang --
 * elke afzonderlijke capability heeft een eigen, expliciete rolcheck,
 * analoog aan CoachAccessCore (F10).
 *
 * KRITIEKE, LIVE BEWEZEN INVARIANT: self-role-elevation is architecturaal
 * onmogelijk. Een nieuw lid kan zichzelf uitsluitend als 'member' toevoegen
 * (tenzij hij de organization-owner is, het legitieme bootstrap-scenario).
 * Rolwijziging van ANDEREN is uitsluitend voor de owner, nooit voor de
 * gebruiker zelf.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'organization.v1' };
  var ROLES = ['owner', 'admin', 'staff', 'member'];
  var STAFF_ROLES = ['owner', 'admin', 'staff'];
  var MEMBERSHIP_STATUSES = ['active', 'inactive', 'removed'];

  function hasRole(userId, orgId, requiredRoles, memberships, organizations) {
    var isOwner = Array.isArray(organizations) && organizations.some(function (o) {
      return o.id === orgId && o.owner_user_id === userId;
    });
    if (isOwner) return true;
    if (!Array.isArray(memberships)) return false;
    return memberships.some(function (m) {
      return m.organization_id === orgId && m.user_id === userId && m.status === 'active' && requiredRoles.indexOf(m.role) !== -1;
    });
  }

  function canManageStaff(userId, orgId, memberships, organizations) {
    return hasRole(userId, orgId, STAFF_ROLES, memberships, organizations);
  }

  function canSelfJoin(role) {
    return role === 'member';
  }

  function canPromoteOther(userId, targetUserId, orgId, organizations) {
    if (userId === targetUserId) return false;
    return Array.isArray(organizations) && organizations.some(function (o) {
      return o.id === orgId && o.owner_user_id === userId;
    });
  }

  var OrganizationCore = {
    VERSIONS: VERSIONS, ROLES: ROLES, STAFF_ROLES: STAFF_ROLES, MEMBERSHIP_STATUSES: MEMBERSHIP_STATUSES,
    hasRole: hasRole,
    canManageStaff: canManageStaff,
    canSelfJoin: canSelfJoin,
    canPromoteOther: canPromoteOther
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = OrganizationCore; }
  else { global.OrganizationCore = OrganizationCore; }
})(typeof window !== 'undefined' ? window : this);
