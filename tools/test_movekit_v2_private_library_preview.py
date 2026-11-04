#!/usr/bin/env python3
"""Synthetic-only regressions for the private MoveKit local review page generator."""
import base64
import copy
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


M = load('mk_private_preview', ROOT / 'movekit-v2-private-library-preview.py')
EVIL = '</script><script>alert(1)</script><img src=x onerror=alert(2)>'


def make_stage():
    catalog = []
    for i in range(1, 583):
        item = {
            'catalog_id': 'TK-%06d' % i,
            'source': {'provider': 'movekit', 'provider_id': 'synthetic-move-%d' % i},
            'identity': {'name': 'Synthetic Move %d' % i, 'nl': None, 'category': 'strength',
                         'primary': ['Synth Chest'], 'secondary': ['Synth Arms'],
                         'equipment': ['Synth Bar' if i % 2 else 'Synth Mat'],
                         'difficulty': 'Beginner'},
            'assets': [],
        }
        if i > 226:
            n = i - 227
            if n < 245:
                route, fb = 'AI_PROPOSAL_PENDING_HUMAN_REVIEW', \
                    {'ai_classification_proposal': {'category': 'strength', 'type': 'compound'}}
            elif n < 330:
                route, fb = 'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW', \
                    {'proposed_exact_vocabulary': [{'term': 'Synth Term'}]}
            else:
                route, fb = 'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW', \
                    {'owner_choice': 'apart', 'owner_note': 'note %d' % i,
                     'proposed_route': 'KEEP_DISTINCT_PROVISIONAL'}
            item['_review'] = {
                'status': 'NOT_PUBLISHED', 'review_route': route, 'feedback': fb,
                'movement_patterns_supplied': ['Synth Push'],
                'confirmed_by_authenticated_reviewer': False,
                'supplier_metadata_modified': False}
        catalog.append(item)
    return {'_schema': 'synthetic', '_status': 'PRIVATE_REVIEW_NOT_RELEASED', 'count': 582,
            'catalog': catalog, '_approved_for_import': 0, '_media_grants_created': 0,
            '_app_activated': False, '_history_updates': 0, '_personal_exercise_updates': 0}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='tk-preview-test-')).resolve()
        self.source = self.tmp / 'Movikit'
        self.private = self.source / '.tk-private-review'
        self.private.mkdir(parents=True)
        self.video_dir = self.source / 'complete-exercise-library-golden-release-synthetic'
        self.video_dir.mkdir()
        self.poster_dir = self.private / 'posters-webp-v2'
        self.poster_dir.mkdir()
        self.stage = make_stage()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def write_stage(self, stage=None, name='stage.json'):
        p = self.private / name
        p.write_text(json.dumps(stage or self.stage), encoding='utf8')
        return p

    def run_gen(self, stage=None, out='preview.html', **kw):
        staged = self.write_stage(stage)
        return M.generate(self.source, staged, self.private / out, **kw)

    def embedded(self, html):
        m = re.search(r'<script type="application/json" id="tk-data">(.*?)</script>', html, re.S)
        return json.loads(m.group(1))


class HappyPathTests(Base):
    def test_all_582_with_counts_and_no_extra_files(self):
        before = set(self.private.iterdir())
        res = self.run_gen()
        self.assertEqual(res['total'], 582)
        self.assertEqual(res['groups'], {'published': 226, 'ai': 245, 'term': 85, 'owner': 26})
        html = (self.private / 'preview.html').read_text(encoding='utf8')
        data = self.embedded(html)
        self.assertEqual(len(data['items']), 582)
        self.assertEqual(len({x['id'] for x in data['items']}), 582)
        self.assertIn('In afwachting inhoudelijke vrijgave', html)
        self.assertEqual(set(self.private.iterdir()) - before,
                         {self.private / 'preview.html', self.private / 'stage.json'})
        self.assertFalse(any(self.source.glob('*.html')))

    def test_owner_and_metadata_fields_present(self):
        res = self.run_gen()
        data = self.embedded((self.private / 'preview.html').read_text(encoding='utf8'))
        owner = [x for x in data['items'] if x['group'] == 'owner']
        self.assertEqual(len(owner), 26)
        self.assertEqual(owner[0]['owner']['choice'], 'apart')
        self.assertTrue(owner[0]['owner']['note'].startswith('note'))
        self.assertEqual(res['baseline_compared'], False)

    def test_baseline_comparison(self):
        base = copy.deepcopy(self.stage['catalog'][:226])
        r = self.run_gen(baseline_catalog=self._baseline(base))
        self.assertTrue(r['baseline_compared'])

    def _baseline(self, entries):
        p = self.tmp / 'baseline.json'
        p.write_text(json.dumps({'count': 226, 'catalog': entries}), encoding='utf8')
        return p

    def test_baseline_mutation_fails(self):
        base = copy.deepcopy(self.stage['catalog'][:226])
        base[5]['identity']['name'] = 'Changed'
        with self.assertRaisesRegex(ValueError, 'BASELINE_MUTATED'):
            self.run_gen(baseline_catalog=self._baseline(base))
        self.assertFalse((self.private / 'preview.html').exists())


class SecurityTests(Base):
    def html(self):
        self.run_gen()
        return (self.private / 'preview.html').read_text(encoding='utf8')

    def test_csp_blocks_network_and_scripts(self):
        html = self.html()
        csp = re.search(r'Content-Security-Policy" content="([^"]+)"', html).group(1)
        self.assertIn("default-src 'none'", csp)
        self.assertNotIn('connect-src', csp)
        self.assertNotIn('unsafe-inline', csp)
        self.assertNotIn('unsafe-eval', csp)
        self.assertNotRegex(csp, r'https?:')
        script = re.findall(r'<script>(.*?)</script>', html, re.S)
        self.assertEqual(len(script), 1)
        digest = base64.b64encode(hashlib.sha256(script[0].encode('utf8')).digest()).decode()
        self.assertIn("'sha256-%s'" % digest, csp)

    def test_no_network_or_unsafe_apis_in_page(self):
        html = self.html()
        for bad in ('http://', 'https://', 'fetch(', 'XMLHttpRequest', 'serviceWorker', 'WebSocket',
                    'sendBeacon', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
                    'eval(', 'new Function', 'autoplay', 'localStorage', 'sessionStorage',
                    'indexedDB', 'document.cookie', 'window.open', 'location.href', '<link',
                    '<iframe', '<form', 'importScripts', 'postMessage', 'EventSource'):
            self.assertNotIn(bad, html, bad)
        # The ONLY authorised exception: one user-click Blob download of the local draft.
        self.assertEqual(html.count('download='), 1)
        self.assertIn("a.download='tk504-review-concept-'", html)
        self.assertEqual(html.count('createObjectURL'), 1)
        self.assertEqual(html.count('new Blob('), 1)
        self.assertIn('noindex', html)

    def test_injection_is_neutralised(self):
        self.stage['catalog'][0]['identity']['name'] = EVIL
        self.stage['catalog'][0]['identity']['equipment'] = [EVIL]
        self.stage['catalog'][-1]['_review']['feedback']['owner_note'] = EVIL + ' '
        self.run_gen()
        html = (self.private / 'preview.html').read_text(encoding='utf8')
        self.assertNotIn('<script>alert', html)
        self.assertNotIn('<img src=x', html)
        self.assertEqual(html.count('<script'), 2)
        self.assertNotIn(' ', html)
        data = self.embedded(html)
        self.assertEqual(data['items'][0]['name'], EVIL)
        self.assertEqual(data['items'][-1]['owner']['note'], EVIL + ' ')

    def test_script_has_no_embedded_private_content(self):
        src = (ROOT / 'movekit-v2-private-library-preview.py').read_text(encoding='utf8')
        self.assertNotIn('http://', src)
        self.assertNotIn('https://', src)
        self.assertNotRegex(src, r'TK-\d{6}')  # no embedded catalog records


