import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-groovy'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
// Custom JMeter built-in identifiers highlighting in Prism
if (Prism.languages.groovy) {
  Prism.languages.insertBefore('groovy', 'keyword', {
    'jmeter-variable': /\b(vars|props|prev|sampler|ctx|log|OUT|SampleResult|ResponseCode|ResponseMessage)\b/,
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.javascript) {
  Prism.languages.insertBefore('javascript', 'keyword', {
    'jmeter-variable': /\b(vars|props|prev|sampler|ctx|log|OUT|SampleResult|ResponseCode|ResponseMessage)\b/,
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.json) {
  Prism.languages.insertBefore('json', 'string', {
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}

if (Prism.languages.bash) {
  Prism.languages.insertBefore('bash', 'string', {
    'jmeter-placeholder': /\$\{[a-zA-Z0-9_.-]+\}/,
  })
}
