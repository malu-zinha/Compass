# Componentes

```
components/
├── ui/       # Primitivas de interface — base de todas as telas
├── brand/    # Logo (mark, full, lockup)
├── layout/   # AppHeader, Sidebar, AccountMenu, PageHeader
├── icons/    # Ícones SVG
└── index.js
```

## Regras

- **Nenhuma cor, fonte ou sombra literal.** Tudo vem de `src/styles/tokens.css`.
  `npm run lint:tokens` falha se aparecer hex, `rgb()`/`hsl()` ou `font-family` literal.
- **Estilo em CSS Module colocalizado** (`Button.jsx` + `Button.module.css`).
- **Toda primitiva aceita `className`** e repassa props extras ao elemento raiz.
- **Ícones herdam `currentColor`**: a cor vem do CSS de quem usa, nunca de prop.
  São decorativos (`aria-hidden`) por padrão.

## ui/

```javascript
import { Button, Card, Field, Input, useToast, useConfirm } from '../components/ui';
```

| Primitiva | Uso |
|---|---|
| `Button` | `variant` primary · secondary · ghost · danger; `size` sm · md · lg; `loading`, `icon`, `iconOnly` (exige `aria-label`), `as` |
| `Card` | `variant` flat · raised · interactive; `padding` none · sm · md · lg; `as` |
| `Chip` | `tone` neutral · info · success · warning · danger; `onRemove` |
| `StatusBadge` | `status` da entrevista → rótulo pt-BR e tom (`lib/status.js`) |
| `Field` | rótulo, `hint`, `error` e `required`, ligados ao controle filho |
| `Input`, `Textarea`, `Select` | controles; leem id e `aria-*` do `Field` |
| `Checkbox`, `Switch` | `Switch` é `role="switch"`; `onChange(boolean)` |
| `Modal` | `open`, `onClose`, `title`, `footer`; foco preso, Esc, retorno de foco |
| `useConfirm()` | `await confirm({ title, message, confirmLabel, tone })` → boolean |
| `useToast()` | `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)` |
| `Tabs` | `items=[{ id, label, content }]`, `label`; setas, Home, End |
| `Accordion` | `title`, `defaultOpen` |
| `Skeleton`, `Spinner` | carregamento |
| `EmptyState`, `ErrorPanel`, `ErrorBoundary` | vazio e erro |
| `ScoreMeter` | `score` 0–1000, `variant` ring · bar; cor pela faixa (`lib/score.js`) |
| `Avatar` | `src`, `name`; cai nas iniciais |

`ToastProvider` e `ConfirmProvider` já envolvem o app em `main.jsx` e os testes em
`src/test/render.jsx` (`TestProviders`).

Verde e vermelho são **só semânticos** (sucesso/erro, score alto/baixo). Azul é a marca;
âmbar é "em andamento / atenção".
