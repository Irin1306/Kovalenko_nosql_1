
# Spotify Tracks — MongoDB Atlas

## Опис проєкту 

Мета проєкту — навчитися працювати з MongoDB Atlas,
завантажувати дані з CSV, трансформувати їх за допомогою
Aggregation Pipeline, виконувати складні запити та
оптимізувати пошук за допомогою індексів.

**Технології:** MongoDB Atlas, Python 3, PyMongo, Pandas, JavaScript (mongosh), MongoDB Aggregation Pipeline, Kaggle Dataset. 


## Налаштування та запуск

1. Встановлення залежностей  
```bash
python -m venv venv
```  
Активація середовища (Windows):  
```bash
venv\Scripts\activate
``` 
Linux / macOS: 
```bash
source venv/bin/activate
``` 
Встановлення бібліотек:   
```bash
pip install -r requirements.txt
```

2. Завантаження датасету

Завантажити Spotify Tracks Dataset з Kaggle - https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset  

Розпакувати архів та помістити CSV-файл у корінь проєкту під назвою dataset.csv.

3. Налаштування MongoDB Atlas

Створити файл .env у корені проєкту:  
```env
MONGO_URI=your_mongodb_connection_string
```

4. Запуск проєкту

Виконувати скрипти в такому порядку:

1. Завантаження CSV:   
```bash
python scripts/01_load_data.py
```
2. Трансформація даних:  
```bash
mongosh "YOUR_MONGODB_URI" scripts/02_transform.js
```
3. Виконання запитів:  
```bash
mongosh "YOUR_MONGODB_URI" queries/part2_queries.js
```
4. Створення та аналіз індексів:  
```bash
mongosh "YOUR_MONGODB_URI" queries/part3_indexes.js
```
Результати зберігаються в базі даних spotify, у колекціях tracks_raw та tracks. 


## Структура бази даних

Назва бази даних: `spotify`

Колекції:

- `tracks_raw` — початкові дані з CSV.
- `tracks` — трансформовані документи.

### Структура документа tracks
```json
{
  "track_id": "example_track_id",
  "track_name": "Example Song",
  "album_name": "Example Album",
  "artists": ["Artist One", "Artist Two"],
  "explicit": false,
  "popularity": 85,
  "duration_ms": 210000,
  "duration_sec": 210,
  "track_genre": "pop",
  "popularity_tier": "high",
  "audio_features": {
    "danceability": 0.82,
    "energy": 0.76,
    "loudness": -8.5,
    "speechiness": 0.04,
    "acousticness": 0.12,
    "instrumentalness": 0.01,
    "liveness": 0.15,
    "valence": 0.75,
    "tempo": 120.5,
    "key": 5,
    "mode": 1,
    "time_signature": 4
  }
}
```

## Частина 1. Завантаження та трансформація   

1. **Чому аудіохарактеристики винесені в окремий об'єкт
audio_features, а не зберігаються плоско?**

Аудіохарактеристики винесені в окремий вкладений об'єкт
для логічного групування пов'язаних даних.

Наприклад:

```json
{
  "track_name": "Example Song",
  "audio_features": {
    "danceability": 0.82,
    "energy": 0.76,
    "tempo": 120.5
  }
}
```

Переваги такого підходу:

- Логічна організація структури документа.
- Зручніше працювати з пов'язаними характеристиками.
- Зрозуміліша структура даних.
- Можливість створювати індекси для вкладених полів.
- Легше розширювати структуру новими аудіохарактеристиками.

Наприклад, пошук за danceability виконується так:

```javascript
db.tracks.find({
  "audio_features.danceability": {
    $gt: 0.7
  }
});
```

Недоліки вкладеної структури:

- Необхідно використовувати повний шлях до поля.
- Складніші деякі проєкції та запити.
- Вкладені структури можуть ускладнювати індексацію.
- Зміна структури об'єкта може вимагати оновлення запитів.

Вкладення особливо вигідне, коли поля логічно пов'язані,
часто використовуються разом та належать одному документу.

