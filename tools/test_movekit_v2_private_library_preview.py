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
                    'eval(', 'new Function', 'autoplay', 'localStorage', 'indexedDB', '<link',
                    '<iframe', '<form', 'download='):
            self.assertNotIn(bad, html, bad)
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


if __name__ == '__main__':
    unittest.main()
