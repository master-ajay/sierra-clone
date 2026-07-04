# design-system

Shared Tailwind preset + React components for every product's console UI.
Presentation only — no business logic, no data-fetching, no API clients.
See `docs/superpowers/specs/2026-07-04-design-system-design.md` for the
full spec.

## Usage

```ts
// tailwind.config.ts
export default {
  presets: [require('design-system/tailwind-preset')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
}
```

```tsx
import { AppShell, Button, Card } from 'design-system'
```

## Components

Props below are copied directly from each component's exported TypeScript
interface — treat the `.tsx` source as the source of truth if this drifts.

### `Button`

| Prop | Type | Default |
|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive'` | `'primary'` |
| `size` | `'sm' \| 'md'` | `'md'` |
| ...rest | `ButtonHTMLAttributes<HTMLButtonElement>` | |

### `Card`

Plain surface container. Props: `HTMLAttributes<HTMLDivElement>`.

### `Table<T>`

| Prop | Type |
|---|---|
| `columns` | `{ key: string; header: string; render?: (row: T) => ReactNode }[]` |
| `data` | `T[]` |
| `rowKey` | `keyof T` |
| `emptyMessage` | `string` (default `'No data'`) |

### `Badge` / `StatusPill`

| Prop | Type |
|---|---|
| `status` | `'success' \| 'warning' \| 'error' \| 'info'` |

### `Input`

| Prop | Type |
|---|---|
| `label` | `string` |
| `error` | `string?` — renders a `role="alert"` message and error-state border |
| ...rest | `InputHTMLAttributes<HTMLInputElement>` |

### `Select`

| Prop | Type |
|---|---|
| `label` | `string` |
| `options` | `{ value: string; label: string }[]` |
| `error` | `string?` |
| ...rest | `SelectHTMLAttributes<HTMLSelectElement>` |

### `Modal`

| Prop | Type |
|---|---|
| `open` | `boolean` |
| `onClose` | `() => void` |
| `title` | `string` |
| `children` | `ReactNode` |

Built on `@radix-ui/react-dialog` — focus trap, Escape-to-close, and ARIA
roles come from Radix, not reimplemented here.

### `ToastProvider` / `useToast()`

Wrap your app in `<ToastProvider>`, then call `useToast().showToast({ message, variant?, duration? })`
from anywhere inside it. `variant` is `'success' | 'error' | 'info'` (default `'info'`);
`duration` is milliseconds before auto-dismiss (default `4000`). Toasts stack
top-right and render in a `role="status"` live region.

### `EmptyState`

| Prop | Type |
|---|---|
| `icon` | `ReactNode?` |
| `heading` | `string` |
| `body` | `string` |
| `action` | `{ label: string; onClick: () => void }?` |

### `MetricCard`

| Prop | Type |
|---|---|
| `label` | `string` |
| `value` | `string \| number` |
| `trend` | `{ direction: 'up' \| 'down'; value: string }?` — `up` uses `status.success`, `down` uses `status.error` |

### `AppShell`

| Prop | Type |
|---|---|
| `nav` | `{ label: string; href: string; active: boolean }[]` |
| `productName` | `string` — shown at the top of the sidebar |
| `title` | `string` — page title in the topbar |
| `actions` | `ReactNode?` — right-aligned topbar slot |
| `children` | `ReactNode` — main content area |

Nav items render as plain `<a>` tags (no hard dependency on `next/link`) —
`aria-current="page"` marks the active one. Cross-product navigation (a
switcher between separately-deployed product apps) is explicitly out of
scope for v1 per the spec's OQ-3.

## Tokens

`tokens.js` (plain CommonJS, so it can be `require()`d by `tailwind-preset.js`
without a build step) is the single source of truth for color/spacing/type
values. Never hardcode a hex value in a consuming product — if the token set
is missing something you need, add it here instead.
