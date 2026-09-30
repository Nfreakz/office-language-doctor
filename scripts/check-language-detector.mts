import assert from 'node:assert/strict'
import { detectTextLanguage, isLikelyMismatch } from '../src/lib/language/detect.ts'

const reliableCases: Array<[string, string, string]> = [
  ['Catalan', 'Benvinguts a la sessió. Gràcies per la vostra participació i col·laboració.', 'ca-ES'],
  ['Galician', 'Grazas pola súa colaboración. Benvidos á sesión de traballo e participación.', 'gl-ES'],
  ['Basque', 'Eskerrik asko zuen laguntzagatik. Ongi etorri lan saiora eta parte hartzera.', 'eu-ES'],
  ['Spanish', 'Gracias por vuestra colaboración. Bienvenidos a la sesión de trabajo y participación.', 'es-ES'],
  ['Catalan short', 'Benvinguts a la sessió.', 'ca-ES'],
  ['Galician fixture', 'Grazas pola súa colaboración. Esta frase está escrita en galego.', 'gl-ES'],
  ['Basque short', 'Eskerrik asko zuen laguntzagatik.', 'eu-ES'],
]

for (const [name, text, expectedTag] of reliableCases) {
  const result = detectTextLanguage(text)
  console.log(`${name}: ${result.tag} / ${result.confidence} / margin=${result.margin}`)
  assert.equal(result.tag, expectedTag)
  assert.ok(
    result.confidence === 'high' || result.confidence === 'medium',
    `${name} should be reliable, got ${result.confidence}`,
  )
}

const exactLabels: Array<[string, string]> = [
  ['Català:', 'ca-ES'],
  ['Valencià:', 'ca-ES'],
  ['Galego:', 'gl-ES'],
  ['Euskara:', 'eu-ES'],
  ['Español:', 'es-ES'],
  ['English:', 'en-US'],
  ['Français:', 'fr-FR'],
  ['Português:', 'pt-PT'],
  ['Deutsch:', 'de-DE'],
  ['Italiano:', 'it-IT'],
]

for (const [text, expectedTag] of exactLabels) {
  const result = detectTextLanguage(text)
  assert.equal(result.tag, expectedTag, text)
  assert.equal(result.confidence, 'high', text)
  assert.equal(isLikelyMismatch('en-US', result.tag, result.confidence), expectedTag !== 'en-US', text)
}

for (const text of ['2026', 'Total', 'EU', 'CA / GL / EU']) {
  const result = detectTextLanguage(text)
  assert.equal(result.tag, null, `${text} should remain undetected`)
  assert.equal(result.confidence, 'unknown', `${text} should remain unknown`)
}

const fixtureEnglish = detectTextLanguage('Office Language Doctor · compatibility fixture')
assert.notEqual(fixtureEnglish.confidence, 'high')

console.log('Language detector calibration: OK')
