export function ToolButton({
  title,
  action,
  disabled,
  active,
  children,
}: {
  title: string
  action: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`tool-button ${active ? 'active-tool' : ''}`}
      title={title}
      aria-label={title}
      onClick={action}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
