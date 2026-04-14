# Aura Social

## Запуск одной командой

```bash
npm start
```

Это автоматически:
1. Проверит и установит зависимости backend/ и frontend/ если нужно
2. Запустит бэкенд на http://localhost:3000
3. Запустит фронтенд на http://localhost:5173

## Первый запуск

```bash
# Только если хочешь установить зависимости заранее:
npm run install:all

# Затем:
npm start
```

## Требования

- Node.js >= 18
- `backend/.env` — скопируй из `backend/.env.example` и заполни JWT_SECRET

## Скрипты

| Команда | Описание |
|---|---|
| `npm start` | Запуск dev-режима (авто-установка зависимостей) |
| `npm run build` | Сборка фронтенда |
| `npm run preview` | Запуск prod-сборки |
| `npm run install:all` | Установка всех зависимостей вручную |
