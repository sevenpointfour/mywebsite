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
-- Table structure for table `client_blood_test_reports`
--

DROP TABLE IF EXISTS `client_blood_test_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_blood_test_reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `report_date_1` date DEFAULT NULL,
  `report_date_2` date DEFAULT NULL,
  `report_date_3` date DEFAULT NULL,
  `report_date_4` date DEFAULT NULL,
  `report_date_5` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `client_blood_test_reports_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_blood_test_reports`
--

LOCK TABLES `client_blood_test_reports` WRITE;
/*!40000 ALTER TABLE `client_blood_test_reports` DISABLE KEYS */;
INSERT INTO `client_blood_test_reports` VALUES (1,8,'2011-06-25',NULL,NULL,NULL,NULL,'2025-06-11 08:51:04','2025-06-11 08:51:04'),(2,8,'2011-06-25',NULL,NULL,NULL,NULL,'2025-06-11 08:57:31','2025-06-11 08:57:31'),(3,8,'2011-06-24',NULL,NULL,NULL,NULL,'2025-06-11 19:13:42','2025-06-11 19:13:42'),(4,8,'2011-06-23',NULL,NULL,NULL,NULL,'2025-06-11 19:22:35','2025-06-11 19:22:35'),(5,8,'2011-06-22',NULL,NULL,NULL,NULL,'2025-06-11 19:26:48','2025-06-11 19:26:48'),(6,8,'2011-06-22',NULL,NULL,NULL,NULL,'2025-06-11 19:27:02','2025-06-11 19:27:02'),(7,8,'2011-06-21',NULL,NULL,NULL,NULL,'2025-06-11 19:31:24','2025-06-11 19:31:24');
/*!40000 ALTER TABLE `client_blood_test_reports` ENABLE KEYS */;
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
