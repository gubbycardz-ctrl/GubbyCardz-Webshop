/**
 * Card-shaped placeholder shown where a card scan or product photo will go.
 * Purely decorative: the texts repeat what the surrounding tile already says.
 */
export function CardArt({ topLabel, bottomLabel, className = "" }: { topLabel?: string; bottomLabel?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`card-art flex flex-col justify-between p-3 text-[0.65rem] font-semibold uppercase tracking-widest text-foreground/50 ${className}`}>
      <span>{topLabel}</span>
      <span className="self-end font-mono normal-case tracking-normal">{bottomLabel}</span>
    </div>
  );
}
