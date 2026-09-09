// A field real visitors never see or fill in — anything that arrives
// here non-empty came from a bot blindly filling out every input it
// found. Positioned off-screen (not display:none, which some bots
// specifically know to skip) and hidden from assistive tech and tab
// order, so it's invisible to every real visitor — sighted, screen-reader,
// or keyboard — but still present for a bot. The server checks this
// value, not this component; see the API route each form posts to.
export function HoneypotField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="absolute left-[-9999px]" aria-hidden="true">
      <label htmlFor={id}>Company</label>
      <input
        id={id}
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
