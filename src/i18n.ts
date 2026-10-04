import { isDocumentError, type DocumentErrorCode } from './lib/document/errors'

export type UiLocale = 'en' | 'es' | 'ca'

type Variables = Record<string, string | number>

const EN = {
  'meta.title': 'Fix Wrong Proofing Language | Office Language Doctor',
  'meta.description': 'Find and repair wrong proofing-language metadata in Word, PowerPoint, OpenDocument and RTF files locally in your browser. No document upload.',
  'locale.aria': 'Interface language',
  'nav.projectLinks': 'Project links',
  'footer.supportAria': 'Support NeoRS on Buy Me a Coffee',
  'footer.support': '☕ Buy me a coffee',
  'hero.byline': 'Community Edition · A NeoRS open-source project',
  'hero.title': 'Find and fix the wrong proofing language in Office documents.',
  'hero.leadBefore': 'Inspect stored proofing languages, review language issues and download a repaired copy. Documents stay in your browser, and the',
  'hero.source': 'source code is public',
  'hero.leadAfter': '.',
  'workflow.aria': 'Workflow',
  'workflow.select': 'Select document',
  'workflow.review': 'Review issues',
  'workflow.download': 'Download repaired copy',
  'upload.title': 'Choose a supported document',
  'upload.privacyBadge': 'Local processing · no upload',
  'upload.choose': 'Choose a file or drop it here',
  'upload.formats': 'Word, PowerPoint, OpenDocument and RTF · 17 supported formats · 29 detected language families',
  'upload.action': 'Choose file',
  'upload.none': 'No file selected.',
  'upload.localNote': 'Processed locally · Nothing uploaded',
  'sample.try': 'Try a sample file',
  'sample.or': 'or inspect your own document above',
  'info.formats': 'Supported formats',
  'info.richText': 'Rich Text',
  'info.detectionLabel': 'Detection',
  'info.detectionLanguages': '29 families, including all 24 official EU languages, plus Catalan/Valencian, Galician, Basque, Norwegian Bokmål and Turkish.',
  'info.changes': 'What does it change?',
  'info.changesText': 'Only the proofing-language metadata you explicitly repair. Language Doctor does not rewrite your document text. Smart Fix preselects only high-confidence safe suggestions.',
  'info.privacy': 'Privacy',
  'info.privacyText': 'Document contents, filenames and file bytes stay on your device. There is no upload endpoint, account system or server-side document processing.',
  'results.title': 'Stored proofing languages',
  'results.copy': 'These are the proofing-language tags stored in the document for actual text fragments. They are not the detected language of the text.',
  'stats.fragments': 'Text fragments',
  'stats.languages': 'Reliable languages',
  'stats.issues': 'Review issues',
  'stats.noLanguage': 'No language',
  'mixed.title': 'Mixed-language text detected.',
  'mixed.copy': 'Global remapping is disabled because it could overwrite valid language differences.',
  'global.label': 'Set all stored language tags to',
  'global.prepare': 'Prepare global fix',
  'table.storedLanguage': 'Stored language',
  'table.tag': 'Tag',
  'table.fragments': 'Text fragments',
  'table.changeTo': 'Change to',
  'change.none': 'No changes prepared.',
  'repair.globalButton': 'Repair stored tags and download',
  'audit.title': 'Text language audit',
  'audit.experimental': 'Experimental',
  'audit.copy': 'Review reliable mismatches and missing proofing-language tags individually. Word runs from the same paragraph are grouped for readability and can be expanded only when needed. Missing tags, contextual detections and Catalan / Valencian choices always require explicit review.',
  'audit.filtersAria': 'Filter audit results',
  'audit.issues': 'Issues',
  'audit.allText': 'All text',
  'audit.matches': 'Matches',
  'audit.noLanguage': 'No language',
  'audit.exportAria': 'Export audit report',
  'audit.exportCsv': 'Export CSV',
  'audit.exportJson': 'Export JSON',
  'audit.items': 'Items',
  'audit.all': 'All',
  'audit.noResults': '0 results',
  'smart.none': 'No fragment fixes selected.',
  'smart.help': 'High-confidence direct fixes are preselected. Medium-confidence, paragraph-context and Catalan/Valencian suggestions require review.',
  'smart.repair': 'Repair selected fixes',
  'audit.text': 'Text',
  'audit.stored': 'Stored',
  'audit.detected': 'Detected',
  'audit.status': 'Status',
  'audit.fix': 'Fix',
  'pagination.aria': 'Audit pages',
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'footer.maintained': 'Created and maintained by NeoRS.',
  'footer.infoAria': 'Project information',
  'footer.issue': 'Report an issue',
  'footer.privacy': 'Privacy',
  'status.analyzing': 'Analysing {file}…',
  'status.analyzed': '{file} analysed locally as {format}. Nothing was uploaded.',
  'status.analyzeError': 'Could not analyse this document.',
  'status.previousSessionKept': 'The previous document is still active below.',
  'error.unsupportedFormat': 'Choose a supported Word, PowerPoint, OpenDocument or RTF file.',
  'error.unsupportedWordFormat': 'Choose a supported Word file: DOCX, DOCM, DOTX or DOTM.',
  'error.unsupportedPowerPointFormat': 'Choose a supported PowerPoint file: PPTX, PPTM, POTX, POTM, PPSX or PPSM.',
  'error.unsupportedOdfFormat': 'Choose a supported OpenDocument file: ODT, OTT, ODP, OTP, ODS or OTS.',
  'error.unsupportedRtfFormat': 'Choose an RTF file.',
  'error.invalidWordPackage': 'This file is not a valid or readable Word document package.',
  'error.invalidPowerPointPackage': 'This file is not a valid or readable PowerPoint document package.',
  'error.invalidOdfPackage': 'This file is not a valid or readable OpenDocument package.',
  'error.odfMimetypeMismatch': 'The file extension does not match its internal OpenDocument type ({mime}).',
  'error.odfContentMissing': 'The OpenDocument file is missing its content.xml document content.',
  'error.invalidRtfDocument': 'This file is not a valid or readable RTF document.',
  'error.rtfLcidMissing': 'RTF repair is not configured for the target language {tag}.',
  'error.odfStyleInsertionFailed': 'The OpenDocument file does not contain a safe location for the repaired language style.',
  'summary.storedTags.one': '{format} · 1 stored language tag',
  'summary.storedTags.many': '{format} · {count} stored language tags',
  'stored.noTags': 'No proofing-language tags were found on text fragments in this document.',
  'stored.noEditable': 'No stored language tags are available for global remapping. Review Issues below to add missing tags manually.',
  'stored.parts.one': 'Found in 1 document XML part',
  'stored.parts.many': 'Found across {count} document XML parts',
  'detection.summary.one': '{languages} reliable language · {mismatches} likely mismatches',
  'detection.summary.many': '{languages} reliable languages · {mismatches} likely mismatches',
  'detection.none': 'No reliable language guesses',
  'audit.range.docx': '{start}–{end} of {items} audit items · {runs} filtered runs',
  'audit.range.default': '{start}–{end} of {items}',
  'pagination.page': 'Page {page} of {pages}',
  'audit.emptyIssues': 'No language issues need review.',
  'audit.emptyMatches': 'No reliable matching fragments found.',
  'audit.emptyUndetected': 'No fragments without a detectable language.',
  'audit.emptyAll': 'No textual fragments were found in the document content.',
  'paragraph.label': 'Paragraph · {location}',
  'paragraph.runs.one': '1 run',
  'paragraph.runs.many': '{count} runs',
  'paragraph.issues.one': '1 issue',
  'paragraph.issues.many': '{count} issues',
  'paragraph.noIssues': 'No issues',
  'paragraph.context': '{count} from paragraph context',
  'paragraph.direct': '{count} detected directly',
  'paragraph.noReliable': 'No reliable detection',
  'paragraph.conflict': 'Conflicting paragraph evidence',
  'paragraph.hideRuns': 'Hide runs',
  'paragraph.showRuns.one': 'Show 1 run',
  'paragraph.showRuns.many': 'Show {count} runs',
  'paragraph.variantAria': 'Choose Català or Valencià for this paragraph',
  'paragraph.variant': 'Choose Català / Valencià…',
  'paragraph.reviewTitle': 'Selects reviewed run-level fixes for this paragraph. Nothing is repaired until you use Repair selected fixes.',
  'paragraph.selected': '{count} paragraph fixes selected',
  'paragraph.select': 'Select {count} paragraph fixes',
  'fragment.run': 'Run {number}',
  'stored.noTag': 'No stored tag',
  'stored.run': 'Stored language set on this run',
  'stored.style': 'Stored language inherited from style',
  'stored.paragraph': 'Stored language inherited from paragraph',
  'stored.document': 'Stored language inherited from document default',
  'stored.noneSource': 'No stored source',
  'confidence.high': 'High confidence',
  'confidence.medium': 'Medium confidence',
  'confidence.low': 'Low confidence',
  'confidence.unknown': 'Unknown confidence',
  'detected.context': 'Detected from paragraph context',
  'detected.direct': 'Detected directly',
  'detected.conflict': 'Conflicting paragraph evidence',
  'detected.contextTitle': 'Language inferred from surrounding text in the same Word paragraph. Review this suggestion before repairing the individual run.',
  'detected.tooShort': 'Too short / non-linguistic',
  'detected.contextRejected': 'Paragraph context rejected: conflicting evidence',
  'badge.noLanguage': 'No language detected',
  'badge.lowConfidence': 'Low confidence',
  'badge.missingTag': 'Missing tag',
  'badge.mismatch': 'Mismatch',
  'badge.matches': 'Matches',
  'badge.conflictTitle': 'Reliable evidence in this Word paragraph conflicts, so paragraph context was rejected and this run remains unchanged.',
  'badge.undetectedTitle': 'There is not enough linguistic text to identify a language safely. This fragment will be left unchanged.',
  'badge.contextTitle': 'Detected from the surrounding Word paragraph because this run is too short or ambiguous on its own. Contextual fixes require review.',
  'fix.noSuggestion': 'No suggestion',
  'fix.selectAria': 'Select repair for: {text}',
  'fix.languageAria': 'Repair language for: {text}',
  'fix.variant': 'Choose Català / Valencià…',
  'smart.pending.one': '1 suggestion needs review.',
  'smart.pending.many': '{count} suggestions need review.',
  'smart.selectedPending': '{selected} fixes selected · {pending} suggestions still need review.',
  'smart.selectedDone': '{selected} fixes selected · all suggestions reviewed.',
  'select.keep': 'Keep {tag}',
  'select.chooseLanguage': 'Choose language…',
  'change.prepared.one': '1 language mapping prepared.',
  'change.prepared.many': '{count} language mappings prepared.',
  'repair.globalWorking': 'Repairing stored language metadata locally…',
  'repair.globalDone': 'Done. {fragments} language tags changed across {parts} document XML parts.',
  'repair.globalError': 'Could not repair this document.',
  'repair.selectedWorking': 'Repairing selected text fragments locally…',
  'repair.selectedDone': 'Done. {fragments} selected text fragments repaired across {parts} document XML parts.',
  'repair.selectedError': 'Could not repair the selected fragments.',
  'repair.rechecked': 'Rechecked the repaired copy · {issues} review issues remain.',
  'repair.recheckError': 'The repaired copy was downloaded, but the on-page audit could not be refreshed.',
  'export.done': '{format} audit report generated locally for {file}.',
  'format.docx': 'Word',
  'format.pptx': 'PowerPoint',
  'format.odt': 'OpenDocument Text',
  'format.odp': 'OpenDocument Presentation',
  'format.ods': 'OpenDocument Spreadsheet',
  'format.rtf': 'Rich Text',
  'location.documentBody': 'Document body',
  'location.header': 'Header {number}',
  'location.footer': 'Footer {number}',
  'location.footnotes': 'Footnotes',
  'location.endnotes': 'Endnotes',
  'location.comments': 'Comments',
  'location.wordContent': 'Word content',
  'location.slide': 'Slide {number}',
  'location.notesSlide': 'Notes slide {number}',
  'location.chart': 'Chart {number}',
  'location.smartArt': 'SmartArt data {number}',
  'location.powerPointContent': 'PowerPoint content',
  'location.rtfBody': 'RTF body',
  'location.documentContent': 'Document content',
  'location.presentationContent': 'Presentation content',
  'location.spreadsheetContent': 'Spreadsheet content',
  'location.sheet': 'Sheet: {name} · {range}',
} as const

