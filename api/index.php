<?php
/**
 * api/index.php
 * Main API Entry Point & Router Dispatcher
 */

// ตั้งค่า CORS Header
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-HTTP-Method-Override');

// จัดการ Preflight Request ของ CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- เชื่อมต่อฐานข้อมูล ----------
require_once __DIR__ . '/../inc/connDB.php';

// ---------- โหลดคลาสหลัก ----------
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Router.php';

// ---------- โหลด Controllers ----------
require_once __DIR__ . '/controllers/CategoryController.php';
require_once __DIR__ . '/controllers/SupplierController.php';
require_once __DIR__ . '/controllers/ProductController.php';

try {
    // สร้าง instance ของ controller พร้อมส่ง PDO connection
    $categoryController = new CategoryController($conn);
    $supplierController = new SupplierController($conn);
    $productController  = new ProductController($conn);

    // สร้าง Router
    $router = new Router();

    // Suppliers Endpoints
    $router->get('/suppliers', [$supplierController, 'index']);
    $router->get('/suppliers/{id}', [$supplierController, 'show']);

    // Categories Endpoints
    $router->get('/categories', [$categoryController, 'index']);
    $router->get('/categories/{id}', [$categoryController, 'show']);

    // Products Endpoints (CRUD)
    $router->get('/products', [$productController, 'index']);
    $router->get('/products/{id}', [$productController, 'show']);
    $router->post('/products', [$productController, 'store']);
    $router->put('/products/{id}', [$productController, 'update']);
    $router->delete('/products/{id}', [$productController, 'delete']);

    // ดึง path จริงจาก query string ที่ .htaccess ส่งมา (__route)
    $requestPath = $_GET['__route'] ?? '';

    // รองรับการระบุ path แบบตรง (เช่น กรณีรันบนเซิร์ฟเวอร์ที่ไม่ได้ rewrite ผ่าน .htaccess)
    if ($requestPath === '') {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        // ตัด /api/ ออกถ้ามี
        if (preg_match('#/api(?:/index\.php)?/(.*)$#i', $uri, $m)) {
            $requestPath = $m[1];
        }
    }

    $requestMethod = $_SERVER['REQUEST_METHOD'];

    // รองรับ Method Spoofing (เช่น HTML Form หรือไคลเอนต์ที่ส่ง POST พร้อม _method=PUT / DELETE)
    if ($requestMethod === 'POST') {
        $spoofed = $_POST['_method'] ?? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? $_GET['_method'] ?? null;
        if ($spoofed && in_array(strtoupper($spoofed), ['PUT', 'DELETE', 'PATCH'])) {
            $requestMethod = strtoupper($spoofed);
        }
    }

    // สั่ง Dispatch ไปยัง Controller ที่ตรงกัน
    $router->dispatch($requestMethod, $requestPath);

} catch (Throwable $e) {
    Response::error('เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ: ' . $e->getMessage(), 500);
}
