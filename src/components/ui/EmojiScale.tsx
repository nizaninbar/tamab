const FACES = ['😫', '😖', '😞', '😕', '😐', '🙂', '😊', '😄', '😍', '🥰']

export const moodEmoji = (mood: number | null) => (mood ? FACES[mood - 1] : '😶')

export function EmojiScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-center text-6xl leading-none">{moodEmoji(value)}</div>
      <div className="mt-1 text-center text-sm text-ink-soft">{value ? `${value}/10` : 'גללי כדי לבחור'}</div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        dir="ltr"
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => value === null && onChange(5)}
        className="mt-3 h-10 w-full accent-blush-500"
        aria-label="איך היה השבוע"
      />
    </div>
  )
}
