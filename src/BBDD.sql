-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 25-11-2025 a las 01:56:49
-- Versión del servidor: 10.11.13-MariaDB-0ubuntu0.24.04.1
-- Versión de PHP: 8.4.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sagucre_biometria`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `applications`
--

CREATE TABLE `applications` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(200) NOT NULL,
  `town_hall_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `applications`
--

INSERT INTO `applications` (`id`, `email`, `dni`, `phone`, `first_name`, `last_name`, `town_hall_id`) VALUES
(12, 'santiagoaguirrecrespocontact@gmail.com', '99946358e', NULL, 'Saantiago', 'Aaaguirre', 1),
(13, 'santiagoaguirrecrespocontact@gmail.com', '99946358e', NULL, 'Saantiago', 'Aaaguirre', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `daily_stats`
--

CREATE TABLE `daily_stats` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `timestamp` datetime NOT NULL,
  `active_hours` double NOT NULL,
  `distance` double NOT NULL,
  `points` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `daily_stats`
--

INSERT INTO `daily_stats` (`id`, `user_id`, `timestamp`, `active_hours`, `distance`, `points`) VALUES
(1, 2, '2025-11-20 17:35:18', 0.75, 1.4, 15),
(2, 2, '2025-11-21 14:20:26', 2, 5, 50),
(3, 1010, '2025-11-21 15:21:24', 0, 18, 2),
(4, 1010, '2025-11-21 16:01:30', 0, 0, 0),
(5, 273, '2025-11-21 16:05:43', 0, 0, 0),
(6, 273, '2025-11-21 16:06:19', 2.5, 5.3, 50),
(7, 273, '2025-11-24 11:51:45', 0, 0, 0),
(8, 273, '2025-11-24 11:52:03', 0, 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historic_air_quality`
--

CREATE TABLE `historic_air_quality` (
  `id` int(10) UNSIGNED NOT NULL,
  `date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `measurements`
--

CREATE TABLE `measurements` (
  `id` int(10) UNSIGNED NOT NULL,
  `node_id` int(10) UNSIGNED NOT NULL,
  `timestamp` datetime NOT NULL,
  `co_value` double NOT NULL COMMENT 'CO in ppm',
  `o3_value` double NOT NULL COMMENT 'Ozone in \\0b5g/m\\0b3',
  `no2_value` double NOT NULL COMMENT 'NO2 in \\0b5g/m\\0b3',
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `measurements`
--

INSERT INTO `measurements` (`id`, `node_id`, `timestamp`, `co_value`, `o3_value`, `no2_value`, `latitude`, `longitude`, `created_at`) VALUES
(4, 5000, '2025-11-21 09:19:08', 5.2, 45.1, 32.8, 40.41680000, -3.70380000, '2025-11-21 09:19:08'),
(5, 5000, '2025-11-21 08:19:08', 6.8, 48.3, 35.2, 40.41680000, -3.70380000, '2025-11-21 09:19:08'),
(6, 5000, '2025-11-21 07:19:08', 4.9, 42.7, 30.1, 40.41680000, -3.70380000, '2025-11-21 09:19:08'),
(7, 5000, '2025-11-21 06:19:08', 7.1, 50.2, 38.4, 40.41680000, -3.70380000, '2025-11-21 09:19:08'),
(8, 5001, '2025-11-21 09:19:08', 999.9, 45.1, 32.8, 40.42150000, -3.69230000, '2025-11-21 09:19:08'),
(9, 5001, '2025-11-21 08:19:08', 888.8, 48.3, 35.2, 40.42150000, -3.69230000, '2025-11-21 09:19:08'),
(10, 5001, '2025-11-21 07:19:08', 777.7, 42.7, 30.1, 40.42150000, -3.69230000, '2025-11-21 09:19:08'),
(11, 5001, '2025-11-21 06:19:08', 666.6, 50.2, 38.4, 40.42150000, -3.69230000, '2025-11-21 09:19:08'),
(12, 5002, '2025-11-21 09:19:08', 99.9, 99.9, 99.9, 40.42860000, -3.67920000, '2025-11-21 09:19:08'),
(13, 5002, '2025-11-21 08:19:08', 99.9, 99.9, 99.9, 40.42860000, -3.67920000, '2025-11-21 09:19:08'),
(14, 5002, '2025-11-21 07:19:08', 99.9, 99.9, 99.9, 40.42860000, -3.67920000, '2025-11-21 09:19:08'),
(15, 5002, '2025-11-21 06:19:08', 99.9, 99.9, 99.9, 40.42860000, -3.67920000, '2025-11-21 09:19:08'),
(16, 5003, '2025-11-21 09:19:08', 1.1, 10.1, 5.8, 40.41500000, -3.70500000, '2025-11-21 09:19:08'),
(17, 5003, '2025-11-21 08:19:08', 999.9, 9999.9, 999.9, 40.41500000, -3.70500000, '2025-11-21 09:19:08'),
(18, 5003, '2025-11-21 07:19:08', 2.2, 15.7, 8.1, 40.41500000, -3.70500000, '2025-11-21 09:19:08'),
(19, 5003, '2025-11-21 06:19:08', 888.8, 8888.8, 888.8, 40.41500000, -3.70500000, '2025-11-21 09:19:08'),
(20, 5004, '2025-11-21 09:19:08', -999.9, 45.1, 32.8, 40.43000000, -3.71000000, '2025-11-21 09:19:08'),
(21, 5004, '2025-11-21 08:19:08', -888.8, -777.7, 35.2, 40.43000000, -3.71000000, '2025-11-21 09:19:08'),
(22, 5004, '2025-11-21 07:19:08', -777.7, 42.7, -666.6, 40.43000000, -3.71000000, '2025-11-21 09:19:08'),
(23, 5004, '2025-11-21 06:19:08', -666.6, -555.5, -444.4, 40.43000000, -3.71000000, '2025-11-21 09:19:08'),
(28, 153, '2025-11-21 14:16:32', 2, 2, 2, 2.00000000, 1.00000000, '2025-11-21 13:16:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `nodes`
--

CREATE TABLE `nodes` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive','maintenance','error') NOT NULL DEFAULT 'active',
  `lastStatusUpdate` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `nodes`
--

INSERT INTO `nodes` (`id`, `user_id`, `name`, `status`, `lastStatusUpdate`) VALUES
(153, 273, 'GTI', 'active', 0),
(5000, 1000, 'NODO_PRUEBA_NORMAL', 'active', 20251121091753),
(5001, 1001, 'NODO_PRUEBA_INACTIVO_26H', 'inactive', 20251121151206),
(5002, 1002, 'NODO_PRUEBA_LECTURAS_FIJAS', 'active', 20251121081753),
(5003, 1003, 'NODO_PRUEBA_CAMBIOS_BRUSCOS', 'active', 20251121071753),
(5004, 1004, 'NODO_PRUEBA_VALORES_NEGATIVOS', 'inactive', 20251121151206),
(5005, 1010, 'GTIas', 'active', 1763736967054),
(5006, 2, 'GTIoako', 'active', 1763737497708);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `prizes`
--

CREATE TABLE `prizes` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `points_required` int(11) NOT NULL,
  `quantity_available` int(11) NOT NULL,
  `initial_quantity` int(11) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `active` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `prizes`
--

INSERT INTO `prizes` (`id`, `name`, `description`, `points_required`, `quantity_available`, `initial_quantity`, `image_url`, `active`) VALUES
(3, 'Cupón 5€', 'Descuento de 5 euros en tu próxima compra', 500, 96, 100, NULL, 1),
(4, 'Cupón 10€', 'Descuento de 10 euros en tu próxima compra', 1000, 50, 50, NULL, 1),
(5, 'Cupón 20€', 'Descuento de 20 euros en tu próxima compra', 2000, 24, 25, NULL, 1),
(6, 'Botella Reutilizable', 'Botella de agua ecológica de acero inoxidable', 800, 29, 30, NULL, 1),
(7, 'Camiseta Eco', 'Camiseta de algodón orgánico con diseño exclusivo', 1200, 18, 20, NULL, 1),
(8, 'Auriculares Bluetooth', 'Auriculares inalámbricos con cancelación de ruido', 3000, 9, 10, NULL, 1),
(9, 'Power Bank', 'Batería portátil de 10000mAh', 2500, 15, 15, NULL, 1),
(10, 'Mochila Deportiva', 'Mochila impermeable perfecta para tus rutas', 1800, 12, 12, NULL, 1),
(11, 'Entrada Cine', 'Entrada gratuita para cualquier película', 600, 49, 50, NULL, 1),
(12, 'Membresía Gimnasio', 'Mes gratis en gimnasio asociado', 4000, 5, 5, NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `problems`
--

CREATE TABLE `problems` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `resolution` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `name`) VALUES
(1, 'admin'),
(2, 'walker');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `town_halls`
--

CREATE TABLE `town_halls` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `province` varchar(100) NOT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `town_halls`
--

INSERT INTO `town_halls` (`id`, `name`, `province`, `postal_code`, `created_at`) VALUES
(1, 'Gandia', 'Valencia', '46730', '2025-10-30 23:32:15'),
(2, 'Valencia', 'Valencia', '46002', '2025-10-30 23:32:15');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `points` int(11) NOT NULL,
  `active_hours` double NOT NULL DEFAULT 0,
  `total_distance` double NOT NULL DEFAULT 0,
  `photo_url` varchar(255) DEFAULT NULL,
  `town_hall_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role_id`, `points`, `active_hours`, `total_distance`, `photo_url`, `town_hall_id`) VALUES
(2, 'sammc', 'sammc@email.com', '$2b$10$r3LVMD3TIFvcUjI0MqDvVeqT5aORGz50LLgLak9Mp/Z6IABOZwULm', 2, 6700, 200, 200, NULL, 1),
(273, 'mery', 'mery@gmail.com', '$2b$10$BNuvpRFXhEK65VjqpfjOJe8.yZl5QFeoSlGsm/EqbTNpNjlsXNKO.', 2, 300, 0, 0, NULL, 1),
(1000, 'usuario_prueba_1', 'prueba1@test.com', 'password123', 1, 100, 50.5, 120.75, 'foto1.jpg', 1),
(1001, 'usuario_prueba_2', 'prueba2@test.com', 'password123', 1, 80, 35.2, 95.3, 'foto2.jpg', 1),
(1002, 'usuario_prueba_3', 'prueba3@test.com', 'password123', 1, 150, 75.8, 200.45, 'foto3.jpg', 2),
(1003, 'usuario_prueba_4', 'prueba4@test.com', 'password123', 1, 120, 60, 150.2, 'foto4.jpg', 2),
(1004, 'usuario_prueba_5', 'prueba5@test.com', 'password123', 1, 90, 40.5, 110.8, 'foto5.jpg', 2),
(1005, 'hola', 'smth@email', 'hola', 2, 0, 0, 0, NULL, 1),
(1007, 's.aaag', 'santiagoaguirrecrespocontact@gmail.com', '$2b$10$Wi/uaLpHQFmLLM1avdTO4u3w8FgYsiqKadYBRtBQRQ3ouqbIKr0PK', 2, 0, 0, 0, NULL, 1),
(1010, 's.agui', 'santiagoaaguirrec@gmail.com', '$2b$10$UHAEhxlMt30yAHE5eorSaOyyB80giKATZqlP9kOprf/VWbSXrrooe', 2, 0, 0, 0, NULL, 1),
(1011, 'p.cast', 'fcastells@upv.es', '$2b$10$BX7cZ3cRMflDEqrgc7gutOl86ax1L47iRYRmFC1UifeuB0b2CVR7.', 2, 0, 0, 0, NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `winners`
--

CREATE TABLE `winners` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `prize_id` int(10) UNSIGNED NOT NULL,
  `coupon_code` varchar(50) NOT NULL,
  `redemption_date` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Volcado de datos para la tabla `winners`
--

INSERT INTO `winners` (`id`, `user_id`, `prize_id`, `coupon_code`, `redemption_date`) VALUES
(1, 273, 3, '7UU6-TM0O-LORN', '2025-11-21 05:08:46'),
(2, 273, 7, '6SYH-SJHR-1XJG', '2025-11-21 05:14:46'),
(3, 273, 5, 'LJZ0-CPDF-6AJH', '2025-11-21 05:17:03'),
(4, 273, 8, 'A5O3-X6JO-FFN4', '2025-11-21 05:20:15'),
(5, 273, 7, 'YHTJ-JDV2-4DYG', '2025-11-21 05:24:58'),
(6, 273, 6, 'UAX3-6G1O-BDMX', '2025-11-21 05:25:12'),
(7, 273, 3, 'U9FP-L5X5-SZ9B', '2025-11-21 05:25:36'),
(8, 273, 3, '3HM4-1GE6-90L5', '2025-11-21 05:26:03'),
(9, 273, 3, '6HVF-GWVC-61XD', '2025-11-21 15:56:38'),
(10, 273, 11, '9K30-BOGX-Z1HH', '2025-11-21 15:56:58');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `applications_dni_index` (`dni`),
  ADD KEY `applications_town_hall_id_index` (`town_hall_id`);

--
-- Indices de la tabla `daily_stats`
--
ALTER TABLE `daily_stats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_daily_user` (`user_id`);

--
-- Indices de la tabla `historic_air_quality`
--
ALTER TABLE `historic_air_quality`
  ADD PRIMARY KEY (`id`),
  ADD KEY `historic_air_quality_date_index` (`date`);

--
-- Indices de la tabla `measurements`
--
ALTER TABLE `measurements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `measurements_latitude_longitude_index` (`latitude`,`longitude`),
  ADD KEY `measurements_node_id_timestamp_index` (`node_id`,`timestamp`),
  ADD KEY `measurements_timestamp_index` (`timestamp`);

--
-- Indices de la tabla `nodes`
--
ALTER TABLE `nodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `nodes_user_id_index` (`user_id`),
  ADD KEY `nodes_status_index` (`status`);

--
-- Indices de la tabla `prizes`
--
ALTER TABLE `prizes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prizes_points_required_index` (`points_required`),
  ADD KEY `prizes_active_index` (`active`);

--
-- Indices de la tabla `problems`
--
ALTER TABLE `problems`
  ADD PRIMARY KEY (`id`),
  ADD KEY `problems_user_id_index` (`user_id`),
  ADD KEY `problems_status_index` (`status`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_unique` (`name`);

--
-- Indices de la tabla `town_halls`
--
ALTER TABLE `town_halls`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_username_unique` (`username`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_town_hall_id_index` (`town_hall_id`),
  ADD KEY `users_role_id_foreign` (`role_id`);

--
-- Indices de la tabla `winners`
--
ALTER TABLE `winners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `winners_user_id_index` (`user_id`),
  ADD KEY `winners_prize_id_index` (`prize_id`),
  ADD KEY `winners_redemption_date_index` (`redemption_date`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `daily_stats`
--
ALTER TABLE `daily_stats`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `historic_air_quality`
--
ALTER TABLE `historic_air_quality`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `measurements`
--
ALTER TABLE `measurements`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT de la tabla `nodes`
--
ALTER TABLE `nodes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5007;

--
-- AUTO_INCREMENT de la tabla `prizes`
--
ALTER TABLE `prizes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `problems`
--
ALTER TABLE `problems`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `town_halls`
--
ALTER TABLE `town_halls`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1012;

--
-- AUTO_INCREMENT de la tabla `winners`
--
ALTER TABLE `winners`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_town_hall_id_foreign` FOREIGN KEY (`town_hall_id`) REFERENCES `town_halls` (`id`);

--
-- Filtros para la tabla `daily_stats`
--
ALTER TABLE `daily_stats`
  ADD CONSTRAINT `fk_daily_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `measurements`
--
ALTER TABLE `measurements`
  ADD CONSTRAINT `measurements_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `nodes`
--
ALTER TABLE `nodes`
  ADD CONSTRAINT `nodes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `problems`
--
ALTER TABLE `problems`
  ADD CONSTRAINT `problems_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `users_town_hall_id_foreign` FOREIGN KEY (`town_hall_id`) REFERENCES `town_halls` (`id`);

--
-- Filtros para la tabla `winners`
--
ALTER TABLE `winners`
  ADD CONSTRAINT `winners_prize_id_foreign` FOREIGN KEY (`prize_id`) REFERENCES `prizes` (`id`),
  ADD CONSTRAINT `winners_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
