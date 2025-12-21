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
-- Table structure for table `client_food_plan_hourly_details`
--

DROP TABLE IF EXISTS `client_food_plan_hourly_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_food_plan_hourly_details` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `time_slot` varchar(10) NOT NULL COMMENT 'e.g., 06:00, 13:00',
  `present_intake` text,
  `proposed_structure` text,
  `additional_points` text,
  PRIMARY KEY (`detail_id`),
  KEY `plan_id` (`plan_id`,`time_slot`),
  CONSTRAINT `client_food_plan_hourly_details_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `client_food_plans` (`plan_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_food_plan_hourly_details`
--

LOCK TABLES `client_food_plan_hourly_details` WRITE;
/*!40000 ALTER TABLE `client_food_plan_hourly_details` DISABLE KEYS */;
INSERT INTO `client_food_plan_hourly_details` VALUES (1,1,'06:00','Water',NULL,NULL),(2,1,'07:00',NULL,'JUice',NULL),(3,1,'11:00',NULL,'Ukala',NULL),(4,2,'06:00','Tea',NULL,NULL),(5,3,'06:00',NULL,'bbbbbb',NULL),(6,4,'06:00',NULL,'MMMMMMM',NULL),(7,5,'06:00',NULL,'<p>OOOOOO</p>',NULL),(8,6,'06:00',NULL,'<p>WWWWWW</p>',NULL),(9,7,'06:00',NULL,'KKKKKKKKKKKK',NULL),(10,8,'06:00',NULL,'PPPPPPPPPP',NULL),(11,9,'06:00',NULL,'PPPPPPPPPP',NULL),(12,10,'06:00',NULL,'LLLLLLLL',NULL),(13,11,'06:00',NULL,'UUUUUUUU',NULL),(14,12,'06:00',NULL,'QQQQQQ',NULL),(15,13,'06:00',NULL,'PPPPPP',NULL),(16,14,'06:00',NULL,'PPPPPP',NULL),(17,15,'06:00',NULL,'TTTTTTTT',NULL);
/*!40000 ALTER TABLE `client_food_plan_hourly_details` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-12 15:42:23
