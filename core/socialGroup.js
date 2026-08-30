/* ==========================================================================
 * TrainingKompas — SOCIAL GROUP CORE  (F9.2, MS-F9-02)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: het canonieke rol-/lidmaatschapscontract voor SOCIALE groepen
 * (athlete-created communities). Expliciet GEEN hergebruik van de bestaande
 * commerciële organizations/teams/memberships-architectuur (F1/F11) -- dat
 * is een ANDER vertrouwensmodel. Een sociale groep heeft een eenvoudiger
 * rolmodel: owner/member.
 *
 * KRITIEKE LES UIT MS-F9-01: een lid mag zichzelf NOOIT kunnen promoveren.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'social_group.v1' };
  var ROLES = ['owner', 'member'];
  var JOIN_MODES = ['open', 'approval_required', 'invite_only'];

  function isMember(userId, groupId, memberships) {
    if (!Array.isArray(memberships)) return false;
    return memberships.some(function (m) { return m.user_id === userId && m.group_id === groupId && m.status === 'active'; });
  }

  function isOwner(userId, groupId, memberships) {
    if (!Array.isArray(memberships)) return false;
    return memberships.some(function (m) { return m.user_id === userId && m.group_id === groupId && m.status === 'active' && m.role === 'owner'; });
  }

  function canViewGroup(userId, group, memberships) {
    if (!group || !group.id) return false;
    if (isMember(userId, group.id, memberships)) return true;
    return group.join_mode === 'open';
  }

  function canJoinDirectly(group) {
    return !!group && group.join_mode === 'open';
  }

  function canManageMembers(userId, groupId, memberships) {
    return isOwner(userId, groupId, memberships);
  }

  var SocialGroupCore = {
    VERSIONS: VERSIONS, ROLES: ROLES, JOIN_MODES: JOIN_MODES,
    isMember: isMember, isOwner: isOwner,
    canViewGroup: canViewGroup, canJoinDirectly: canJoinDirectly, canManageMembers: canManageMembers
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = SocialGroupCore; }
  else { global.SocialGroupCore = SocialGroupCore; }
})(typeof window !== 'undefined' ? window : this);
