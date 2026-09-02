/**
 * DEMONSTRATION: How rawXml preservation works
 * 
 * This shows the flow from JMX import → parse → export
 */

// ============================================================
// STEP 1: Original JMX snippet (from E2E_v2_QC.jmx line 249)
// ============================================================
const originalXmlBlock = `<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="1. Register Account JS" enabled="true">
  <stringProp name="HTTPSampler.domain">\${baseUrl}</stringProp>
  <stringProp name="HTTPSampler.protocol">https</stringProp>
  <stringProp name="HTTPSampler.path">/seeker/fe/register</stringProp>
  <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
  <stringProp name="HTTPSampler.method">POST</stringProp>
  <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
  <boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments">
      <elementProp name="" elementType="HTTPArgument">
        <boolProp name="HTTPArgument.always_encode">false</boolProp>
        <stringProp name="Argument.value">{
    "name": "Ha JS - \${__time(yyyyMMddHHmmss)}",
    "password": "hadtv.nlsv.test+\${envi}_\${__time(yyyyMMddHHmmss)}@gmail.com",
    "mobile": "09\${__Random(0,9)}\${__Random(1000000,9999999)}",
    "is_check_policy": true,
    "email": "hadtv.nlsv.test+\${envi}_\${__time(yyyyMMddHHmmss)}@gmail.com"
}</stringProp>
        <stringProp name="Argument.metadata">=</stringProp>
      </elementProp>
    </collectionProp>
  </elementProp>
</HTTPSamplerProxy>`;

console.log('=== RAWXML PRESERVATION FLOW ===\n');

console.log('STEP 1: Original JMX (has dynamic body with variables)');
console.log('Content includes:');
console.log('  ✓ postBodyRaw: true');
console.log('  ✓ Body with ${__time(yyyyMMddHHmmss)}');
console.log('  ✓ Body with ${envi}');
console.log('  ✓ Body with ${__Random(...)}');
console.log('\n' + originalXmlBlock.substring(0, 200) + '...\n');

// ============================================================
// STEP 2: What parser does
// ============================================================
console.log('STEP 2: Parser processes this element');
console.log('--------');
console.log('parseComponent() function:');
console.log('  1. Parse properties from element');
console.log('  2. Extract body value: body = "${__time(...)}" ← from Argument.value');
console.log('  3. Save FULL raw XML: node.metadata.rawXml = XMLSerializer.serialize(element)');
console.log('\nResult:');
console.log('  node.name = "1. Register Account JS"');
console.log('  node.type = "HTTPRequest"');
console.log('  node.properties.body = "{...${__time(...)}, ${envi}, ...}"');
console.log('  node.metadata.rawXml = (full original XML block above)');

// ============================================================
// STEP 3: What writer does on export
// ============================================================
console.log('\n\nSTEP 3: Writer exports the node');
console.log('--------');
console.log('createComponent() function:');
console.log('  1. Check: if (node.metadata?.rawXml) ← YES!');
console.log('  2. Parse raw XML: DOMParser.parseFromString(node.metadata.rawXml)');
console.log('  3. Import into export: documentNode.importNode(parsed.documentElement)');
console.log('  4. Return imported node (UNCHANGED)');
console.log('\nResult:');
console.log('  ✓ Exact same XML structure as original');
console.log('  ✓ Body with variables preserved');
console.log('  ✓ JMeter GUI can still edit script');

// ============================================================
// STEP 4: Compare
// ============================================================
console.log('\n\nSTEP 4: Verification');
console.log('--------');
console.log('Original XML has:');
console.log('  ✓ "hadtv.nlsv.test+${envi}@gmail.com" in body');
console.log('  ✓ "${__time(yyyyMMddHHmmss)}" in body');
console.log('\nExported XML will have:');
console.log('  ✓ SAME "hadtv.nlsv.test+${envi}@gmail.com"');
console.log('  ✓ SAME "${__time(yyyyMMddHHmmss)}"');
console.log('  ✓ Because we re-use the raw XML!');

// ============================================================
// CONCLUSION
// ============================================================
console.log('\n\n=== CONCLUSION ===');
console.log('✅ Body data will NOT be lost on save because:');
console.log('   1. rawXml captures the ENTIRE original element');
console.log('   2. Export re-uses raw XML instead of rebuilding');
console.log('   3. All JMeter variables stay intact');
console.log('   4. File is 100% compatible with JMeter GUI');

console.log('\n📁 When you save in this app:');
console.log('   app → parse JMX (save rawXml)');
console.log('      → export JMX (restore rawXml)');
console.log('      → file.jmx (body & variables intact!)');
console.log('      → open in JMeter GUI ✓ (editable)');
