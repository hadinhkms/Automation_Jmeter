import fs from 'fs'
import path from 'path'

const searchDirs = [
  'd:\\Project_Jmeter',
  'd:\\Project_Jmeter\\runs',
  'C:\\Users\\Admin\\Downloads',
]

const filesToFix = []

for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) continue
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.jmx')) {
      filesToFix.push(path.join(dir, entry.name))
    } else if (entry.isDirectory() && dir === 'd:\\Project_Jmeter\\runs') {
      const jmxPath = path.join(dir, entry.name, 'Test_Plan.jmx')
      if (fs.existsSync(jmxPath)) {
        filesToFix.push(jmxPath)
      }
    }
  }
}

for (const filePath of filesToFix) {
  if (!fs.existsSync(filePath)) continue
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // 1. Replace JSR223 Groovy csvFilePath assignments
  const regex1 = /def\s+csvFilePath\s*=\s*(&quot;|"|')E:\/Jmeter\/data\/csvfile_(\$\{envi\}|qc|stg)\.csv(&quot;|"|')/g
  if (regex1.test(content)) {
    content = content.replace(regex1, 'def folderData = vars.get("folderdata") ?: "D:/Project_Jmeter/data"\ndef envi = vars.get("envi") ?: "qc"\ndef csvFilePath = "${folderData}/csvfile_${envi}.csv"')
    modified = true
  }

  // 2. Replace JSR223 Groovy csvFile assignments
  const regex2 = /def\s+csvFile\s*=\s*(&apos;|&quot;|"|')E:\/Jmeter\/data\/csvfile_(\$\{envi\}|qc|stg)\.csv(&apos;|&quot;|"|')(\s*\/\/[^\r\n]*)?/g
  if (regex2.test(content)) {
    content = content.replace(regex2, 'def folderData = vars.get("folderdata") ?: "D:/Project_Jmeter/data"\ndef envi = vars.get("envi") ?: "qc"\ndef csvFile = "${folderData}/csvfile_${envi}.csv"')
    modified = true
  }

  // 3. Replace CSV Data Set Config filename
  const regex3 = /<stringProp\s+name="filename">E:\/Jmeter\/data\/keyword_new\.csv<\/stringProp>/g
  if (regex3.test(content)) {
    content = content.replace(regex3, '<stringProp name="filename">${folderdata}/keyword_new.csv</stringProp>')
    modified = true
  }

  // 4. Replace hardcoded downloadDir in User Defined Variables
  const regex4 = /<stringProp\s+name="Argument\.value">E:\/Jmeter\/downloads<\/stringProp>/g
  if (regex4.test(content)) {
    content = content.replace(regex4, '<stringProp name="Argument.value">D:/Project_Jmeter/downloads</stringProp>')
    modified = true
  }

  // 5. Replace GPKD file path if hardcoded E:\Jmeter
  const regex5 = /E:\\Jmeter\\GPKD\\/g
  if (regex5.test(content)) {
    content = content.replace(regex5, '${folderGPKD}GPKD\\')
    modified = true
  }

  // 6. Ensure folderdata and folderGPKD exist in User Defined Variables if missing
  if (content.includes('testname="User Defined Variables - envi QC"') && !content.includes('name="folderdata"')) {
    const qcUDVRegex = /(<Arguments[^>]*testname="User Defined Variables - envi QC"[^>]*>[\s\S]*?<collectionProp name="Arguments\.arguments">)/
    if (qcUDVRegex.test(content)) {
      content = content.replace(qcUDVRegex, `$1<elementProp name="folderdata" elementType="Argument"><stringProp name="Argument.name">folderdata</stringProp><stringProp name="Argument.value">D:/Project_Jmeter/data</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp><elementProp name="folderGPKD" elementType="Argument"><stringProp name="Argument.name">folderGPKD</stringProp><stringProp name="Argument.value">D:/Project_Jmeter/</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp>`)
      modified = true
    }
  }

  if (content.includes('testname="User Defined Variables - envi STG"') && !content.includes('name="folderdata"')) {
    const stgUDVRegex = /(<Arguments[^>]*testname="User Defined Variables - envi STG"[^>]*>[\s\S]*?<collectionProp name="Arguments\.arguments">)/
    if (stgUDVRegex.test(content)) {
      content = content.replace(stgUDVRegex, `$1<elementProp name="folderdata" elementType="Argument"><stringProp name="Argument.name">folderdata</stringProp><stringProp name="Argument.value">D:/Project_Jmeter/data</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp><elementProp name="folderGPKD" elementType="Argument"><stringProp name="Argument.name">folderGPKD</stringProp><stringProp name="Argument.value">D:/Project_Jmeter/</stringProp><stringProp name="Argument.metadata">=</stringProp></elementProp>`)
      modified = true
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`Updated: ${filePath}`)
  } else {
    console.log(`No changes needed for: ${filePath}`)
  }
}
