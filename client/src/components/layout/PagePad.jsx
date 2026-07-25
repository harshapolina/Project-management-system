/** Wrap non-workspace pages with ClickUp-density padding */
export function PagePad({ children, className = '' }) {
  return (
    <div
      className={`h-full min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 ${className}`}
    >
      {children}
    </div>
  )
}
