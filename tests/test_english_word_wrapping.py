"""Check visible word glyphs rather than only the document's scroll width."""
import functools
import http.server
import json
import threading

from playwright.sync_api import sync_playwright

from test_english_mining import Handler, OUT, ROOT, render


def main():
    (OUT / '.test-pages').mkdir(exist_ok=True)
    note = json.loads((OUT / 'tests/fixtures/notes.json').read_text(encoding='utf-8'))['samples'][0]
    fields = {name: field['value'] for name, field in note['fields'].items()}
    words = ['under your breath', 'transcontinental', 'pneumonoultramicroscopicsilicovolcanoconiosis']
    for index, word in enumerate(words):
        for side in ['front', 'back']:
            body = render((OUT / (side + '.html')).read_text(encoding='utf-8'), dict(fields, Word=word, Deck='English Mining', Tags=''))
            (OUT / '.test-pages' / f'wrap-{index}-{side}.html').write_text(
                '<!doctype html><meta charset="utf-8"><base href="/"><link rel="stylesheet" href="style.css"><body class="card nightMode">' + body,
                encoding='utf-8')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    checks = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width in [320, 360, 496, 820, 1380]:
            page.set_viewport_size({'width':width, 'height':1000})
            for index, word in enumerate(words):
                for side in ['front', 'back']:
                    page.goto(f'http://127.0.0.1:{server.server_port}/.test-pages/wrap-{index}-{side}.html')
                    page.evaluate('document.fonts.ready')
                    page.wait_for_timeout(80)
                    for theme in ['nord', 'focus']:
                        page.evaluate('(theme) => SenrenEnglishTheme.apply(theme)', theme)
                        page.wait_for_timeout(40)
                        result = page.evaluate('''side => {
                          const word = [...document.querySelectorAll('#word')].find(el=>el.getClientRects().length);
                          const text = side === 'back' ? word.querySelector('.ruby-base-word') : word;
                          const range = document.createRange(); range.selectNodeContents(text);
                          const bounds = word.getBoundingClientRect();
                          const box = word.closest('.background-box, .front, .back').getBoundingClientRect();
                          return {
                            text:text.textContent.trim(),
                            rects:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),
                            bounds:{left:Math.max(0,bounds.left,box.left),right:Math.min(innerWidth,bounds.right,box.right),top:box.top,bottom:box.bottom},
                            whiteSpace:getComputedStyle(text).whiteSpace,
                            overflow:document.documentElement.scrollWidth > innerWidth
                          };
                        }''', side)
                        assert result['text'] == word
                        assert result['whiteSpace'] == 'normal'
                        assert not result['overflow']
                        if ' ' not in word:
                            assert len({round(rect['top']) for rect in result['rects']}) == 1, (width, side, 'Word split across lines', result)
                        for rect in result['rects']:
                            assert rect['left'] >= result['bounds']['left'] - 1 and rect['right'] <= result['bounds']['right'] + 1, (width, side, theme, word, result)
                            assert rect['top'] >= result['bounds']['top'] - 5 and rect['bottom'] <= result['bounds']['bottom'] + 5, (width, side, theme, 'clipped vertically', result)
                        assert not errors, errors
                        checks += 5
                        if width == 360 and index == 0 and side == 'front' and theme == 'focus':
                            page.locator('#word:visible').click()
                            page.wait_for_timeout(350)
                            page.screenshot(path=str(OUT / 'preview-word-wrap-phone.png'))
        page.set_viewport_size({'width':360, 'height':1000})
        page.goto(f'http://127.0.0.1:{server.server_port}/.test-pages/wrap-1-front.html')
        page.evaluate('''() => {
          document.documentElement.style.setProperty('--english-word-size-base', '5rem');
          document.documentElement.style.setProperty('--english-serif', 'Arial, sans-serif');
        }''')
        page.wait_for_timeout(100)
        small_size = page.locator('#word:visible').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')
        page.set_viewport_size({'width':820, 'height':1000})
        page.wait_for_timeout(100)
        large_size = page.locator('#word:visible').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')
        assert large_size > small_size, 'Word did not grow after orientation/width change'
        page.evaluate("document.documentElement.style.setProperty('--english-word-size-base', '1rem')")
        page.wait_for_timeout(100)
        assert page.locator('#word:visible').evaluate('(el)=>el.style.fontSize') == '', 'Fitted font overrode a smaller typography setting'
        checks += 2
        browser.close()
    server.shutdown()
    print(f'PASS: {checks} word wrapping and visible-glyph checks across five widths and both card sides/themes')


if __name__ == '__main__':
    main()
