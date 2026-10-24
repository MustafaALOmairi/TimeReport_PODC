-- Time Report - Port of Duqm
-- MySQL 5.7+ / MariaDB 10.3+
CREATE DATABASE IF NOT EXISTS time_report CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE time_report;

CREATE TABLE IF NOT EXISTS time_reports (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mv            VARCHAR(120) NOT NULL DEFAULT '',   -- vessel name
  voy           VARCHAR(80)  NOT NULL DEFAULT '',   -- voyage number
  report_date   DATE         NOT NULL,
  shift         VARCHAR(20)  NOT NULL DEFAULT '',   -- Day / Night
  berth         VARCHAR(40)  NOT NULL DEFAULT '',
  bollard       VARCHAR(40)  NOT NULL DEFAULT '',
  yard_no       VARCHAR(120) NOT NULL DEFAULT '',
  what_we_do    TEXT NULL,                          -- remarks / description
  report_type   VARCHAR(60)  NOT NULL DEFAULT '',   -- ESR, Cargo Discharge, ...
  sign_name     VARCHAR(120) NOT NULL DEFAULT '',   -- name typed above the signature
  signature     MEDIUMTEXT NULL,                    -- signature image (PNG data URL)
  created_by    VARCHAR(120) NOT NULL DEFAULT '',   -- logged-in user's name
  created_by_user VARCHAR(60) NOT NULL DEFAULT '',  -- logged-in user ID
  pams_done     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (report_date),
  INDEX idx_mv (mv),
  INDEX idx_voy (voy),
  INDEX idx_berth (berth)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS work_activities (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id  INT UNSIGNED NOT NULL,
  start_time TIME NULL,
  end_time   TIME NULL,
  qty        VARCHAR(40)  NOT NULL DEFAULT '',      -- "No" column (cargo quantity)
  what_we_use VARCHAR(255) NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES time_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS manpower (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id  INT UNSIGNED NOT NULL,
  role       ENUM('FOREMAN','TALLYMAN','DOCKER') NOT NULL,
  badge      VARCHAR(40) NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES time_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_usage (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id  INT UNSIGNED NOT NULL,
  equipment  VARCHAR(120) NOT NULL DEFAULT '',
  operator   VARCHAR(120) NOT NULL DEFAULT '',
  start_time TIME NULL,
  end_time   TIME NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES time_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS discharge_lists (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mv          VARCHAR(120) NOT NULL DEFAULT '',
  voy         VARCHAR(80)  NOT NULL DEFAULT '',
  list_date   DATE         NOT NULL,
  shift       VARCHAR(20)  NOT NULL DEFAULT '',
  berth       VARCHAR(40)  NOT NULL DEFAULT '',
  yard_no     VARCHAR(120) NOT NULL DEFAULT '',
  remarks     TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (list_date),
  INDEX idx_mv (mv)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS discharge_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  list_id     INT UNSIGNED NOT NULL,
  item_no     VARCHAR(60)  NOT NULL DEFAULT '',     -- container / lot / BL no.
  description VARCHAR(255) NOT NULL DEFAULT '',
  qty         VARCHAR(40)  NOT NULL DEFAULT '',
  unit        VARCHAR(20)  NOT NULL DEFAULT '',
  location    VARCHAR(80)  NOT NULL DEFAULT '',
  remarks     VARCHAR(255) NOT NULL DEFAULT '',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (list_id) REFERENCES discharge_lists(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Existing database? Add the new column once:
-- ALTER TABLE time_reports ADD COLUMN report_type VARCHAR(60) NOT NULL DEFAULT '' AFTER what_we_do;
-- Existing database? ALTER TABLE time_reports ADD COLUMN sign_name VARCHAR(120) NOT NULL DEFAULT '', ADD COLUMN signature MEDIUMTEXT NULL, ADD COLUMN created_by VARCHAR(120) NOT NULL DEFAULT '', ADD COLUMN created_by_user VARCHAR(60) NOT NULL DEFAULT '';
