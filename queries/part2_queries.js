
db = db.getSiblingDB("spotify");

// ======================================================
// Завдання 1. Треки для вечірки
// ======================================================

// Шукаємо треки з високою танцювальністю та енергією,
// тривалість яких становить від 3 до 5 хвилин.

db.tracks.find({
    "audio_features.danceability": {
        $gt: 0.7
    },
    "audio_features.energy": {
        $gt: 0.7
    },
    duration_ms: {
        $gte: 180000,
        $lte: 300000
    }
}, {
    _id: 0,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    duration_sec: 1,
    popularity: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
}).sort({
    popularity: -1
}).limit(10).forEach(printjson);


// ======================================================
// Завдання 2. Виконавці, у яких усі треки популярні
// ======================================================

// Розгортаємо масив виконавців,
// групуємо їхні треки та обчислюємо популярність.

db.tracks.aggregate([ 
    {
        $unwind: "$artists"
    }, 
    {
        $group: {
            _id: "$artists",
            tracks_count: {
                $sum: 1
            },
            min_popularity: {
                $min: "$popularity"
            },
            avg_popularity: {
                $avg: "$popularity"
            }
        }
    },  
    {
        $match: {
            tracks_count: {
                $gte: 3
            },
            min_popularity: {
                $gte: 60
            }
        }
    },  
    {
        $project: {
            _id: 0,
            artist: "$_id",
            tracks_count: 1,
            min_popularity: 1,
            avg_popularity: {
                $round: ["$avg_popularity", 1]
            }
        }
    }, 
    {
        $sort: {
            avg_popularity: -1,
            tracks_count: -1
        }
    }, 
    {
        $limit: 20
    }
]).forEach(printjson);


// ======================================================
// Завдання 3. Нетипові треки
// ======================================================

// Визначаємо треки з темпом, який перевищує
// середнє значення жанру більше ніж на 2 стандартні
// відхилення.

db.tracks.aggregate([ 
    {
        $group: {
            _id: "$track_genre",
            avg_tempo: {
                $avg: "$audio_features.tempo"
            },
            std_tempo: {
                $stdDevPop: "$audio_features.tempo"
            }
        }
    },  
    {
        $addFields: {
            outlier_threshold: {
                $add: [
                    "$avg_tempo",
                    {
                        $multiply: [
                            2,
                            "$std_tempo"
                        ]
                    }
                ]
            }
        }
    }, 
    {
        $lookup: {
            from: "tracks",
            let: {
                current_genre: "$_id",
                threshold: "$outlier_threshold"
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: [
                                        "$track_genre",
                                        "$$current_genre"
                                    ]
                                },
                                {
                                    $gt: [
                                        "$audio_features.tempo",
                                        "$$threshold"
                                    ]
                                }
                            ]
                        }
                    }
                }, 
                // Залишаємо необхідну інформацію про треки
                {
                    $project: {
                        track_name: 1,
                        popularity: 1,
                        artists: 1,
                        audio_features: {
                            tempo: "$audio_features.tempo"
                        }
                    }
                }
            ],
            as: "outlier_tracks"
        }
    }, 
    // Залишаємо тільки жанри з нетиповими треками
    {
        $match: {
            "outlier_tracks.0": {
                $exists: true
            }
        }
    }, 
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_tempo: {
                $round: ["$avg_tempo", 1]
            },
            outlier_threshold: {
                $round: ["$outlier_threshold", 1]
            },
            outlier_tracks: 1
        }
    }, 
    {
        $sort: {
            genre: 1
        }
    }, 
    {
        $limit: 10
    }
]).forEach(printjson);


// ======================================================
// Завдання 4. Треки для фонової роботи
// ======================================================

// Шукаємо тихі, переважно інструментальні треки
// з низькою мовленнєвою складовою та без explicit-контенту.

db.tracks.find({
    "audio_features.loudness": {
        $lt: -10
    },
    "audio_features.speechiness": {
        $lt: 0.1
    },
    "audio_features.instrumentalness": {
        $gt: 0.5
    },
    explicit: false
}, {
    _id: 0,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    popularity: 1,
    duration_sec: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
}).sort({
    popularity: -1
}).limit(10).forEach(printjson);   