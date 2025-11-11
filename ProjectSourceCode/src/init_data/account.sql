BEGIN;

-- USERS
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  name     TEXT,
  password_hash TEXT NOT NULL
);

INSERT INTO users (username, name, password_hash) VALUES
  ('user1', 'Bob',   'abcd1'),
  ('user2', 'Steve', 'abcd2'),
  ('user3', 'John',  'abcd3'),
  ('user4', 'Sally', 'abcd4'),
  ('user5', 'Jane',  'abcd5')
ON CONFLICT (username) DO NOTHING;

-- WORKOUTS (no generated column; use a trigger to fill date_actual)
DROP TABLE IF EXISTS workouts CASCADE;
CREATE TABLE workouts (
  id SERIAL PRIMARY KEY,
  username  TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  -- MMDDYY as an integer  (example: 010125 -> 10125 if you type it as an int)
  date_int  INTEGER NOT NULL CHECK (date_int BETWEEN 0 AND 999999),
  date_actual DATE, -- filled by trigger
  back   BOOLEAN NOT NULL DEFAULT FALSE,
  chest  BOOLEAN NOT NULL DEFAULT FALSE,
  arms   BOOLEAN NOT NULL DEFAULT FALSE,
  legs   BOOLEAN NOT NULL DEFAULT FALSE,
  glutes BOOLEAN NOT NULL DEFAULT FALSE,
  abs    BOOLEAN NOT NULL DEFAULT FALSE,
  cardio BOOLEAN NOT NULL DEFAULT FALSE
);

-- BEFORE INSERT/UPDATE trigger to compute date_actual from date_int
CREATE OR REPLACE FUNCTION set_workout_date_actual() RETURNS trigger AS $$
BEGIN
  -- pad to 6 digits and parse as MMDDYY
  NEW.date_actual := to_date(lpad(NEW.date_int::text, 6, '0'), 'MMDDYY');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_workout_date_actual ON workouts;
CREATE TRIGGER trg_set_workout_date_actual
BEFORE INSERT OR UPDATE OF date_int ON workouts
FOR EACH ROW EXECUTE FUNCTION set_workout_date_actual();

-- OPTIONAL helper to insert workouts
CREATE OR REPLACE FUNCTION insert_workout(
  p_username TEXT,
  p_date_int INTEGER,
  p_back BOOLEAN DEFAULT FALSE,
  p_chest BOOLEAN DEFAULT FALSE,
  p_arms BOOLEAN DEFAULT FALSE,
  p_legs BOOLEAN DEFAULT FALSE,
  p_glutes BOOLEAN DEFAULT FALSE,
  p_abs BOOLEAN DEFAULT FALSE,
  p_cardio BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE v_id INTEGER;
BEGIN
  INSERT INTO workouts(username, date_int, back, chest, arms, legs, glutes, abs, cardio)
  VALUES (p_username, p_date_int, p_back, p_chest, p_arms, p_legs, p_glutes, p_abs, p_cardio)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- (OPTIONAL) seed some workouts for user1
INSERT INTO workouts (username, date_int, back, chest, arms, legs, glutes, abs, cardio) VALUES
  ('user1', 10125, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE), -- 01/01/25
  ('user1', 20125, TRUE,  FALSE, TRUE,  FALSE, FALSE, FALSE, FALSE), -- 02/01/25
  ('user1', 30125, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE ), -- 03/01/25
  ('user1', 40125, FALSE, FALSE, FALSE, TRUE,  TRUE,  TRUE,  FALSE), -- 04/01/25
  ('user1', 50125, FALSE, FALSE, FALSE, TRUE,  FALSE, FALSE, FALSE); -- 05/01/25

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,       -- e.g., 'FIRST_WORKOUT'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_path TEXT NOT NULL DEFAULT '/img/temptrophy.jpg',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (username, achievement_id)
);

INSERT INTO achievements (code, title, description, sort_order)
VALUES ('FIRST_WORKOUT', 'Complete your first workout', 'Log any workout once to earn this badge.', 10)
ON CONFLICT (code) DO NOTHING;

-- Trigger to auto-award FIRST_WORKOUT on first ever workout
CREATE OR REPLACE FUNCTION trg_award_first_workout() RETURNS TRIGGER AS $$
DECLARE v_ach_id INTEGER;
BEGIN
  SELECT id INTO v_ach_id FROM achievements WHERE code = 'FIRST_WORKOUT';
  IF (SELECT COUNT(*) FROM workouts WHERE username = NEW.username) = 1 THEN
    INSERT INTO user_achievements(username, achievement_id)
    VALUES (NEW.username, v_ach_id)
    ON CONFLICT (username, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_workouts_first ON workouts;
CREATE TRIGGER trg_after_insert_workouts_first
AFTER INSERT ON workouts
FOR EACH ROW EXECUTE FUNCTION trg_award_first_workout();

COMMIT;
