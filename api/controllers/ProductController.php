<?php
/**
 * ProductController.php
 * คอนโทรลเลอร์สำหรับจัดการข้อมูลสินค้า (CRUD) ผ่าน RESTful API
 */

class ProductController
{
    private PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    /**
     * ดึงข้อมูลจาก Request รองรับทั้ง JSON (php://input) และ FormData ($_POST)
     */
    private function getRequestData(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $data = [];

        if (stripos($contentType, 'application/json') !== false) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        if (empty($data)) {
            $data = $_POST;
        }

        // กรณี PUT / DELETE ที่ส่งแบบ form-urlencoded แต่ไม่ใช่ JSON
        if (empty($data)) {
            $raw = file_get_contents('php://input');
            parse_str($raw, $parsed);
            if (is_array($parsed)) {
                $data = $parsed;
            }
        }

        return $data;
    }

    /**
     * GET /api/products
     * ค้นหาและดึงรายการสินค้า พร้อมการกรองตาม Keyword, Category, และ Supplier
     */
    public function index(): void
    {
        try {
            $search     = trim($_GET['q'] ?? $_GET['search'] ?? '');
            $categoryId = trim($_GET['category_id'] ?? $_GET['cat_id'] ?? '');
            $supplierId = trim($_GET['supplier_id'] ?? '');

            $sql = "SELECT 
                        p.i_ProductID   AS id,
                        p.c_ProductName AS name,
                        p.i_SupplierID  AS supplier_id,
                        COALESCE(s.c_SupplierName, 'ไม่ระบุ') AS supplier_name,
                        p.i_CategoryID  AS category_id,
                        COALESCE(c.c_CategoryName, 'ไม่ระบุ') AS category_name,
                        p.c_Unit        AS unit,
                        p.i_Price       AS price
                    FROM tb_products p
                    LEFT JOIN tb_categories c ON p.i_CategoryID = c.i_CategoryID
                    LEFT JOIN tb_suppliers  s ON p.i_SupplierID = s.i_SupplierID
                    WHERE 1 = 1";

            $params = [];

            if ($search !== '') {
                $sql .= " AND (p.c_ProductName LIKE :search OR p.c_Unit LIKE :searchUnit)";
                $params[':search']     = "%{$search}%";
                $params[':searchUnit'] = "%{$search}%";
            }

            if ($categoryId !== '' && is_numeric($categoryId) && (int)$categoryId > 0) {
                $sql .= " AND p.i_CategoryID = :catId";
                $params[':catId'] = (int)$categoryId;
            }

            if ($supplierId !== '' && is_numeric($supplierId) && (int)$supplierId > 0) {
                $sql .= " AND p.i_SupplierID = :supId";
                $params[':supId'] = (int)$supplierId;
            }

            $sql .= " ORDER BY p.i_ProductID DESC";

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $key => $val) {
                if (is_int($val)) {
                    $stmt->bindValue($key, $val, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($key, $val, PDO::PARAM_STR);
                }
            }
            $stmt->execute();

            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // แปลงชนิดข้อมูล price และ id ให้เป็น numeric
            foreach ($products as &$p) {
                $p['id']          = (int)$p['id'];
                $p['supplier_id'] = (int)$p['supplier_id'];
                $p['category_id'] = (int)$p['category_id'];
                $p['price']       = (float)$p['price'];
            }
            unset($p);

            Response::success($products, 'ดึงข้อมูลรายการสินค้าสำเร็จ');
        } catch (PDOException $e) {
            Response::error('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/products/{id}
     * ดึงข้อมูลสินค้ารายตัว
     */
    public function show(string $id): void
    {
        if (!is_numeric($id) || (int)$id <= 0) {
            Response::error('รหัสสินค้าไม่ถูกต้อง', 400);
            return;
        }

        try {
            $sql = "SELECT 
                        p.i_ProductID   AS id,
                        p.c_ProductName AS name,
                        p.i_SupplierID  AS supplier_id,
                        COALESCE(s.c_SupplierName, 'ไม่ระบุ') AS supplier_name,
                        p.i_CategoryID  AS category_id,
                        COALESCE(c.c_CategoryName, 'ไม่ระบุ') AS category_name,
                        p.c_Unit        AS unit,
                        p.i_Price       AS price
                    FROM tb_products p
                    LEFT JOIN tb_categories c ON p.i_CategoryID = c.i_CategoryID
                    LEFT JOIN tb_suppliers  s ON p.i_SupplierID = s.i_SupplierID
                    WHERE p.i_ProductID = :id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', (int)$id, PDO::PARAM_INT);
            $stmt->execute();

            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) {
                Response::notFound("ไม่พบข้อมูลสินค้ารหัส #{$id}");
                return;
            }

            $product['id']          = (int)$product['id'];
            $product['supplier_id'] = (int)$product['supplier_id'];
            $product['category_id'] = (int)$product['category_id'];
            $product['price']       = (float)$product['price'];

            Response::success($product, 'ดึงข้อมูลสินค้าสำเร็จ');
        } catch (PDOException $e) {
            Response::error('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/products
     * เพิ่มสินค้าใหม่ พร้อมการตรวจสอบ Validation
     */
    public function store(): void
    {
        $input = $this->getRequestData();
        $errors = $this->validate($input);

        if (!empty($errors)) {
            Response::validationError($errors);
            return;
        }

        try {
            $name       = trim($input['name'] ?? $input['ProductName'] ?? '');
            $supplierId = (int)($input['supplier_id'] ?? $input['SupplierID'] ?? 0);
            $categoryId = (int)($input['category_id'] ?? $input['CatID'] ?? $input['CategoryID'] ?? 0);
            $unit       = trim($input['unit'] ?? $input['Unit'] ?? '');
            $price      = (float)($input['price'] ?? $input['Price'] ?? 0);

            $sql = "INSERT INTO tb_products (c_ProductName, i_SupplierID, i_CategoryID, c_Unit, i_Price)
                    VALUES (:name, :supplier_id, :category_id, :unit, :price)";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':name', $name, PDO::PARAM_STR);
            $stmt->bindValue(':supplier_id', $supplierId, PDO::PARAM_INT);
            $stmt->bindValue(':category_id', $categoryId, PDO::PARAM_INT);
            $stmt->bindValue(':unit', $unit, PDO::PARAM_STR);
            $stmt->bindValue(':price', $price);
            $stmt->execute();

            $insertedId = (int)$this->conn->lastInsertId();

            Response::success([
                'id'          => $insertedId,
                'name'        => $name,
                'supplier_id' => $supplierId,
                'category_id' => $categoryId,
                'unit'        => $unit,
                'price'       => $price
            ], 'เพิ่มข้อมูลสินค้าใหม่เรียบร้อยแล้ว', 201);

        } catch (PDOException $e) {
            Response::error('ไม่สามารถบันทึกข้อมูลสินค้าได้: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/products/{id}
     * แก้ไขข้อมูลสินค้าเดิม
     */
    public function update(string $id): void
    {
        if (!is_numeric($id) || (int)$id <= 0) {
            Response::error('รหัสสินค้าไม่ถูกต้อง', 400);
            return;
        }

        // ตรวจสอบว่ามีสินค้ารหัสนี้อยู่จริงหรือไม่
        $checkStmt = $this->conn->prepare("SELECT i_ProductID FROM tb_products WHERE i_ProductID = :id");
        $checkStmt->bindValue(':id', (int)$id, PDO::PARAM_INT);
        $checkStmt->execute();

        if (!$checkStmt->fetch()) {
            Response::notFound("ไม่พบข้อมูลสินค้ารหัส #{$id} ที่ต้องการแก้ไข");
            return;
        }

        $input = $this->getRequestData();
        $errors = $this->validate($input);

        if (!empty($errors)) {
            Response::validationError($errors);
            return;
        }

        try {
            $name       = trim($input['name'] ?? $input['ProductName'] ?? '');
            $supplierId = (int)($input['supplier_id'] ?? $input['SupplierID'] ?? 0);
            $categoryId = (int)($input['category_id'] ?? $input['CatID'] ?? $input['CategoryID'] ?? 0);
            $unit       = trim($input['unit'] ?? $input['Unit'] ?? '');
            $price      = (float)($input['price'] ?? $input['Price'] ?? 0);

            $sql = "UPDATE tb_products 
                    SET c_ProductName = :name,
                        i_SupplierID  = :supplier_id,
                        i_CategoryID  = :category_id,
                        c_Unit        = :unit,
                        i_Price       = :price
                    WHERE i_ProductID = :id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':name', $name, PDO::PARAM_STR);
            $stmt->bindValue(':supplier_id', $supplierId, PDO::PARAM_INT);
            $stmt->bindValue(':category_id', $categoryId, PDO::PARAM_INT);
            $stmt->bindValue(':unit', $unit, PDO::PARAM_STR);
            $stmt->bindValue(':price', $price);
            $stmt->bindValue(':id', (int)$id, PDO::PARAM_INT);
            $stmt->execute();

            Response::success([
                'id'          => (int)$id,
                'name'        => $name,
                'supplier_id' => $supplierId,
                'category_id' => $categoryId,
                'unit'        => $unit,
                'price'       => $price
            ], 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว');

        } catch (PDOException $e) {
            Response::error('ไม่สามารถอัปเดตข้อมูลสินค้าได้: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/products/{id}
     * ลบสินค้าออกจากระบบ (พร้อมตรวจสอบ Foreign Key ใน OrderDetails)
     */
    public function delete(string $id): void
    {
        if (!is_numeric($id) || (int)$id <= 0) {
            Response::error('รหัสสินค้าไม่ถูกต้อง', 400);
            return;
        }

        $productId = (int)$id;

        try {
            // ตรวจสอบว่าสินค้ามีอยู่หรือไม่
            $stmt = $this->conn->prepare("SELECT i_ProductID, c_ProductName FROM tb_products WHERE i_ProductID = :id");
            $stmt->bindValue(':id', $productId, PDO::PARAM_INT);
            $stmt->execute();
            $product = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$product) {
                Response::notFound("ไม่พบข้อมูลสินค้ารหัส #{$productId}");
                return;
            }

            // ตรวจสอบว่ามี Order ที่ใช้สินค้านี้อยู่หรือไม่
            $chkOrder = $this->conn->prepare("SELECT COUNT(*) AS total FROM tb_orderdetails WHERE i_ProductID = :id");
            $chkOrder->bindValue(':id', $productId, PDO::PARAM_INT);
            $chkOrder->execute();
            $orderCount = (int)($chkOrder->fetchColumn() ?? 0);

            if ($orderCount > 0) {
                Response::error("ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีรายการคำสั่งซื้อ (Order Details) อ้างอิงอยู่จำนวน {$orderCount} รายการ", 409);
                return;
            }

            // ทำการลบ
            $delStmt = $this->conn->prepare("DELETE FROM tb_products WHERE i_ProductID = :id");
            $delStmt->bindValue(':id', $productId, PDO::PARAM_INT);
            $delStmt->execute();

            Response::success([
                'id'   => $productId,
                'name' => $product['c_ProductName']
            ], "ลบสินค้า '{$product['c_ProductName']}' (รหัส #{$productId}) เรียบร้อยแล้ว");

        } catch (PDOException $e) {
            Response::error('เกิดข้อผิดพลาดในการลบสินค้า: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ฟังก์ชันตรวจสอบ Validation
     */
    private function validate(array $input): array
    {
        $errors = [];

        $name       = trim($input['name'] ?? $input['ProductName'] ?? '');
        $supplierId = $input['supplier_id'] ?? $input['SupplierID'] ?? '';
        $categoryId = $input['category_id'] ?? $input['CatID'] ?? $input['CategoryID'] ?? '';
        $unit       = trim($input['unit'] ?? $input['Unit'] ?? '');
        $price      = $input['price'] ?? $input['Price'] ?? '';

        // 1. ตรวจสอบชื่อสินค้า
        if ($name === '') {
            $errors['name'] = 'กรุณาระบุชื่อสินค้า';
        } elseif (mb_strlen($name, 'UTF-8') < 3) {
            $errors['name'] = 'ชื่อสินค้าต้องมีความยาวอย่างน้อย 3 ตัวอักษร';
        } elseif (mb_strlen($name, 'UTF-8') > 50) {
            $errors['name'] = 'ชื่อสินค้าต้องไม่เกิน 50 ตัวอักษร';
        }

        // 2. ตรวจสอบผู้จัดจำหน่าย
        if ($supplierId === '' || !is_numeric($supplierId) || (int)$supplierId <= 0) {
            $errors['supplier_id'] = 'กรุณาเลือกผู้จัดจำหน่าย (Supplier)';
        } else {
            $stmt = $this->conn->prepare("SELECT i_SupplierID FROM tb_suppliers WHERE i_SupplierID = :id");
            $stmt->bindValue(':id', (int)$supplierId, PDO::PARAM_INT);
            $stmt->execute();
            if (!$stmt->fetch()) {
                $errors['supplier_id'] = 'ไม่พบรหัสผู้จัดจำหน่ายที่ระบุในฐานข้อมูล';
            }
        }

        // 3. ตรวจสอบหมวดหมู่สินค้า
        if ($categoryId === '' || !is_numeric($categoryId) || (int)$categoryId <= 0) {
            $errors['category_id'] = 'กรุณาเลือกหมวดหมู่สินค้า (Category)';
        } else {
            $stmt = $this->conn->prepare("SELECT i_CategoryID FROM tb_categories WHERE i_CategoryID = :id");
            $stmt->bindValue(':id', (int)$categoryId, PDO::PARAM_INT);
            $stmt->execute();
            if (!$stmt->fetch()) {
                $errors['category_id'] = 'ไม่พบรหัสหมวดหมู่สินค้าที่ระบุในฐานข้อมูล';
            }
        }

        // 4. ตรวจสอบหน่วยนับ
        if ($unit === '') {
            $errors['unit'] = 'กรุณาระบุหน่วยนับ (เช่น ชิ้น, กล่อง, ขวด)';
        } elseif (mb_strlen($unit, 'UTF-8') > 30) {
            $errors['unit'] = 'หน่วยนับต้องไม่เกิน 30 ตัวอักษร';
        }

        // 5. ตรวจสอบราคา
        if ($price === '' || !is_numeric($price)) {
            $errors['price'] = 'กรุณาระบุราคาสินค้าเป็นตัวเลข';
        } elseif ((float)$price < 0) {
            $errors['price'] = 'ราคาสินค้าต้องไม่ต่ำกว่า 0 บาท';
        }

        return $errors;
    }
}
