/** Lightweight DOM shim (document + XMLSerializer) used by tests/test-recorder.mjs. */
export function installRecorderDomShim() {
  if (typeof globalThis.document === 'undefined') {
    class MockElement {
      constructor(tagName) {
        this.tagName = tagName
        this.attributes = {}
        this.children = []
        this.textContent = ''
      }
      setAttribute(name, val) {
        this.attributes[name] = String(val)
      }
      getAttribute(name) {
        return this.attributes[name]
      }
      appendChild(child) {
        this.children.push(child)
        return child
      }
    }
    class MockDocument {
      createElement(tag) {
        return new MockElement(tag)
      }
    }
    globalThis.document = {
      implementation: {
        createDocument: () => new MockDocument(),
      },
    }
    globalThis.XMLSerializer = class {
      serializeToString(el) {
        const attrs = Object.entries(el.attributes)
          .map(([k, v]) => ` ${k}="${v}"`)
          .join('')
        if (el.children.length === 0 && !el.textContent) {
          return `<${el.tagName}${attrs}/>`
        }
        const inner = el.textContent || el.children.map((c) => this.serializeToString(c)).join('')
        return `<${el.tagName}${attrs}>${inner}</${el.tagName}>`
      }
    }
  }
}
