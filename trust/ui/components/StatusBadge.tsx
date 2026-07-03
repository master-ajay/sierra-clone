export function StatusBadge({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={
        allowed
          ? 'rounded-full bg-pass/15 px-2.5 py-1 text-xs font-medium text-pass'
          : 'rounded-full bg-block/15 px-2.5 py-1 text-xs font-medium text-block'
      }
    >
      {allowed ? 'Passed' : 'Blocked'}
    </span>
  );
}

export function FlagBadge({ severity }: { severity: 'warn' | 'block' }) {
  return (
    <span
      className={
        severity === 'block'
          ? 'rounded-full bg-block/15 px-2 py-0.5 text-xs font-medium text-block'
          : 'rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn'
      }
    >
      {severity === 'block' ? 'Blocked' : 'Flagged'}
    </span>
  );
}