class MediaTests(Base):
    def test_existing_media_relative_missing_placeholder_no_copy(self):
        (self.poster_dir / 'synthetic-move-1.webp').write_bytes(b'x')
        (self.video_dir / 'synthetic-move-1.mp4').write_bytes(b'x')
        (self.video_dir / 'synthetic-move-2.mp4').write_bytes(b'x')
        files_before = sorted(p.name for p in self.tmp.rglob('*') if p.is_file())
        res = self.run_gen()
        data = self.embedded((self.private / 'preview.html').read_text(encoding='utf8'))
        one, two, three = data['items'][:3]
        self.assertEqual(one['poster'], 'posters-webp-v2/synthetic-move-1.webp')
        self.assertEqual(one['video'],
                         '../complete-exercise-library-golden-release-synthetic/synthetic-move-1.mp4')
        self.assertIsNone(two['poster'])
        self.assertIsNotNone(two['video'])
        self.assertIsNone(three['poster'])
        self.assertIsNone(three['video'])
        self.assertEqual((res['posters_found'], res['videos_found']), (1, 2))
        for x in data['items']:
            for k in ('poster', 'video'):
                if x[k]:
                    self.assertNotRegex(x[k], r'^([a-z]+:|/)')
                    self.assertTrue((self.private / x[k]).resolve().is_file())
        files_after = sorted(p.name for p in self.tmp.rglob('*') if p.is_file())
        self.assertEqual(sorted(set(files_after) - set(files_before)), ['preview.html', 'stage.json'])
        self.assertEqual(len(list(self.video_dir.iterdir())), 2)  # nothing copied/added

    def test_missing_media_directories_still_generates(self):
        shutil.rmtree(self.video_dir)
        shutil.rmtree(self.poster_dir)
        res = self.run_gen()
        self.assertEqual((res['posters_found'], res['videos_found']), (0, 0))

    def test_ambiguous_video_directory_ignored(self):
        (self.source / 'complete-exercise-library-golden-release-other').mkdir()
        (self.video_dir / 'synthetic-move-1.mp4').write_bytes(b'x')
        self.assertEqual(self.run_gen()['videos_found'], 0)

    def test_unsafe_slug_rejected(self):
        for slug in ('../evil', 'a/b', 'A_B', 'x\\y', ''):
            stage = make_stage()
            stage['catalog'][3]['source']['provider_id'] = slug
            with self.assertRaises(ValueError):
                self.run_gen(stage, out='slug-%d.html' % abs(hash(slug)))


class FailClosedTests(Base):
    def assertFails(self, code, mutate):
        stage = make_stage()
        mutate(stage)
        with self.assertRaisesRegex(ValueError, code):
            self.run_gen(stage)
        self.assertFalse((self.private / 'preview.html').exists())

    def test_output_locations(self):
        staged = self.write_stage()
        (self.private / 'sub').mkdir()
        for bad in (self.tmp / 'out.html', self.source / 'out.html', self.private / 'sub' / 'o.html',
                    self.private / '..' / 'o.html', self.private / 'out.txt', self.private / 'out'):
            with self.assertRaises(ValueError, msg=str(bad)):
                M.generate(self.source, staged, bad)
        self.assertEqual(list(self.private.glob('*.html')), [])

    def test_existing_output_never_overwritten(self):
        out = self.private / 'preview.html'
        out.write_text('keep', encoding='utf8')
        with self.assertRaisesRegex(ValueError, 'OUTPUT_ALREADY_EXISTS'):
            self.run_gen()
        self.assertEqual(out.read_text(encoding='utf8'), 'keep')

    def test_staged_catalog_must_be_private(self):
        outside = self.tmp / 'stage.json'
        outside.write_text(json.dumps(self.stage), encoding='utf8')
        with self.assertRaisesRegex(ValueError, 'STAGED_CATALOG_MUST_BE_PRIVATE_JSON'):
            M.generate(self.source, outside, self.private / 'p.html')

    def test_private_directory_required(self):
        shutil.rmtree(self.private)
        with self.assertRaises(ValueError):
            M.generate(self.source, self.private / 'x.json', self.private / 'p.html')

    def test_stage_validation(self):
        self.assertFails('STAGE_STATUS', lambda s: s.update(_status='RELEASED'))
        self.assertFails('CATALOG_COUNT', lambda s: s.update(catalog=s['catalog'][:-1]))
        self.assertFails('RELEASE_FLAG_SET', lambda s: s.update(_approved_for_import=1))
        self.assertFails('RELEASE_FLAG_SET', lambda s: s.update(_approved_for_import=True))
        self.assertFails('RELEASE_FLAG_SET', lambda s: s.update(_media_grants_created=3))
        self.assertFails('APP_ACTIVATION', lambda s: s.update(_app_activated=True))
        self.assertFails('DUPLICATE_CATALOG_ID',
                         lambda s: s['catalog'][9].update(catalog_id='TK-000001'))
        self.assertFails('DUPLICATE_PROVIDER_SLUG',
                         lambda s: s['catalog'][9]['source'].update(provider_id='synthetic-move-1'))
        self.assertFails('PENDING_NOT_UNPUBLISHED',
                         lambda s: s['catalog'][300]['_review'].update(status='PUBLISHED'))
        self.assertFails('PENDING_HAS_ASSETS', lambda s: s['catalog'][300].update(assets=[{'u': 1}]))
        self.assertFails('REVIEW_CONFIRMATION_FLAG',
                         lambda s: s['catalog'][300]['_review'].update(
                             confirmed_by_authenticated_reviewer=True))
        self.assertFails('REVIEW_COUNTS_CHANGED',
                         lambda s: s['catalog'][300]['_review'].update(
                             review_route='SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW',
                             feedback={'proposed_exact_vocabulary': []}))
        self.assertFails('UNKNOWN_REVIEW_ROUTE',
                         lambda s: s['catalog'][300]['_review'].update(review_route='PUBLISHED'))
        self.assertFails('BASELINE_ENTRY_HAS_REVIEW_BLOCK',
                         lambda s: s['catalog'][3].update(_review={'status': 'NOT_PUBLISHED'}))

    def test_metadata_and_variant_must_not_be_approved(self):
        def meta(s):
            s['catalog'][-1]['_review']['feedback']['source_metadata_proposal'] = {'approved': True}

        def variant(s):
            s['catalog'][-1]['_review']['feedback']['variant_pair'] = {
                'automated_deduplication_permitted': True,
                'formal_variant_relation_approved': False}
        self.assertFails('METADATA_PROPOSAL_APPROVED', meta)
        self.assertFails('VARIANT_APPROVED', variant)

    def test_cli_returns_nonzero_on_failure(self):
        staged = self.write_stage()
        rc = M.main(['--source-directory', str(self.source), '--staged-catalog', str(staged),
                     '--output', str(self.tmp / 'out.html')])
        self.assertEqual(rc, 1)


