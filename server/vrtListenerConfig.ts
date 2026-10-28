const VRT_COLLECTOR_PATTERN = /<ResultCollector\b[^>]*guiclass="ViewResultsFullVisualizer"[^>]*>[\s\S]*?<\/ResultCollector>/g

const FORCED_SAVE_FLAGS = ['xml', 'samplerData', 'responseData', 'requestHeaders', 'responseHeaders', 'url'] as const

function escapeXmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function forceSaveFlag(collectorXml: string, flag: string): string {
  const flagPattern = new RegExp(`<${flag}>\\s*(true|false)\\s*</${flag}>`)
  if (flagPattern.test(collectorXml)) {
    return collectorXml.replace(flagPattern, `<${flag}>true</${flag}>`)
  }
  return collectorXml.replace(
    /(<value class="SampleSaveConfiguration">)/,
    `$1\n              <${flag}>true</${flag}>`
  )
}

function forceFilename(collectorXml: string, vrtFilePath: string): string {
  const filenameProp = `<stringProp name="filename">${escapeXmlAttr(vrtFilePath)}</stringProp>`
  const existing = /<stringProp name="filename"\s*\/>|<stringProp name="filename">[\s\S]*?<\/stringProp>/
  if (existing.test(collectorXml)) {
    return collectorXml.replace(existing, filenameProp)
  }
  return collectorXml.replace(/<\/ResultCollector>$/, `  ${filenameProp}\n        </ResultCollector>`)
}

/**
 * Imported JMX plans keep their original View Results Tree XML, which usually has no output file and
 * samplerData=false. Rewrite every VRT listener so the run records the request actually sent
 * (resolved variables/functions, headers, body) into vrt_results.xml for the results tree.
 */
export function enforceVrtListenerCapture(jmxContent: string, vrtFilePath: string): string {
  return jmxContent.replace(VRT_COLLECTOR_PATTERN, (collectorXml) => {
    let updated = collectorXml
    for (const flag of FORCED_SAVE_FLAGS) {
      updated = forceSaveFlag(updated, flag)
    }
    return forceFilename(updated, vrtFilePath)
  })
}
