/* ==========================================================================
 * TrainingKompas — EQUIPMENT CORE  (F11.2, MS-F11-02)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: canoniek, client-side gespiegeld autorisatiecontract voor
 * equipment_catalog/exercise_equipment. Hergebruikt de bestaande equipment-
 * tabellen (uitgebreid met organization_id) -- geen tweede equipment-model.
 * Drie mutueel exclusieve eigenaarscontexten: gym (legacy Model A),
 * organization (nieuw Model B, F11), of persoonlijk (user_id).
 *
 * EXERCISE MAPPING: exercise_equipment.exercise_id blijft altijd verwijzen
 * naar de bestaande, canonieke Exercise Library -- geen nieuwe identiteit.
 *
 * ROLMODEL: hergebruikt OrganizationCore.STAFF_ROLES -- geen apart
 * equipment-rolmodel.
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'equipment.v1' };
  var OWNER_CONTEXTS = ['gym', 'organization', 'personal'];

  function resolveOwnerContext(item) {
    if (!item) return null;
    if (item.gym_id != null) return 'gym';
    if (item.organization_id != null) return 'organization';
    if (item.user_id != null) return 'personal';
    return null;
  }

  function canManageEquipment(userId, item, memberships, organizations, OrganizationCoreRef) {
    var context = resolveOwnerContext(item);
    if (context === 'personal') return item.user_id === userId;
    if (context === 'organization') {
      var OC = OrganizationCoreRef || ((typeof module !== 'undefined' && module.exports) ? require('./organizationCore.js') : global.OrganizationCore);
      return OC.canManageStaff(userId, item.organization_id, memberships, organizations);
    }
    return false;
  }

  function canViewEquipment(userId, item, memberships, organizations, OrganizationCoreRef) {
    var context = resolveOwnerContext(item);
    if (context === 'personal') return item.user_id === userId;
    if (context === 'organization') {
      var OC = OrganizationCoreRef || ((typeof module !== 'undefined' && module.exports) ? require('./organizationCore.js') : global.OrganizationCore);
      return OC.hasRole(userId, item.organization_id, OC.ROLES, memberships, organizations);
    }
    return false;
  }

  var EquipmentCore = {
    VERSIONS: VERSIONS, OWNER_CONTEXTS: OWNER_CONTEXTS,
    resolveOwnerContext: resolveOwnerContext,
    canManageEquipment: canManageEquipment,
    canViewEquipment: canViewEquipment
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = EquipmentCore; }
  else { global.EquipmentCore = EquipmentCore; }
})(typeof window !== 'undefined' ? window : this);
