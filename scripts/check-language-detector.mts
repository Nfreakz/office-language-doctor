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
  ['English', 'Welcome to the working session. Thank you for your participation and collaboration on this project.', 'en-US'],
  ['French', 'Bienvenue à cette session de travail. Merci pour votre participation et votre collaboration à ce projet.', 'fr-FR'],
  ['Portuguese', 'Bem-vindos a esta sessão de trabalho. Obrigado pela vossa participação e colaboração neste projeto.', 'pt-PT'],
  ['German', 'Willkommen zu dieser Arbeitssitzung. Vielen Dank für Ihre Teilnahme und Zusammenarbeit an diesem Projekt.', 'de-DE'],
  ['Italian', 'Benvenuti a questa sessione di lavoro. Grazie per la vostra partecipazione e collaborazione al progetto.', 'it-IT'],
  ['Dutch', 'Welkom bij deze werksessie. Bedankt voor uw deelname en samenwerking aan dit project.', 'nl-NL'],
  ['Polish', 'Witamy na spotkaniu roboczym. Dziękujemy za udział i współpracę przy tym projekcie.', 'pl-PL'],
  ['Romanian', 'Bine ați venit la această sesiune de lucru. Vă mulțumim pentru participare și colaborare.', 'ro-RO'],
  ['Czech', 'Vítejte na pracovním setkání. Děkujeme za vaši účast a spolupráci na tomto projektu.', 'cs-CZ'],
  ['Swedish', 'Välkommen till arbetsmötet. Tack för ditt deltagande och ditt samarbete i projektet.', 'sv-SE'],
  ['Danish', 'Velkommen til arbejdsmødet. Tak for din deltagelse og dit samarbejde om dette projekt.', 'da-DK'],
  ['Norwegian Bokmål', 'Velkommen til arbeidsmøtet. Takk for deltakelsen og samarbeidet ditt i dette prosjektet.', 'nb-NO'],
  ['Finnish', 'Tervetuloa työskentelykokoukseen. Kiitos osallistumisestasi ja yhteistyöstäsi tässä hankkeessa.', 'fi-FI'],
  ['Hungarian', 'Üdvözöljük a munkamegbeszélésen. Köszönjük részvételét és együttműködését ebben a projektben.', 'hu-HU'],
  ['Greek', 'Καλώς ήρθατε στη συνάντηση εργασίας. Σας ευχαριστούμε για τη συμμετοχή και τη συνεργασία σας σε αυτό το έργο.', 'el-GR'],
  ['Turkish', 'Çalışma toplantısına hoş geldiniz. Bu projeye katılımınız ve iş birliğiniz için teşekkür ederiz.', 'tr-TR'],
  ['Slovak', 'Vitajte na pracovnom stretnutí. Ďakujeme za vašu účasť a spoluprácu na tomto projekte.', 'sk-SK'],
  ['Slovenian', 'Dobrodošli na delovnem srečanju. Hvala za vaše sodelovanje in udeležbo pri tem projektu.', 'sl-SI'],
  ['Croatian', 'Dobrodošli na radni sastanak. Hvala vam na sudjelovanju i suradnji na ovom projektu.', 'hr-HR'],
  ['Bulgarian', 'Добре дошли на работната среща. Благодарим ви за участието и сътрудничеството по този проект.', 'bg-BG'],
  ['Estonian', 'Tere tulemast töökoosolekule. Täname teid osalemise ja koostöö eest selles projektis.', 'et-EE'],
  ['Irish', 'Fáilte chuig an gcruinniú oibre. Go raibh maith agaibh as bhur rannpháirtíocht agus bhur gcomhoibriú sa tionscadal seo.', 'ga-IE'],
  ['Latvian', 'Laipni lūdzam darba sanāksmē. Paldies par jūsu dalību un sadarbību šajā projektā.', 'lv-LV'],
  ['Lithuanian', 'Sveiki atvykę į darbo susitikimą. Dėkojame už jūsų dalyvavimą ir bendradarbiavimą šiame projekte.', 'lt-LT'],
  ['Maltese', "Merħba għal-laqgħa ta' ħidma. Grazzi tal-parteċipazzjoni u l-kollaborazzjoni tagħkom f'dan il-proġett.", 'mt-MT'],
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
  ['Nederlands:', 'nl-NL'],
  ['Polski:', 'pl-PL'],
  ['Română:', 'ro-RO'],
  ['Čeština:', 'cs-CZ'],
  ['Svenska:', 'sv-SE'],
  ['Dansk:', 'da-DK'],
  ['Norsk bokmål:', 'nb-NO'],
  ['Suomi:', 'fi-FI'],
  ['Magyar:', 'hu-HU'],
  ['Ελληνικά:', 'el-GR'],
  ['Türkçe:', 'tr-TR'],
  ['Slovenčina:', 'sk-SK'],
  ['Slovenščina:', 'sl-SI'],
  ['Hrvatski:', 'hr-HR'],
  ['Български:', 'bg-BG'],
  ['Eesti:', 'et-EE'],
  ['Gaeilge:', 'ga-IE'],
  ['Latviešu:', 'lv-LV'],
  ['Lietuvių:', 'lt-LT'],
  ['Malti:', 'mt-MT'],
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

assert.equal(isLikelyMismatch('en-GB', 'en-US', 'high'), false)
assert.equal(isLikelyMismatch('pt-BR', 'pt-PT', 'high'), false)
assert.equal(isLikelyMismatch('nl-BE', 'nl-NL', 'high'), false)
assert.equal(isLikelyMismatch('ro-MD', 'ro-RO', 'high'), false)
assert.equal(isLikelyMismatch('sv-FI', 'sv-SE', 'high'), false)
assert.equal(isLikelyMismatch('no-NO', 'nb-NO', 'high'), false)
assert.equal(isLikelyMismatch('nn-NO', 'nb-NO', 'high'), false)
assert.equal(isLikelyMismatch('da-DK', 'nb-NO', 'high'), true)
assert.equal(isLikelyMismatch('fi-FI', 'hu-HU', 'high'), true)
assert.equal(isLikelyMismatch('pl-PL', 'cs-CZ', 'high'), true)
assert.equal(isLikelyMismatch('sk-SK', 'cs-CZ', 'high'), true)
assert.equal(isLikelyMismatch('sl-SI', 'hr-HR', 'high'), true)
assert.equal(isLikelyMismatch('bg-BG', 'el-GR', 'high'), true)
assert.equal(isLikelyMismatch('et-EE', 'fi-FI', 'high'), true)
assert.equal(isLikelyMismatch('ga-IE', 'en-GB', 'high'), true)
assert.equal(isLikelyMismatch('lv-LV', 'lt-LT', 'high'), true)
assert.equal(isLikelyMismatch('mt-MT', 'it-IT', 'high'), true)

const fixtureEnglish = detectTextLanguage('Office Language Doctor · compatibility fixture')
assert.notEqual(fixtureEnglish.confidence, 'high')

console.log('Language detector calibration: OK')