Плоска структура може бути зручнішою, коли поля незалежні
або часто використовуються окремо. 
 

2. **Чому виконавці зберігаються як масив, а не як рядок?
Які запити стають простішими?**

Виконавці зберігаються як масив, оскільки один музичний трек
може мати декількох виконавців.

Наприклад:

```json
{
  "artists": [
    "Drake",
    "Future"
  ]
}
```

Якщо зберігати виконавців одним рядком,
для пошуку конкретного артиста довелося б використовувати
операції над рядками.

Масив дозволяє використовувати оператори MongoDB:

**Пошук за конкретним виконавцем:**

```javascript
db.tracks.find({
  artists: "Drake"
});
```

**Пошук за декількома виконавцями:**

```javascript
db.tracks.find({
  artists: {
    $in: ["Drake", "Future"]
  }
});
```

**Пошук треків, де присутні обидва виконавці:**

```javascript
db.tracks.find({
  artists: {
    $all: ["Drake", "Future"]
  }
});
```

**Розгортання масиву:**

```javascript
db.tracks.aggregate([
  {
    $unwind: "$artists"
  }
]);
```

Отже, масив спрощує пошук, фільтрацію, групування
та аналітику за виконавцями.


## Частина 2. Запити до даних

У файлі `part2_queries.js` реалізовано чотири завдання.

### Завдання 1. Треки для вечірки  

Знайдено треки з високою танцювальністю, високою енергією та тривалістю від 3 до 5 хвилин.
Результат містить 10 найпопулярніших треків, які відповідають заданим умовам. 

### Завдання 2. Популярні виконавці  
У результаті отримуємо виконавців, які мають щонайменше три треки, а мінімальна популярність їхніх треків становить не менше 60. 
Результат сортується за середньою популярністю та кількістю треків у спадному порядку. 

### Завдання 3. Нетипові треки  

Для кожного жанру обчислюється середній темп
і стандартне відхилення. 

Поріг нетипового темпу:  
tempo > avg_tempo + 2 * stdDevPop

За допомогою `$lookup` знаходяться треки,
темп яких перевищує відповідний поріг.

Результат містить назву жанру, середній темп,
поріг та масив нетипових треків.

### Завдання 4. Музика для роботи 

Знайдено інструментальні треки з низькою гучністю,
низькою мовленнєвою складовою та без explicit-контенту.


## Частина 3. Індекси та оптимізація

### Завдання 1. Аналіз та створення індексу

Початковий запит:

```javascript
db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": {
    $gte: 0.7
  }
}).sort({
  popularity: -1
});
```

Створено складений індекс:

```javascript
db.tracks.createIndex({
  track_genre: 1,
  popularity: -1,
  "audio_features.danceability": 1
});
``` 

Індекс містить:

track_genre — для фільтрації за жанром;
popularity — для сортування за популярністю;
audio_features.danceability — для фільтрації за танцювальністю. 
 
1. **Що змінилося в плані виконання?**
 
--- EXPLAIN ДО СТВОРЕННЯ ІНДЕКСУ ---
{
  executionTimeMillis: 69,
  totalDocsExamined: 113999,
  totalKeysExamined: 0,
  nReturned: 354,
  winningPlan: {
    isCached: false,
    stage: 'SORT',
    sortPattern: {
      popularity: -1
    },
    memLimit: 33554432,
    type: 'simple',
    inputStage: {
      stage: 'COLLSCAN',
      filter: {
        '$and': [
          {
            track_genre: {
              '$eq': 'pop'
            }
          },
          {
            'audio_features.danceability': {
              '$gte': 0.7
            }
          }
        ]
      },
      direction: 'forward'
    }
  }
}  

Отримані результати:

executionTimeMillis: 69 ms;
totalDocsExamined: 113 999;
totalKeysExamined: 0;
nReturned: 354;

Основна стадія	COLLSCAN
Сортування	SORT
Початковий план виконання містив стадію COLLSCAN, тобто MongoDB виконувала повне сканування колекції. 
Також використовувалася стадія SORT для сортування результатів за популярністю.

