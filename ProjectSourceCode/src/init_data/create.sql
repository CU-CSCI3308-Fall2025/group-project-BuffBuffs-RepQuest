--table uer
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION create_user(p_username TEXT, p_name TEXT, p_password TEXT)
RETURNS TEXT AS $$
DECLARE
  v_username TEXT;
BEGIN
  INSERT INTO users(username, name, password)
  VALUES (p_username, p_name, p_password)
  RETURNING username INTO v_username;
  RETURN v_username;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'username % already exists', p_username;
END;


--workouts
DROP TABLE IF EXISTS workouts;

CREATE TABLE workouts (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  date_int INTEGER NOT NULL CHECK (date_int BETWEEN 0 AND 999999),
  date_actual DATE GENERATED ALWAYS AS (
    -- convert MMDDYY (integer) to DATE assuming 20YY for years 00-99
    to_date(lpad(date_int::text, 6, '0'), 'MMDDYY')
  ) STORED,
  back BOOLEAN NOT NULL DEFAULT FALSE,
  chest BOOLEAN NOT NULL DEFAULT FALSE,
  arms BOOLEAN NOT NULL DEFAULT FALSE,
  legs BOOLEAN NOT NULL DEFAULT FALSE,
  glutes BOOLEAN NOT NULL DEFAULT FALSE,
  abs BOOLEAN NOT NULL DEFAULT FALSE,
  cardio BOOLEAN NOT NULL DEFAULT FALSE,
);

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
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO workouts(
    username, date_int, back, chest, arms, legs, glutes, abs, cardio
  )
  VALUES (
    p_username, p_date_int, p_back, p_chest, p_arms, p_legs, p_glutes, p_abs, p_cardio
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'user % does not exist', p_username;
  WHEN others THEN
    RAISE;
END;

