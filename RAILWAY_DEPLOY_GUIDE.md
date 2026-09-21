# คู่มือการ Deploy เว็บแอปพลิเคชันและฐานข้อมูลขึ้น Railway (PaaS)
## Northwind Product Management Web Application

คู่มือนี้จัดทำขึ้นเพื่อแนะนำขั้นตอนการนำโปรเจกต์เว็บแอปพลิเคชัน PHP + MySQL ขึ้นสู่ระบบออนไลน์บนแพลตฟอร์ม **Railway (https://railway.com/)** ครบถ้วนตั้งแต่การสร้างฐานข้อมูล, การ Import ข้อมูล, จนถึงการเผยแพร่เว็บไซต์จริง

---

## 📑 สารบัญ
1. [ภาพรวมของสถาปัตยกรรมบน Railway](#1-ภาพรวมของสถาปัตยกรรมบน-railway)
2. [สิ่งที่ต้องเตรียมล่วงหน้า (Prerequisites)](#2-สิ่งที่ต้องเตรียมล่วงหน้า)
3. [ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub](#ขั้นตอนที่-1-นำโค้ดขึ้น-github)
4. [ขั้นตอนที่ 2: สมัครและสร้างโปรเจกต์บน Railway](#ขั้นตอนที่-2-สมัครและสร้างโปรเจกต์บน-railway)
5. [ขั้นตอนที่ 3: สร้าง MySQL Database บน Railway](#ขั้นตอนที่-3-สร้าง-mysql-database-บน-railway)
6. [ขั้นตอนที่ 4: Import ข้อมูล Northwind (dbNorthwind.sql)](#ขั้นตอนที่-4-import-ข้อมูล-northwind-dbnorthwindsql)
7. [ขั้นตอนที่ 5: Deploy Web Service จาก GitHub](#ขั้นตอนที่-5-deploy-web-service-จาก-github)
8. [ขั้นตอนที่ 6: เชื่อมต่อ Environment Variables ระหว่าง Web และ Database](#ขั้นตอนที่-6-เชื่อมต่อ-environment-variables)
9. [ขั้นตอนที่ 7: สร้าง Public Domain และทดสอบใช้งานจริง](#ขั้นตอนที่-7-สร้าง-public-domain-และทดสอบใช้งานจริง)
10. [การแก้ปัญหาที่พบบ่อย (Troubleshooting)](#การแก้ปัญหาที่พบบ่อย-troubleshooting)

---

## 1. ภาพรวมของสถาปัตยกรรมบน Railway

โปรเจกต์นี้ได้รับการออกแบบให้รองรับ Cloud PaaS เต็มรูปแบบ:
- **Web Service**: รัน PHP ผ่าน `router.php` และ `railway.json` / `Procfile`
- **Database Service**: MySQL บน Railway
- **Config**: ไฟล์ `inc/connDB.php` จะอ่านค่า Environment Variables จาก Railway อัตโนมัติ (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`) โดยคงความเข้ากันได้กับ Local MAMP 100%

---

## 2. สิ่งที่ต้องเตรียมล่วงหน้า

1. บัญชี **GitHub** (สำหรับเก็บ Source Code)
2. บัญชี **Railway** (สมัครผ่าน [https://railway.com/](https://railway.com/) โดยแนะนำให้ล็อกอินด้วย GitHub)
3. โปรแกรมจัดการฐานข้อมูล (เช่น **TablePlus**, **DBeaver**, **HeidiSQL** หรือ **phpMyAdmin**) สำหรับ Import ข้อมูล

---

## ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub

1. เปิด Terminal / PowerShell ที่โฟลเดอร์โปรเจกต์:
   ```bash
   cd c:\MAMP\htdocs\project
   ```

2. สร้าง Git Repository และ Commit โค้ด:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Northwind CRUD Web App with API"
   ```

3. Repository บน GitHub ของคุณ:
   `https://github.com/Achernar046/ApplicationW.git`
4. โค้ดทั้งหมดได้ถูก Push ขึ้น Branch `main` เรียบร้อยแล้ว:
   ```bash
   git remote add origin https://github.com/Achernar046/ApplicationW.git
   git push -u origin main
   ```

---

## ขั้นตอนที่ 2: สมัครและสร้างโปรเจกต์บน Railway

1. เข้าเว็บไซต์ [https://railway.com/](https://railway.com/)
2. คลิก **Login** เลือก **Login with GitHub**
3. ที่หน้า Dashboard คลิกปุ่ม **New Project** (หรือ **+ Create a New Project**)

---

## ขั้นตอนที่ 3: สร้าง MySQL Database บน Railway

1. ในหน้าเลือก Template หรือ Service ให้เลือก **Provision MySQL** (หรือคลิก `Database` > `Add MySQL`)
2. รอสักครู่ (ประมาณ 10-30 วินาที) Railway จะสร้าง Instance ของ MySQL ให้เสร็จสมบูรณ์
3. คลิกเข้าไปที่กล่อง **MySQL**
4. ไปที่แท็บ **Variables** จะเห็นข้อมูลการเชื่อมต่อ เช่น:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE` (ค่าเริ่มต้นมักจะเป็น `railway`)
5. ไปที่แท็บ **Connect** จะมี URL สำหรับเชื่อมต่อภายนอก (Public Networking) ให้กด **Enable Public Networking** เพื่อให้สามารถเชื่อมต่อจากเครื่องคอมพิวเตอร์ของเราเข้าไป Import ข้อมูลได้

---

## ขั้นตอนที่ 4: Import ข้อมูล Northwind (dbNorthwind.sql)

ไฟล์ฐานข้อมูลอยู่ที่ `c:\MAMP\htdocs\project\dbNorthwind.sql`

### วิธีที่ 1: นำเข้าผ่านโปรแกรม TablePlus / DBeaver / HeidiSQL (แนะนำ ง่ายที่สุด)
1. เปิดโปรแกรมจัดการฐานข้อมูล (เช่น TablePlus หรือ DBeaver)
2. สร้าง Connection ใหม่แบบ MySQL
3. นำข้อมูลจากแท็บ **Connect** ของ Railway (Public Domain, Port, User, Password, Database) มากรอก
4. เมื่อเชื่อมต่อสำเร็จ ให้เปิดไฟล์ `dbNorthwind.sql` แล้วกด Execute / Run SQL ทั้งหมด
5. ตรวจสอบว่าตาราง `tb_products`, `tb_categories`, `tb_suppliers` ถูกสร้างและมีข้อมูลเรียบร้อย

### วิธีที่ 2: นำเข้าผ่าน Command Line
ใช้คำสั่ง MySQL CLI จากเครื่องของคุณ:
```bash
mysql -h <PUBLIC_HOST> -P <PUBLIC_PORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < c:\MAMP\htdocs\project\dbNorthwind.sql
```

---

## ขั้นตอนที่ 5: Deploy Web Service จาก GitHub

1. ใน Project เดียวกันบน Railway คลิกปุ่ม **+ Create** หรือ **+ New**
2. เลือก **GitHub Repo**
3. เลือก Repository ที่เรา Push ขึ้นไป (`northwind-product-app`)
4. Railway จะเริ่มทำการ Build อัตโนมัติ โดยตรวจจับไฟล์ `railway.json` และ `Procfile` ที่เตรียมไว้

---

## ขั้นตอนที่ 6: เชื่อมต่อ Environment Variables

เพื่อให้ Web Application เชื่อมต่อกับ MySQL บน Railway ได้อย่างถูกต้อง:

1. คลิกที่ Service ของ **Web App** (ไม่ใช่ตัว MySQL)
2. ไปที่แท็บ **Variables**
3. คลิกปุ่ม **New Variable** หรือ **Add Reference** (แนะนำ **Add Reference**):
   - เพิ่ม `MYSQLHOST` = `${{MySQL.MYSQLHOST}}`
   - เพิ่ม `MYSQLPORT` = `${{MySQL.MYSQLPORT}}`
   - เพิ่ม `MYSQLUSER` = `${{MySQL.MYSQLUSER}}`
   - เพิ่ม `MYSQLPASSWORD` = `${{MySQL.MYSQLPASSWORD}}`
   - เพิ่ม `MYSQLDATABASE` = `${{MySQL.MYSQLDATABASE}}`
   *(หรือคัดลอกค่าจากแท็บ Variables ของ MySQL มาวางตรงๆ)*
4. เมื่อบันทึกตัวแปรแล้ว Railway จะทำการ Redeploy ให้ใหม่อัตโนมัติ

---

## ขั้นตอนที่ 7: สร้าง Public Domain และทดสอบใช้งานจริง

1. คลิกที่ Service ของ **Web App**
2. ไปที่แท็บ **Settings**
3. เลื่อนลงมาที่หัวข้อ **Networking**
4. คลิกปุ่ม **Generate Domain** (จะได้ URL เช่น `https://northwind-product-app-production.up.railway.app`)
5. คลิกเปิด URL เพื่อทดสอบการทำงาน:
   - ทดสอบค้นหาชื่อสินค้า
   - ทดสอบกรองตามหมวดหมู่และผู้จัดจำหน่าย
   - ทดสอบกดปุ่ม "เพิ่มสินค้าใหม่" และตรวจสอบการแจ้งเตือน
   - ทดสอบการแก้ไขข้อมูล (Update)
   - ทดสอบการลบข้อมูล (Delete)

---

## การแก้ปัญหาที่พบบ่อย (Troubleshooting)

### 1. หน้าเว็บขึ้น "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล"
- **สาเหตุ**: Environment Variables ของ MySQL ยังไม่ได้ใส่ หรือใส่ค่าผิด
- **วิธีแก้**: ตรวจสอบในแท็บ Variables ของ Web App ว่ามี `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` ครบถ้วนหรือไม่

### 2. ลบสินค้าไม่ผ่าน (HTTP 409)
- **สาเหตุ**: สินค้านั้นถูกอ้างอิงอยู่ในตาราง `tb_orderdetails` (มีประวัติคำสั่งซื้อ) ระบบได้ป้องกันเพื่อไม่ให้ข้อมูลเสียหาย
- **วิธีแก้**: ให้ทดลองเพิ่มสินค้าใหม่ขึ้นมา 1 ชิ้น แล้วทดสอบลบชิ้นที่สร้างใหม่ จะสามารถลบได้สำเร็จ 100%

### 3. เมื่อรันในเครื่อง MAMP ทำไมยังใช้ได้ปกติ?
- **เหตุผล**: โค้ดใน `inc/connDB.php` ถูกเขียนให้ตรวจจับอัตโนมัติ หากไม่มี Environment Variables ของ Cloud ระบบจะสลับไปใช้ค่าของ Local MAMP (`localhost`, `root`, `root`, `db_northwind`) ทันที
