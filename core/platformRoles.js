/* ==========================================================================
 * TrainingKompas — PLATFORM ROLES & PERMISSIONS CORE  (Sprint 5/8 fundering)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen browser-opslag, geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * DOEL: ÉÉN rolhiërarchie en ÉÉN permissie-resolutiefunctie, hergebruikt door
 * zowel de coach-atleet-relatie (Sprint 5) als de club/team-laag (Sprint 8) —
 * expliciet om duplicated business logic te voorkomen (harde eis uit de
 * sprintopdracht).
 *
 * HARDE REGEL: dit bestand is GEEN vervanging van database-RLS. RLS blijft de
 * daadwerkelijke handhaving (zie migratie_v339.sql). Dit bestand is de
 * client-/servercode-kant: dezelfde regels als RLS, maar dan bruikbaar voor
 * UI-beslissingen ("mag ik deze knop tonen?") vóórdat een query gedaan wordt.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSIONS = { roles: 'platform_roles.v1', visibility: 'athlete_visibility.v1' };

  // Rolhiërarchie exact zoals in de sprintopdracht — hoger getal = meer rechten.
  var ROLE_RANK = {
    ATHLETE: 0,
    COACH: 1,
    CLUB_COACH: 2,
    CLUB_ADMIN: 3,
    PLATFORM_ADMIN: 4
  };
  var ROLES = Object.keys(ROLE_RANK);

  function isKnownRole(role) {
    return Object.prototype.hasOwnProperty.call(ROLE_RANK, role);
  }

  function rankOf(role) {
    return isKnownRole(role) ? ROLE_RANK[role] : -1;
  }

  // hasAtLeastRole: "is deze rol minimaal zo bevoegd als de vereiste rol?"
  function hasAtLeastRole(role, minRole) {
    if (!isKnownRole(role) || !isKnownRole(minRole)) return false;
    return rankOf(role) >= rankOf(minRole);
  }

  // canViewAthleteData: bepaalt of een viewer een specifieke atleet mag zien,
  // op basis van EXPLICIETE, reeds-opgehaalde relaties/memberships (geen query
  // hierbinnen). Consent-gedreven: een 'pending' coach-atleet-relatie geeft
  // GEEN inzage — pas 'active' telt (privacy-by-design, roadmap-eis).
  //
  // relationship: { type:'coach_athlete', status:'pending'|'active'|'revoked' } | null
  // membership:  { role, status:'active'|'pending'|'inactive', teamId, organizationId } | null
  function canViewAthleteData(viewerId, athleteId, relationship, membership) {
    if (!viewerId || !athleteId) return { allowed: false, reason: 'viewerId/athleteId ontbreekt' };
    if (viewerId === athleteId) return { allowed: true, reason: 'eigen data' };

    if (relationship && relationship.type === 'coach_athlete' && relationship.status === 'active') {
      return { allowed: true, reason: 'actieve coach-atleet-relatie' };
    }
    if (relationship && relationship.type === 'coach_athlete' && relationship.status !== 'active') {
      return { allowed: false, reason: 'coach-atleet-relatie niet (meer) actief (status: ' + relationship.status + ')' };
    }

    if (membership && membership.status === 'active' && hasAtLeastRole(membership.role, 'CLUB_COACH')) {
      return { allowed: true, reason: 'actief club-coach/admin-lidmaatschap binnen dezelfde organisatie/team' };
    }

    return { allowed: false, reason: 'geen geldige relatie of membership gevonden' };
  }

  // resolveVisibleAthleteIds: pure filter — gegeven een lijst relaties/memberships
  // van één coach, welke athleteId's mag deze coach zien? Dedupliceert.
  function resolveVisibleAthleteIds(viewerId, relationships, memberships) {
    var visible = {};
    (relationships || []).forEach(function (r) {
      if (r && r.type === 'coach_athlete' && r.status === 'active' && r.coachId === viewerId && r.athleteId) {
        visible[r.athleteId] = true;
      }
    });
    (memberships || []).forEach(function (m) {
      if (m && m.status === 'active' && m.viewerRole && hasAtLeastRole(m.viewerRole, 'CLUB_COACH') && Array.isArray(m.teamAthleteIds)) {
        m.teamAthleteIds.forEach(function (id) { if (id) visible[id] = true; });
      }
    });
    return Object.keys(visible);
  }

  // canManageOrganization / canManageTeam: eenvoudige, expliciete rolchecks —
  // bewust GEEN losse if/else her-en-der in UI-code (dat was de expliciete eis).
  function canManageOrganization(role) { return hasAtLeastRole(role, 'CLUB_ADMIN'); }
  function canManageTeam(role) { return hasAtLeastRole(role, 'CLUB_COACH'); }
  function canOverrideAdjustment(role) { return hasAtLeastRole(role, 'COACH'); }

  var PlatformRolesCore = {
    ROLES: ROLES,
    ROLE_RANK: ROLE_RANK,
    isKnownRole: isKnownRole,
    rankOf: rankOf,
    hasAtLeastRole: hasAtLeastRole,
    canViewAthleteData: canViewAthleteData,
    resolveVisibleAthleteIds: resolveVisibleAthleteIds,
    canManageOrganization: canManageOrganization,
    canManageTeam: canManageTeam,
    canOverrideAdjustment: canOverrideAdjustment,
    VERSIONS: VERSIONS
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = PlatformRolesCore; }
  if (global) { global.PlatformRolesCore = PlatformRolesCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
