import assert from 'node:assert'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

/** Step 8 of tests/test-recorder.mjs: write the golden JMX and run it with a workspace JMeter if present. */
export function runGoldenJmeterCli(jmxXml) {
  const fixturesDir = join(process.cwd(), 'tests', 'fixtures')
  mkdirSync(fixturesDir, { recursive: true })
  const jmxFilePath = join(fixturesDir, 'golden_recorded_plan.jmx')
  const jtlFilePath = join(fixturesDir, 'golden_recorded_run.jtl')
  const reportDirPath = join(fixturesDir, 'golden_recorded_report')

  writeFileSync(jmxFilePath, jmxXml, 'utf-8')
  console.log(`✓ Exported JMX file written to: ${jmxFilePath}`)

  // Locate JMeter executable
  const candidates = [
    join(process.cwd(), 'apache-jmeter-5.6.3', 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
    join(process.cwd(), 'apache-jmeter-5.6.3', 'bin', process.platform === 'win32' ? 'jmeter.bat' : 'jmeter'),
  ]
  const jmeterExe = candidates.find((p) => existsSync(p))

  if (jmeterExe) {
    console.log(`Running JMeter CLI: ${jmeterExe}`)
    try {
      if (existsSync(jtlFilePath)) rmSync(jtlFilePath, { force: true })
      if (existsSync(reportDirPath)) rmSync(reportDirPath, { recursive: true, force: true })

      const cmd = `"${jmeterExe}" -n -t "${jmxFilePath}" -l "${jtlFilePath}" -e -o "${reportDirPath}" -f`
      const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' })
      console.log(output)

      assert(existsSync(jtlFilePath), 'JTL results file must be generated')
      assert(existsSync(join(reportDirPath, 'index.html')), 'HTML Dashboard report index.html must be generated')
      console.log('✓ Apache JMeter 5.6.3 CLI Non-GUI Run & HTML Report Generation PASS 100%!')
    } catch (err) {
      console.error('JMeter CLI Execution Error:', err)
      throw err
    }
  } else {
    console.log('⚠ JMeter executable not found in workspace, skipping CLI execution step.')
  }
}
