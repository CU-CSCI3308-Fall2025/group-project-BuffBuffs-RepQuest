BEGIN;

-- Drop in dependency-safe order (for re-run)
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  username      TEXT PRIMARY KEY,
  name          TEXT,
  password_hash TEXT NOT NULL,
  profile_pic TEXT
);

-- =========================
-- USER PROGRESS
-- =========================
CREATE TABLE user_progress (
  username         TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  highest_completed INTEGER NOT NULL DEFAULT 0
);

-- Seed some users, for initial testing 
INSERT INTO users (username, name, password_hash) VALUES
  ('user1', 'default', 'password')
ON CONFLICT (username) DO NOTHING;


-- =========================
-- WORKOUTS
-- =========================
CREATE TABLE workouts (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  -- date stored as 6-digit MMDDYY in an integer 
  date_int    INTEGER NOT NULL CHECK (date_int BETWEEN 0 AND 999999),
  date_actual DATE,  -- filled by trigger
  push  BOOLEAN NOT NULL DEFAULT FALSE,
  pull BOOLEAN NOT NULL DEFAULT FALSE,
  legs   BOOLEAN NOT NULL DEFAULT FALSE,
  rest   BOOLEAN NOT NULL DEFAULT FALSE
);

-- BEFORE trigger to compute date_actual from date_int
CREATE OR REPLACE FUNCTION set_workout_date_actual() RETURNS trigger AS $$
DECLARE
  padded TEXT;
BEGIN
  -- pad to 6 digits and parse as MMDDYY 
  padded := lpad(NEW.date_int::text, 6, '0');
  NEW.date_actual := to_date(padded, 'MMDDYY');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_workout_date_actual ON workouts;
CREATE TRIGGER trg_set_workout_date_actual
BEFORE INSERT OR UPDATE OF date_int ON workouts
FOR EACH ROW EXECUTE FUNCTION set_workout_date_actual();

