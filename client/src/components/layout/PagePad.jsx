/** Wrap non-workspace pages with ClickUp-density padding */
export function PagePad({ children, className = '' }) {
  return (
    <div className={`h-full overflow-y-auto px-5 py-4 ${className}`}>
      {children}
    </div>
  )
}
