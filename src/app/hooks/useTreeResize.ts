import { useEffect, useState } from 'react'

/** Resizable sidebar width with persistence. */
export function useTreeResize() {
  const [treeWidth, setTreeWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jmeter_tree_width')
      if (saved) {
        const val = Number(saved)
        if (Number.isFinite(val) && val >= 220 && val <= 1400) return val
      }
    } catch {
      return 360
    }
    return 360
  })
  const [isResizingTree, setIsResizingTree] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('jmeter_tree_width', String(treeWidth))
    } catch {
      // Ignore storage write error
    }
  }, [treeWidth])

  const handleTreeResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingTree(true)
    const startX = e.clientX
    const startWidth = treeWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const nextWidth = Math.max(220, Math.min(window.innerWidth - 300, startWidth + delta))
      setTreeWidth(nextWidth)
    }

    const onMouseUp = () => {
      setIsResizingTree(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return { treeWidth, setTreeWidth, isResizingTree, handleTreeResizeStart }
}
