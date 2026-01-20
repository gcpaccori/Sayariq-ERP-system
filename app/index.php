<?php
/**
 * Punto de entrada principal de la API v3
 * Ñawpariy Avanza Apurímac - Sistema IoT Agroclimático
 * Versión corregida con mejor manejo de errores y ruteo
 */

// Inicializar tiempo de ejecución
$_SERVER['REQUEST_TIME_FLOAT'] = microtime(true);

// Habilitar logging de errores
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/api_v3_errors.log');

// Log de inicio de request
error_log("=== API v3 Request Start ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("URI: " . $_SERVER['REQUEST_URI']);
error_log("Script Name: " . $_SERVER['SCRIPT_NAME']);

// Cargar configuración
require_once __DIR__ . '/config/config.php';

// Configurar CORS
require_once __DIR__ . '/config/cors.php';

// Cargar clases principales
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/Validator.php';
require_once __DIR__ . '/utils/Router.php';

require_once __DIR__ . '/services/EmailService.php';

// Cargar controladores
require_once __DIR__ . '/controllers/HealthController.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/SensorsController.php';
require_once __DIR__ . '/controllers/SensorDataController.php';
require_once __DIR__ . '/controllers/ZonesController.php';
require_once __DIR__ . '/controllers/ParcelsController.php';
require_once __DIR__ . '/controllers/StationsController.php';
require_once __DIR__ . '/controllers/AlertsController.php';
require_once __DIR__ . '/controllers/UsersController.php';
require_once __DIR__ . '/controllers/AuditController.php';
require_once __DIR__ . '/controllers/PermissionsController.php';

// Manejo de errores global
set_exception_handler(function($exception) {
    error_log("Uncaught exception: " . $exception->getMessage());
    error_log("Stack trace: " . $exception->getTraceAsString());
    
    if (DEBUG_MODE) {
        Response::error('Excepción no capturada: ' . $exception->getMessage() . ' en ' . $exception->getFile() . ':' . $exception->getLine(), 500, [
            'exception_type' => get_class($exception),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'stack_trace' => $exception->getTraceAsString()
        ]);
    } else {
        Response::error('Error interno del servidor', 500);
    }
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    
    error_log("PHP Error: {$message} in {$file} on line {$line}");
    
    if (DEBUG_MODE) {
        Response::error("Error PHP: {$message}", 500, [
            'severity' => $severity,
            'file' => $file,
            'line' => $line,
            'error_type' => 'PHP_ERROR'
        ]);
    } else {
        Response::error('Error interno del servidor', 500);
    }
});

try {
    // Verificar método HTTP
    $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods)) {
        error_log("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
        Response::error('Método HTTP no permitido', 405);
    }
    
    // Verificar si es un request de health check simple
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (strpos($path, '/health') !== false && $_SERVER['REQUEST_METHOD'] === 'GET') {
        error_log("Health check request detected");
        Response::success([
            'status' => 'OK',
            'version' => '3.0',
            'timestamp' => date('Y-m-d H:i:s'),
            'server' => $_SERVER['SERVER_NAME'],
            'path' => $path
        ], 'API v3 funcionando correctamente');
        exit;
    }
    
    // Inicializar router y procesar solicitud
    error_log("Initializing router...");
    $router = new Router();
    $router->route();
    
} catch (Exception $e) {
    error_log("Router error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    Response::error('Error en el enrutamiento: ' . $e->getMessage(), 500);
}

error_log("=== API v3 Request End ===");
