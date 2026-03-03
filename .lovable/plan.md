
## Full App Retheme: Neo-Brutalist → Modern SaaS

### Overview
Replace the aggressive neo-brutalist visual language (thick black borders, hard-offset shadows, uppercase typography everywhere, warm paper background) with a clean, professional Modern SaaS aesthetic. All interactive behaviors are preserved.

### Files to change

1. `src/index.css` - CSS variables + all component utility classes
2. `src/components/ui/card.tsx` - Remove hard shadow/border, add soft shadow
3. `src/components/ui/button.tsx` - Soften variants, remove uppercase
4. `src/components/layout/AppLayout.tsx` - Sidebar styling
5. `src/components/layout/MobileBottomNav.tsx` - Bottom nav styling
6. `src/components/common/PageHeader.tsx` - Page title typography

### Color/Variable Changes
- Background: warm paper → clean near-white (`0 0% 98%`)
- Border: jet black → slate-200 (`220 13% 87%`)
- Radius: 6px → 8px
- Sidebar: white with light border (not black shadow)
- Table headers: light gray (not inverted black/white)
- Active nav: blue left accent bar + `bg-blue-50`

### Interactions Preserved
- Row hover: `bg-slate-50` highlight
- Row selection: `bg-blue-50` with blue border
- Button hover: subtle translate + `shadow-md`
- Nav hover: `hover:bg-slate-100` with border
- Active nav: clear visual indicator

### What is NOT changed
- All React logic, routes, auth, data hooks, PDF components, Supabase logic
