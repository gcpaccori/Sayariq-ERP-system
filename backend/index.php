case 'categorias':
    require_once 'controllers/CategoriasController.php';
    $controller = new CategoriasController($pdo);
    $controller->handleRequest($method, $id, $action);
    break;
