const path=require('path');
const C=require(path.resolve('core/concept2Live.js'));
let p=0,f=0;
function ok(c,m){ if(c){p++;} else {f++; console.log('MISLUKT: '+m);} }
function eq(a,b,m){ ok(a===b, m+' (verwacht '+b+', kreeg '+a+')'); }
const P31={elapsedTimeS:123.45,distanceM:2000,workoutState:0,dragFactor:120,workoutType:2};
const P32={strokeRateSPM:28,currentPaceS:110,averagePowerW:250,heartRateBpm:null,ergMachineType:0,speedMps:4.5};

// A) mapping
const m=C.pm5RawToCanonical(P31);
eq(m.distance_m,2000,'A1: distanceM -> distance_m');
eq(m.elapsed_s,123.45,'A2: elapsedTimeS -> elapsed_s');
eq(m.workout_state,0,'A3: workoutState 0 blijft 0');
eq(m.drag_factor,120,'A4: dragFactor -> drag_factor');
ok(!('speed_mps' in C.pm5RawToCanonical(P32)) && !('speedMps' in C.pm5RawToCanonical(P32)),'A5: speedMps niet gemapt (geen canoniek veld)');
ok(!('workout_type' in m),'A6: workoutType niet gemapt (geen canoniek veld)');

// B) workout_state=0 fix in normalizeLiveMetric
eq(C.normalizeLiveMetric({workout_state:0},'rowerg',{}).workoutState,0,'B1: workout_state 0 blijft 0');
eq(C.normalizeLiveMetric({workout_state:1},'rowerg',{}).workoutState,1,'B2: workout_state 1 blijft 1');
eq(C.normalizeLiveMetric({},'rowerg',{}).workoutState,null,'B3: afwezig -> null');

// C) machinetypes (officiele PM5 enum, rev 1.30 Appendix A)
eq(C.pm5MachineType(0),'rowerg','C1: STATIC_D -> rowerg');
eq(C.pm5MachineType(8),'rowerg','C2: STATIC_DYNAMIC -> rowerg');
eq(C.pm5MachineType(128),'skierg','C3: STATIC_SKI -> skierg');
eq(C.pm5MachineType(143),'skierg','C4: SKI_SIMULATOR -> skierg');
eq(C.pm5MachineType(192),'bikeerg','C5: BIKE -> bikeerg');
eq(C.pm5MachineType(207),'bikeerg','C6: BIKE_SIMULATOR -> bikeerg');
eq(C.pm5MachineType(226),'bikeerg','C7: MULTIERG_BIKE -> bikeerg');
eq(C.pm5MachineType(99),null,'C8: onbekende code -> null, niet geraden');
eq(C.pm5MachineType(null),null,'C9: null -> null');

// D) partial merge, beide volgordes
function full(a){const c=a; return c.distanceM===2000&&c.elapsedTimeS===123.45&&c.strokeRateSPM===28&&c.pace500M===110&&c.watts===250;}
let a=C.createPm5LiveAggregator(); a.push(P31,'rowerg',{}); let cm=a.push(P32,'rowerg',{});
ok(full(cm),'D1: 0x31 -> 0x32 levert alle vijf metrics tegelijk');
a=C.createPm5LiveAggregator(); a.push(P32,'rowerg',{}); cm=a.push(P31,'rowerg',{});
ok(full(cm),'D2: 0x32 -> 0x31 levert alle vijf metrics tegelijk');
eq(cm.wattsSource,'concept2_measured','D3: PM5-watts zijn measured, niet derived');
eq(cm.workoutState,0,'D4: workout_state 0 overleeft de merge');

// E) absent vs invalid
a=C.createPm5LiveAggregator();
a.push({heartRateBpm:140},'rowerg',{});
eq(a.push({distanceM:100},'rowerg',{}).heartRateBPM,140,'E1: afwezig veld wist eerdere HR niet');
eq(a.push({heartRateBpm:null},'rowerg',{}).heartRateBPM,null,'E2: aanwezig-maar-invalid (sentinel 255) wist HR wel');

// F) malformed/unknown wissen niets (router geeft dan niets door)
a=C.createPm5LiveAggregator(); a.push(P31,'rowerg',{});
eq(a.push({},'rowerg',{}).distanceM,2000,'F1: leeg event wist bestaande state niet');
eq(a.getMergedRaw().distance_m,2000,'F2: merged raw behoudt distance');

// G) sessie-reset: geen lek tussen sessies
a=C.createPm5LiveAggregator(); a.push(P31,'rowerg',{});
a.reset();
cm=a.push({averagePowerW:250},'rowerg',{});
eq(cm.distanceM,null,'G1: na reset geen distance uit vorige sessie');
eq(cm.watts,250,'G2: nieuwe sessie ziet eigen watts');
eq(a.getMachineType(),null,'G3: machinetype gereset');

// H) drie machinetypes door dezelfde pipeline
[['rowerg',0,500],['skierg',128,500],['bikeerg',192,1000]].forEach(function(t){
  const g=C.createPm5LiveAggregator();
  g.push(P31,null,{});
  const r=g.push({strokeRateSPM:28,currentPaceS:110,averagePowerW:250,ergMachineType:t[1]},null,{});
  eq(r.machineType,t[0],'H: '+t[0]+' afgeleid uit ergMachineType '+t[1]);
  eq(r.paceBasisM,t[2],'H: '+t[0]+' paceBasis '+t[2]);
  eq(r.pace500M,110,'H: '+t[0]+' pace500 blijft protocolwaarde');
  eq(r.pace1000M,220,'H: '+t[0]+' pace1000 afgeleid');
  eq(r.distanceM,2000,'H: '+t[0]+' distance behouden over events');
});
console.log('Concept2 PM5 live aggregation: '+p+' geslaagd, '+f+' mislukt');
process.exit(f?1:0);