class ReviewRelationTests(Base):
    """8 kept apart / 12 metadata-correction / 6 variant members; paired identity links, no dedup."""

    def build(self):
        st = self.stage
        owner_ids = [x['catalog_id'] for x in st['catalog'] if
                     x.get('_review', {}).get('review_route') == 'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW']
        self.assertEqual(len(owner_ids), 26)
        plan = ['apart'] * 8 + ['meta'] * 12 + ['variant'] * 6
        by = {x['catalog_id']: x for x in st['catalog']}
        for cid, choice in zip(owner_ids, plan):
            fb = by[cid]['_review']['feedback']
            fb['owner_choice'] = choice
            if choice == 'meta':
                fb['source_metadata_proposal'] = {'approved': False, 'fields': {'equipment': ['Synth Term']}}
        variants = owner_ids[20:]
        # 3 pairs, each pair points at the other (and one points at an existing published id)
        pairs = [(variants[0], variants[1]), (variants[2], variants[3]), (variants[4], 'TK-000010')]
        for a, b in pairs:
            by[a]['_review']['feedback']['variant_pair'] = {
                'peer_catalog_id': b, 'video_bytes_identical': False,
                'automated_deduplication_permitted': False, 'formal_variant_relation_approved': False}
        by[variants[1]]['_review']['feedback']['variant_pair'] = {
            'peer_catalog_id': variants[0], 'video_bytes_identical': False,
            'automated_deduplication_permitted': False, 'formal_variant_relation_approved': False}
        by[variants[3]]['_review']['feedback']['variant_pair'] = {
            'peer_catalog_id': variants[2], 'video_bytes_identical': False,
            'automated_deduplication_permitted': False, 'formal_variant_relation_approved': False}
        by[variants[5]]['_review']['feedback']['variant_pair'] = {
            'peer_catalog_id': variants[4], 'video_bytes_identical': False,
            'automated_deduplication_permitted': False, 'formal_variant_relation_approved': False}
        return owner_ids, variants

    def test_owner_split_and_unapproved_flags_survive(self):
        owner_ids, variants = self.build()
        self.run_gen()
        data = self.embedded((self.private / 'preview.html').read_text(encoding='utf8'))
        owner = [x for x in data['items'] if x['owner']]
        self.assertEqual([x['owner']['choice'] for x in owner].count('apart'), 8)
        self.assertEqual([x['owner']['choice'] for x in owner].count('meta'), 12)
        self.assertEqual([x['owner']['choice'] for x in owner].count('variant'), 6)
        meta = [x for x in data['items'] if x['metadata']]
        self.assertEqual(len(meta), 12)
        self.assertTrue(all(x['metadata']['approved'] is False for x in meta))
        paired = [x for x in data['items'] if x['variant']]
        self.assertEqual(len(paired), 6)
        self.assertTrue(all(x['variant']['automated_deduplication_permitted'] is False and
                            x['variant']['formal_variant_relation_approved'] is False for x in paired))
        # no auto-dedup: all 582 ids and slugs remain
        self.assertEqual(len({x['id'] for x in data['items']}), 582)
        self.assertEqual(len({x['slug'] for x in data['items']}), 582)

    def test_pair_links_resolve_in_both_directions(self):
        owner_ids, variants = self.build()
        self.run_gen()
        data = self.embedded((self.private / 'preview.html').read_text(encoding='utf8'))
        ids = {x['id'] for x in data['items']}
        for x in data['items']:
            if x['variant']:
                self.assertIn(x['variant']['peer_catalog_id'], ids)
        by = {x['id']: x for x in data['items']}
        self.assertEqual(by[variants[0]]['variant']['peer_catalog_id'], variants[1])
        self.assertEqual(by[variants[1]]['variant']['peer_catalog_id'], variants[0])
        # a pending item referencing a published one does not change the published item
        self.assertIsNone(by['TK-000010']['variant'])
        self.assertEqual(by['TK-000010']['group'], 'published')

    def test_source_terms_are_embedded_verbatim_without_synonyms(self):
        self.build()
        for x in self.stage['catalog']:
            r = x.get('_review')
            if r and r['review_route'] == 'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW':
                r['feedback']['proposed_exact_vocabulary'] = [{'term': 'Wrist  Roller', 'source_sha256': 'a' * 64}]
        self.run_gen()
        data = self.embedded((self.private / 'preview.html').read_text(encoding='utf8'))
        terms = [x for x in data['items'] if x['group'] == 'term']
        self.assertEqual(len(terms), 85)
        for t in terms:
            self.assertEqual(t['proposal'], [{'term': 'Wrist  Roller', 'source_sha256': 'a' * 64}])
        html = (self.private / 'preview.html').read_text(encoding='utf8')
        self.assertIn('Voorstel bronterm (niet bevestigd)', html)


class UxContractTests(Base):
    """Static contract checks for the navigation / accessibility / performance upgrade."""

    def page(self):
        self.run_gen()
        return (self.private / 'preview.html').read_text(encoding='utf8')

    def test_detail_is_a_modal_dialog_with_focus_management(self):
        html = self.page()
        self.assertRegex(html, r'<aside id="detail" hidden role="dialog" aria-modal="true" aria-labelledby="detail-title">')
        for needle in ("e.key==='Escape'", 'function trap(e)', 'lastFocus', "$('page').inert=true",
                       "$('page').inert=false", "h.id='detail-title'", 'id="scrim"'):
            self.assertIn(needle, html)

    def test_large_catalog_is_rendered_in_chunks(self):
        html = self.page()
        self.assertIn('var PAGE=96;', html)
        self.assertIn('current.slice(0,S.limit)', html)
        self.assertIn('id="more"', html)
        self.assertIn('setTimeout(function(){S.q=v;render();},120)', html)

    def test_owner_filter_and_relationship_chips_exist(self):
        html = self.page()
        self.assertIn('id="owner"', html)
        self.assertIn('Gekoppeld paar', html)
        self.assertIn('Gekoppeld vanuit (niet automatisch ontdubbeld)', html)
        self.assertIn('Metadata-voorstel (niet goedgekeurd)', html)

    def test_no_text_suggests_approval(self):
        html = self.page()
        ui = html.split('<script type="application/json"')[0] + html.split('</script>', 1)[1]
        for m in re.finditer(r'(?i)goedgekeurd|vrijgegeven|approved|gepubliceerd', ui):
            ctx = ui[max(0, m.start() - 24):m.end()].lower()
            self.assertTrue(any(k in ctx for k in ('niet ', 'bestaand', 'geen ', 'niets', 'alleen'))
                            or 'garandeert' in ctx, ctx)

    def test_csp_still_strict_and_no_network(self):
        html = self.page()
        self.assertIn("default-src 'none'", html)
        self.assertNotRegex(html, r'(?i)\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|serviceWorker|importScripts)\b')
        self.assertNotRegex(html, r'(?i)(src|href)="https?:')

    def test_deep_link_hash_is_validated(self):
        html = self.page()
        self.assertIn(r"/^#(TK-\d{6})$/", html)
        self.assertIn('byId[m[1]]', html)


