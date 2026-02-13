<?php
require_once '../config/database.php';
require_once '../controllers/BaseController.php';
require_once '../controllers/PersonasController.php';
require_once '../controllers/LotesController.php';
require_once '../controllers/PesosController.php';
require_once '../controllers/AjusteContableController.php';
require_once '../controllers/PagoCampoController.php';
require_once '../controllers/PedidosController.php';
require_once '../controllers/KardexController.php';
require_once '../controllers/VentasController.php';
require_once '../controllers/BancoController.php';
require_once '../controllers/CostosFijosController.php';
require_once '../controllers/EmpleadosController.php';
require_once '../controllers/RentabilidadController.php';
require_once '../controllers/AdelantosController.php';
require_once '../controllers/AnalisisLotesPedidosController.php';
require_once '../controllers/RegistroPesosController.php';
require_once '../controllers/PesosLoteController.php';
require_once '../controllers/LiquidacionesController.php';
require_once '../controllers/LiquidacionClientesController.php';
require_once '../controllers/LiquidacionProveedoresController.php';
require_once '../controllers/CategoriasPesoController.php';
require_once '../controllers/KardexIntegralController.php';

// ✨ Helper para kardex integral
require_once '../helpers/KardexIntegralHelper.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('No se pudo establecer conexi車n con la base de datos');
    }
    
    $request_method = $_SERVER["REQUEST_METHOD"];
    $request_uri = $_SERVER['REQUEST_URI'];

    // Remove query string and base path
    $path = parse_url($request_uri, PHP_URL_PATH);
    $path = str_replace('/backend/public/index.php', '', $path);
    $path = str_replace('/backend', '', $path);
    $path = str_replace('/api', '', $path);
    $path = trim($path, '/');

    logMessage('DEBUG', 'Procesando ruta', [
        'path' => $path,
        'method' => $request_method,
        'uri' => $request_uri
    ]);

    // Parse route
    $segments = explode('/', $path);
    $resource = $segments[0] ?? '';

$id = null;
$action = null;

if (isset($segments[1])) {
    if (is_numeric($segments[1])) {
        $id = $segments[1];
        $action = $segments[2] ?? null;
    } else {
        $action = $segments[1];
    }
}

    // Route to controllers
    $controller = null;

    switch($resource) {
        case 'personas':
            $controller = new PersonasController($db);
            break;
        case 'lotes':
            $controller = new LotesController($db);
            break;
        case 'pesos':
            $controller = new PesosController($db);
            break;
        case 'pesos-lote':
            $controller = new PesosLoteController($db);
            break;
        case 'ajustes-contables':
            $controller = new AjusteContableController($db);
            break;
        case 'pagos-campo':
            $controller = new PagoCampoController($db);
            break;
        case 'pedidos':
            $controller = new PedidosController($db);
            break;
        case 'kardex':
            $controller = new KardexController($db);
            break;
        case 'ventas':
            $controller = new VentasController($db);
            break;
        case 'banco':
            $controller = new BancoController($db);
            break;
        case 'costos-fijos':
            $controller = new CostosFijosController($db);
            break;
        case 'empleados':
            $controller = new EmpleadosController($db);
            break;
        case 'rentabilidad':
            $controller = new RentabilidadController($db);
            break;
        case 'adelantos':
            $controller = new AdelantosController($db);
            break;
        case 'analisis-lotes-pedidos':
            $controller = new AnalisisLotesPedidosController($db);
            break;
        case 'registro-pesos':
            $controller = new RegistroPesosController($db);
            break;
        case 'liquidaciones':
            $controller = new LiquidacionesController($db);
            break;
        case 'liquidaciones-clientes':
            $controller = new LiquidacionClientesController($db);
            break;
        case 'liquidaciones-proveedores':
            $controller = new LiquidacionProveedoresController($db);
            break;
        case 'categorias-peso':
            $controller = new CategoriasPesoController($db);
            break;
        case 'kardex-integral':
            // Manejo especial de rutas anidadas para kardex-integral
            $kardexController = new KardexIntegralController($db);
            $subPath = implode('/', array_slice($segments, 1));
            
            if ($request_method === 'GET') {
                if ($subPath === '' || $subPath === '/') {
                    echo json_encode($kardexController->getAll());
                } elseif ($subPath === 'saldos/fisico') {
                    echo json_encode($kardexController->getSaldosFisicos());
                } elseif ($subPath === 'saldos/financiero') {
                    echo json_encode($kardexController->getSaldosFinancieros());
                } elseif (preg_match('/^por-productor\/(\d+)$/', $subPath, $m)) {
                    echo json_encode($kardexController->getPorProductor($m[1]));
                } elseif ($subPath === 'por-documento') {
                    echo json_encode($kardexController->getPorDocumento());
                } elseif (preg_match('/^reporte\/estado-cuenta\/(\d+)$/', $subPath, $m)) {
                    echo json_encode($kardexController->getEstadoCuentaProductor($m[1]));
                } elseif ($subPath === 'reporte/flujo-caja') {
                    echo json_encode($kardexController->getFlujoCaja());
                } elseif ($subPath === 'reporte/inventario') {
                    echo json_encode($kardexController->getReporteInventario());
                } elseif (is_numeric($subPath)) {
                    echo json_encode($kardexController->getById($subPath));
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Ruta no encontrada: kardex-integral/' . $subPath]);
                }
            } elseif ($request_method === 'POST') {
                if ($subPath === 'liquidacion') {
                    echo json_encode($kardexController->registrarLiquidacion());
                } elseif ($subPath === 'venta') {
                    echo json_encode($kardexController->registrarVenta());
                } elseif ($subPath === 'adelanto') {
                    echo json_encode($kardexController->registrarAdelanto());
                } elseif ($subPath === 'manual') {
                    echo json_encode($kardexController->registrarManual());
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Ruta POST no encontrada']);
                }
            } elseif ($request_method === 'DELETE') {
                if (is_numeric($subPath)) {
                    echo json_encode($kardexController->delete($subPath));
                } else {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'ID requerido para eliminar']);
                }
            } else {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
            }
            exit();
        default:
            http_response_code(404);
            jsonResponse([
                'success' => false,
                'error' => 'Resource Not Found',
                'message' => "Recurso no encontrado: {$resource}",
                'path' => $path,
                'available_resources' => [
                    'personas', 'lotes', 'pesos', 'pesos-lote', 'ajustes-contables',
                    'pagos-campo', 'pedidos', 'kardex', 'ventas',
                    'banco', 'costos-fijos', 'empleados', 'rentabilidad', 
                    'adelantos', 'analisis-lotes-pedidos', 'registro-pesos', 
                    'liquidaciones', 'liquidaciones-clientes', 'liquidaciones-proveedores',
                    'categorias-peso', 'kardex-integral'
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ], 404);
            exit();
    }

    // Handle request
    if ($controller) {
        $controller->handleRequest($request_method, $id, $action);
    }
    
} catch (Exception $e) {
    logMessage('ERROR', 'Error en API', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    jsonResponse([
        'success' => false,
        'error' => 'API Error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => DEBUG_MODE ? $e->getTraceAsString() : null,
        'timestamp' => date('Y-m-d H:i:s')
    ], 500);
}
?>
