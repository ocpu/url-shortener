CREATE DATABASE IF NOT EXISTS urlshortener;

CREATE USER IF NOT EXISTS 'user'@'localhost' IDENTIFIED BY 'pass';
GRANT SELECT, INSERT, UPDATE ON urlshortener.* TO 'user'@'localhost';

USE urlshortener;

DROP TABLE IF EXISTS uses;
DROP TABLE IF EXISTS shorts;

CREATE TABLE shorts
(
  id         INTEGER PRIMARY KEY AUTO_INCREMENT,
  identifier VARCHAR(8),
  url        VARCHAR(200),
  created    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (identifier)
);

CREATE TABLE IF NOT EXISTS uses
(
  used INTEGER,
  at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY uses (used) REFERENCES shorts (id)
);
