// Copy a JMX plan with every View Results Tree listener rewritten to record the request actually sent
// (resolved variables, headers, body) into an XML file — the same capture the web runner applies.
//   npx tsx scripts/prepare-vrt-capture.mts <in.jmx> <out.jmx> <vrt_results.xml>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { enforceVrtListenerCapture } from '../server/vrtListenerConfig.ts'

const [input, output, vrtFile] = process.argv.slice(2)
if (!input || !output || !vrtFile) {
  console.error('Usage: npx tsx scripts/prepare-vrt-capture.mts <in.jmx> <out.jmx> <vrt_results.xml>')
  process.exit(2)
}

const jmx = readFileSync(input, 'utf-8')
const captured = enforceVrtListenerCapture(jmx, resolve(vrtFile).replace(/\\/g, '/'))
if (captured === jmx) {
  console.error(`No View Results Tree listener in ${input}: request details will not be recorded.`)
}
writeFileSync(output, captured, 'utf-8')
