# Wallpaper package languages

TIMEFORM ships one package per platform, with English and Simplified Chinese included. Download names stay `TIMEFORM-Lively.zip` and `TIMEFORM-WallpaperEngine.zip` in every language.

- Lively 2.2 or later reads the Chinese customization labels and library metadata from `LivelyProperties.loc.json` and `LivelyInfo.loc.json`. The base files are English, providing a fallback for other interface languages and older clients.
- The offline `configure.html` editor starts in Chinese for a Chinese browser, otherwise English. Its language selector remembers the choice independently of wallpaper settings. Switching language preserves the selected design, preview dimensions and edited values.
- Wallpaper Engine uses `general.localization` with `en-us` and `zh-chs`. Property and option tokens start with `ui_` as required by the host.
- Both archives include `README.en.txt` and `README.zh-CN.txt`. Original model and edition names remain unchanged.

Translations belong to `src/hosts/localization.js`; shared configuration keys, option values and animation code remain language-independent. Existing configuration imports retain their schema and migration behavior.

Build with `npm run build:lively:complete` and `npm run build:runtime`. Run `npm test` and `npm run check:all` to validate labels, settings compatibility and reproducible packages. Browser checks cover the offline editor and exported ZIP. Native platform rendering and language selection must also be checked in the wallpaper applications.

References: [Lively localization](https://github.com/lively-community/lively/wiki/Web-Guide-IV-:-Interaction#localization), [Wallpaper Engine property translation](https://docs.wallpaperengine.io/en/web/customization/localization.html).
