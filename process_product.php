<?php
/**
 * process_product.php
 * Endpoint สำหรับรองรับ Form POST แบบดั้งเดิมจาก product_insert_api.html
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/inc/connDB.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$productName = trim($_POST['ProductName'] ?? '');
$supplierId  = trim($_POST['SupplierID'] ?? '');
$catId       = trim($_POST['CatID'] ?? '');
$unit        = trim($_POST['Unit'] ?? '');
$price       = trim($_POST['Price'] ?? '');
$productID   = trim($_POST['ProductID'] ?? '');
$action      = trim($_POST['action'] ?? 'insert');

// Validation เบื้องต้น
$errors = [];
if ($productName === '' || mb_strlen($productName, 'UTF-8') < 3) {
    $errors['ProductName'] = 'ชื่อสินค้าต้องมีอย่างน้อย 3 ตัวอักษร';
}
if ($supplierId === '' || !is_numeric($supplierId) || (int)$supplierId <= 0) {
    $errors['SupplierID'] = 'กรุณาเลือกผู้จัดจำหน่าย';
}
if ($catId === '' || !is_numeric($catId) || (int)$catId <= 0) {
    $errors['CatID'] = 'กรุณาเลือกหมวดหมู่สินค้า';
}
if ($unit === '') {
    $errors['Unit'] = 'กรุณาระบุหน่วยนับ';
}
if ($price === '' || !is_numeric($price) || (float)$price < 0) {
    $errors['Price'] = 'ราคาสินค้าต้องเป็นตัวเลขและไม่ต่ำกว่า 0';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'ข้อมูลไม่ผ่านการตรวจสอบจาก Server',
        'errors'  => $errors
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($action === 'update' && !empty($productID)) {
        $sql = "UPDATE `tb_products` 
                SET `c_ProductName` = :productName, 
                    `i_SupplierID`  = :supplierId, 
                    `i_CategoryID`  = :catId, 
                    `c_Unit`        = :unit, 
                    `i_Price`       = :price 
                WHERE `i_ProductID` = :productID";

        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':productName', $productName, PDO::PARAM_STR);
        $stmt->bindValue(':supplierId', (int)$supplierId, PDO::PARAM_INT);
        $stmt->bindValue(':catId', (int)$catId, PDO::PARAM_INT);
        $stmt->bindValue(':unit', $unit, PDO::PARAM_STR);
        $stmt->bindValue(':price', (float)$price);
        $stmt->bindValue(':productID', (int)$productID, PDO::PARAM_INT);
        $stmt->execute();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว',
            'id'      => (int)$productID
        ], JSON_UNESCAPED_UNICODE);

    } else {
        $sql = "INSERT INTO `tb_products` (`c_ProductName`, `i_SupplierID`, `i_CategoryID`, `c_Unit`, `i_Price`) 
                VALUES (:productName, :supplierId, :catId, :unit, :price)";

        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':productName', $productName, PDO::PARAM_STR);
        $stmt->bindValue(':supplierId', (int)$supplierId, PDO::PARAM_INT);
        $stmt->bindValue(':catId', (int)$catId, PDO::PARAM_INT);
        $stmt->bindValue(':unit', $unit, PDO::PARAM_STR);
        $stmt->bindValue(':price', (float)$price);
        $stmt->execute();

        $newId = (int)$conn->lastInsertId();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'บันทึกข้อมูลสินค้าเรียบร้อยแล้ว',
            'id'      => $newId
        ], JSON_UNESCAPED_UNICODE);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'ไม่สามารถบันทึกข้อมูลได้: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
