INSERT INFO workouts
    (username, date, back, chest, arms, legs, glutes, abs, cardio) 
    --date as a six digit integer MM-DD-YY
    --back, chest, etc. as booleans. this will allow us to put several on for one workout
VALUES
    (user1, 010125, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (user1, 020125, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (user1, 030125, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
    (user1, 040125, FALSE, FALSE, FALSE, TRUE, TRUE, TRUE, FALSE),
    (user1, 050125, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE);