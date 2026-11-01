db = db.getSiblingDB("spotify");

// ======================================================
// Завдання 1. Аналіз запиту та індексація
// ====================================================== 
 
db.tracks.dropIndexes(); 

// Запит для пошуку треків жанру pop з danceability >= 0.7
const query1 = {
    track_genre: "pop",
    "audio_features.danceability": {
        $gte: 0.7
    }
};

print("\n--- ЗАВДАННЯ 1: АНАЛІЗ ЗАПИТУ ТА ІНДЕКСАЦІЯ ---"); 
print("\n--- EXPLAIN ДО СТВОРЕННЯ ІНДЕКСУ ---"); 

const before = db.tracks.find(query1)
    .sort({
        popularity: -1
    })
    .explain("executionStats"); 
 
printjson({
    executionTimeMillis:
        before.executionStats.executionTimeMillis, 
    totalDocsExamined:
        before.executionStats.totalDocsExamined, 
    totalKeysExamined:
        before.executionStats.totalKeysExamined, 
    nReturned:
        before.executionStats.nReturned, 
    winningPlan:
        before.queryPlanner.winningPlan
});

print("\n--- СТВОРЕННЯ ІНДЕКСУ ---"); 
// Індекс за жанром, популярністю та danceability
db.tracks.createIndex(
    {
        track_genre: 1,
        popularity: -1,
        "audio_features.danceability": 1
    },
    {
        name: "genre_popularity_danceability_idx"
    }
);

print("\n--- EXPLAIN ПІСЛЯ СТВОРЕННЯ ІНДЕКСУ ---");

const after = db.tracks.find(query1)
    .sort({
        popularity: -1
    })
    .explain("executionStats");
 
printjson({
    executionTimeMillis:
        after.executionStats.executionTimeMillis, 
    totalDocsExamined:
        after.executionStats.totalDocsExamined, 
    totalKeysExamined:
        after.executionStats.totalKeysExamined, 
    nReturned:
        after.executionStats.nReturned, 
    winningPlan:
        after.queryPlanner.winningPlan
}); 
 

// ======================================================
// Завдання 2. Індекс для інших полів
// ======================================================

print("\n--- ЗАВДАННЯ 2: ІНДЕКС ДЛЯ ФОНОВОЇ МУЗИКИ ---");

// Створюємо складений індекс за трьома полями:
// explicit — наявність ненормативного контенту;
// instrumentalness — рівень інструментальності;
// speechiness — рівень мовленнєвої складової.

db.tracks.createIndex(
    {
        explicit: 1,
        "audio_features.instrumentalness": -1,
        "audio_features.speechiness": 1
    },
    {
        name: "background_music_idx"
    }
);

// Формуємо запит для пошуку фонової музики
const backgroundQuery = {
    explicit: false, 
    "audio_features.instrumentalness": {
        $gt: 0.5
    }, 
    "audio_features.speechiness": {
        $lt: 0.1
    }
};  
 
print("\n--- EXPLAIN ЗАПИТУ ДЛЯ ФОНОВОЇ МУЗИКИ ---");

const backgroundResult = db.tracks.find(
    backgroundQuery
).explain("executionStats");
 
printjson({
    executionTimeMillis:
        backgroundResult.executionStats.executionTimeMillis, 
    totalDocsExamined:
        backgroundResult.executionStats.totalDocsExamined, 
    totalKeysExamined:
        backgroundResult.executionStats.totalKeysExamined, 
    nReturned:
        backgroundResult.executionStats.nReturned, 
    winningPlan:
        backgroundResult.queryPlanner.winningPlan
});
 