"""Check compact English glossary spacing while retaining dictionary formatting."""
import functools
import http.server
import json
import threading

from playwright.sync_api import sync_playwright

from test_english_mining import Handler, OUT, ROOT, render


def main():
    (OUT / '.test-pages').mkdir(exist_ok=True)
    note = json.loads((OUT / 'tests/fixtures/glossary.json').read_text(encoding='utf-8'))[0]
    fields = {name: field['value'] for name, field in note['fields'].items()}
    fields['Preference'] = '(5K, verb, seth-oald-extra)'
    card = render((OUT / 'back.html').read_text(encoding='utf-8'), dict(fields, Tags='', Deck='English Mining'))
    (OUT / '.test-pages/native-glossary.html').write_text(
        '<!doctype html><meta charset="utf-8"><base href="/"><link rel="stylesheet" href="style.css">'
        '<style>:root {--english-dictionary-collapse:0; --english-serif:"Klee One",klee,serif;}</style><body class="card nightMode">' + card,
        encoding='utf-8')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    checks = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width in [1380, 820, 496, 360]:
            page.set_viewport_size({'width':width, 'height':1100})
            page.goto(f'http://127.0.0.1:{server.server_port}/.test-pages/native-glossary.html')
            page.wait_for_timeout(600)
            for theme in ['nord', 'focus']:
                page.evaluate('(theme) => SenrenEnglishTheme.apply(theme)', theme)
                result = page.evaluate('''html => {
                  const box = document.querySelector('#glossary .glossary-box');
                  const frame = document.createElement('iframe'); document.body.appendChild(frame);
                  const doc = frame.contentDocument;
                  doc.open(); doc.write('<base href="'+document.baseURI+'"><body>'+html); doc.close();
                  doc.body.style.fontFamily = getComputedStyle(box).fontFamily;
                  doc.body.style.fontSize = getComputedStyle(box).fontSize;
                  doc.body.style.lineHeight = '1.5';
                  const active = box.querySelector('li[data-dictionary][style*="display: block"]');
                  const native = doc.querySelector('li[data-dictionary]');
                  const properties = ['display','listStyleType','paddingLeft','fontFamily','fontStyle','fontWeight'];
                  const inspect = (element) => Object.fromEntries(properties.map(name=>[name,name === 'fontFamily' ? getComputedStyle(element)[name].split(',')[0] : getComputedStyle(element)[name]]));
                  const pairs = [
                    [active, native],
                    [active.querySelector('i'),native.querySelector('i')],
                    [active.querySelector('ul'),native.querySelector('ul')],
                    [active.querySelector('ul li'),native.querySelector('ul li')],
                    [active.querySelector('ul ul'),native.querySelector('ul ul')],
                    [active.querySelector('ul ul li'),native.querySelector('ul ul li')],
                  ];
                  const styles = pairs.map(([a,b])=>[inspect(a),inspect(b)]);
                  frame.remove();
                  return {styles, heading: active.querySelector('i').textContent,
                    titleVisible: [...box.querySelectorAll('.dictionary-title')].some(el=>getComputedStyle(el).display!=='none'),
                    accent: getComputedStyle(active,'::before').content,
                    activeCount: [...box.querySelectorAll('li[data-dictionary]')].filter(el=>getComputedStyle(el).display!=='none').length,
                    overflow:document.documentElement.scrollWidth > innerWidth};
                }''', fields['Meaning'])
                for index, (actual, native) in enumerate(result['styles']):
                    if index == 0:
                        assert actual.pop('listStyleType') == 'none', 'Outer entry number is still visible'
                        native.pop('listStyleType')
                    if index == 1:
                        actual.pop('listStyleType')
                        native.pop('listStyleType')
                    if index in [2, 4]:
                        assert 0 < float(actual.pop('paddingLeft').removesuffix('px')) < float(native.pop('paddingLeft').removesuffix('px')), 'Nested lists waste horizontal space'
                    assert actual == native, (width, theme, actual, native)
                    checks += len(actual)
                assert result['heading'] == '(5K, verb, seth-oald-extra)'
                assert not result['titleVisible'] and result['accent'] == 'none'
                assert result['activeCount'] == 1 and not result['overflow']
                assert not errors, errors
                checks += 5
                page.locator('#glossary').screenshot(path=str(OUT / f'preview-compact-glossary-{width}-{theme}.png'))
                # Imported Cambridge class styles must survive switching too.
                page.keyboard.press('k')
                assert page.locator('li[data-dictionary="Cambridge Dictionary"]').is_visible()
                assert page.locator('li[data-dictionary="Cambridge Dictionary"] .ic-ec25e73eb2').first.evaluate('(el)=>getComputedStyle(el).color') == 'rgb(170, 170, 170)'
                page.keyboard.press('j')
                checks += 2
        browser.close()
    server.shutdown()
    print(f'PASS: {checks} compact glossary, preserved formatting, and dictionary switching checks')


if __name__ == '__main__':
    main()