export type MessageKey = keyof typeof EN

const ES: Record<MessageKey, string> = {
  ...EN,
  'meta.title': 'Corrige el idioma de corrección | Office Language Doctor',
  'meta.description': 'Encuentra y repara metadatos incorrectos del idioma de corrección en Word, PowerPoint, OpenDocument y RTF, localmente en tu navegador. Sin subir documentos.',
  'locale.aria': 'Idioma de la interfaz',
  'nav.projectLinks': 'Enlaces del proyecto',
  'footer.supportAria': 'Apoya NeoRS en Buy Me a Coffee',
  'footer.support': '☕ Invítame a un café',
  'hero.byline': 'Community Edition · Un proyecto de código abierto de NeoRS',
  'hero.title': 'Encuentra y corrige el idioma de corrección incorrecto en documentos de Office.',
  'hero.leadBefore': 'Revisa los idiomas de corrección guardados, comprueba incidencias de idioma y descarga una copia reparada. Los documentos permanecen en tu navegador y el',
  'hero.source': 'código fuente es público',
  'workflow.aria': 'Flujo de trabajo',
  'workflow.select': 'Selecciona el documento',
  'workflow.review': 'Revisa incidencias',
  'workflow.download': 'Descarga la copia reparada',
  'upload.title': 'Elige un documento compatible',
  'upload.privacyBadge': 'Procesamiento local · sin subida',
  'upload.choose': 'Elige un archivo o arrástralo aquí',
  'upload.formats': 'Word, PowerPoint, OpenDocument y RTF · 17 formatos compatibles · 29 familias de idiomas detectadas',
  'upload.action': 'Elegir archivo',
  'upload.none': 'Ningún archivo seleccionado.',
  'upload.localNote': 'Procesado localmente · No se sube nada',
  'sample.try': 'Probar un archivo de ejemplo',
  'sample.or': 'o revisa tu propio documento arriba',
  'info.formats': 'Formatos compatibles',
  'info.richText': 'Texto enriquecido',
  'info.detectionLabel': 'Detección',
  'info.detectionLanguages': '29 familias, incluidos los 24 idiomas oficiales de la UE, además de Catalán/Valenciano, Gallego, Euskera, Noruego bokmål y Turco.',
  'info.changes': '¿Qué modifica?',
  'info.changesText': 'Sólo los metadatos del idioma de corrección que decidas reparar. Language Doctor no reescribe el texto del documento. Smart Fix preselecciona únicamente sugerencias seguras de alta confianza.',
  'info.privacy': 'Privacidad',
  'info.privacyText': 'El contenido, el nombre y los bytes del documento permanecen en tu dispositivo. No hay endpoint de subida, cuentas ni procesamiento de documentos en un servidor.',
  'results.title': 'Idiomas de corrección guardados',
  'results.copy': 'Estas son las etiquetas de idioma de corrección almacenadas en el documento para fragmentos de texto reales. No son el idioma detectado del texto.',
  'stats.fragments': 'Fragmentos de texto',
  'stats.languages': 'Idiomas fiables',
  'stats.issues': 'Incidencias a revisar',
  'stats.noLanguage': 'Sin idioma',
  'mixed.title': 'Se ha detectado texto en varios idiomas.',
  'mixed.copy': 'La reasignación global está desactivada porque podría sobrescribir diferencias de idioma válidas.',
  'global.label': 'Cambiar todas las etiquetas de idioma guardadas a',
  'global.prepare': 'Preparar corrección global',
  'table.storedLanguage': 'Idioma guardado',
  'table.tag': 'Etiqueta',
  'table.fragments': 'Fragmentos de texto',
  'table.changeTo': 'Cambiar a',
  'change.none': 'No hay cambios preparados.',
  'repair.globalButton': 'Reparar etiquetas y descargar',
  'audit.title': 'Auditoría del idioma del texto',
  'audit.experimental': 'Experimental',
  'audit.copy': 'Revisa individualmente los errores fiables y las etiquetas de idioma de corrección ausentes. Los runs de Word del mismo párrafo se agrupan para facilitar la lectura y sólo se despliegan cuando hace falta. Las etiquetas ausentes, las detecciones contextuales y Catalán / Valenciano siempre requieren revisión explícita.',
  'audit.filtersAria': 'Filtrar resultados de la auditoría',
  'audit.issues': 'Errores',
  'audit.allText': 'Todo el texto',
  'audit.matches': 'Correctos',
  'audit.noLanguage': 'Sin idioma',
  'audit.exportAria': 'Exportar informe de auditoría',
  'audit.exportCsv': 'Exportar CSV',
  'audit.exportJson': 'Exportar JSON',
  'audit.items': 'Elementos',
  'audit.all': 'Todos',
  'audit.noResults': '0 resultados',
  'smart.none': 'No hay correcciones de fragmentos seleccionadas.',
  'smart.help': 'Las correcciones directas de alta confianza se preseleccionan. Las de confianza media, contexto de párrafo y Catalán/Valenciano requieren revisión.',
  'smart.repair': 'Reparar correcciones seleccionadas',
  'audit.text': 'Texto',
  'audit.stored': 'Guardado',
  'audit.detected': 'Detectado',
  'audit.status': 'Estado',
  'audit.fix': 'Corrección',
  'pagination.aria': 'Páginas de auditoría',
  'pagination.previous': 'Anterior',
  'pagination.next': 'Siguiente',
  'footer.maintained': 'Creado y mantenido por NeoRS.',
  'footer.infoAria': 'Información del proyecto',
  'footer.issue': 'Informar de un problema',
  'footer.privacy': 'Privacidad',
  'status.analyzing': 'Analizando {file}…',
  'status.analyzed': '{file} analizado localmente como {format}. No se ha subido nada.',
  'status.analyzeError': 'No se ha podido analizar este documento.',
  'status.previousSessionKept': 'El documento anterior sigue activo debajo.',
  'error.unsupportedFormat': 'Elige un archivo compatible de Word, PowerPoint, OpenDocument o RTF.',
  'error.unsupportedWordFormat': 'Elige un archivo Word compatible: DOCX, DOCM, DOTX o DOTM.',
  'error.unsupportedPowerPointFormat': 'Elige un archivo PowerPoint compatible: PPTX, PPTM, POTX, POTM, PPSX o PPSM.',
  'error.unsupportedOdfFormat': 'Elige un archivo OpenDocument compatible: ODT, OTT, ODP, OTP, ODS u OTS.',
  'error.unsupportedRtfFormat': 'Elige un archivo RTF.',
  'error.invalidWordPackage': 'Este archivo no es un documento Word válido o no se puede leer.',
  'error.invalidPowerPointPackage': 'Este archivo no es un documento PowerPoint válido o no se puede leer.',
  'error.invalidOdfPackage': 'Este archivo no es un paquete OpenDocument válido o no se puede leer.',
  'error.odfMimetypeMismatch': 'La extensión no coincide con el tipo OpenDocument interno ({mime}).',
  'error.odfContentMissing': 'Al archivo OpenDocument le falta el contenido del documento content.xml.',
  'error.invalidRtfDocument': 'Este archivo no es un documento RTF válido o no se puede leer.',
  'error.rtfLcidMissing': 'La reparación RTF no está configurada para el idioma de destino {tag}.',
  'error.odfStyleInsertionFailed': 'El archivo OpenDocument no contiene una ubicación segura para el estilo de idioma reparado.',
  'summary.storedTags.one': '{format} · 1 etiqueta de idioma guardada',
  'summary.storedTags.many': '{format} · {count} etiquetas de idioma guardadas',
  'stored.noTags': 'No se han encontrado etiquetas de idioma de corrección en los fragmentos de texto de este documento.',
  'stored.noEditable': 'No hay etiquetas de idioma guardadas para reasignar de forma global. Revisa Incidencias para añadir manualmente las que falten.',
  'stored.parts.one': 'Encontrado en 1 parte XML del documento',
  'stored.parts.many': 'Encontrado en {count} partes XML del documento',
  'detection.summary.one': '{languages} idioma fiable · {mismatches} posibles errores',
  'detection.summary.many': '{languages} idiomas fiables · {mismatches} posibles errores',
  'detection.none': 'No hay detecciones de idioma fiables',
  'audit.range.docx': '{start}–{end} de {items} elementos · {runs} runs filtrados',
  'audit.range.default': '{start}–{end} de {items}',
  'pagination.page': 'Página {page} de {pages}',
  'audit.emptyIssues': 'No hay incidencias de idioma que revisar.',
  'audit.emptyMatches': 'No hay fragmentos coincidentes con detección fiable.',
  'audit.emptyUndetected': 'No hay fragmentos sin un idioma detectable.',
  'audit.emptyAll': 'No se han encontrado fragmentos de texto en el documento.',
  'paragraph.label': 'Párrafo · {location}',
  'paragraph.runs.one': '1 run',
  'paragraph.runs.many': '{count} runs',
  'paragraph.issues.one': '1 incidencia',
  'paragraph.issues.many': '{count} incidencias',
  'paragraph.noIssues': 'Sin errores',
  'paragraph.context': '{count} por contexto de párrafo',
  'paragraph.direct': '{count} detectados directamente',
  'paragraph.noReliable': 'Sin detección fiable',
  'paragraph.conflict': 'Evidencia contradictoria en el párrafo',
  'paragraph.hideRuns': 'Ocultar runs',
  'paragraph.showRuns.one': 'Mostrar 1 run',
  'paragraph.showRuns.many': 'Mostrar {count} runs',
  'paragraph.variantAria': 'Elegir Català o Valencià para este párrafo',
  'paragraph.variant': 'Elegir Català / Valencià…',
  'paragraph.reviewTitle': 'Selecciona correcciones revisadas por run para este párrafo. No se repara nada hasta usar Reparar correcciones seleccionadas.',
  'paragraph.selected': '{count} correcciones del párrafo seleccionadas',
  'paragraph.select': 'Seleccionar {count} correcciones del párrafo',
  'fragment.run': 'Run {number}',
  'stored.noTag': 'Sin etiqueta guardada',
  'stored.run': 'Idioma guardado directamente en este run',
  'stored.style': 'Idioma guardado heredado del estilo',
  'stored.paragraph': 'Idioma guardado heredado del párrafo',
  'stored.document': 'Idioma guardado heredado del valor predeterminado del documento',
  'stored.noneSource': 'Sin origen de idioma guardado',
  'confidence.high': 'Confianza alta',
  'confidence.medium': 'Confianza media',
  'confidence.low': 'Confianza baja',
  'confidence.unknown': 'Confianza desconocida',
  'detected.context': 'Detectado por contexto de párrafo',
  'detected.direct': 'Detectado directamente',
  'detected.conflict': 'Evidencia contradictoria en el párrafo',
  'detected.contextTitle': 'Idioma inferido a partir del texto circundante del mismo párrafo de Word. Revisa la sugerencia antes de reparar el run.',
  'detected.tooShort': 'Demasiado corto / no lingüístico',
  'detected.contextRejected': 'Contexto de párrafo rechazado: evidencia contradictoria',
  'badge.noLanguage': 'Sin idioma detectado',
  'badge.lowConfidence': 'Confianza baja',
  'badge.missingTag': 'Falta etiqueta',
  'badge.mismatch': 'No coincide',
  'badge.matches': 'Correcto',
  'badge.conflictTitle': 'La evidencia fiable de este párrafo de Word es contradictoria, por lo que se ha rechazado el contexto y este run no se modifica.',
  'badge.undetectedTitle': 'No hay suficiente texto lingüístico para identificar un idioma de forma segura. Este fragmento no se modificará.',
  'badge.contextTitle': 'Detectado a partir del párrafo de Word porque este run es demasiado corto o ambiguo por sí solo. Las correcciones contextuales requieren revisión.',
  'fix.noSuggestion': 'Sin sugerencia',
  'fix.selectAria': 'Seleccionar reparación para: {text}',
  'fix.languageAria': 'Idioma de reparación para: {text}',
  'fix.variant': 'Elegir Català / Valencià…',
  'smart.pending.one': '1 sugerencia necesita revisión.',
  'smart.pending.many': '{count} sugerencias necesitan revisión.',
  'smart.selectedPending': '{selected} correcciones seleccionadas · {pending} sugerencias todavía necesitan revisión.',
  'smart.selectedDone': '{selected} correcciones seleccionadas · todas las sugerencias revisadas.',
  'select.keep': 'Mantener {tag}',
  'select.chooseLanguage': 'Elegir idioma…',
  'change.prepared.one': '1 asignación de idioma preparada.',
  'change.prepared.many': '{count} asignaciones de idioma preparadas.',
  'repair.globalWorking': 'Reparando localmente los metadatos de idioma guardados…',
  'repair.globalDone': 'Hecho. Se han cambiado {fragments} etiquetas de idioma en {parts} partes XML del documento.',
  'repair.globalError': 'No se ha podido reparar este documento.',
  'repair.selectedWorking': 'Reparando localmente los fragmentos de texto seleccionados…',
  'repair.selectedDone': 'Hecho. Se han reparado {fragments} fragmentos de texto seleccionados en {parts} partes XML del documento.',
  'repair.selectedError': 'No se han podido reparar los fragmentos seleccionados.',
  'repair.rechecked': 'Copia reparada revisada de nuevo · quedan {issues} incidencias por revisar.',
  'repair.recheckError': 'La copia reparada se ha descargado, pero no se ha podido actualizar la auditoría en pantalla.',
  'export.done': 'Informe de auditoría {format} generado localmente para {file}.',
  'format.docx': 'Word',
  'format.pptx': 'PowerPoint',
  'format.odt': 'Texto OpenDocument',
  'format.odp': 'Presentación OpenDocument',
  'format.ods': 'Hoja de cálculo OpenDocument',
  'format.rtf': 'Texto enriquecido',
  'location.documentBody': 'Cuerpo del documento',
  'location.header': 'Encabezado {number}',
  'location.footer': 'Pie de página {number}',
  'location.footnotes': 'Notas al pie',
  'location.endnotes': 'Notas al final',
  'location.comments': 'Comentarios',
  'location.wordContent': 'Contenido de Word',
  'location.slide': 'Diapositiva {number}',
  'location.notesSlide': 'Notas de la diapositiva {number}',
  'location.chart': 'Gráfico {number}',
  'location.smartArt': 'Datos de SmartArt {number}',
  'location.powerPointContent': 'Contenido de PowerPoint',
  'location.rtfBody': 'Cuerpo RTF',
  'location.documentContent': 'Contenido del documento',
  'location.presentationContent': 'Contenido de la presentación',
  'location.spreadsheetContent': 'Contenido de la hoja de cálculo',
  'location.sheet': 'Hoja: {name} · {range}',
}

