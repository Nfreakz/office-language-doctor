import assert from 'node:assert/strict'
import {
  MESSAGES,
  formatLabel,
  localizeLocationLabel,
  resolveLocale,
  setLocale,
  t,
} from '../src/i18n.ts'

assert.deepEqual(Object.keys(MESSAGES).sort(), ['ca', 'en', 'es'])
assert.equal(resolveLocale(['ca-ES', 'es-ES']), 'ca')
assert.equal(resolveLocale(['es-MX', 'en-US']), 'es')
assert.equal(resolveLocale(['fr-FR', 'en-GB']), 'en')
assert.equal(resolveLocale(['de-DE']), 'en')

const englishKeys = Object.keys(MESSAGES.en).sort()
assert.deepEqual(Object.keys(MESSAGES.es).sort(), englishKeys)
assert.deepEqual(Object.keys(MESSAGES.ca).sort(), englishKeys)

for (const locale of ['en', 'es', 'ca'] as const) {
  for (const [key, value] of Object.entries(MESSAGES[locale])) {
    assert.ok(value.trim().length > 0, `Empty ${locale} translation for ${key}`)
  }
}

assert.equal(t('status.analyzing', { file: 'demo.docx' }, 'es'), 'Analizando demo.docx…')
assert.equal(
  t('summary.storedTags.many', { format: 'Word', count: 3 }, 'ca'),
  'Word · 3 etiquetes de llengua desades',
)

setLocale('es')
assert.equal(formatLabel('ods'), 'Hoja de cálculo OpenDocument')
assert.equal(localizeLocationLabel('Document body'), 'Cuerpo del documento')
assert.equal(localizeLocationLabel('Header 2'), 'Encabezado 2')
assert.equal(localizeLocationLabel('Slide 7'), 'Diapositiva 7')
assert.equal(localizeLocationLabel('Sheet: Budget Q4 · AB1'), 'Hoja: Budget Q4 · AB1')

setLocale('ca')
assert.equal(formatLabel('rtf'), 'Text enriquit')
assert.equal(localizeLocationLabel('Footer 1'), 'Peu de pàgina 1')
assert.equal(localizeLocationLabel('Notes slide 3'), 'Notes de la diapositiva 3')

console.log('CA / ES / EN interface localization: OK')