@unittest.skipUnless(shutil.which('node'), 'node not available')
class JavaScriptSyntaxTests(Base):
    def test_embedded_script_parses(self):
        self.run_gen()
        html = (self.private / 'preview.html').read_text(encoding='utf8')
        js = re.findall(r'<script>(.*?)</script>', html, re.S)[0]
        p = self.tmp / 'check.js'
        p.write_text(js, encoding='utf8')
        r = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


PENDING_ROUTES = ('AI_PROPOSAL_PENDING_HUMAN_REVIEW', 'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW',
                  'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW')


class DraftBindingTests(Base):
    """Python side of the draft collector: digests, embedded config, static UI contract."""

    def page(self, **kw):
        res = self.run_gen(**kw)
        return res, (self.private / 'preview.html').read_text(encoding='utf8')

    def test_stage_digest_and_manifest_digest_are_independently_reproducible(self):
        res, html = self.page()
        draft = self.embedded(html)['draft']
        stage_bytes = (self.private / 'stage.json').read_bytes()
        self.assertEqual(draft['stage_sha256'], hashlib.sha256(stage_bytes).hexdigest())
        rows = sorted((x['catalog_id'], x['source']['provider_id'], x['_review']['review_route'])
                      for x in self.stage['catalog'][226:])
        self.assertEqual(len(rows), 356)
        manifest = ''.join('%s\t%s\t%s\n' % r for r in rows)
        self.assertEqual(draft['manifest_sha256'], hashlib.sha256(manifest.encode()).hexdigest())
        self.assertEqual(res['draft_stage_sha256'], draft['stage_sha256'])
        self.assertEqual(res['draft_manifest_sha256'], draft['manifest_sha256'])

    def test_embedded_draft_config_is_fixed_and_carries_no_licensed_content(self):
        _res, html = self.page()
        draft = self.embedded(html)['draft']
        self.assertEqual(draft['schema'], 'tk504-owner-review-draft')
        self.assertEqual(draft['version'], 1)
        self.assertEqual(draft['statuses'], ['unreviewed', 'review-agree-provisionally',
                                             'needs-correction', 'exclude-provisionally'])
        self.assertEqual((draft['max_bytes'], draft['max_note'], draft['expected']), (524288, 500, 356))
        self.assertEqual(sorted(draft['routes'].values()), sorted(PENDING_ROUTES))
        self.assertEqual(sorted(draft), ['expected', 'manifest_sha256', 'max_bytes', 'max_note',
                                         'routes', 'schema', 'stage_sha256', 'statuses', 'version'])
        blob = json.dumps(draft)
        self.assertNotIn('note 3', blob)
        self.assertNotIn('Synthetic Move', blob)

    def test_digests_change_when_stage_or_pending_manifest_changes(self):
        _r, html_a = self.page()
        a = self.embedded(html_a)['draft']
        # owner note edit: stage digest changes, manifest (ids/slugs/routes) does not
        s2 = make_stage()
        s2['catalog'][-1]['_review']['feedback']['owner_note'] = 'different'
        self.write_stage(s2, name='stage2.json')
        M.generate(self.source, self.private / 'stage2.json', self.private / 'p2.html')
        b = self.embedded((self.private / 'p2.html').read_text(encoding='utf8'))['draft']
        self.assertNotEqual(a['stage_sha256'], b['stage_sha256'])
        self.assertEqual(a['manifest_sha256'], b['manifest_sha256'])
        # slug edit of a pending item changes both
        s3 = make_stage()
        s3['catalog'][300]['source']['provider_id'] = 'renamed-slug'
        self.write_stage(s3, name='stage3.json')
        M.generate(self.source, self.private / 'stage3.json', self.private / 'p3.html')
        c = self.embedded((self.private / 'p3.html').read_text(encoding='utf8'))['draft']
        self.assertNotEqual(a['manifest_sha256'], c['manifest_sha256'])
        self.assertNotEqual(a['stage_sha256'], c['stage_sha256'])

    def test_csp_hash_covers_final_script_including_draft_code(self):
        _r, html = self.page()
        csp = re.search(r'Content-Security-Policy" content="([^"]+)"', html).group(1)
        script = re.findall(r'<script>(.*?)</script>', html, re.S)
        self.assertEqual(len(script), 1)
        self.assertIn('function makeDraft(', script[0])
        self.assertIn('/*DRAFT_LIB*/', M.SCRIPT_TEMPLATE)
        self.assertNotIn('/*DRAFT_LIB*/', script[0])
        digest = base64.b64encode(hashlib.sha256(script[0].encode('utf8')).digest()).decode()
        self.assertIn("'sha256-%s'" % digest, csp)
        self.assertEqual(csp.count('sha256-'), 2)  # exactly script + style
        for forbidden in ('connect-src', 'blob:', 'unsafe-', 'http', "form-action *"):
            self.assertNotIn(forbidden, csp)
        self.assertIn("default-src 'none'", csp)

    def test_ui_contract_for_draft_controls(self):
        _r, html = self.page()
        for needle in ('id="dexport"', 'id="dimport"', 'accept=".json,application/json"',
                       'id="dstatus"', 'id="dsum"', 'id="dmsg"', "GEEN geauthenticeerde goedkeuring",
                       "ta.maxLength=DATA.draft.max_note", "function draftControls(root,it)",
                       "if(isPending(it))draftControls(root,it);",
                       "if(!it||!isPending(it)||!cur)return;",   # published can never get a decision
                       "'review-agree-provisionally'", "'needs-correction'", "'exclude-provisionally'",
                       # fail-closed import: state is replaced only AFTER a successful parse
                       "try{m=DR.parse(t);}catch(err){bad(", "D=m;dirty=false;",
                       "f.size>DATA.draft.max_bytes", "if(blob.size>DATA.draft.max_bytes)",
                       "e.preventDefault();e.returnValue=''"):
            self.assertIn(needle, html, needle)
        # the published 226 are not given a control: draftControls is only reached for pending
        self.assertEqual(html.count('draftControls(root,it)'), 1 + 1)  # call + definition

    def test_export_builder_reads_only_ids_slugs_routes_and_draft_state(self):
        lib = M.DRAFT_LIB
        build = lib[lib.index('function build('):lib.index('function parse(')]
        for forbidden in ('.name', '.nl', '.poster', '.video', '.owner', '.proposal', '.metadata',
                          '.variant', '.equipment', '.primary', 'http'):
            self.assertNotIn(forbidden, build, forbidden)
        for needed in ('p.id', 'p.slug', 'cfg.routes[p.group]', 'v.status', 'v.note'):
            self.assertIn(needed, build)
        for bad in ('fetch', 'XMLHttp', 'localStorage', 'sessionStorage', 'indexedDB', 'document.', 'innerHTML'):
            self.assertNotIn(bad, lib, bad)  # library is pure: no DOM, network or storage

    def test_generator_source_has_no_network_modules(self):
        src = (ROOT / 'movekit-v2-private-library-preview.py').read_text(encoding='utf8')
        for bad in ('urlopen', 'import socket', 'import requests', 'http.client', 'supabase', 'netlify'):
            self.assertNotIn(bad, src.lower(), bad)


