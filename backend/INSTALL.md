# Instalación del Backend PHP/MySQL

## Requisitos
- PHP 7.4 o superior
- MySQL 5.7 o superior
- Apache o Nginx

## Pasos de Instalación

### 1. Configurar Base de Datos
\`\`\`bash
# Crear base de datos
mysql -u root -p
CREATE DATABASE sayariq_erp;
exit;

# Importar esquema
mysql -u root -p sayariq_erp < database/schema.sql
\`\`\`

### 2. Configurar PHP
Editar `config/database.php` con tus credenciales:
\`\`\`php
'host' => 'localhost',
'database' => 'sayariq_erp',
'username' => 'tu_usuario',
'password' => 'tu_contraseña'
\`\`\`

### 3. Configurar Servidor Web

#### Apache
- Copiar carpeta `backend` al directorio web (ej: /var/www/html/)
- Asegurar que mod_rewrite esté habilitado
- El archivo .htaccess ya está configurado

#### Nginx
\`\`\`nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /ruta/a/backend/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
\`\`\`

### 4. Permisos
\`\`\`bash
chmod -R 755 backend/
chmod -R 775 backend/public/
\`\`\`

### 5. Probar API
\`\`\`bash
curl http://localhost:8000/api/personas
\`\`\`

## Estructura de URLs
- Base URL: `http://localhost:8000/api`
- Personas: `/personas`
- Lotes: `/lotes`
- Pedidos: `/pedidos`
- Pesos: `/pesos`
- Ajustes Contables: `/ajustes-contables`
- Pagos Campo: `/pagos-campo`
- Ventas: `/ventas`
- Kardex: `/kardex`
- Banco: `/banco`
- Costos Fijos: `/costos-fijos`
- Empleados: `/empleados`

## Configuración Frontend
Actualizar `.env.local` en Next.js:
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:8000/api