--- EXPLAIN ПІСЛЯ СТВОРЕННЯ ІНДЕКСУ ---
{
  executionTimeMillis: 2,
  totalDocsExamined: 354,
  totalKeysExamined: 412,
  nReturned: 354,
  winningPlan: {
    isCached: false,
    stage: 'FETCH',
    inputStage: {
      stage: 'IXSCAN',
      keyPattern: {
        track_genre: 1,
        popularity: -1,
        'audio_features.danceability': 1
      },
      indexName: 'genre_popularity_danceability_idx',
      isMultiKey: false,
      multiKeyPaths: {
        track_genre: [],
        popularity: [],
        'audio_features.danceability': []
      },
      isUnique: false,
      isSparse: false,
      isPartial: false,
      indexVersion: 2,
      direction: 'forward',
      indexBounds: {
        track_genre: [
          '["pop", "pop"]'
        ],
        popularity: [
          '[MaxKey, MinKey]'
        ],
        'audio_features.danceability': [
          '[0.7, inf.0]'
        ]
      }
    }
  }
}

Отримані результати після створення індексу:  
 	            
executionTimeMillis: 2 ms;
totalDocsExamined: 354:
totalKeysExamined: 412:
nReturned: 354;

Основні стадії	IXSCAN → FETCH
Після створення індексу MongoDB почала використовувати IXSCAN замість COLLSCAN. 
Стадія FETCH використовується для отримання повних документів із колекції, оскільки запит повертає поля, які не всі містяться в індексі. 
Окремої стадії SORT у новому плані виконання немає, оскільки індекс дозволяє забезпечити необхідний порядок сортування. 


2. **Як зрозуміти, що індекс використовується?**

Для перевірки використовується:

```javascript
.explain("executionStats")
```

Основні показники:

- `IXSCAN` — індекс використовується.
- `indexName` — назва використаного індексу.
- `totalKeysExamined` — кількість перевірених ключів.
- `totalDocsExamined` — кількість перевірених документів.
- `executionTimeMillis` — час виконання запиту.
- `nReturned` — кількість повернених документів.  

 
### Завдання 2. Індекс для пошуку музики для роботи

Створено складений індекс:

```javascript
db.tracks.createIndex({
  explicit: 1,
  "audio_features.instrumentalness": -1,
  "audio_features.speechiness": 1
});
```  

За допомогою `explain("executionStats")`
перевірено використання індексу.

--- ЗАВДАННЯ 2: ІНДЕКС ДЛЯ ФОНОВОЇ МУЗИКИ ---

--- EXPLAIN ЗАПИТУ ДЛЯ ФОНОВОЇ МУЗИКИ ---
{
  executionTimeMillis: 38,
  totalDocsExamined: 16141,
  totalKeysExamined: 16602,
  nReturned: 16141,
  winningPlan: {
    isCached: false,
    stage: 'FETCH',
    inputStage: {
      stage: 'IXSCAN',
      keyPattern: {
        explicit: 1,
        'audio_features.instrumentalness': -1,
        'audio_features.speechiness': 1
      },
      indexName: 'background_music_idx',
      isMultiKey: false,
      multiKeyPaths: {
        explicit: [],
        'audio_features.instrumentalness': [],
        'audio_features.speechiness': []
      },
      isUnique: false,
      isSparse: false,
      isPartial: false,
      indexVersion: 2,
      direction: 'forward',
      indexBounds: {
        explicit: [
          '[false, false]'
        ],
        'audio_features.instrumentalness': [
          '[inf.0, 0.5)'
        ],
        'audio_features.speechiness': [
          '[-inf.0, 0.1)'
        ]
      }
    }
  }
}

Отримані результати:

executionTimeMillis: 38 ms;
totalDocsExamined: 16141;
totalKeysExamined: 16602;
nReturned: 16141;
indexName: background_music_idx;
основні стадії: IXSCAN та FETCH.
У плані виконання присутня стадія IXSCAN з назвою індексу background_music_idx.  
Стадія FETCH залишається, оскільки запит повертає повні документи, а не тільки поля індексу. 
 