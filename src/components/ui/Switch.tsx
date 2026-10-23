export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3"
    >
      <span className="font-medium">{label}</span>
      <span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${checked ? 'bg-blush-500' : 'bg-lilac-200'}`}>
        <span className={`size-6 rounded-full bg-white shadow transition-transform ${checked ? '-translate-x-6' : ''}`} />
      </span>
    </button>
  )
}
