/* ==========================================================================
 * TrainingKompas — BRANDING CORE  (F11.5, MS-F11-05)
 * --------------------------------------------------------------------------
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE.
 *
 * DOEL: canoniek, client-side gespiegeld brand-context-resolution-contract.
 * Bepaalt deterministisch of, en welke, organization-branding getoond mag
 * worden -- nooit branding raden uit cache/URL/e-maildomein. De database
 * (RLS + org_has_role()) blijft de daadwerkelijke bron van waarheid; deze
 * module spiegelt uitsluitend de presentatiebeslissing.
 *
 * KRITIEKE INVARIANT: Trainingskompas-identiteit blijft ALTIJD zichtbaar,
 * ongeacht tenant-branding (co-branding, nooit volledige vervanging).
 * ========================================================================== */
(function (global) {
  'use strict';

  var VERSIONS = { schema: 'branding.v1' };
  var TK_DEFAULT = Object.freeze({
    source: 'trainingskompas_default',
    display_name: 'Trainingskompas',
    logo_url: null,
    primary_color: '#0B1D2A',
    accent_color: '#00B894',
    powered_by_visible: true
  });
  var HEX_RE = /^#[0-9A-Fa-f]{6}$/;
  var HTTPS_RE = /^https:\/\//;

  function resolveBrandContext(session) {
    if (!session || !session.authenticated) return cloneDefault();
    if (!session.activeOrganizationId) return cloneDefault();

    var OC = (typeof module !== 'undefined' && module.exports) ? require('./organizationCore.js') : global.OrganizationCore;
    var hasAccess = OC.hasRole(session.userId, session.activeOrganizationId, OC.ROLES, session.memberships || [], session.organizations || []);
    if (!hasAccess) return cloneDefault();

    var gym = (session.gymsBranding || []).find(function (g) {
      return g.organization_id === session.activeOrganizationId;
    });
    if (!gym || gym.branding_enabled !== true) return cloneDefault();

    var validated = validateBrandingRow(gym);
    if (!validated) return cloneDefault();

    return Object.assign({}, cloneDefault(), validated, {
      source: 'organization',
      organization_id: session.activeOrganizationId,
      powered_by_visible: true
    });
  }

  function validateBrandingRow(gym) {
    var out = {};
    if (gym.display_name && typeof gym.display_name === 'string') out.display_name = gym.display_name;
    if (gym.logo_url && HTTPS_RE.test(gym.logo_url)) out.logo_url = gym.logo_url;
    if (gym.primary_color && HEX_RE.test(gym.primary_color)) out.primary_color = gym.primary_color;
    if (gym.accent_color && HEX_RE.test(gym.accent_color)) out.accent_color = gym.accent_color;
    return out;
  }

  function cloneDefault() {
    return Object.assign({}, TK_DEFAULT);
  }

  var BrandingCore = {
    VERSIONS: VERSIONS, TK_DEFAULT: TK_DEFAULT,
    resolveBrandContext: resolveBrandContext,
    validateBrandingRow: validateBrandingRow
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = BrandingCore; }
  else { global.BrandingCore = BrandingCore; }
})(typeof window !== 'undefined' ? window : this);
