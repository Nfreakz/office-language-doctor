import assert from 'node:assert/strict'
import {
  fragmentLocationLabel,
  storedLanguageSourceLabel,
} from '../src/lib/document/labels.ts'

assert.equal(fragmentLocationLabel('docx', 'word/document.xml'), 'Document body')
assert.equal(fragmentLocationLabel('docx', 'word/header2.xml'), 'Header 2')
assert.equal(fragmentLocationLabel('docx', 'word/footer1.xml'), 'Footer 1')
assert.equal(fragmentLocationLabel('docx', 'word/footnotes.xml'), 'Footnotes')
assert.equal(fragmentLocationLabel('docx', 'word/endnotes.xml'), 'Endnotes')
assert.equal(fragmentLocationLabel('docx', 'word/comments.xml'), 'Comments')

assert.equal(fragmentLocationLabel('pptx', 'ppt/slides/slide7.xml'), 'Slide 7')
assert.equal(fragmentLocationLabel('pptx', 'ppt/notesSlides/notesSlide3.xml'), 'Notes slide 3')
assert.equal(fragmentLocationLabel('pptx', 'ppt/charts/chart4.xml'), 'Chart 4')
assert.equal(fragmentLocationLabel('pptx', 'ppt/diagrams/data2.xml'), 'SmartArt data 2')

assert.equal(fragmentLocationLabel('odt', 'content.xml'), 'Document content')
assert.equal(fragmentLocationLabel('odp', 'content.xml'), 'Presentation content')
assert.equal(fragmentLocationLabel('ods', 'content.xml'), 'Spreadsheet content')

assert.equal(storedLanguageSourceLabel('run'), 'Direct text')
assert.equal(storedLanguageSourceLabel('paragraph-default'), 'Paragraph default')
assert.equal(storedLanguageSourceLabel('style'), 'Style')
assert.equal(storedLanguageSourceLabel('document-default'), 'Document default')
assert.equal(storedLanguageSourceLabel('none'), 'No stored source')

console.log('Fragment diagnostics labels: OK')