const CA: Record<MessageKey, string> = {
  ...EN,
  'meta.title': "Corregeix l'idioma de correcció | Office Language Doctor",
  'meta.description': "Troba i repara metadades incorrectes de la llengua de correcció en Word, PowerPoint, OpenDocument i RTF, localment al navegador. Sense pujar documents.",
  'locale.aria': 'Idioma de la interfície',
  'nav.projectLinks': 'Enllaços del projecte',
  'footer.supportAria': 'Dona suport a NeoRS a Buy Me a Coffee',
  'footer.support': "☕ Convida'm a un cafè",
  'hero.byline': 'Community Edition · Un projecte de codi obert de NeoRS',
  'hero.title': "Troba i corregeix la llengua de correcció incorrecta als documents d'Office.",
  'hero.leadBefore': 'Revisa les llengües de correcció desades, comprova incidències de llengua i descarrega una còpia reparada. Els documents es queden al navegador i el',
  'hero.source': 'codi font és públic',
  'workflow.aria': 'Flux de treball',
  'workflow.select': 'Selecciona el document',
  'workflow.review': 'Revisa incidències',
  'workflow.download': 'Descarrega la còpia reparada',
  'upload.title': 'Tria un document compatible',
  'upload.privacyBadge': 'Processament local · sense pujada',
  'upload.choose': "Tria un fitxer o arrossega'l aquí",
  'upload.formats': 'Word, PowerPoint, OpenDocument i RTF · 17 formats compatibles · 29 famílies lingüístiques detectades',
  'upload.action': 'Triar fitxer',
  'upload.none': 'Cap fitxer seleccionat.',
  'upload.localNote': 'Processat localment · No es puja res',
  'sample.try': 'Prova un fitxer de mostra',
  'sample.or': 'o revisa el teu document a dalt',
  'info.formats': 'Formats compatibles',
  'info.richText': 'Text enriquit',
  'info.detectionLabel': 'Detecció',
  'info.detectionLanguages': '29 famílies, incloses les 24 llengües oficials de la UE, més Català/Valencià, Gallec, Basc, Noruec bokmål i Turc.',
  'info.changes': 'Què modifica?',
  'info.changesText': 'Només les metadades de la llengua de correcció que decideixis reparar. Language Doctor no reescriu el text del document. Smart Fix preselecciona només suggeriments segurs d’alta confiança.',
  'info.privacy': 'Privacitat',
  'info.privacyText': 'El contingut, el nom i els bytes del document es queden al teu dispositiu. No hi ha cap endpoint de pujada, comptes ni processament de documents al servidor.',
  'results.title': 'Llengües de correcció desades',
  'results.copy': 'Aquestes són les etiquetes de llengua de correcció desades al document per a fragments de text reals. No són la llengua detectada del text.',
  'stats.fragments': 'Fragments de text',
  'stats.languages': 'Llengües fiables',
  'stats.issues': 'Incidències a revisar',
  'stats.noLanguage': 'Sense llengua',
  'mixed.title': "S'ha detectat text en diverses llengües.",
  'mixed.copy': 'La reassignació global està desactivada perquè podria sobreescriure diferències de llengua vàlides.',
  'global.label': 'Canvia totes les etiquetes de llengua desades a',
  'global.prepare': 'Preparar correcció global',
  'table.storedLanguage': 'Llengua desada',
  'table.tag': 'Etiqueta',
  'table.fragments': 'Fragments de text',
  'table.changeTo': 'Canviar a',
  'change.none': 'No hi ha canvis preparats.',
  'repair.globalButton': 'Reparar etiquetes i descarregar',
  'audit.title': 'Auditoria de la llengua del text',
  'audit.experimental': 'Experimental',
  'audit.copy': 'Revisa individualment els errors fiables i les etiquetes de llengua de correcció absents. Els runs de Word del mateix paràgraf s’agrupen per facilitar la lectura i només es despleguen quan cal. Les etiquetes absents, les deteccions contextuals i Català / Valencià sempre requereixen revisió explícita.',
  'audit.filtersAria': "Filtra els resultats de l'auditoria",
  'audit.issues': 'Errors',
  'audit.allText': 'Tot el text',
  'audit.matches': 'Correctes',
  'audit.noLanguage': 'Sense llengua',
  'audit.exportAria': "Exporta l'informe d'auditoria",
  'audit.exportCsv': 'Exportar CSV',
  'audit.exportJson': 'Exportar JSON',
  'audit.items': 'Elements',
  'audit.all': 'Tots',
  'audit.noResults': '0 resultats',
  'smart.none': 'No hi ha correccions de fragments seleccionades.',
  'smart.help': 'Les correccions directes d’alta confiança es preseleccionen. Les de confiança mitjana, context de paràgraf i Català/Valencià requereixen revisió.',
  'smart.repair': 'Reparar correccions seleccionades',
  'audit.text': 'Text',
  'audit.stored': 'Desat',
  'audit.detected': 'Detectat',
  'audit.status': 'Estat',
  'audit.fix': 'Correcció',
  'pagination.aria': "Pàgines de l'auditoria",
  'pagination.previous': 'Anterior',
  'pagination.next': 'Següent',
  'footer.maintained': 'Creat i mantingut per NeoRS.',
  'footer.infoAria': 'Informació del projecte',
  'footer.issue': 'Informar d’un problema',
  'footer.privacy': 'Privacitat',
  'status.analyzing': 'Analitzant {file}…',
  'status.analyzed': "{file} analitzat localment com a {format}. No s'ha pujat res.",
  'status.analyzeError': "No s'ha pogut analitzar aquest document.",
  'status.previousSessionKept': 'El document anterior continua actiu a sota.',
  'error.unsupportedFormat': 'Tria un fitxer compatible de Word, PowerPoint, OpenDocument o RTF.',
  'error.unsupportedWordFormat': 'Tria un fitxer Word compatible: DOCX, DOCM, DOTX o DOTM.',
  'error.unsupportedPowerPointFormat': 'Tria un fitxer PowerPoint compatible: PPTX, PPTM, POTX, POTM, PPSX o PPSM.',
  'error.unsupportedOdfFormat': 'Tria un fitxer OpenDocument compatible: ODT, OTT, ODP, OTP, ODS o OTS.',
  'error.unsupportedRtfFormat': 'Tria un fitxer RTF.',
  'error.invalidWordPackage': 'Aquest fitxer no és un document Word vàlid o no es pot llegir.',
  'error.invalidPowerPointPackage': 'Aquest fitxer no és un document PowerPoint vàlid o no es pot llegir.',
  'error.invalidOdfPackage': 'Aquest fitxer no és un paquet OpenDocument vàlid o no es pot llegir.',
  'error.odfMimetypeMismatch': "L'extensió no coincideix amb el tipus OpenDocument intern ({mime}).",
  'error.odfContentMissing': "Al fitxer OpenDocument li falta el contingut del document content.xml.",
  'error.invalidRtfDocument': 'Aquest fitxer no és un document RTF vàlid o no es pot llegir.',
  'error.rtfLcidMissing': "La reparació RTF no està configurada per a la llengua de destinació {tag}.",
  'error.odfStyleInsertionFailed': "El fitxer OpenDocument no conté una ubicació segura per a l'estil de llengua reparat.",
  'summary.storedTags.one': '{format} · 1 etiqueta de llengua desada',
  'summary.storedTags.many': '{format} · {count} etiquetes de llengua desades',
  'stored.noTags': "No s'han trobat etiquetes de llengua de correcció als fragments de text d'aquest document.",
  'stored.noEditable': "No hi ha etiquetes de llengua desades per remapejar globalment. Revisa Incidències per afegir manualment les que faltin.",
  'stored.parts.one': 'Trobat en 1 part XML del document',
  'stored.parts.many': 'Trobat en {count} parts XML del document',
  'detection.summary.one': '{languages} llengua fiable · {mismatches} possibles errors',
  'detection.summary.many': '{languages} llengües fiables · {mismatches} possibles errors',
  'detection.none': 'No hi ha deteccions de llengua fiables',
  'audit.range.docx': '{start}–{end} de {items} elements · {runs} runs filtrats',
  'audit.range.default': '{start}–{end} de {items}',
  'pagination.page': 'Pàgina {page} de {pages}',
  'audit.emptyIssues': "No hi ha incidències de llengua per revisar.",
  'audit.emptyMatches': 'No hi ha fragments coincidents amb detecció fiable.',
  'audit.emptyUndetected': 'No hi ha fragments sense una llengua detectable.',
  'audit.emptyAll': "No s'han trobat fragments de text al document.",
  'paragraph.label': 'Paràgraf · {location}',
  'paragraph.runs.one': '1 run',
  'paragraph.runs.many': '{count} runs',
  'paragraph.issues.one': '1 incidència',
  'paragraph.issues.many': '{count} incidències',
  'paragraph.noIssues': 'Sense errors',
  'paragraph.context': '{count} per context de paràgraf',
  'paragraph.direct': '{count} detectats directament',
  'paragraph.noReliable': 'Sense detecció fiable',
  'paragraph.conflict': 'Evidència contradictòria al paràgraf',
  'paragraph.hideRuns': 'Amagar runs',
  'paragraph.showRuns.one': 'Mostrar 1 run',
  'paragraph.showRuns.many': 'Mostrar {count} runs',
  'paragraph.variantAria': 'Tria Català o Valencià per a aquest paràgraf',
  'paragraph.variant': 'Tria Català / Valencià…',
  'paragraph.reviewTitle': 'Selecciona correccions revisades per run per a aquest paràgraf. No es repara res fins que facis servir Reparar correccions seleccionades.',
  'paragraph.selected': '{count} correccions del paràgraf seleccionades',
  'paragraph.select': 'Seleccionar {count} correccions del paràgraf',
  'fragment.run': 'Run {number}',
  'stored.noTag': 'Sense etiqueta desada',
  'stored.run': 'Llengua desada directament en aquest run',
  'stored.style': "Llengua desada heretada de l'estil",
  'stored.paragraph': 'Llengua desada heretada del paràgraf',
  'stored.document': 'Llengua desada heretada del valor predeterminat del document',
  'stored.noneSource': 'Sense origen de llengua desada',
  'confidence.high': 'Confiança alta',
  'confidence.medium': 'Confiança mitjana',
  'confidence.low': 'Confiança baixa',
  'confidence.unknown': 'Confiança desconeguda',
  'detected.context': 'Detectat per context de paràgraf',
  'detected.direct': 'Detectat directament',
  'detected.conflict': 'Evidència contradictòria al paràgraf',
  'detected.contextTitle': 'Llengua inferida a partir del text del mateix paràgraf de Word. Revisa el suggeriment abans de reparar el run.',
  'detected.tooShort': 'Massa curt / no lingüístic',
  'detected.contextRejected': 'Context de paràgraf rebutjat: evidència contradictòria',
  'badge.noLanguage': 'Sense llengua detectada',
  'badge.lowConfidence': 'Confiança baixa',
  'badge.missingTag': 'Falta etiqueta',
  'badge.mismatch': 'No coincideix',
  'badge.matches': 'Correcte',
  'badge.conflictTitle': "L'evidència fiable d'aquest paràgraf de Word és contradictòria, així que s'ha rebutjat el context i aquest run no es modifica.",
  'badge.undetectedTitle': 'No hi ha prou text lingüístic per identificar una llengua de manera segura. Aquest fragment no es modificarà.',
  'badge.contextTitle': 'Detectat a partir del paràgraf de Word perquè aquest run és massa curt o ambigu per si sol. Les correccions contextuals requereixen revisió.',
  'fix.noSuggestion': 'Sense suggeriment',
  'fix.selectAria': 'Seleccionar reparació per a: {text}',
  'fix.languageAria': 'Llengua de reparació per a: {text}',
  'fix.variant': 'Tria Català / Valencià…',
  'smart.pending.one': '1 suggeriment necessita revisió.',
  'smart.pending.many': '{count} suggeriments necessiten revisió.',
  'smart.selectedPending': '{selected} correccions seleccionades · {pending} suggeriments encara necessiten revisió.',
  'smart.selectedDone': '{selected} correccions seleccionades · tots els suggeriments revisats.',
  'select.keep': 'Mantenir {tag}',
  'select.chooseLanguage': 'Tria una llengua…',
  'change.prepared.one': '1 assignació de llengua preparada.',
  'change.prepared.many': '{count} assignacions de llengua preparades.',
  'repair.globalWorking': 'Reparant localment les metadades de llengua desades…',
  'repair.globalDone': 'Fet. S’han canviat {fragments} etiquetes de llengua en {parts} parts XML del document.',
  'repair.globalError': "No s'ha pogut reparar aquest document.",
  'repair.selectedWorking': 'Reparant localment els fragments de text seleccionats…',
  'repair.selectedDone': 'Fet. S’han reparat {fragments} fragments de text seleccionats en {parts} parts XML del document.',
  'repair.selectedError': "No s'han pogut reparar els fragments seleccionats.",
  'repair.rechecked': 'Còpia reparada revisada de nou · queden {issues} incidències per revisar.',
  'repair.recheckError': "La còpia reparada s'ha descarregat, però no s'ha pogut actualitzar l'auditoria en pantalla.",
  'export.done': "Informe d'auditoria {format} generat localment per a {file}.",
  'format.docx': 'Word',
  'format.pptx': 'PowerPoint',
  'format.odt': 'Text OpenDocument',
  'format.odp': 'Presentació OpenDocument',
  'format.ods': 'Full de càlcul OpenDocument',
  'format.rtf': 'Text enriquit',
  'location.documentBody': 'Cos del document',
  'location.header': 'Capçalera {number}',
  'location.footer': 'Peu de pàgina {number}',
  'location.footnotes': 'Notes al peu',
  'location.endnotes': 'Notes finals',
  'location.comments': 'Comentaris',
  'location.wordContent': 'Contingut de Word',
  'location.slide': 'Diapositiva {number}',
  'location.notesSlide': 'Notes de la diapositiva {number}',
  'location.chart': 'Gràfic {number}',
  'location.smartArt': 'Dades de SmartArt {number}',
  'location.powerPointContent': 'Contingut de PowerPoint',
  'location.rtfBody': 'Cos RTF',
  'location.documentContent': 'Contingut del document',
  'location.presentationContent': 'Contingut de la presentació',
  'location.spreadsheetContent': 'Contingut del full de càlcul',
  'location.sheet': 'Full: {name} · {range}',
}

