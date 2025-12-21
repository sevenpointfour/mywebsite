-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: consultation
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `client_food_plans`
--

DROP TABLE IF EXISTS `client_food_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_food_plans` (
  `plan_id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `general_recommendations` text,
  `additional_personal_recommendations` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_latest` tinyint(1) DEFAULT '1',
  `created_by_admin_id` int DEFAULT NULL,
  `created_by_nutritionist_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`plan_id`),
  KEY `client_id` (`client_id`,`is_latest`),
  KEY `fk_created_by_admin` (`created_by_admin_id`),
  CONSTRAINT `client_food_plans_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_created_by_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_food_plans`
--

LOCK TABLES `client_food_plans` WRITE;
/*!40000 ALTER TABLE `client_food_plans` DISABLE KEYS */;
INSERT INTO `client_food_plans` VALUES (1,8,NULL,'A2 Whey','2025-06-11 10:47:08','2025-06-11 10:55:37',0,NULL,NULL),(2,8,NULL,'','2025-06-11 10:55:37','2025-06-11 19:11:59',0,NULL,NULL),(3,8,NULL,'','2025-06-11 19:11:59','2025-06-11 19:12:44',0,NULL,NULL),(4,8,NULL,'','2025-06-11 19:12:44','2025-06-12 00:11:51',0,NULL,NULL),(5,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:11:51','2025-06-12 00:22:39',0,3,NULL),(6,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:22:39','2025-06-12 00:33:29',0,3,NULL),(7,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:33:29','2025-06-12 00:38:08',0,3,NULL),(8,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:38:08','2025-06-12 00:38:15',0,3,NULL),(9,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:38:15','2025-06-12 00:39:11',0,3,NULL),(10,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:39:11','2025-06-12 00:41:36',0,3,NULL),(11,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 00:41:36','2025-06-12 02:33:00',0,3,NULL),(12,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 02:33:00','2025-06-12 05:18:59',0,3,NULL),(13,8,NULL,'<p>VVVVVVVVVVVV</p>','2025-06-12 05:18:59','2025-06-12 05:19:25',0,NULL,1),(14,8,NULL,'BBBBBBBBBBBBBB','2025-06-12 05:19:25','2025-06-12 06:15:01',0,NULL,1),(15,8,NULL,'BBBBBBBBBBBBBB','2025-06-12 06:15:01','2025-06-12 06:15:01',1,NULL,1);
/*!40000 ALTER TABLE `client_food_plans` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-12 15:42:24
