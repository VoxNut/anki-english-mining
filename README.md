# Anki English Mining

An English adaptation of Senren v4.7.0, with Nord/Focus themes, saved presets, dictionary switching, audio replay, picture navigation, and a lightbox. Based on the Senren runtime maintained in [VoxNut/reisei](https://github.com/VoxNut/reisei).

The glossary follows **Word Font**, retains dictionary headings and nested definition/example bullets, and uses compact spacing. The outer dictionary entry number is hidden. Long words and phrases wrap on narrow screens. IPA retains its own sans-serif font.

## Existing fields

Use these exact field names, in this order:

```text
Word
IPA
Meaning
Sentence
SentenceAudio
WordAudio
Image
Frequency
PartOfSpeech
Preference
MiscInfo
```

`Meaning` accepts plain definitions or Yomitan dictionary HTML. `Preference` accepts dictionary names and entries such as `(ADJECTIVE, Example Dictionary)` or `(5K, NOUN, #2, Example Dictionary)`. Existing note fields and review scheduling do not need to change.

## Install

1. Back up your Anki collection before replacing an existing note type's templates.
2. Create or select an **English Mining** note type with the fields above and one card template named **Card 1**.
3. Copy all `_senren_english*` files, `_extracted_css_base.css`, and `_bookmark.svg` from this repository into the active profile's `collection.media` directory. On Windows, this is usually `%APPDATA%/Anki2/<profile>/collection.media`.
4. Open **Cards…** for this note type. Paste `front.html` into **Front Template**, `back.html` into **Back Template**, and `style.css` into **Styling**. These are Anki templates, not standalone web pages.
5. Reopen the reviewer. To use the desktop **Save** and **Save to Anki** controls, keep AnkiConnect installed and available at its default local address, `http://127.0.0.1:8765`.
6. Sync Anki Desktop, then your mobile device, to transfer templates and media.

Custom fonts are optional. The CSS can use `_KleeOne-SemiBold.ttf`, `_NotoSansJP.ttf`, and `_NotoSerifJP.ttf` from the media folder; font binaries are not included. Choose an installed font in Typography or add your preferred font files.

## Controls

| Action | Desktop shortcut |
| --- | --- |
| Settings | P |
| Switch Nord/Focus theme | Comma |
| Previous/next dictionary | J / K |
| Replay word and current sentence | W |
| Picture lightbox | Q |
| Picture grid | Shift+Q |
| Hide/show pictures | M |
| Close lightbox | Escape |

On touch screens, tap the left edge of the header to reveal hidden controls. Tap the word on the front to reveal its sentence. Typography's **Word Font** controls the word and glossary; IPA stays independent.

Use **Save** to update the selected preset, then **Save to Anki** to persist styling for sync. Preset files, storage keys, and CSS variables are separate from Japanese Senren. **Save to Anki** targets the note type named **English Mining**.

## Run the regression checks

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/test_english_mining.py
python tests/test_english_glossary.py
python tests/test_english_word_wrapping.py
```

The suite uses synthetic notes and mocked AnkiConnect writes. It checks desktop/phone layouts, both themes, dictionary preferences, picture controls, and font persistence across Save → Save to Anki → a fresh load. It does not modify a running Anki collection. Physical mobile-device verification remains separate.