DRIVER = r"""
'use strict';
const fs = require('fs'), vm = require('vm');
const [htmlPath, libPath] = process.argv.slice(2);
const html = fs.readFileSync(htmlPath, 'utf8');
const libText = fs.readFileSync(libPath, 'utf8');
const dataText = /<script type="application\/json" id="tk-data">(.*?)<\/script>/s.exec(html)[1];
const appJs = /<script>(.*?)<\/script>/s.exec(html)[1];
const DATA = JSON.parse(dataText);
const out = {};
const tick = () => new Promise(r => setImmediate(r));
const clone = o => JSON.parse(JSON.stringify(o));

// ------------------------------------------------ part 1: DOM-free draft library
const makeDraft = new Function(libText + '\nreturn makeDraft;')();
const cfg = DATA.draft;
const pending = DATA.items.filter(i => i.group !== 'published').sort((a, b) => a.id < b.id ? -1 : 1);
const DR = makeDraft(cfg, pending);
out.pending = pending.length;
const state = DR.blank();
state.get(pending[0].id).status = 'review-agree-provisionally';
state.get(pending[1].id).status = 'needs-correction';
state.get(pending[1].id).note = 'Let op\nregel\t2 \u00e9 <b>x</b> ' + 'a'.repeat(400);
state.get(pending[2].id).status = 'exclude-provisionally';
state.get(pending[3].id).note = 'n'.repeat(500);
const exp = DR.build(state, '2026-11-04T10:00:00.000Z');
const text = JSON.stringify(exp);
out.export_keys = Object.keys(exp);
out.entry_keys = Object.keys(exp.decisions[0]);
out.n_decisions = exp.decisions.length;
out.unique_ids = new Set(exp.decisions.map(d => d.id)).size;
out.flags = [exp.draft_only, exp.authenticated, exp.formal_approval, exp.ready_for_import];
out.counts = exp.counts;
out.export_has_licensed = ['Synthetic Move', 'note 3', 'posters-webp', 'file:', 'http', '../', 'Synth Chest', 'compound', 'KEEP_DISTINCT']
  .filter(w => text.indexOf(w) >= 0);
out.routes_ok = exp.decisions.every(d => d.review_route === cfg.routes[pending.find(p => p.id === d.id).group]);
out.slugs_ok = exp.decisions.every(d => d.slug === pending.find(p => p.id === d.id).slug);
const back = DR.parse(text);
out.roundtrip = JSON.stringify([...back]) === JSON.stringify([...state]);
out.roundtrip_pretty = JSON.stringify([...DR.parse(JSON.stringify(exp, null, 1) + '\n')]) === JSON.stringify([...state]);
out.blank_roundtrip = DR.parse(JSON.stringify(DR.build(DR.blank(), '2026-11-04T10:00:00Z'))).size;

const rejects = {};
function expectReject(name, fn, code) {
  let got = 'ACCEPTED';
  try { const r = fn(); if (typeof r !== 'undefined') DR.parse(r); } catch (e) { got = e.message; }
  rejects[name] = got === code ? 'ok' : name + ': expected ' + code + ' got ' + got;
}
const mut = f => () => { const o = clone(exp); const r = f(o); return JSON.stringify(typeof r === 'undefined' ? o : r); };
const D0 = o => o.decisions[0];
expectReject('not_json', () => '{nope', 'DRAFT_NOT_JSON');
expectReject('empty', () => '', 'DRAFT_NOT_JSON');
expectReject('non_string', () => 123, 'DRAFT_TOO_LARGE');
expectReject('oversize', () => 'x'.repeat(cfg.max_bytes + 1), 'DRAFT_TOO_LARGE');
expectReject('array_top', () => '[]', 'DRAFT_SHAPE');
expectReject('null_top', () => 'null', 'DRAFT_SHAPE');
expectReject('proto_key', () => text.replace('{"schema"', '{"__proto__":{"polluted":1},"schema"'), 'DRAFT_SHAPE');
expectReject('extra_top', mut(o => { o.entitlement = true; }), 'DRAFT_SHAPE');
expectReject('entitlement_granted', mut(o => { o.entitlement_granted = false; }), 'DRAFT_SHAPE');
expectReject('missing_counts', mut(o => { delete o.counts; }), 'DRAFT_SHAPE');
expectReject('schema', mut(o => { o.schema = 'other'; }), 'DRAFT_SCHEMA');
expectReject('version2', mut(o => { o.version = 2; }), 'DRAFT_SCHEMA');
expectReject('version_str', mut(o => { o.version = '1'; }), 'DRAFT_SCHEMA');
expectReject('formal_approval', mut(o => { o.formal_approval = true; }), 'DRAFT_FLAGS');
expectReject('ready_for_import', mut(o => { o.ready_for_import = true; }), 'DRAFT_FLAGS');
expectReject('draft_only_false', mut(o => { o.draft_only = false; }), 'DRAFT_FLAGS');
expectReject('authenticated', mut(o => { o.authenticated = true; }), 'DRAFT_FLAGS');
expectReject('flag_string', mut(o => { o.formal_approval = 'false'; }), 'DRAFT_FLAGS');
expectReject('stage_digest', mut(o => { o.stage_sha256 = '0'.repeat(64); }), 'DRAFT_STAGE_MISMATCH');
expectReject('stage_digest_upper', mut(o => { o.stage_sha256 = o.stage_sha256.toUpperCase(); }), 'DRAFT_STAGE_MISMATCH');
expectReject('manifest_digest', mut(o => { o.manifest_sha256 = '1'.repeat(64); }), 'DRAFT_MANIFEST_MISMATCH');
expectReject('ts_text', mut(o => { o.exported_at = 'yesterday'; }), 'DRAFT_TIMESTAMP');
expectReject('ts_number', mut(o => { o.exported_at = 5; }), 'DRAFT_TIMESTAMP');
expectReject('ts_impossible', mut(o => { o.exported_at = '2026-13-45T99:99:99Z'; }), 'DRAFT_TIMESTAMP');
expectReject('355', mut(o => { o.decisions.pop(); }), 'DRAFT_COUNT');
expectReject('357', mut(o => { o.decisions.push(clone(D0(o))); }), 'DRAFT_COUNT');
expectReject('decisions_object', mut(o => { o.decisions = {}; }), 'DRAFT_COUNT');
expectReject('duplicate_id', mut(o => { o.decisions[1] = clone(D0(o)); }), 'DRAFT_ID');
expectReject('unknown_id', mut(o => { D0(o).id = 'TK-999999'; }), 'DRAFT_ID');
expectReject('published_id', mut(o => { D0(o).id = 'TK-000001'; }), 'DRAFT_ID');
expectReject('id_number', mut(o => { D0(o).id = 7; }), 'DRAFT_ID');
expectReject('id_proto', mut(o => { D0(o).id = '__proto__'; }), 'DRAFT_ID');
expectReject('slug', mut(o => { D0(o).slug = 'other-slug'; }), 'DRAFT_SLUG');
expectReject('slug_swapped', mut(o => { const t = o.decisions[0].slug; o.decisions[0].slug = o.decisions[1].slug; o.decisions[1].slug = t; }), 'DRAFT_SLUG');
expectReject('route', mut(o => { D0(o).review_route = 'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW'; }), 'DRAFT_ROUTE');
expectReject('route_published', mut(o => { D0(o).review_route = 'PUBLISHED'; }), 'DRAFT_ROUTE');
expectReject('entry_missing_key', mut(o => { delete D0(o).review_route; }), 'DRAFT_ENTRY_SHAPE');
expectReject('entry_extra_key', mut(o => { D0(o).entitled = true; }), 'DRAFT_ENTRY_SHAPE');
expectReject('entry_media_url', mut(o => { D0(o).poster = 'file:///x.webp'; }), 'DRAFT_ENTRY_SHAPE');
expectReject('entry_string', mut(o => { o.decisions[0] = 'x'; }), 'DRAFT_ENTRY_SHAPE');
expectReject('entry_array', mut(o => { o.decisions[0] = []; }), 'DRAFT_ENTRY_SHAPE');
for (const [n, v] of [['approved', 'approved'], ['number', 1], ['empty', ''], ['array', ['unreviewed']], ['null', null],
                      ['case', 'Needs-Correction'], ['space', 'needs-correction '], ['release', 'release']])
  expectReject('status_' + n, mut(o => { D0(o).status = v; }), 'DRAFT_STATUS');
for (const [n, v] of [['501', 'x'.repeat(501)], ['number', 5], ['null', null], ['nul', 'a\u0000b'], ['esc', 'a\u001bb'], ['del', 'a\u007fb'], ['array', ['x']]])
  expectReject('note_' + n, mut(o => { D0(o).note = v; }), 'DRAFT_NOTE');
expectReject('counts_wrong', mut(o => { o.counts['needs-correction'] += 1; }), 'DRAFT_COUNTS');
expectReject('counts_extra', mut(o => { o.counts.approved = 1; }), 'DRAFT_COUNTS');
expectReject('counts_missing', mut(o => { delete o.counts.unreviewed; }), 'DRAFT_COUNTS');
expectReject('counts_string', mut(o => { o.counts = 'x'; }), 'DRAFT_COUNTS');
out.rejects = rejects;
out.reject_failures = Object.values(rejects).filter(v => v !== 'ok');
out.reject_count = Object.keys(rejects).length;
out.pollution = ({}).polluted === undefined;
const frozen = JSON.stringify([...state]);
try { DR.parse('{bad'); } catch (e) { /* expected */ }
out.parse_pure = JSON.stringify([...state]) === frozen;
out.accepts_500 = DR.parse(text).get(pending[3].id).note.length === 500;
// export-size guard: worst-case notes exceed the import limit in BYTES
const big = DR.blank(); big.forEach(v => { v.note = '\u5b57'.repeat(500); });
out.worst_case_bytes_over_limit = Buffer.byteLength(JSON.stringify(DR.build(big, '2026-11-04T10:00:00Z'), null, 1)) > cfg.max_bytes;

// ------------------------------------------------ part 2: whole page in a DOM stub
function loadPage() {
  const reg = {}, clicks = [], blobs = [], timers = [];
  class El {
    constructor(tag) { this.tag = tag; this.children = []; this.handlers = {}; this.attrs = {}; this._id = '';
      this.classList = { toggle() {}, add() {}, remove() {} }; this.textContent = ''; this.value = ''; }
    set id(v) { this._id = v; reg[v] = this; } get id() { return this._id; }
    get firstChild() { return this.children[0] || null; }
    get isConnected() { return true; }
    appendChild(c) { if (c.isFrag) { c.children.forEach(x => { x.parent = this; this.children.push(x); }); c.children = []; }
      else { c.parent = this; this.children.push(c); } return c; }
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
    remove() { if (this.parent) this.parent.removeChild(this); }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(t, f) { (this.handlers[t] = this.handlers[t] || []).push(f); }
    fire(t, ev) { (this.handlers[t] || []).forEach(f => f(ev || { target: this, key: '' })); }
    click() { if (this.tag === 'a') clicks.push({ href: this.href, download: this.download, rel: this.rel }); this.fire('click'); }
    focus() {} querySelector() { return null; } querySelectorAll() { return []; }
  }
  const doc = {
    body: new El('body'), activeElement: null,
    getElementById(id) { return reg[id] || (() => { const e = new El('div'); e.id = id; return e; })(); },
    createElement(t) { return new El(t); },
    createDocumentFragment() { const e = new El('#frag'); e.isFrag = true; return e; },
    querySelectorAll() { return []; }, addEventListener() {},
  };
  doc.getElementById('tk-data').textContent = dataText;
  const win = { handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } };
  const sandbox = { document: doc, window: win, history: { replaceState() {} }, location: { hash: '', pathname: '/', search: '' },
    Blob, URL: { createObjectURL(b) { blobs.push(b); return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout(f, ms) { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, console };
  vm.runInNewContext(appJs, sandbox, { timeout: 20000 });
  return { doc, reg, clicks, blobs, timers, win, $: id => doc.getElementById(id), sandbox };
}
const gridCards = P => P.$('grid').children;
const cardId = c => c.getAttribute('data-id');
const isPend = id => id > 'TK-000226';
async function readFile(text, sizeOverride) {
  let read = false;
  return { size: sizeOverride != null ? sizeOverride : Buffer.byteLength(text), text() { read = true; return Promise.resolve(text); }, get wasRead() { return read; } };
}
async function importText(P, text, size) {
  const f = await readFile(text, size);
  const input = P.$('dimport');
  const ev = { target: { files: [f], value: 'C:\\fake\\draft.json' } };
  input.fire('change', ev);
  await tick(); await tick();
  return { fileRead: f.wasRead, inputReset: ev.target.value === '' };
}

const P = loadPage();
out.count_text = P.$('count').textContent;
out.rendered_cards = gridCards(P).length;
out.sum_initial = P.$('dsum').textContent;
out.dstatus_options = P.$('dstatus').children.map(o => o.value);
out.warning_in_page = html.indexOf('GEEN geauthenticeerde goedkeuring') > 0;
const firstPub = gridCards(P).find(c => !isPend(cardId(c)));
P.$('sort').value = 'name-desc'; P.$('sort').fire('change');
const firstPend = gridCards(P).find(c => isPend(cardId(c)));
const pendId = cardId(firstPend);
// published: no decision controls
delete P.reg['dec-status']; delete P.reg['dec-note'];
firstPub.fire('click');
out.published_has_controls = !!P.reg['dec-status'] || !!P.reg['dec-note'];
// pending: controls exist and work
firstPend.fire('click');
const sel = P.reg['dec-status'], ta = P.reg['dec-note'];
out.pending_has_controls = !!sel && !!ta;
out.select_options = sel.children.map(o => o.value);
out.note_maxlength = ta.maxLength;
out.select_initial = sel.value;
sel.value = 'needs-correction'; sel.fire('change');
ta.value = 'Zie <img src=x onerror=alert(1)> en </script>'; ta.fire('input');
out.sum_after = P.$('dsum').textContent;
out.cards_after_change = gridCards(P).length;
P.$('dstatus').value = 'needs-correction'; P.$('dstatus').fire('change');
out.filter_count_text = P.$('count').textContent;
out.filter_ids = gridCards(P).map(cardId);
P.$('dstatus').value = 'exclude-provisionally'; P.$('dstatus').fire('change');
out.filter_empty_text = P.$('count').textContent;
P.$('dstatus').value = ''; P.$('dstatus').fire('change');
out.count_after_clear = P.$('count').textContent;
out.pending_id = pendId;
// export on click only
out.clicks_before_export = P.clicks.length;
P.$('dexport').fire('click');
out.clicks_after_export = P.clicks.length;
out.download_name = P.clicks[0] && P.clicks[0].download;
out.download_href = P.clicks[0] && P.clicks[0].href;
out.blob_type = P.blobs[0] && P.blobs[0].type;
const exported = await P.blobs[0].text();
const eo = JSON.parse(exported);
out.exp_n = eo.decisions.length;
out.exp_flags = [eo.draft_only, eo.authenticated, eo.formal_approval, eo.ready_for_import];
out.exp_entry = eo.decisions.find(d => d.id === pendId);
out.exp_counts = eo.counts;
out.exp_stage_ok = eo.stage_sha256 === DATA.draft.stage_sha256 && eo.manifest_sha256 === DATA.draft.manifest_sha256;
out.exp_has_licensed = ['Synthetic Move', 'note 3', 'posters-webp', 'Synth Chest'].filter(w => exported.indexOf(w) >= 0);
out.exp_published_ids = eo.decisions.filter(d => !isPend(d.id)).length;
out.msg_after_export = P.$('dmsg').textContent;
out.beforeunload_after_export = (() => { let prevented = false; P.win.handlers.beforeunload({ preventDefault() { prevented = true; } }); return prevented; })();
// restore in a FRESH page from the exported file
const Q = loadPage();
const r1 = await importText(Q, exported);
out.import_ok_summary = Q.$('dsum').textContent;
out.import_ok_msg = Q.$('dmsg').textContent;
out.import_ok_class = Q.$('dmsg').className;
out.import_reset_input = r1.inputReset;
Q.$('dstatus').value = 'needs-correction'; Q.$('dstatus').fire('change');
out.import_filter_ids = gridCards(Q).map(cardId);
Q.$('dstatus').value = ''; Q.$('dstatus').fire('change');
Q.$('dstatus').value = 'needs-correction'; Q.$('dstatus').fire('change');
gridCards(Q)[0].fire('click');
out.import_restored_note = Q.reg['dec-note'].value;
out.import_restored_status = Q.reg['dec-status'].value;
out.beforeunload_after_import = (() => { let prevented = false; Q.win.handlers.beforeunload({ preventDefault() { prevented = true; } }); return prevented; })();
// failed imports leave the existing draft untouched and show an error
const before = Q.$('dsum').textContent;
const failures = {};
async function badImport(name, text, size, code) {
  const r = await importText(Q, text, size);
  failures[name] = {
    err: Q.$('dmsg').className === 'err' && Q.$('dmsg').attrs.role === 'alert' && Q.$('dmsg').textContent.indexOf(code) >= 0,
    unchanged: Q.$('dsum').textContent === before,
    read: r.fileRead, reset: r.inputReset, shown: Q.$('dmsg').textContent };
}
await badImport('oversize_not_read', 'x', cfg.max_bytes + 1, 'DRAFT_TOO_LARGE');
await badImport('not_json', '{nope', null, 'DRAFT_NOT_JSON');
const forged = clone(eo); forged.stage_sha256 = 'f'.repeat(64);
await badImport('foreign_stage', JSON.stringify(forged), null, 'DRAFT_STAGE_MISMATCH');
const hacked = clone(eo); hacked.formal_approval = true;
await badImport('formal_approval', JSON.stringify(hacked), null, 'DRAFT_FLAGS');
const short = clone(eo); short.decisions.pop();
await badImport('355', JSON.stringify(short), null, 'DRAFT_COUNT');
const inj = clone(eo); inj.decisions[0].note = '<img src=x onerror=alert(1)>'.repeat(30);
await badImport('note_too_long', JSON.stringify(inj), null, 'DRAFT_NOTE');
const echo = clone(eo); echo.schema = '<script>alert(9)</script>';
await badImport('error_never_echoes_input', JSON.stringify(echo), null, 'DRAFT_SCHEMA');
out.error_text_has_input = Q.$('dmsg').textContent.indexOf('<script>') >= 0;
out.failures = failures;
// valid import still works after failures; then an unreviewed draft resets everything
const cleared = clone(eo); cleared.decisions.forEach(d => { d.status = 'unreviewed'; d.note = ''; });
cleared.counts = { 'unreviewed': 356, 'review-agree-provisionally': 0, 'needs-correction': 0, 'exclude-provisionally': 0 };
await importText(Q, JSON.stringify(cleared));
out.after_clear_summary = Q.$('dsum').textContent;

// export guard: worst-case notes cannot be exported (would exceed what import accepts)
const G = loadPage();
G.$('group').value = 'pending'; G.$('group').fire('change');
let more = 0; while (!G.$('more').hidden && more++ < 20) G.$('more').fire('click');
const allCards = gridCards(G).filter(c => isPend(cardId(c)));
out.guard_cards = allCards.length;
for (const c of allCards) { c.fire('click'); G.reg['dec-note'].value = '\u5b57'.repeat(500); G.reg['dec-note'].fire('input'); }
G.$('dexport').fire('click');
out.guard_msg = G.$('dmsg').textContent;
out.guard_err = G.$('dmsg').className;
out.guard_downloads = G.clicks.length;
console.log(JSON.stringify(out));
"""


