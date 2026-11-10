# Project Rules: Цифровой деканат МГИМО (Mobile-First Student Portal)

## 1. Tech Stack & Strict Build Rules (CRITICAL)
- Framework: React 18 + Vite + TypeScript.
- Styling: Pure Tailwind CSS v4 (NO external component libraries like Material UI, Chakra, or AntD; build all modals, badges, and buttons using pure Tailwind).
- Routing/Imports: DO NOT use Next.js modules (`next/link`, `next/image`, `next/navigation`).
- Icons: `lucide-react` ONLY.
- TypeScript Vite Rule (`verbatimModuleSyntax`): ALWAYS use `import type { ... } from '../types'` (or `'./types'`) when importing interfaces or types. Never import types without the `type` keyword.
- Shared Contract: Never modify `src/types.ts`. All components must strictly match the prop signatures defined for the team.

## 2. Mobile-First Layout & Spacing
- Target Viewport: Mobile screen (`375px` to `430px` width) inside a centered container (`max-w-md mx-auto min-h-screen bg-slate-50`).
- Bottom Navigation Clearance: Every main screen view (`DashboardView`, `ScheduleView`, `GradesView`, `RequestsView`, `AiAssistantView`, `ProfileView`) MUST have bottom padding `pb-24` so content and chat inputs are never hidden behind the fixed bottom navigation bar.
- Screen Padding: Standard horizontal padding is `px-4`, vertical spacing between sections is `space-y-4`.

## 3. Unified MGIMO Design System (Visual Sync)
- **Top Headers / Hero Cards:** Deep MGIMO Navy gradient (`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl` or `rounded-2xl p-5 shadow-md`).
- **Primary Action Buttons:** `bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm`.
- **Secondary / Ghost Buttons:** `bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors`.
- **Academic Gold Accents (for AI features, ratings, VIP badges):** `text-amber-500`, `bg-amber-500/10 border border-amber-500/20`.
- **Standard Content Cards:** `bg-white rounded-2xl p-4 shadow-sm border border-slate-100`.
- **Status Badges (`rounded-full px-2.5 py-0.5 text-xs font-medium border`):**
  - Success / Готово / Автомат близко: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Info / Подписано ЭЦП / Штатно: `bg-blue-50 text-blue-700 border-blue-200`
  - Warning / Проверка деканатом / Требует внимания: `bg-amber-50 text-amber-700 border-amber-200`
  - Neutral / Создано: `bg-slate-100 text-slate-600 border-slate-200`
- **Typography:** Clean Russian UI text, headings `font-semibold tracking-tight text-slate-900`, secondary labels `text-xs text-slate-500`.
