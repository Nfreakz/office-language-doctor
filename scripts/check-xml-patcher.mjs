import assert from 'node:assert/strict'
import { extractTextFragments, replaceTextRunLanguages } from '../src/lib/pptx/xml.ts'

const xml = `<p:sld xmlns:p="p" xmlns:a="a"><a:p>
<a:r><a:rPr lang="en-US" altLang="fr-FR"/><a:t>Benvinguts a la sessió.</a:t></a:r>
<a:r><a:t>Eskerrik asko zuen laguntzagatik.</a:t></a:r>
<a:fld id="{1}" type="slidenum"><a:rPr lang="en-US"/><a:t>2</a:t></a:fld>
</a:p></p:sld>`

const before = extractTextFragments(xml)
assert.equal(before.length, 3)
assert.equal(before[0].storedTag, 'en-US')
assert.equal(before[1].storedTag, null)
assert.equal(before[2].storedTag, 'en-US')

const result = replaceTextRunLanguages(xml, new Map([
  [0, 'ca-ES'],
  [1, 'eu-ES'],
]))

assert.equal(result.changes, 2)
assert.match(result.xml, /lang="ca-ES" altLang="fr-FR"/)
assert.match(result.xml, /<a:r><a:rPr lang="eu-ES"\/><a:t>Eskerrik/)
assert.match(result.xml, /<a:fld id="\{1\}" type="slidenum"><a:rPr lang="en-US"\/>/)

const after = extractTextFragments(result.xml)
assert.equal(after[0].storedTag, 'ca-ES')
assert.equal(after[1].storedTag, 'eu-ES')
assert.equal(after[2].storedTag, 'en-US')

console.log('XML fragment patcher: OK')
