---
name: overflow-x-auto closing div
description: Pattern for wrapping Table in overflow-x-auto — must explicitly close the div before the outer card container closes.
---

When wrapping a `<Table>` in `<div className="overflow-x-auto">` inside a card container, the structure must be:

```jsx
<div className="bg-card rounded-xl ...overflow-hidden">  {/* outer card */}
  <div className="overflow-x-auto">                       {/* scroll wrapper */}
    <Table>...</Table>
  </div>                                                   {/* MUST close scroll wrapper */}
</div>                                                     {/* closes card */}
```

**Why:** If you add `<div className="overflow-x-auto">` after the card opening but forget `</div>` before `</Table>`, the parser structure shifts — the scroll div's close gets consumed by something inside, leaving the card's `</div>` and outer containers without matching opens, causing a cascade of JSX errors at the outermost closing tag (usually `</main>` or `</AdminLayout>`).
