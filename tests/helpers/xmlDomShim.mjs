/** Lightweight DOM shim (document + DOMParser + XMLSerializer) for tests/verify-enterprise-phases.mjs. */
export function installXmlDomShim() {
  if (typeof globalThis.document === 'undefined') {
    class MockElement {
      constructor(tagName) {
        this.tagName = tagName
        this.nodeName = tagName
        this.attributes = {}
        this.children = []
        this.childNodes = []
        this.textContent = ''
      }
      setAttribute(name, val) { this.attributes[name] = String(val) }
      getAttribute(name) { return this.attributes[name] || null }
      hasAttribute(name) { return name in this.attributes }
      appendChild(child) {
        this.children.push(child)
        this.childNodes.push(child)
        return child
      }
      querySelector(tag) {
        for (const c of this.children) {
          if (c.tagName === tag) return c
          const found = c.querySelector(tag)
          if (found) return found
        }
        return null
      }
      querySelectorAll(tag) {
        const results = []
        for (const c of this.children) {
          if (tag === '*' || c.tagName === tag) results.push(c)
          results.push(...c.querySelectorAll(tag))
        }
        return results
      }
    }

    function parseXmlToElement(xml) {
      const root = new MockElement('root')
      const stack = [root]
      const tagRegex = /<([a-zA-Z0-9_.:-]+)([^>]*?)(\/?)>|([^<]+)|<\/([a-zA-Z0-9_.:-]+)>/g
      let match

      while ((match = tagRegex.exec(xml)) !== null) {
        const [full, openTag, attrStr, selfClose, text, closeTag] = match
        if (openTag) {
          if (openTag.startsWith('?')) continue
          const el = new MockElement(openTag)
          if (attrStr) {
            const attrRegex = /([a-zA-Z0-9_.:-]+)=["']([^"']*)["']/g
            let aMatch
            while ((aMatch = attrRegex.exec(attrStr)) !== null) {
              el.setAttribute(aMatch[1], aMatch[2])
            }
          }
          stack[stack.length - 1].appendChild(el)
          if (!selfClose) {
            stack.push(el)
          }
        } else if (closeTag) {
          if (stack.length > 1 && stack[stack.length - 1].tagName === closeTag) {
            stack.pop()
          }
        } else if (text && text.trim() && stack.length > 1) {
          stack[stack.length - 1].textContent += text.trim()
        }
      }
      return root.children[0] || root
    }

    class MockDocument {
      createElement(tag) { return new MockElement(tag) }
    }

    globalThis.document = {
      implementation: {
        createDocument: () => new MockDocument(),
      },
    }

    globalThis.DOMParser = class {
      parseFromString(xml) {
        const rootEl = parseXmlToElement(xml)
        return {
          documentElement: rootEl,
          querySelector: (tag) => rootEl.querySelector(tag),
          querySelectorAll: (tag) => rootEl.querySelectorAll(tag),
        }
      }
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
