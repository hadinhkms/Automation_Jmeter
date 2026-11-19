export const jmeterSnippets: Record<string, { label: string; code: string }[]> = {
  groovy: [
    { label: 'vars.get(key)', code: 'def myVar = vars.get("variable_name")' },
    { label: 'vars.put(key, value)', code: 'vars.put("variable_name", "my_value")' },
    { label: 'props.get(key)', code: 'def globalProp = props.get("property_name")' },
    { label: 'props.put(key, value)', code: 'props.put("property_name", "my_value")' },
    { label: 'log.info(...)', code: 'log.info("Current variable: " + vars.get("variable_name"))' },
    { label: 'prev.setSuccessful(...)', code: 'prev.setSuccessful(true)\nprev.setResponseCode("200")\nprev.setResponseMessage("OK")' },
    { label: 'Read CSV Lines', code: 'def lines = new File("path/to/file.csv").readLines()\nlines.each { line ->\n    log.info("Line: " + line)\n}' },
    { label: 'Format Current Date', code: 'import java.text.SimpleDateFormat\ndef sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss")\ndef nowFormatted = sdf.format(new Date())\nvars.put("CURRENT_TIME", nowFormatted)' },
    { label: 'JSON Parsing (JsonSlurper)', code: 'import groovy.json.JsonSlurper\ndef response = prev.getResponseDataAsString()\ndef json = new JsonSlurper().parseText(response)\ndef id = json.data?.id\nvars.put("ITEM_ID", id ? id.toString() : "")' },
  ],
  javascript: [
    { label: 'vars.get(key)', code: 'var myVar = vars.get("variable_name");' },
    { label: 'vars.put(key, value)', code: 'vars.put("variable_name", "my_value");' },
    { label: 'log.info(...)', code: 'log.info("Message: " + vars.get("variable_name"));' },
    { label: 'prev.setSuccessful(...)', code: 'prev.setSuccessful(true);\nprev.setResponseCode("200");' },
  ],
  json: [
    { label: 'Login Payload', code: '{\n  "login_name": "${loginEmail}",\n  "password": "${password}",\n  "step": 1\n}' },
    { label: 'Simple Object', code: '{\n  "id": "${id}",\n  "name": "example",\n  "status": true\n}' },
    { label: 'Nested Array Payload', code: '{\n  "items": [\n    { "id": 1, "quantity": 10 },\n    { "id": 2, "quantity": 5 }\n  ]\n}' },
  ],
  bash: [
    { label: 'cURL GET request', code: 'curl -X GET "https://api.example.com/items" \\\n  -H "Accept: application/json"' },
    { label: 'cURL POST JSON', code: 'curl -X POST "https://api.example.com/items" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "example", "count": 1}\'' },
    { label: 'cURL Bearer Auth', code: 'curl -X GET "https://api.example.com/me" \\\n  -H "Authorization: Bearer ${token}"' },
  ],
  curl: [
    { label: 'cURL GET request', code: 'curl -X GET "https://api.example.com/items" \\\n  -H "Accept: application/json"' },
    { label: 'cURL POST JSON', code: 'curl -X POST "https://api.example.com/items" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "example", "count": 1}\'' },
    { label: 'cURL Bearer Auth', code: 'curl -X GET "https://api.example.com/me" \\\n  -H "Authorization: Bearer ${token}"' },
  ],
}
