# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Анимации

> Источник правды — родительский `../CLAUDE.md` (секция «Анимации»). Дубль здесь — для версионирования.

- Принцип: живой 3D / clay стиль — мягкие пружинные микроанимации, а не резкие
  линейные переходы. Интерфейс должен ощущаться «тактильным».
- Все микроанимации идут через переиспользуемые пресеты из `lib/animations.ts`
  (напр. `usePressScale` — пружинный scale на нажатии, damping ~15). НЕ плодить
  inline-конфиги reanimated по экранам — добавляй новый пресет в `lib/animations.ts`
  и переиспользуй.
- Движок — `react-native-reanimated` (уже в проекте).
