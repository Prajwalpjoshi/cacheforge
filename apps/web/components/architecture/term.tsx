/** A one-line plain-language definition, shown the first time a technical term appears on the page — not a full glossary, just enough to keep reading without stopping to look the word up. */
export function Term({
  word,
  definition,
}: {
  word: string;
  definition: string;
}) {
  return (
    <span className="block text-sm leading-6">
      <strong className="font-semibold text-foreground">{word}</strong>
      <span className="text-muted"> — {definition}</span>
    </span>
  );
}
