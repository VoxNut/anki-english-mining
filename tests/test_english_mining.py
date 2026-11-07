"""Exercise the complete English templates in Chromium without writing to live Anki."""
import functools
import http.server
import json
import re
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT


def render(template, fields):
    pattern = re.compile(r'{{([#^])(\w+)}}(.*?){{/\2}}', re.S)
    while pattern.search(template):
        template = pattern.sub(lambda m: m[3] if bool(fields.get(m[2])) == (m[1] == '#') else '', template)
    template = re.sub(r'{{(?:text:)?(\w+)}}', lambda m: fields.get(m[1], ''), template)
    return re.sub(r'\[sound:[^\]]+\]', '<a href="#" class="replay-button" onclick="return false">▶</a>', template)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    data = json.loads((OUT / 'tests/fixtures/notes.json').read_text(encoding='utf-8'))
    notes = [{key: value['value'] for key, value in note['fields'].items()} for note in data['samples']]
    notes += [dict(notes[0], Word='an extraordinarily long English expression', IPA='', Meaning='A plain text definition.', Sentence='', Image='', PartOfSpeech='', Frequency=''),
              dict(notes[0], Word='word-image', Image='<img src="test-image.svg"><img src="test-image-2.svg">', Preference='(ADJECTIVE, Dictionary B)',
                   Meaning='<ol><li data-dictionary="Dictionary A"><i>(noun, Dictionary A)</i>First meaning</li><li data-dictionary="Dictionary B"><i>(adjective, Dictionary B)</i>Second meaning</li></ol>'),
              dict(notes[0], Word='preferred sense', Preference='(5K, NOUN, #2, Dictionary B)',
                   Meaning='<ol><li data-dictionary="Dictionary B"><i>(5K, noun, Dictionary B)</i>First sense</li><li data-dictionary="Dictionary B"><i>(5K, noun, Dictionary B)</i>Second sense</li></ol>')]
    (OUT / '.test-pages').mkdir(exist_ok=True)
    (OUT / 'test-image.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#88c0d0"/></svg>')
    (OUT / 'test-image-2.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#b48ead"/></svg>')
    for i, note in enumerate(notes):
        for side in ['front', 'back']:
            body = render((OUT / (side + '.html')).read_text(encoding='utf-8'), dict(note, Deck='English Mining', Tags='test mining'))
            html = '<!doctype html><meta charset="utf-8"><base href="/"><link rel="stylesheet" href="style.css"><body class="card nightMode">' + body
            (OUT / '.test-pages' / f'{i}-{side}.html').write_text(html, encoding='utf-8')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}/.test-pages/'
    checks = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: (_ for _ in ()).throw(AssertionError(dialog.message)))
        for width in [1200, 496, 360]:
            page.set_viewport_size({'width': width, 'height': 1000})
            for i, note in enumerate(notes):
                for side in ['front', 'back']:
                    page.goto(url + f'{i}-{side}.html')
                    page.wait_for_timeout(650)
                    for theme in ['nord', 'focus']:
                        page.evaluate('(theme) => SenrenEnglishTheme.apply(theme)', theme)
                        assert not errors, errors
                        assert page.locator('#word').first.inner_text().strip().startswith(note['Word']), (i, side)
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), (width, i, side, 'horizontal overflow')
                        checks += 3
                        if side == 'back':
                            assert page.locator('#glossary').is_visible(), (i, 'Meaning hidden')
                            assert page.locator('#formattedSentence').inner_text().strip() == re.sub('<[^>]+>', '', note['Sentence']).strip()
                            assert page.locator('[data-english-lookup=youglish]').get_attribute('href').endswith('/english')
                            assert 'lucida sans unicode' in page.locator('.english-ipa').evaluate('(el) => getComputedStyle(el).fontFamily').lower()
                            if note['IPA']:
                                assert page.locator('.english-ipa li:visible').count() == note['IPA'].count('<li '), 'IPA variant was hidden'
                            checks += 4
                            if i == 5:
                                assert page.locator('#glossary li[data-dictionary]:visible').inner_text().endswith('Second sense'), 'Entry-number preference failed'
                                checks += 1
                        if i == 0 and side == 'back':
                            page.screenshot(path=str(OUT / f'preview-{width}-{theme}.png'), full_page=True)
                    if side == 'front' and note['Sentence']:
                        page.locator('#word:visible').click()
                        assert page.locator('#sentence-wrapper').evaluate('(el) => el.classList.contains("expanded")')
                        checks += 1
                    if side == 'back' and i == 4:
                        entries = page.locator('#glossary li[data-dictionary]')
                        assert entries.nth(1).is_visible() and not entries.nth(0).is_visible(), (width, 'Preference ignored', entries.evaluate_all('(els)=>els.map(el=>[el.textContent,el.style.display,getComputedStyle(el).display])'))
                        page.keyboard.press('j')
                        assert entries.nth(0).is_visible() and not entries.nth(1).is_visible(), 'Dictionary shortcut failed'
                        page.locator('.picture-container img:visible').click()
                        assert page.locator('#lightbox').evaluate('(el) => el.classList.contains("active")'), 'Lightbox failed'
                        page.keyboard.press('Escape')
                        assert not page.locator('#lightbox').evaluate('(el) => el.classList.contains("active")'), 'Lightbox close failed'
                        checks += 3
        # Exercise settings Save, Save to Anki, and a fresh webview using mocked AnkiConnect.
        page.set_viewport_size({'width':1200,'height':1000})
        for theme in ['nord', 'focus']:
            page.goto(url + '0-back.html')
            page.wait_for_timeout(700)
            page.evaluate('localStorage.clear()')
            page.evaluate('(theme) => SenrenEnglishTheme.apply(theme)', theme)
            page.evaluate('''() => {
              window.testCss = null; window.testPresets = null; window.testWrites = [];
              const original = fetch;
              window.fetch = async (url, options = {}) => {
                if (String(url).startsWith('http://127.0.0.1:8765')) {
                  const request = JSON.parse(options.body); testWrites.push(request);
                  let result = null;
                  if (request.action === 'guiCurrentCard') result = {modelName:'Senren+'};
                  else if (request.action === 'modelStyling') result = {css: await (await original('style.css')).text()};
                  else if (request.action === 'updateModelStyling') window.testCss = request.params.model.css;
                  else if (request.action === 'storeMediaFile') window.testPresets = JSON.parse(decodeURIComponent(escape(atob(request.params.data))));
                  else throw Error('Unexpected write: ' + request.action);
                  return new Response(JSON.stringify({result,error:null}));
                }
                return original(url, options);
              };
            }''')
            page.keyboard.press('p')
            page.wait_for_selector('#senren_english-settings-modal.active', state='attached')
            assert 'Kanji Hover' not in page.locator('#senren_english-settings-modal').inner_text()
            choice = page.locator('[data-var="--english-serif"] .senren_english-segment-btn').filter(has_text='Georgia').first
            choice.evaluate('(el) => el.click()')
            assert page.locator('#word').evaluate('(el) => getComputedStyle(el).fontFamily').lower().startswith('georgia')
            assert page.locator('#glossary .glossary-box').evaluate('(el) => getComputedStyle(el).fontFamily').lower().startswith('georgia'), 'Live glossary font preview ignored the word font'
            page.evaluate('senren_englishUpdateCurrentPreset()')
            assert page.evaluate('testPresets[testPresets._active]["--english-serif"]') == 'Georgia, "Times New Roman", serif'
            page.evaluate('document.querySelector("#senren_english-save-btn").onclick()')
            assert page.evaluate('testCss !== null')
            assert page.evaluate('testWrites.filter(x => x.action === "updateModelStyling").every(x => x.params.model.name === "English Mining")')
            assert page.evaluate('localStorage.getItem("senren_english_--english-serif")') is None
            saved_css = page.evaluate('testCss')
            page.goto(url + '0-back.html')
            page.evaluate('(css) => { const style=document.createElement("style"); style.textContent=css; document.head.appendChild(style); }', saved_css)
            page.wait_for_timeout(500)
            assert page.locator('#word').evaluate('(el) => getComputedStyle(el).fontFamily').lower().startswith('georgia'), 'Saved font lost after fresh load'
            for target in ['#glossary .glossary-box', '#glossary li[data-dictionary] > i', '#glossary li[data-dictionary] li']:
                assert page.locator(target).first.evaluate('(el) => getComputedStyle(el).fontFamily').lower().startswith('georgia'), 'Saved glossary font lost after fresh load: ' + target
            assert 'lucida sans unicode' in page.locator('.english-ipa').evaluate('(el)=>getComputedStyle(el).fontFamily').lower(), 'IPA font was changed with the glossary font'
            assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--serif").trim()') == '', 'English leaked Japanese typography'
            checks += 13
        assert not errors, errors
        browser.close()
    server.shutdown()
    print(f'PASS: {checks} English template, theme, responsive, dictionary, image, and persistence checks')


if __name__ == '__main__':
    main()
