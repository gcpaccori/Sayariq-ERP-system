<?php
/**
 * Configuración principal del backend Sayariq
 * Acceso total desde cualquier origen con errores visibles
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

// Configuración de zona horaria
date_default_timezone_set('America/Lima');

// Configuración de memoria y tiempo
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 300);

// Configuración de la aplicación
define('API_VERSION', '1.1');
define('DEBUG_MODE', true);
define('AUTH_REQUIRED', false); // Acceso abierto

// Configuración de base de datos InfinityFree
define('DB_HOST', 'sql308.infinityfree.com');
define('DB_NAME', 'if0_40375920_sayariq');
define('DB_USER', 'if0_40375920');
define('DB_PASS', '4EcScCLR1tZun');
define('DB_CHARSET', 'utf8mb4');

// Configuración de sesiones
define('SESSION_LIFETIME', 86400); // 24 horas

// Configuración de archivos
define('UPLOAD_PATH', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB

// Configuración de logging
define('LOG_LEVEL', 'DEBUG');
define('LOG_PATH', __DIR__ . '/../logs/');

// Configuración de API
define('API_RATE_LIMIT', 10000); // requests per hour
define('API_TIMEOUT', 30); // seconds

// Configuración de seguridad
define('ENCRYPTION_KEY', 'sayariq_2024_key');
define('JWT_SECRET', 'sayariq_jwt_secret_2024');

// Crear directorios necesarios
$directories = [
    LOG_PATH,
    UPLOAD_PATH
];

foreach ($directories as $dir) {
    if (!file_exists($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// Configuración de headers de seguridad
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Configuración de contenido
header('Content-Type: application/json; charset=utf-8');

// Función de logging mejorada
function logMessage($level, $message, $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' | Context: ' . json_encode($context) : '';
    $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
    
    $logFile = LOG_PATH . 'api_' . date('Y-m-d') . '.log';
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // También mostrar en pantalla si DEBUG_MODE está activo
    if (DEBUG_MODE) {
        error_log($logEntry);
    }
}

// Función de configuración dinámica
function getConfig($key, $default = null) {
    $configs = [
        'api.version' => API_VERSION,
        'api.debug' => DEBUG_MODE,
        'db.host' => DB_HOST,
        'db.name' => DB_NAME,
        'upload.max_size' => MAX_FILE_SIZE,
        'auth.required' => AUTH_REQUIRED
    ];
    
    return $configs[$key] ?? $default;
}

// Log de inicio de la aplicación
logMessage('INFO', 'Backend Sayariq v' . API_VERSION . ' iniciado', [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
]);

// Función para responder con JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Manejador de errores global
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $error = [
        'success' => false,
        'error' => 'PHP Error',
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline,
        'code' => $errno,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    logMessage('ERROR', $errstr, [
        'file' => $errfile,
        'line' => $errline,
        'code' => $errno
    ]);
    
    // Mostrar error visible
    if (DEBUG_MODE) {
        echo json_encode($error, JSON_PRETTY_PRINT);
    }
    
    return true;
});

// Manejador de excepciones global
set_exception_handler(function($exception) {
    $error = [
        'success' => false,
        'error' => 'Exception',
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    logMessage('EXCEPTION', $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ]);
    
    jsonResponse($error, 500);
});
?>
