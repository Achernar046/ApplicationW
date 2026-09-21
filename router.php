<?php
/**
 * router.php
 * Router Script สำหรับ PHP Built-in Web Server (ใช้บน Railway หรือ Local PHP CLI)
 * ตัวอย่างคำสั่งรัน: php -S 0.0.0.0:8080 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$filePath = __DIR__ . $uri;

// หากเป็นไฟล์ Static ที่มีอยู่จริง (CSS, JS, รูปภาพ ฯลฯ) ให้ส่งไฟล์นั้นออกไปทันที
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    return false;
}

// จัดการคำขอที่ส่งเข้ามายัง /api/...
if (preg_match('#^/api(?:/index\.php)?/(.*)$#i', $uri, $matches)) {
    $_GET['__route'] = $matches[1];
    require __DIR__ . '/api/index.php';
    return true;
}

// จัดการคำขอ /api ตรงๆ
if ($uri === '/api' || $uri === '/api/') {
    require __DIR__ . '/api/index.php';
    return true;
}

// หน้าหลัก
if ($uri === '/' || $uri === '/index.php' || $uri === '/index.html') {
    require __DIR__ . '/index.html';
    return true;
}

return false;