export const MESSAGES: Record<UiLocale, Record<MessageKey, string>> = {
  en: EN,
  es: ES,
  ca: CA,
}

let currentLocale: UiLocale = 'en'
const listeners = new Set<(locale: UiLocale) => void>()
const STORAGE_KEY = 'office-language-doctor-locale'

export function resolveLocale(preferred: readonly string[]): UiLocale {
  for (const value of preferred) {
    const normalized = value.toLowerCase()
    if (normalized.startsWith('ca')) return 'ca'
    if (normalized.startsWith('es')) return 'es'
    if (normalized.startsWith('en')) return 'en'
  }
  return 'en'
}

export function initLocale(): UiLocale {
  let stored: string | null = null

  if (typeof window !== 'undefined') {
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }
  }

  currentLocale = stored === 'ca' || stored === 'es' || stored === 'en'
    ? stored
    : resolveLocale(typeof navigator !== 'undefined' ? navigator.languages : ['en'])

  return currentLocale
}

export function getLocale(): UiLocale {
  return currentLocale
}

export function setLocale(locale: UiLocale): void {
  if (currentLocale === locale) return
  currentLocale = locale

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // The interface still changes even when browser storage is unavailable.
    }
  }

  for (const listener of listeners) listener(locale)
}

export function onLocaleChange(listener: (locale: UiLocale) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function t(key: MessageKey, variables: Variables = {}, locale = currentLocale): string {
  let message = MESSAGES[locale][key] ?? EN[key]

  for (const [name, value] of Object.entries(variables)) {
    message = message.replaceAll(`{${name}}`, String(value))
  }

  return message
}


const DOCUMENT_ERROR_MESSAGE_KEYS: Record<DocumentErrorCode, MessageKey> = {
  'unsupported-format': 'error.unsupportedFormat',
  'unsupported-word-format': 'error.unsupportedWordFormat',
  'unsupported-powerpoint-format': 'error.unsupportedPowerPointFormat',
  'unsupported-odf-format': 'error.unsupportedOdfFormat',
  'unsupported-rtf-format': 'error.unsupportedRtfFormat',
  'invalid-word-package': 'error.invalidWordPackage',
  'invalid-powerpoint-package': 'error.invalidPowerPointPackage',
  'invalid-odf-package': 'error.invalidOdfPackage',
  'odf-mimetype-mismatch': 'error.odfMimetypeMismatch',
  'odf-content-missing': 'error.odfContentMissing',
  'invalid-rtf-document': 'error.invalidRtfDocument',
  'rtf-lcid-missing': 'error.rtfLcidMissing',
  'odf-style-insertion-failed': 'error.odfStyleInsertionFailed',
}

export function documentErrorMessage(
  error: unknown,
  fallbackKey: MessageKey,
  locale = currentLocale,
): string {
  if (!isDocumentError(error)) return t(fallbackKey, {}, locale)
  return t(DOCUMENT_ERROR_MESSAGE_KEYS[error.code], { ...error.details }, locale)
}

export function formatNumber(value: number, locale = currentLocale): string {
  const tag = locale === 'ca' ? 'ca-ES' : locale === 'es' ? 'es-ES' : 'en-GB'
  return new Intl.NumberFormat(tag).format(value)
}

export function formatLabel(format: 'pptx' | 'docx' | 'odt' | 'odp' | 'ods' | 'rtf'): string {
  return t(`format.${format}` as MessageKey)
}

export function localizeLocationLabel(label: string): string {
  const exact: Record<string, MessageKey> = {
    'Document body': 'location.documentBody',
    Footnotes: 'location.footnotes',
    Endnotes: 'location.endnotes',
    Comments: 'location.comments',
    'Word content': 'location.wordContent',
    'PowerPoint content': 'location.powerPointContent',
    'RTF body': 'location.rtfBody',
    'Document content': 'location.documentContent',
    'Presentation content': 'location.presentationContent',
    'Spreadsheet content': 'location.spreadsheetContent',
  }

  const exactKey = exact[label]
  if (exactKey) return t(exactKey)

  const patterns: Array<[RegExp, MessageKey, string[]]> = [
    [/^Header (\d+)$/, 'location.header', ['number']],
    [/^Footer (\d+)$/, 'location.footer', ['number']],
    [/^Slide (\d+)$/, 'location.slide', ['number']],
    [/^Notes slide (\d+)$/, 'location.notesSlide', ['number']],
    [/^Chart (\d+)$/, 'location.chart', ['number']],
    [/^SmartArt data (\d+)$/, 'location.smartArt', ['number']],
    [/^Sheet: (.+) · (.+)$/, 'location.sheet', ['name', 'range']],
  ]

  for (const [pattern, key, names] of patterns) {
    const match = pattern.exec(label)
    if (!match) continue

    const variables: Variables = {}
    names.forEach((name, index) => {
      variables[name] = match[index + 1] ?? ''
    })
    return t(key, variables)
  }

  return label
}

export function applyStaticTranslations(root: ParentNode = document): void {
  document.documentElement.lang = currentLocale
  document.title = t('meta.title')

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = t('meta.description')

  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n as MessageKey | undefined
    if (key) element.textContent = t(key)
  }

  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    const key = element.dataset.i18nAriaLabel as MessageKey | undefined
    if (key) element.setAttribute('aria-label', t(key))
  }

  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const key = element.dataset.i18nTitle as MessageKey | undefined
    if (key) element.title = t(key)
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-ui-locale]')) {
    const active = button.dataset.uiLocale === currentLocale
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
}
