# Мини-приложение для секции настольного тенниса

Полное руководство по установке и настройке приложения.

## Структура проекта

```
/workspace
├── client/          # Фронтенд (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── ...
│   └── ...
├── server/          # Бэкенд (PocketBase - уже готов)
└── schema.json      # Схема базы данных
```

## Шаг 1: Настройка PocketBase (сервер с БД)

### 1.1 Установка PocketBase

На первой виртуальной машине (с белым IP):

```bash
cd /opt
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
mkdir -p /opt/pocketbase/pb_data
```

### 1.2 Импорт схемы базы данных

1. Запустите PocketBase первый раз:
```bash
cd /opt/pocketbase
./pocketbase serve --http=0.0.0.0:8090
```

2. Откройте админ-панель в браузере: `http://your-server-ip:8090/_/`
3. Создайте первого пользователя (администратора)
4. В разделе Settings → Collections импортируйте файл `schema.json`

ИЛИ создайте коллекции вручную через API:

```bash
curl -X POST http://localhost:8090/api/collections \
  -H "Content-Type: application/json" \
  -d @/workspace/schema.json
```

### 1.3 Настройка прав доступа

Для каждой коллекции настройте правила доступа:

**users:**
- List: true
- View: @request.auth.id != ""
- Create: true
- Update: @request.auth.id = id
- Delete: @request.auth.id != "" && role = "moderator"

**posts, comments, trainings, products, championships, matches, gallery:**
- List: true
- View: true
- Create: @request.auth.id != ""
- Update: @request.auth.id != "" && users.role = "moderator"
- Delete: @request.auth.id != "" && users.role = "moderator"

### 1.4 Создание модератора

1. Зарегистрируйте пользователя через админ-панель
2. В таблице `users` добавьте поле `role` со значением `moderator`

## Шаг 2: Настройка фронтенда (второй сервер)

### 2.1 Установка зависимостей

```bash
cd /workspace/client
npm install
```

### 2.2 Конфигурация

Создайте файл `.env`:

```bash
cp .env.example .env
```

Отредактируйте `.env`, указав адрес вашего PocketBase:

```
VITE_POCKETBASE_URL=http://your-pocketbase-server-ip:8090
```

### 2.3 Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

### 2.4 Сборка для продакшена

```bash
npm run build
```

Файлы будут в папке `dist/`. Разместите их на веб-сервере (nginx, apache).

## Шаг 3: Настройка nginx (опционально)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /workspace/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://your-pocketbase-server-ip:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Использование приложения

### Для обычных пользователей:

1. **Лента** - просмотр новостей, лайки, комментарии
2. **Запись на тренировку** - просмотр расписания, запись на свободные места
3. **Магазин** - просмотр товаров, кнопка "Купить" перенаправляет к модератору
4. **Рейтинг** - таблица игроков со статистикой
5. **Соревнования** - выбор чемпионата, просмотр матчей
6. **Галерея** - просмотр фотографий

### Для модераторов:

Во всех разделах доступна кнопка "+" для добавления контента:
- Лента: создание постов
- Тренировки: создание тренировок
- Магазин: добавление/редактирование/удаление товаров
- Рейтинг: добавление игроков
- Соревнования: создание чемпионатов и матчей, редактирование результатов
- Галерея: загрузка фотографий

## Рекомендации по данным рейтинга

Для теннисистов рекомендуется указывать:
- **Аватарка** - фото игрока
- **Фамилия Имя** - полное имя
- **Год рождения** - для возрастных категорий
- **Ведущая рука** - правая/левая
- **Рейтинговые очки** - основной показатель мастерства
- **Игр сыграно** - общий опыт
- **Побед** - количество выигранных матчей
- **Поражений** - количество проигранных матчей
- **Процент побед** - рассчитывается автоматически (победы / игры * 100)
- **Текущая форма** - последние 5 игр (например: В-В-П-В-В)

## Технические требования

- Node.js 18+
- PocketBase 0.22+
- Современный браузер с поддержкой ES6

## Поддержка

При возникновении проблем проверьте:
1. Корректность URL PocketBase в .env
2. Права доступа в коллекциях
3. Наличие подключения к интернету
4. Логи в консоли браузера (F12)