-- insert workouts function
CREATE OR REPLACE FUNCTION insert_workout(
  p_username TEXT,
  p_date_int INTEGER,
  p_push   BOOLEAN DEFAULT FALSE,
  p_pull  BOOLEAN DEFAULT FALSE,
  p_legs   BOOLEAN DEFAULT FALSE,
  p_rest   BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE v_id INTEGER;
BEGIN
  INSERT INTO workouts(username, date_int, push, pull, legs, rest)
  VALUES (p_username, p_date_int, p_push, p_pull, p_legs, p_rest)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
CREATE INDEX IF NOT EXISTS idx_workouts_username ON workouts(username);
CREATE INDEX IF NOT EXISTS idx_workouts_username_date ON workouts(username, date_actual);

-- =========================
-- ACHIEVEMENTS
-- =========================
CREATE TABLE IF NOT EXISTS achievements (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,       
  title       TEXT NOT NULL,
  icon_path   TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             SERIAL PRIMARY KEY,
  username       TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (username, achievement_id)
);

-- Seed achievements
INSERT INTO achievements (code, title, icon_path, sort_order)
VALUES 
  -- workout milestones
  ('FIRST_WORKOUT', 'Complete 1 Workout',  '/img/general-trophy.png', 10),
  ('FIVE_WORKOUTS',  'Complete 5 Workouts',   '/img/general-trophy.png', 20),
  ('TEN_WORKOUTS',   'Complete 10 Workouts',  '/img/general-trophy.png',  30),
  ('FIFTY_WORKOUTS', 'Complete 50 Workouts',  '/img/general-trophy.png', 40),
  ('ONE_HUNDRED_WORKOUTS',  'Complete 100 Workouts',   '/img/general-trophy.png', 50),
  ('TWO_HUNDRED_WORKOUTS',   'Complete 200 Workouts',  '/img/general-trophy.png', 60),
  ('THREE_HUNDRED_WORKOUTS', 'Complete 300 Workouts',  '/img/general-trophy.png', 70),
  ('FOUR_HUNDRED_WORKOUTS',  'Complete 400 Workouts',   '/img/general-trophy.png', 80),
  ('FIVE_HUNDRED_WORKOUTS',   'Complete 500 Workouts', '/img/general-trophy.png', 90),
  ('ONE_THOUSAND_WORKOUTS', 'Complete 1000 Workouts',  '/img/general-trophy.png', 100),

  -- streak milestones
  ('THREE_DAY_STREAK',  'Achieve a 3 Day Streak', '/img/streak-trophy.png', 110),
  ('WEEK_STREAK',  'Achieve a Week Long Streak',  '/img/streak-trophy.png',  120),
  ('TWO_WEEK_STREAK',  'Achieve a 2 Weeks Long Streak',  '/img/streak-trophy.png',  130),
  ('THREE_WEEK_STREAK',  'Achieve a 3 Weeks Long Streak', '/img/streak-trophy.png', 140),
  ('MONTH_STREAK', 'Achieve a Month Long Streak', '/img/streak-trophy.png',  150),
  ('YEAR_STREAK', 'Achieve a Year Long Streak',  '/img/streak-trophy.png', 160),
  ('TWO_YEAR_STREAK', 'Achieve a 2 Years Long Streak',  '/img/streak-trophy.png', 170),
  ('THREE_YEAR_STREAK', 'Achieve a 3 Years Long Streak','/img/streak-trophy.png',   180),
  ('FOUR_YEAR_STREAK', 'Achieve a 4 Years Long Streak',  '/img/streak-trophy.png', 190),
  ('FIVE_YEAR_STREAK', 'Achieve a 5 Years Long Streak',  '/img/streak-trophy.png', 200),
  
  -- Push workout milestones
  ('ONE_PUSH_WORKOUTS',        'Complete 1 Push Workout',       '/img/push-trophy.png',  210),
  ('FIVE_PUSH_WORKOUTS',        'Complete 5 Push Workouts',      '/img/push-trophy.png',   220),
  ('TEN_PUSH_WORKOUTS',         'Complete 10 Push Workouts',      '/img/push-trophy.png',  230),
  ('FIFTY_PUSH_WORKOUTS',       'Complete 50 Push Workouts',    '/img/push-trophy.png',    240),
  ('ONE_HUNDRED_PUSH_WORKOUTS', 'Complete 100 Push Workouts',    '/img/push-trophy.png',   250),
  ('TWO_HUNDRED_FIFTY_PUSH_WORKOUTS', 'Complete 250 Push Workouts','/img/push-trophy.png',  260),
  ('FIVE_HUNDRED_PUSH_WORKOUTS','Complete 500 Push Workouts',    '/img/push-trophy.png',   270),

  -- Pull workout milestones
  ('ONE_PULL_WORKOUTS',        'Complete 1 Pull Workout',     '/img/pull-trophy.png',    280),
  ('FIVE_PULL_WORKOUTS',        'Complete 5 Pull Workouts',     '/img/pull-trophy.png',    290),
  ('TEN_PULL_WORKOUTS',         'Complete 10 Pull Workouts',    '/img/pull-trophy.png',    300),
  ('FIFTY_PULL_WORKOUTS',       'Complete 50 Pull Workouts',    '/img/pull-trophy.png',    310),
  ('ONE_HUNDRED_PULL_WORKOUTS', 'Complete 100 Pull Workouts',   '/img/pull-trophy.png',    320),
  ('TWO_HUNDRED_FIFTY_PULL_WORKOUTS', 'Complete 250 Pull Workouts','/img/pull-trophy.png', 330),
  ('FIVE_HUNDRED_PULL_WORKOUTS','Complete 500 Pull Workouts',      '/img/pull-trophy.png', 340),

  -- Leg workout milestones
  ('ONE_LEG_WORKOUTS',         'Complete 1 Leg Workout',       '/img/leg-trophy.png',   350),
  ('FIVE_LEG_WORKOUTS',         'Complete 5 Leg Workouts',      '/img/leg-trophy.png',    360),
  ('TEN_LEG_WORKOUTS',          'Complete 10 Leg Workouts',      '/img/leg-trophy.png',   370),
  ('FIFTY_LEG_WORKOUTS',        'Complete 50 Leg Workouts',       '/img/leg-trophy.png',  380),
  ('ONE_HUNDRED_LEG_WORKOUTS',  'Complete 100 Leg Workouts',     '/img/leg-trophy.png',   390),
  ('TWO_HUNDRED_FIFTY_LEG_WORKOUTS', 'Complete 250 Leg Workouts', '/img/leg-trophy.png',  400),
  ('FIVE_HUNDRED_LEG_WORKOUTS', 'Complete 500 Leg Workouts',      '/img/leg-trophy.png',  410),

  -- Rest day milestones
  ('ONE_REST_DAYS',            'Complete 1 Rest Day',           '/img/rest-trophy.png',  420),
  ('FIVE_REST_DAYS',            'Complete 5 Rest Days',         '/img/rest-trophy.png',    430),
  ('TEN_REST_DAYS',             'Complete 10 Rest Days',        '/img/rest-trophy.png',    440),
  ('FIFTY_REST_DAYS',           'Complete 50 Rest Days',        '/img/rest-trophy.png',    450),
  ('ONE_HUNDRED_REST_DAYS',     'Complete 100 Rest Days',       '/img/rest-trophy.png',    460),
  ('TWO_HUNDRED_FIFTY_REST_DAYS','Complete 250 Rest Days',      '/img/rest-trophy.png',    470),
  ('FIVE_HUNDRED_REST_DAYS',    'Complete 500 Rest Days',       '/img/rest-trophy.png',    480)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION award(p_code TEXT, p_username TEXT) RETURNS VOID AS $$
DECLARE v_ach_id INTEGER;
BEGIN
  SELECT id INTO v_ach_id FROM achievements WHERE code = p_code;
  IF v_ach_id IS NULL THEN
    RAISE EXCEPTION 'Unknown achievement code: %', p_code;
  END IF;

  INSERT INTO user_achievements(username, achievement_id)
  VALUES (p_username, v_ach_id)
  ON CONFLICT (username, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- after inserting a workout, check and award achievements
CREATE OR REPLACE FUNCTION trg_evaluate_achievements_after_workout() RETURNS TRIGGER AS $$
DECLARE
  v_count        INTEGER;
  v_push_count   INTEGER;
  v_pull_count   INTEGER;
  v_legs_count   INTEGER;
  v_rest_count   INTEGER;
BEGIN
  -- total workouts for this user
  SELECT COUNT(*) INTO v_count
  FROM workouts
  WHERE username = NEW.username;

  IF v_count = 1 THEN
    PERFORM award('FIRST_WORKOUT', NEW.username);
  END IF;
  IF v_count >= 5 THEN
    PERFORM award('FIVE_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 10 THEN
    PERFORM award('TEN_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 50 THEN
    PERFORM award('FIFTY_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 100 THEN
    PERFORM award('ONE_HUNDRED_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 200 THEN
    PERFORM award('TWO_HUNDRED_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 300 THEN
    PERFORM award('THREE_HUNDRED_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 400 THEN
    PERFORM award('FOUR_HUNDRED_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 500 THEN
    PERFORM award('FIVE_HUNDRED_WORKOUTS', NEW.username);
  END IF;

  IF v_count >= 1000 THEN
    PERFORM award('ONE_THOUSAND_WORKOUTS', NEW.username);
  END IF;

  -- Push workouts
  SELECT COUNT(*) INTO v_push_count
  FROM workouts
  WHERE username = NEW.username
    AND push = TRUE;
 IF v_push_count >= 1 THEN
    PERFORM award('ONE_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 5 THEN
    PERFORM award('FIVE_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 10 THEN
    PERFORM award('TEN_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 50 THEN
    PERFORM award('FIFTY_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 100 THEN
    PERFORM award('ONE_HUNDRED_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 250 THEN
    PERFORM award('TWO_HUNDRED_FIFTY_PUSH_WORKOUTS', NEW.username);
  END IF;
  IF v_push_count >= 500 THEN
    PERFORM award('FIVE_HUNDRED_PUSH_WORKOUTS', NEW.username);
  END IF;

  -- Pull workouts
  SELECT COUNT(*) INTO v_pull_count
  FROM workouts
  WHERE username = NEW.username
    AND pull = TRUE;

  IF v_pull_count >= 1 THEN
    PERFORM award('ONE_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 5 THEN
    PERFORM award('FIVE_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 10 THEN
    PERFORM award('TEN_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 50 THEN
    PERFORM award('FIFTY_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 100 THEN
    PERFORM award('ONE_HUNDRED_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 250 THEN
    PERFORM award('TWO_HUNDRED_FIFTY_PULL_WORKOUTS', NEW.username);
  END IF;
  IF v_pull_count >= 500 THEN
    PERFORM award('FIVE_HUNDRED_PULL_WORKOUTS', NEW.username);
  END IF;

  -- Leg workouts
  SELECT COUNT(*) INTO v_legs_count
  FROM workouts
  WHERE username = NEW.username
    AND legs = TRUE;

  IF v_legs_count >= 1 THEN
    PERFORM award('ONE_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 5 THEN
    PERFORM award('FIVE_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 10 THEN
    PERFORM award('TEN_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 50 THEN
    PERFORM award('FIFTY_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 100 THEN
    PERFORM award('ONE_HUNDRED_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 250 THEN
    PERFORM award('TWO_HUNDRED_FIFTY_LEG_WORKOUTS', NEW.username);
  END IF;
  IF v_legs_count >= 500 THEN
    PERFORM award('FIVE_HUNDRED_LEG_WORKOUTS', NEW.username);
  END IF;

  -- Rest days
  SELECT COUNT(*) INTO v_rest_count
  FROM workouts
  WHERE username = NEW.username
    AND rest = TRUE;

  IF v_rest_count >= 1 THEN
    PERFORM award('ONE_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 5 THEN
    PERFORM award('FIVE_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 10 THEN
    PERFORM award('TEN_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 50 THEN
    PERFORM award('FIFTY_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 100 THEN
    PERFORM award('ONE_HUNDRED_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 250 THEN
    PERFORM award('TWO_HUNDRED_FIFTY_REST_DAYS', NEW.username);
  END IF;
  IF v_rest_count >= 500 THEN
    PERFORM award('FIVE_HUNDRED_REST_DAYS', NEW.username);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_insert_workouts_eval ON workouts;

CREATE TRIGGER trg_after_insert_workouts_eval
AFTER INSERT OR UPDATE OF push, pull, legs, rest
ON workouts
FOR EACH ROW
EXECUTE FUNCTION trg_evaluate_achievements_after_workout();


COMMIT;
