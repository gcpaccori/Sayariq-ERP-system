<?php
/**
 * Configuración CORS - Totalmente abierto para acceso desde cualquier origen
 */

class CorsHandler {
    
    public static function handleCors() {
        // Permitir cualquier origen
        if (isset($_SERVER['HTTP_ORIGIN'])) {
            header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        } else {
            header("Access-Control-Allow-Origin: *");
        }
        
        // Permitir credenciales
        header('Access-Control-Allow-Credentials: true');
        
        // Permitir todos los métodos HTTP
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        
        // Permitir todos los headers
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
        } else {
            header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Version, X-API-Key');
        }
        
        // Cache preflight por 24 horas
        header('Access-Control-Max-Age: 86400');
        
        // Exponer headers útiles
        header('Access-Control-Expose-Headers: X-Total-Count, X-Page-Count, X-Current-Page');
        
        // Manejar preflight OPTIONS
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'message' => 'CORS preflight successful',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            exit;
        }
    }
}

// Aplicar CORS inmediatamente
CorsHandler::handleCors();
?>
