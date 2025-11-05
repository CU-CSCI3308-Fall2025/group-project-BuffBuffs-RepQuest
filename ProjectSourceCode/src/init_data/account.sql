
--Had to change this based off of the index.js file Addie
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL
);

INSERT INTO users (username, name, password_hash) VALUES
  ('user1', 'Bob',   'abcd1'),
  ('user2', 'Steve', 'abcd2'),
  ('user3', 'John',  'abcd3'),
  ('user4', 'Sally', 'abcd4'),
  ('user5', 'Jane',  'abcd5')
ON CONFLICT (username) DO NOTHING;


-- INSERT INTO users
--   (username, name, password)
-- VALUES
--     (user1, Bob, abcd1),
--     (user2, Steve, abcd2),
--     (user3, John, abcd3),
--     (user4, Sally, abcd4),
--     (user5, Jane, abcd5);
