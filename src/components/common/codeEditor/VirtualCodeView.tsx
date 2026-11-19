import type { RefObject } from 'react'

interface VirtualCodeViewProps {
  scrollerRef: RefObject<HTMLDivElement>
  normLang: string
  totalHeight: number
  offsetTop: number
  rows: { lineNumber: number; html: string }[]
  onScroll: () => void
}

/** Virtualised, read-only rendering used for very large payloads. */
export function VirtualCodeView({ scrollerRef, normLang, totalHeight, offsetTop, rows, onScroll }: VirtualCodeViewProps) {
  return (
    <div
      ref={scrollerRef}
      className={`code-editor-virtual-scroller language-${normLang}`}
      onScroll={onScroll}
    >
      <div className="code-editor-virtual-spacer" style={{ height: `${totalHeight}px` }}>
        <div className="code-editor-virtual-rows" style={{ transform: `translateY(${offsetTop}px)` }}>
          {rows.map((row) => (
            <div key={row.lineNumber} className="code-editor-virtual-row">
              <span className="code-editor-virtual-gutter">{row.lineNumber}</span>
              <code
                className={`code-editor-virtual-line language-${normLang}`}
                dangerouslySetInnerHTML={{ __html: row.html }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
