/* ==========================================================================
 * TrainingKompas — ORGANIZATION CONTEXT RUNTIME  (F11.5, MS-F11-05)
 * --------------------------------------------------------------------------
 * Generieke, herbruikbare active-organization-context voor de gehele F11-
 * organization-architectuur (niet branding-specifiek). Consumeert
 * OrganizationCore/BrandingCore (pure, geteste modules) en verbindt ze met
 * de daadwerkelijke app-runtime (sbGet/sbRpc, authSession).
 *
 * DETERMINISTISCHE ACTIVE-ORG-SELECTIE:
 * - 0 actieve memberships -> geen actieve organisatie.
 * - 1 actieve membership -> automatisch die organisatie actief.
 * - >1 actieve memberships -> een opgeslagen voorkeur (sessionStorage,
 *   uitsluitend een HINT) wordt ALTIJD opnieuw gevalideerd tegen de
 *   actuele, server-opgehaalde memberships. Bij mismatch: genegeerd, geen
 *   actieve organisatie totdat expliciet gekozen (geen stille keuze).
 *
 * session-scoped, NOOIT persistent over logout heen. organization_id komt
 * NOOIT uit querystring/URL/e-maildomein/brandingdata.
 * ========================================================================== */
(function () {
  'use strict';

  var ORG_CONTEXT_PREF_KEY = 'tk_active_org_pref_v1';

  window.OrgRuntimeState = {
    activeOrganizationId: null,
    memberships: [],
    organizations: [],
    status: 'uninitialized'
  };

  async function initOrganizationContext() {
    if (!authSession || !authSession.user || !authSession.user.id) {
      resetOrgContext();
      return window.OrgRuntimeState;
    }
    var userId = authSession.user.id;

    var memberships = await sbGet('memberships', '&user_id=eq.' + userId + '&status=eq.active');
    var organizations = [];
    if (memberships && memberships.length) {
      var orgIds = Array.from(new Set(memberships.map(function (m) { return m.organization_id; })));
      var filter = '&id=in.(' + orgIds.map(function (id) { return '"' + id + '"'; }).join(',') + ')';
      organizations = await sbGet('organizations', filter);
    }

    window.OrgRuntimeState.memberships = memberships || [];
    window.OrgRuntimeState.organizations = organizations || [];

    var activeId = resolveActiveOrganizationId(userId, memberships || []);
    window.OrgRuntimeState.activeOrganizationId = activeId;
    window.OrgRuntimeState.status = !memberships || !memberships.length ? 'no_org' : (activeId ? 'active' : 'ambiguous');

    if (activeId) {
      try { sessionStorage.setItem(ORG_CONTEXT_PREF_KEY, activeId); } catch (e) { /* hint alleen, geen probleem */ }
    }

    await refreshBrandContext();
    return window.OrgRuntimeState;
  }

  function resolveActiveOrganizationId(userId, memberships) {
    if (!memberships.length) return null;
    if (memberships.length === 1) return memberships[0].organization_id;

    var preferred = null;
    try { preferred = sessionStorage.getItem(ORG_CONTEXT_PREF_KEY); } catch (e) { preferred = null; }
    if (preferred && memberships.some(function (m) { return m.organization_id === preferred; })) {
      return preferred;
    }
    return null;
  }

  async function setActiveOrganization(orgId) {
    var valid = window.OrgRuntimeState.memberships.some(function (m) { return m.organization_id === orgId; });
    if (!valid) return false;
    window.OrgRuntimeState.activeOrganizationId = orgId;
    window.OrgRuntimeState.status = 'active';
    try { sessionStorage.setItem(ORG_CONTEXT_PREF_KEY, orgId); } catch (e) { /* geen probleem */ }
    await refreshBrandContext();
    return true;
  }

  function resetOrgContext() {
    window.OrgRuntimeState.activeOrganizationId = null;
    window.OrgRuntimeState.memberships = [];
    window.OrgRuntimeState.organizations = [];
    window.OrgRuntimeState.status = 'uninitialized';
    try { sessionStorage.removeItem(ORG_CONTEXT_PREF_KEY); } catch (e) { /* geen probleem */ }
    applyBrandContext(getDefaultBrandContext());
  }

  async function refreshBrandContext() {
    var orgId = window.OrgRuntimeState.activeOrganizationId;
    if (!orgId) {
      applyBrandContext(getDefaultBrandContext());
      return;
    }

    var brandingRows = null;
    try {
      brandingRows = await sbRpc('get_organization_branding', { p_organization_id: orgId });
    } catch (e) {
      brandingRows = null;
    }

    var gymsBranding = (brandingRows && brandingRows.length) ? brandingRows.map(function (row) {
      return {
        organization_id: row.organization_id,
        display_name: row.display_name,
        logo_url: row.logo_url,
        primary_color: row.primary_color,
        accent_color: row.accent_color,
        branding_enabled: row.branding_enabled
      };
    }) : [];

    var session = {
      authenticated: !!(authSession && authSession.user),
      userId: authSession ? authSession.user.id : null,
      activeOrganizationId: orgId,
      memberships: window.OrgRuntimeState.memberships,
      organizations: window.OrgRuntimeState.organizations,
      gymsBranding: gymsBranding
    };

    var context = window.BrandingCore ? window.BrandingCore.resolveBrandContext(session) : getDefaultBrandContext();
    applyBrandContext(context);
  }

  function getDefaultBrandContext() {
    return window.BrandingCore ? window.BrandingCore.TK_DEFAULT : {
      source: 'trainingskompas_default', display_name: 'Trainingskompas',
      logo_url: null, primary_color: '#0B1D2A', accent_color: '#00B894', powered_by_visible: true
    };
  }

  function applyBrandContext(context) {
    if (!context) context = getDefaultBrandContext();

    // Kleuren worden UITSLUITEND toegepast op het gecontroleerde tenant-
    // branding-element zelf (--tk-tenant-primary/--tk-tenant-accent), NOOIT
    // globaal op :root. Dit voorkomt elk risico dat een tenantkleur
    // elders in de app foutmeldingen/waarschuwingen/focus-indicators
    // semantisch onbruikbaar maakt -- die blijven onder de centrale
    // Trainingskompas-tokens vallen. BrandingCore heeft de HEX-validatie al
    // uitgevoerd (ongeldige waarden zijn al op de TK-default gevallen) --
    // hier NOOIT een rauwe stringwaarde direct als cssText/innerHTML.
    var brandCard = document.getElementById('tenant-brand-card');
    if (brandCard) {
      brandCard.style.setProperty('--tk-tenant-primary', context.primary_color || '#0B1D2A');
      brandCard.style.setProperty('--tk-tenant-accent', context.accent_color || '#00B894');
      brandCard.style.borderLeft = '3px solid ' + (context.accent_color || '#00B894');
    }

    var nameEl = document.getElementById('tenant-brand-name');
    if (nameEl) nameEl.textContent = context.display_name || 'Trainingskompas';

    var logoEl = document.getElementById('tenant-brand-logo');
    if (logoEl) {
      if (context.logo_url) {
        logoEl.src = context.logo_url;
        logoEl.style.display = '';
        logoEl.onerror = function () { logoEl.style.display = 'none'; };
      } else {
        logoEl.removeAttribute('src');
        logoEl.style.display = 'none';
      }
    }

    var poweredByEl = document.getElementById('tenant-powered-by');
    if (poweredByEl) {
      poweredByEl.textContent = 'Powered by Trainingskompas';
      poweredByEl.style.display = '';
    }

    // Adminbeheer-knop: uitsluitend UX-gemak (verbergen voor niet-bevoegden).
    // Database/RLS (gyms_update_org_admin) blijft de daadwerkelijke autoriteit
    // -- een direct API-verzoek van staff/member faalt server-side, ongeacht
    // wat hier client-side getoond wordt.
    var adminBtn = document.getElementById('tenant-brand-admin-btn');
    if (adminBtn) {
      var orgId = window.OrgRuntimeState.activeOrganizationId;
      var canManage = !!orgId && window.OrganizationCore && window.OrganizationCore.canManageStaff(
        authSession ? authSession.user.id : null,
        orgId,
        window.OrgRuntimeState.memberships,
        window.OrgRuntimeState.organizations
      );
      adminBtn.style.display = canManage ? '' : 'none';
    }
  }

  /* tenantBrandingAdminEdit(): minimale, functionele beheerflow (geen los
   * beheerplatform). Preview is uitsluitend lokaal/tijdelijk -- opslaan
   * gaat altijd via de database, die de daadwerkelijke server-side
   * validatie/RLS/constraints/audit-velden afdwingt. Een mislukte save
   * laat de eerder opgeslagen, authoritatieve branding ongewijzigd. */
  window.tenantBrandingAdminEdit = async function () {
    var orgId = window.OrgRuntimeState.activeOrganizationId;
    if (!orgId) return;
    var newName = prompt('Naam van de organisatie (zichtbaar voor leden):');
    if (newName === null) return;
    var newPrimary = prompt('Primaire kleur (HEX, bv. #123456):');
    if (newPrimary === null) return;
    var newAccent = prompt('Accentkleur (HEX, bv. #00B894):');
    if (newAccent === null) return;

    // Lokale preview: toon direct wat de admin invoert, NOOIT authoritative --
    // wordt bij een mislukte save automatisch overschreven door de volgende
    // refreshBrandContext()-aanroep (die de database als bron van waarheid
    // herleest).
    applyBrandContext({ display_name: newName, primary_color: newPrimary, accent_color: newAccent, powered_by_visible: true });

    var existing = await sbGet('gyms', '&organization_id=eq.' + orgId);
    var payload = { name: newName, primary_color: newPrimary, accent_color: newAccent, branding_enabled: true };
    var ok = false;
    try {
      if (existing && existing.length) {
        ok = await sbPatch('gyms', 'organization_id=eq.' + orgId, JSON.stringify(payload));
      } else {
        payload.organization_id = orgId;
        var r = await sbFetch(SB_URL + '/rest/v1/gyms', { method: 'POST', prefer: 'return=representation', body: payload });
        ok = r.ok;
      }
    } catch (e) {
      ok = false;
    }
    // Server blijft bron van waarheid: altijd herladen na een save-poging,
    // ongeacht of die slaagde -- voorkomt dat een mislukte save de lokale
    // preview als authoritative laat staan.
    await refreshBrandContext();
    if (!ok) alert('Opslaan van de organisatie-uitstraling is niet gelukt. Probeer het opnieuw.');
  };

  window.OrganizationContextRuntime = {
    initOrganizationContext: initOrganizationContext,
    setActiveOrganization: setActiveOrganization,
    resetOrgContext: resetOrgContext,
    refreshBrandContext: refreshBrandContext,
    applyBrandContext: applyBrandContext,
    resolveActiveOrganizationId: resolveActiveOrganizationId
  };
})();
