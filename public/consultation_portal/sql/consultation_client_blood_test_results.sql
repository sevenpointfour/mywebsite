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
-- Table structure for table `client_blood_test_results`
--

DROP TABLE IF EXISTS `client_blood_test_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_blood_test_results` (
  `result_id` int NOT NULL AUTO_INCREMENT,
  `report_id` int NOT NULL,
  `test_code` varchar(100) NOT NULL COMMENT 'e.g., hemoglobin, total_wbc. This should match the name attribute prefix in your form.',
  `value_d1` varchar(255) DEFAULT NULL,
  `value_d2` varchar(255) DEFAULT NULL,
  `value_d3` varchar(255) DEFAULT NULL,
  `value_d4` varchar(255) DEFAULT NULL,
  `value_d5` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `report_id` (`report_id`),
  KEY `test_code` (`test_code`),
  CONSTRAINT `client_blood_test_results_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `client_blood_test_reports` (`report_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_blood_test_results`
--

LOCK TABLES `client_blood_test_results` WRITE;
/*!40000 ALTER TABLE `client_blood_test_results` DISABLE KEYS */;
INSERT INTO `client_blood_test_results` VALUES (1,1,'hemoglobin','15',NULL,NULL,NULL,NULL),(2,2,'hemoglobin','15',NULL,NULL,NULL,NULL),(3,2,'total_wbc','10000',NULL,NULL,NULL,NULL),(4,2,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(5,2,'crp','1.3',NULL,NULL,NULL,NULL),(6,3,'hemoglobin','15',NULL,NULL,NULL,NULL),(7,3,'total_wbc','10000',NULL,NULL,NULL,NULL),(8,3,'total_rbc','5',NULL,NULL,NULL,NULL),(9,3,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(10,3,'crp','1.3',NULL,NULL,NULL,NULL),(11,4,'hemoglobin','15','15.5',NULL,NULL,NULL),(12,4,'total_wbc','10000',NULL,NULL,NULL,NULL),(13,4,'total_rbc','5',NULL,NULL,NULL,NULL),(14,4,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(15,4,'crp','1.3',NULL,NULL,NULL,NULL),(16,5,'hemoglobin','15','15.5','16',NULL,NULL),(17,5,'total_wbc','10000',NULL,NULL,NULL,NULL),(18,5,'total_rbc','5',NULL,NULL,NULL,NULL),(19,5,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(20,5,'crp','1.3',NULL,NULL,NULL,NULL),(21,6,'hemoglobin','15','15.5','16',NULL,NULL),(22,6,'total_wbc','10000',NULL,NULL,NULL,NULL),(23,6,'total_rbc','5',NULL,NULL,NULL,NULL),(24,6,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(25,6,'crp','1.3',NULL,NULL,NULL,NULL),(26,6,'t3','30',NULL,NULL,NULL,NULL),(27,7,'hemoglobin','15','15.5','16',NULL,NULL),(28,7,'total_wbc','10000','9000',NULL,NULL,NULL),(29,7,'total_rbc','5',NULL,NULL,NULL,NULL),(30,7,'chol_hdl_ratio','3.5',NULL,NULL,NULL,NULL),(31,7,'crp','1.3',NULL,NULL,NULL,NULL),(32,7,'t3','30',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `client_blood_test_results` ENABLE KEYS */;
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
