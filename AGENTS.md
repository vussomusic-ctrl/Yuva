# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Типографика

> Источник правды — родительский `../CLAUDE.md` (раздел Typography). Дубль здесь — для версионирования.

- Гарнитура приложения — **Inter** (`@expo-google-fonts/inter`), грузится в `app/_layout.tsx`.
- Веса ТОЛЬКО через `lib/theme/typography.ts` (`fontFamily`, НЕ `fontWeight`): кастомный
  шрифт игнорирует числовой `fontWeight` и ломается на Android.
- Новые экраны — сразу на `typography`; старые мигрируем волнами.

# Анимации

> Источник правды — родительский `../CLAUDE.md` (секция «Анимации»). Дубль здесь — для версионирования.

- Принцип: живой 3D / clay стиль — мягкие пружинные микроанимации, а не резкие
  линейные переходы. Интерфейс должен ощущаться «тактильным».
- Все микроанимации идут через переиспользуемые пресеты из `lib/animations.ts`
  (напр. `usePressScale` — пружинный scale на нажатии, damping ~15). НЕ плодить
  inline-конфиги reanimated по экранам — добавляй новый пресет в `lib/animations.ts`
  и переиспользуй.
- Движок — `react-native-reanimated` (уже в проекте).