@unittest.skipUnless(shutil.which('node'), 'node not available')
class DraftWorkflowNodeTests(Base):
    """Runs the REAL embedded script (DOM stub) and the DOM-free draft library in node."""

    @classmethod
    def setUpClass(cls):
        cls.result = None

    def run_driver(self):
        self.run_gen()
        (self.tmp / 'driver.js').write_text(
            '(async () => {' + DRIVER + '})().catch(e => { console.error(e && e.stack || e); process.exit(1); });',
            encoding='utf8')
        (self.tmp / 'lib.js').write_text(M.DRAFT_LIB, encoding='utf8')
        r = subprocess.run(['node', str(self.tmp / 'driver.js'), str(self.private / 'preview.html'),
                            str(self.tmp / 'lib.js')], capture_output=True, text=True, timeout=180)
        self.assertEqual(r.returncode, 0, r.stderr[-3000:])
        return json.loads(r.stdout.strip().splitlines()[-1])

    def test_library_and_page_behaviour(self):
        o = self.run_driver()
        # ---- export document
        self.assertEqual(o['pending'], 356)
        self.assertEqual(o['export_keys'], ['schema', 'version', 'draft_only', 'authenticated',
                         'formal_approval', 'ready_for_import', 'stage_sha256', 'manifest_sha256',
                         'exported_at', 'counts', 'decisions'])
        self.assertEqual(o['entry_keys'], ['id', 'slug', 'review_route', 'status', 'note'])
        self.assertEqual((o['n_decisions'], o['unique_ids']), (356, 356))
        self.assertEqual(o['flags'], [True, False, False, False])
        self.assertEqual(o['counts'], {'unreviewed': 353, 'review-agree-provisionally': 1,
                                       'needs-correction': 1, 'exclude-provisionally': 1})
        self.assertEqual(o['export_has_licensed'], [])
        self.assertTrue(o['routes_ok'] and o['slugs_ok'])
        self.assertTrue(o['roundtrip'] and o['roundtrip_pretty'])
        self.assertEqual(o['blank_roundtrip'], 356)
        self.assertTrue(o['accepts_500'])
        # ---- strict import validation (every negative case must fail with its exact code)
        self.assertEqual(o['reject_failures'], [])
        self.assertEqual(o['reject_count'], 60)
        self.assertTrue(o['pollution'] and o['parse_pure'])
        self.assertTrue(o['worst_case_bytes_over_limit'])
        # ---- page: browsing intact, 96 cards, counts unchanged
        self.assertTrue(o['count_text'].startswith('582 van 582 oefeningen'), o['count_text'])
        self.assertEqual(o['rendered_cards'], 96)
        self.assertIn('Niet beoordeeld 356', o['sum_initial'])
        self.assertEqual(o['dstatus_options'], ['unreviewed', 'review-agree-provisionally',
                                                'needs-correction', 'exclude-provisionally'])
        # ---- published cannot get a decision; pending can
        self.assertFalse(o['published_has_controls'])
        self.assertTrue(o['pending_has_controls'])
        self.assertEqual(o['select_options'], ['unreviewed', 'review-agree-provisionally',
                                               'needs-correction', 'exclude-provisionally'])
        self.assertEqual((o['note_maxlength'], o['select_initial']), (500, 'unreviewed'))
        self.assertIn('Correctie nodig (concept) 1', o['sum_after'])
        self.assertIn('Niet beoordeeld 355', o['sum_after'])
        self.assertEqual(o['cards_after_change'], 96)
        self.assertTrue(o['filter_count_text'].startswith('1 van 582'), o['filter_count_text'])
        self.assertEqual(o['filter_ids'], [o['pending_id']])
        self.assertTrue(o['filter_empty_text'].startswith('0 van 582'), o['filter_empty_text'])
        self.assertTrue(o['count_after_clear'].startswith('582 van 582'))
        # ---- export only on explicit click, as a local Blob download
        self.assertEqual((o['clicks_before_export'], o['clicks_after_export']), (0, 1))
        self.assertRegex(o['download_name'], r'^tk504-review-concept-[0-9TZ-]+\.json$')
        self.assertEqual(o['download_href'], 'blob:test')
        self.assertEqual(o['blob_type'], 'application/json')
        self.assertEqual(o['exp_n'], 356)
        self.assertEqual(o['exp_flags'], [True, False, False, False])
        self.assertEqual(o['exp_entry']['status'], 'needs-correction')
        self.assertIn('<img', o['exp_entry']['note'])      # kept as inert data, never rendered
        self.assertEqual(o['exp_entry']['id'], o['pending_id'])
        self.assertTrue(o['exp_stage_ok'])
        self.assertEqual(o['exp_has_licensed'], [])
        self.assertEqual(o['exp_published_ids'], 0)
        self.assertFalse(o['beforeunload_after_export'])
        # ---- valid import restores choices in a fresh page, marks nothing approved
        self.assertIn('Correctie nodig (concept) 1', o['import_ok_summary'])
        self.assertNotIn('nog niet', o['import_ok_summary'])
        self.assertIn('geen goedkeuring', o['import_ok_msg'])
        self.assertNotEqual(o['import_ok_class'], 'err')
        self.assertTrue(o['import_reset_input'])
        self.assertEqual(o['import_filter_ids'], [o['pending_id']])
        self.assertEqual(o['import_restored_status'], 'needs-correction')
        self.assertIn('<img src=x', o['import_restored_note'])
        self.assertFalse(o['beforeunload_after_import'])
        # ---- failed imports: error shown, draft untouched, input reset, oversize never read
        self.assertEqual(set(o['failures']), {'oversize_not_read', 'not_json', 'foreign_stage',
                         'formal_approval', '355', 'note_too_long', 'error_never_echoes_input'})
        for name, f in o['failures'].items():
            self.assertTrue(f['err'], (name, f))
            self.assertTrue(f['unchanged'], (name, f))
            self.assertTrue(f['reset'], (name, f))
            self.assertIn('ongewijzigd', f['shown'], (name, f))
        self.assertFalse(o['failures']['oversize_not_read']['read'])
        self.assertFalse(o['error_text_has_input'])
        self.assertIn('Niet beoordeeld 356', o['after_clear_summary'])
        # ---- export size guard
        self.assertEqual(o['guard_cards'], 356)
        self.assertIn('DRAFT_TOO_LARGE', o['guard_msg'])
        self.assertEqual(o['guard_err'], 'err')
        self.assertEqual(o['guard_downloads'], 0)


if __name__ == '__main__':
    unittest.main()
