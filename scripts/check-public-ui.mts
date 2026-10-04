import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const html = readFileSync('index.html', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; license?: string }
const visibleVersion = `v${packageJson.version}`

for (const expected of [
  'Community Edition · A NeoRS open-source project',
  'Created and maintained by NeoRS.',
  'https://github.com/Nfreakz/office-language-doctor',
  'https://github.com/Nfreakz/office-language-doctor/issues',
  'https://buymeacoffee.com/neors',
  'https://github.com/Nfreakz/office-language-doctor/blob/main/LICENSE',
  './samples/LanguageDoctor_SAMPLE.rtf',
  './favicon.svg',
  'Processed locally · Nothing uploaded',
  'What does it change?',
  'Created and maintained by NeoRS.',
  '17 supported formats',
]) {
  assert.ok(html.includes(expected), `Missing public UI content: ${expected}`)
}

for (const id of [
  'file-input',
  'dropzone',
  'status',
  'results',
  'summary',
  'language-rows',
  'global-language',
  'apply-global',
  'repair-button',
  'change-summary',
  'mixed-warning',
  'detection-summary',
  'fragment-rows',
  'smart-actions',
  'smart-fix-summary',
  'smart-repair-button',
  'export-audit-csv',
  'export-audit-json',
]) {
  assert.ok(html.includes(`id="${id}"`), `Missing required application element #${id}`)
}

assert.ok(
  !html.includes('The external visit badge counts page loads only'),
  'Privacy copy should focus on document processing, not counter implementation',
)
assert.ok(!html.includes('<details id="formats"'), 'Supported formats must remain always visible')
assert.ok(!html.includes('<details id="changes"'), 'Repair scope must remain always visible')
assert.ok(!html.includes('<details id="privacy"'), 'Privacy must remain always visible')
assert.ok(html.includes('<section id="formats" class="info-card"'), 'Supported formats card missing')
assert.ok(html.includes('<section id="changes" class="info-card"'), 'Repair scope card missing')
assert.ok(html.includes('<section id="privacy" class="info-card"'), 'Privacy card missing')
assert.ok(html.includes('<meta name="author" content="NeoRS" />'), 'NeoRS author metadata missing')
assert.ok(
  html.includes('https://language-doctor.cecolab.cat/social-preview.jpg'),
  'Social preview metadata missing',
)
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'Twitter/X large card metadata missing')
assert.ok(existsSync('public/social-preview.jpg'), 'Missing social preview image')
assert.ok(existsSync('public/CNAME'), 'Missing GitHub Pages CNAME')
assert.equal(readFileSync('public/CNAME', 'utf8').trim(), 'language-doctor.cecolab.cat', 'Wrong custom domain')
assert.ok(existsSync('public/robots.txt'), 'Missing robots.txt')
assert.ok(existsSync('public/sitemap.xml'), 'Missing sitemap.xml')
assert.ok(
  html.includes('<img class="app-mark" src="./favicon.svg" alt="" aria-hidden="true" />'),
  'Header must use the document-check logo',
)
assert.ok(!html.includes('>LD</span>'), 'Legacy LD placeholder must not remain in the header')
assert.ok(html.includes('class="locale-switcher"'), 'CA / ES / EN locale switcher missing')
for (const locale of ['ca', 'es', 'en']) {
  assert.ok(html.includes(`data-ui-locale="${locale}"`), `Missing UI locale button: ${locale}`)
}
assert.ok(html.includes('data-i18n="hero.title"'), 'Hero title must participate in UI localization')
assert.ok(html.includes('data-i18n="audit.title"'), 'Audit UI must participate in localization')
assert.ok(html.includes('data-i18n-aria-label="locale.aria"'), 'Locale switcher accessible label missing')
assert.ok(html.includes('class="support-link"'), 'Hero Buy Me a Coffee action missing')
assert.ok(html.includes('>☕ Buy me a coffee</a>'), 'Hero support label missing')
assert.ok(html.includes(`Office Language Doctor · ${visibleVersion}`), 'Header version must match package.json')
assert.ok(html.includes(`<span>${visibleVersion}</span>`), 'Footer version must match package.json')
assert.equal(packageJson.license, 'MPL-2.0', 'package.json must declare the Community Edition license')
assert.ok(html.includes('>MPL-2.0</a>'), 'Public footer must expose the MPL-2.0 license')
assert.match(readFileSync('LICENSE', 'utf8'), /^Mozilla Public License Version 2\.0/, 'LICENSE must be MPL 2.0')

assert.ok(existsSync('public/favicon.svg'), 'Missing favicon')
assert.ok(existsSync('public/samples/LanguageDoctor_SAMPLE.rtf'), 'Missing downloadable sample')

const sample = readFileSync('public/samples/LanguageDoctor_SAMPLE.rtf', 'utf8')
assert.match(sample, /^\{\\rtf1/)
assert.match(sample, /Benvinguts/)
assert.match(sample, /Grazas/)
assert.match(sample, /Eskerrik/)

console.log('Public landing page identity and trust links: OK')


assert.ok(
  html.includes('<link rel="canonical" href="https://language-doctor.cecolab.cat/"'),
  'Canonical URL must use the public custom domain',
)
assert.ok(
  html.includes('<meta property="og:url" content="https://language-doctor.cecolab.cat/"'),
  'Open Graph URL must use the public custom domain',
)
assert.ok(
  html.includes('content="https://language-doctor.cecolab.cat/social-preview.jpg"'),
  'Social preview image must use the public custom domain',
)
