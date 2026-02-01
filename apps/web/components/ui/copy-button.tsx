'use client';

export function CopyButton({ value }: { value: string }) {
  return (
    <button
      className="text-xs"
      onClick={() => navigator.clipboard.writeText(value)}
      aria-label="Copy"
    >
      📋
    </button>
  );
}
