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
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `client_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `mobile_number` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email_otp` varchar(10) DEFAULT NULL,
  `email_otp_expires_at` datetime DEFAULT NULL,
  `is_email_verified` tinyint(1) DEFAULT '0',
  `account_status` enum('pending_payment','active','inactive') DEFAULT 'pending_payment',
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_token_expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `nutritionist_id` int DEFAULT NULL,
  `is_account_active` tinyint(1) DEFAULT '0',
  `enrolled_by_executive_id` int DEFAULT NULL,
  `registration_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `height_cms` decimal(5,1) DEFAULT NULL,
  `weight_kg` decimal(5,1) DEFAULT NULL,
  `age_years` int DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL COMMENT 'Male, Female, Other',
  `marital_status` varchar(20) DEFAULT NULL COMMENT 'Single, Married, Divorced, Widowed, Prefer not to say',
  `address_1` varchar(255) DEFAULT NULL,
  `address_2` varchar(255) DEFAULT NULL,
  `address_3` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `shift_duty` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `joint_family` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `is_vegetarian` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `is_non_vegetarian` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `is_vegan` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `is_jain` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `has_lactose_intolerance` varchar(3) DEFAULT NULL COMMENT 'Yes, No',
  `date_of_payment` date DEFAULT NULL,
  `reference_source` varchar(255) DEFAULT NULL,
  `health_issues` text,
  `food_liking` text,
  `food_disliking` text,
  `job_description` text,
  `job_timings` varchar(100) DEFAULT NULL,
  `sedentary_status` varchar(10) DEFAULT NULL COMMENT 'Yes, No, Partly',
  `travelling_frequency` varchar(20) DEFAULT NULL COMMENT 'No, Sometimes, Extensively',
  `last_updated_personal_details` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`),
  UNIQUE KEY `mobile_number` (`mobile_number`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_nutritionist` (`nutritionist_id`),
  KEY `fk_executive_enrolled` (`enrolled_by_executive_id`),
  CONSTRAINT `fk_executive_enrolled` FOREIGN KEY (`enrolled_by_executive_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_nutritionist` FOREIGN KEY (`nutritionist_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (8,'Madhav Laxman','Joshi','9869473422','madhavjoshi02@yahoo.com','$2b$10$0b5UJPbeqoeAYZls.E14UuUq/xCeS71f7dwnZ0HufrYbQxS5mrkl2',NULL,NULL,1,'pending_payment',NULL,NULL,'2025-06-09 12:57:54','2025-06-11 19:11:10',1,1,2,'2025-06-09 18:27:54',170.0,72.0,69,'Male','Single','286 HANUMAN NAGAR NARSI PADA','286 HANUMAN NAGAR NARSI PADA','286 HANUMAN NAGAR NARSI PADA','Mumbai','400101','Yes','No','No','Yes','No','No','No',NULL,'Nil','NIL','NIL','NIL','Consultation','Retired','Partly','Sometimes','2025-06-11 19:11:10');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
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
