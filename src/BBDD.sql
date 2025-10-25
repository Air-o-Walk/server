-- ==============================================
-- AIR QUALITY MONITORING SYSTEM
-- Corrected and optimized database
-- ==============================================

-- User roles table
CREATE TABLE `roles`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Town halls table
CREATE TABLE `town_halls`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `postal_code` VARCHAR(10) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table
CREATE TABLE `users`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role_id` INT UNSIGNED NOT NULL,
    `points` INT NOT NULL DEFAULT 0,
    `photo_url` VARCHAR(255) NULL,
    `town_hall_id` INT UNSIGNED NOT NULL,
    `active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`),
    INDEX `idx_town_hall` (`town_hall_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Measurement nodes table
CREATE TABLE `nodes`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'inactive', 'maintenance', 'error') NOT NULL DEFAULT 'active',
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `description` TEXT NULL,
    `installation_date` DATE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Measurements table
CREATE TABLE `measurements`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `node_id` INT UNSIGNED NOT NULL,
    `timestamp` DATETIME NOT NULL,
    `co2_value` FLOAT NOT NULL COMMENT 'CO2 in ppm',
    `o3_value` FLOAT NOT NULL COMMENT 'Ozone in µg/m³',
    `no2_value` FLOAT NOT NULL COMMENT 'NO2 in µg/m³',
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `temperature` FLOAT NULL COMMENT 'Temperature in °C',
    `humidity` FLOAT NULL COMMENT 'Relative humidity in %',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_node_timestamp` (`node_id`, `timestamp`),
    INDEX `idx_timestamp` (`timestamp`),
    INDEX `idx_location` (`latitude`, `longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historic air quality table (daily aggregations)
CREATE TABLE `historic_air_quality`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `node_id` INT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `co2_avg` FLOAT NOT NULL,
    `co2_max` FLOAT NOT NULL,
    `co2_min` FLOAT NOT NULL,
    `o3_avg` FLOAT NOT NULL,
    `o3_max` FLOAT NOT NULL,
    `o3_min` FLOAT NOT NULL,
    `no2_avg` FLOAT NOT NULL,
    `no2_max` FLOAT NOT NULL,
    `no2_min` FLOAT NOT NULL,
    `measurement_count` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_node_date` (`node_id`, `date`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily user statistics table
CREATE TABLE `daily_stats`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `date` DATE NOT NULL,
    `active_hours` FLOAT NOT NULL DEFAULT 0,
    `distance_km` FLOAT NOT NULL DEFAULT 0,
    `points_earned` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_date` (`user_id`, `date`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prizes table
CREATE TABLE `prizes`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `points_required` INT NOT NULL,
    `quantity_available` INT NOT NULL DEFAULT 0,
    `initial_quantity` INT NOT NULL,
    `image_url` VARCHAR(255) NULL,
    `active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_points` (`points_required`),
    INDEX `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Winners table
CREATE TABLE `winners`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `prize_id` INT UNSIGNED NOT NULL,
    `redemption_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `points_spent` INT NOT NULL,
    `delivery_status` ENUM('pending', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    `notes` TEXT NULL,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_prize` (`prize_id`),
    INDEX `idx_date` (`redemption_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Applications table
CREATE TABLE `applications`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL,
    `dni` VARCHAR(20) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(200) NOT NULL,
    `town_hall_id` INT UNSIGNED NOT NULL,
    `application_type` VARCHAR(100) NULL COMMENT 'E.g.: node, volunteer, information',
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_at` TIMESTAMP NULL,
    INDEX `idx_dni` (`dni`),
    INDEX `idx_status` (`status`),
    INDEX `idx_town_hall` (`town_hall_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Problems/Issues table
CREATE TABLE `problems`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `node_id` INT UNSIGNED NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    `report_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `resolution_date` TIMESTAMP NULL,
    `resolution` TEXT NULL,
    `resolved_by` INT UNSIGNED NULL,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_node` (`node_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Downloads/Files table
CREATE TABLE `downloads`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(50) NULL,
    `size_bytes` BIGINT NULL,
    `description` TEXT NULL,
    `user_id` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- FOREIGN KEYS
-- ==============================================

ALTER TABLE `users` 
    ADD CONSTRAINT `fk_users_role` 
    FOREIGN KEY(`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `users` 
    ADD CONSTRAINT `fk_users_town_hall` 
    FOREIGN KEY(`town_hall_id`) REFERENCES `town_halls`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `nodes` 
    ADD CONSTRAINT `fk_nodes_user` 
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `measurements` 
    ADD CONSTRAINT `fk_measurements_node` 
    FOREIGN KEY(`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `historic_air_quality` 
    ADD CONSTRAINT `fk_historic_node` 
    FOREIGN KEY(`node_id`) REFERENCES `nodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `daily_stats` 
    ADD CONSTRAINT `fk_daily_stats_user` 
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `winners` 
    ADD CONSTRAINT `fk_winners_user` 
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `winners` 
    ADD CONSTRAINT `fk_winners_prize` 
    FOREIGN KEY(`prize_id`) REFERENCES `prizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `applications` 
    ADD CONSTRAINT `fk_applications_town_hall` 
    FOREIGN KEY(`town_hall_id`) REFERENCES `town_halls`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `problems` 
    ADD CONSTRAINT `fk_problems_user` 
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `problems` 
    ADD CONSTRAINT `fk_problems_node` 
    FOREIGN KEY(`node_id`) REFERENCES `nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `problems` 
    ADD CONSTRAINT `fk_problems_resolved_by` 
    FOREIGN KEY(`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `downloads` 
    ADD CONSTRAINT `fk_downloads_user` 
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Basic roles
INSERT INTO `roles` (`name`, `description`) VALUES
('administrator', 'Full system access'),
('user', 'Standard system user'),
('moderator', 'Can manage issues and content'),
('technician', 'Manages nodes and measurements');

-- Example town hall
INSERT INTO `town_halls` (`name`, `province`, `postal_code`) VALUES
('Gandia', 'Valencia', '46700');