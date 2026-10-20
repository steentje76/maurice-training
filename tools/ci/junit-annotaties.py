"""TK-REL-SEC-34: JUnit-XML → GitHub-annotaties (testaantallen en faalberichten), omdat CI-logs niet overal leesbaar zijn."""
import sys, xml.etree.ElementTree as ET
pad, titel = sys.argv[1], sys.argv[2]
wortel = ET.parse(pad).getroot()
suites = [wortel] if wortel.tag == 'testsuite' else list(wortel.iter('testsuite'))
for s in suites:
    print(f"::notice title={titel}::suite {s.get('name')} tests={s.get('tests')} failures={s.get('failures')} errors={s.get('errors')} skipped={s.get('skipped')}")
    for tc in s.iter('testcase'):
        for f in list(tc.findall('failure')) + list(tc.findall('error')):
            tekst = (f.get('message') or f.text or '').strip().splitlines()
            kort = ' / '.join(t.strip() for t in tekst[:3])[:600].replace('%', '%25').replace('\r', '').replace('\n', ' ')
            print(f"::error title={titel}-failure::{tc.get('name')}: {kort}")
