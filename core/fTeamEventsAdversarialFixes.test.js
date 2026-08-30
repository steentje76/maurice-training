/* fTeamEventsAdversarialFixes.test.js — MS-F11-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v518.sql'), 'utf8');

{
  const fnBlok = migratie.split('function public.team_events_validate_location_tenant()')[1].split('$$;')[0];
  ok(fnBlok.includes('if v_location_org is distinct from v_team_org then') &&
     fnBlok.includes("raise exception 'location_id behoort niet tot dezelfde organisatie als het team'"),
    'A1: cross-tenant location-koppeling wordt geblokkeerd door een echte conditie (niet alleen een aanwezige foutmelding-string)');
}

{
  const fnBlok = migratie.split('function public.prevent_team_events_team_id_change()')[1].split('$$;')[0];
  ok(fnBlok.includes('if NEW.team_id is distinct from OLD.team_id then'),
    'B1: team_events.team_id is onveranderlijk door een echte conditie');
}

{
  const fnBlok = migratie.split('function public.team_events_validate_linked_training()')[1].split('$$;')[0];
  ok(fnBlok.includes('if not public.org_user_has_role(v_team_org, v_ti_user_id') && fnBlok.includes('raise exception'),
    'C1: linked_training_instance_id wordt gevalideerd door een echte conditie');
}

{
  const fnBlok = migratie.split('function public.prevent_event_attendance_identity_change()')[1].split('$$;')[0];
  ok(fnBlok.includes('if NEW.event_id is distinct from OLD.event_id then') &&
     fnBlok.includes('if NEW.user_id is distinct from OLD.user_id then'),
    'D1: event_attendance.event_id en user_id zijn beide onveranderlijk door echte condities');
}

{
  const fnBlok = migratie.split('function public.prevent_event_responsibilities_event_id_change()')[1].split('$$;')[0];
  ok(fnBlok.includes('if NEW.event_id is distinct from OLD.event_id then'),
    'E1: event_responsibilities.event_id is onveranderlijk door een echte conditie');
}

ok(migratie.toLowerCase().includes('open productpunt') && migratie.toLowerCase().includes('geen data-lek'),
  'F1: het open productpunt is eerlijk gedocumenteerd, niet verzwegen');

console.log('fTeamEventsAdversarialFixes: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
