import { CATEGORIES } from './constants'

interface PluginCategoryPillsProps {
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
}

export function PluginCategoryPills({ selectedCategory, setSelectedCategory }: PluginCategoryPillsProps) {
  return (
    <div style={{ display: 'flex', gap: '6px', padding: '6px 18px', background: '#fafafa', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          style={{
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: selectedCategory === cat ? 600 : 500,
            background: selectedCategory === cat ? '#0f172a' : '#e2e8f0',
            color: selectedCategory === cat ? '#ffffff' : '#334155',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={() => setSelectedCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
