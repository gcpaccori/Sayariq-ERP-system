<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');



class Database {
    private $host = "localhost";
    private $database_name = "fran2869_sayariq";
    private $username = "fran2869_sayariq";
    private $password = "OdHnplX!OwriBM{M";
    private $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->database_name . ";charset=utf8mb4",
                $this->username,
                $this->password,
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            );
            
            // Log de conexión exitosa
            error_log("[SUCCESS] Conexión a base de datos establecida: " . $this->database_name);
            
        } catch(PDOException $exception) {
            $errorMsg = "Error de conexión a base de datos: " . $exception->getMessage();
            error_log("[ERROR] " . $errorMsg);
            
            // Respuesta JSON con error visible
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database Connection Error',
                'message' => $exception->getMessage(),
                'code' => $exception->getCode(),
                'host' => $this->host,
                'database' => $this->database_name,
                'user' => $this->username,
                'timestamp' => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT);
            exit();
        }
        
        return $this->conn;
    }
    
    public function testConnection() {
        try {
            $conn = $this->getConnection();
            
            if ($conn) {
                return [
                    'success' => true,
                    'message' => 'Conexión exitosa',
                    'host' => $this->host,
                    'database' => $this->database_name,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
}
?>
