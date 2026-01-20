# SAYARIQ System - PHP/MySQL Backend

## Setup Instructions

### 1. Database Configuration
Edit `backend/config/database.php` with your MySQL credentials:
- Host: localhost
- Database: sayariq_db
- User: your_mysql_user
- Password: your_mysql_password

### 2. Create Database
Run the schema file to create all tables:
\`\`\`bash
mysql -u root -p < backend/database/schema.sql
\`\`\`

### 3. Configure Web Server
Point your web server document root to `backend/public` directory

For Apache, ensure mod_rewrite is enabled:
\`\`\`bash
sudo a2enmod rewrite
sudo systemctl restart apache2
\`\`\`

### 4. API Endpoints
Base URL: http://your-domain.com/api/

**Available Resources:**
- personas - Manage producers and suppliers
- lotes - Batch management
- pesos - Weight records
- ajustes-contables - Accounting adjustments
- pagos-campo - Field payments
- pedidos - Orders management
- kardex - Inventory movements
- ventas - Sales registration
- banco - Bank book entries
- costos-fijos - Fixed costs
- empleados - Employee management
- rentabilidad - Profitability reports (diaria/semanal/mensual)

**REST Operations:**
- GET /api/{resource} - List all
- GET /api/{resource}/{id} - Get single record
- POST /api/{resource} - Create new
- PUT /api/{resource}/{id} - Update existing
- DELETE /api/{resource}/{id} - Delete record

### 5. CORS Configuration
Update `backend/public/index.php` to allow your frontend domain in the CORS headers
