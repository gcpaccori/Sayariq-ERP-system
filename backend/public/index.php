<?php
require_once '../config/config.php';
require_once '../config/cors.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Preflight OK',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Si es la raíz del backend, mostrar información
if (preg_match('#/backend(/public(/index\.php)?)?/?$#', $path)) {
    jsonResponse([
        'success' => true,
        'message' => 'Backend Sayariq API',
        'version' => API_VERSION,
        'timestamp' => date('Y-m-d H:i:s'),
        'endpoints' => [
            'personas' => '/backend/personas',
            'lotes' => '/backend/lotes',
            'pesos' => '/backend/pesos',
            'ajustes-contables' => '/backend/ajustes-contables',
            'pagos-campo' => '/backend/pagos-campo',
            'pedidos' => '/backend/pedidos',
            'kardex' => '/backend/kardex',
            'ventas' => '/backend/ventas',
            'banco' => '/backend/banco',
            'costos-fijos' => '/backend/costos-fijos',
            'empleados' => '/backend/empleados',
            'rentabilidad' => '/backend/rentabilidad',
            'test' => '/backend/test'
        ],
        'database' => [
            'host' => DB_HOST,
            'name' => DB_NAME,
            'user' => DB_USER
        ],
        'config' => [
            'debug_mode' => DEBUG_MODE,
            'api_version' => API_VERSION,
            'auth_required' => AUTH_REQUIRED
        ]
    ]);
}

if (preg_match('#/backend/test/?$#', $path)) {
    require_once '../config/database.php';
    $database = new Database();
    $result = $database->testConnection();
    jsonResponse($result);
}

// Include router
require_once '../routes/api.php';
?>
