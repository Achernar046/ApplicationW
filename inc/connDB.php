<?php
/**
 * connDB.php - Database Connection Configuration
 * รองรับทั้ง Local MAMP และ Cloud PaaS (Railway / Docker / Environment Variables)
 */

// ตรวจสอบตัวแปร DATABASE_URL หรือ MYSQL_URL จาก Railway (ถ้ามี)
$databaseUrl = getenv('DATABASE_URL') ?: getenv('MYSQL_URL');

if ($databaseUrl) {
    $dbParts = parse_url($databaseUrl);
    $servername = $dbParts['host'] ?? 'localhost';
    $port       = $dbParts['port'] ?? 3306;
    $username   = $dbParts['user'] ?? 'root';
    $password   = $dbParts['pass'] ?? '';
    $dbname     = isset($dbParts['path']) ? ltrim($dbParts['path'], '/') : 'db_northwind';
} else {
    // อ่านค่าตัวแปรแยกแต่ละตัว หรือใช้ค่าเริ่มต้นของ MAMP
    $servername = getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: 'localhost';
    $port       = getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: 3306;
    $username   = getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root';
    $password   = getenv('MYSQLPASSWORD') !== false 
                    ? getenv('MYSQLPASSWORD') 
                    : (getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : 'root');
    $dbname     = getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'db_northwind';
}

try {
    $dsn = "mysql:host={$servername};port={$port};dbname={$dbname};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $conn = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}