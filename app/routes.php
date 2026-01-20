<?php
/**
 * Definición de rutas de la API v3
 */

// Cargar controlador de sensores de alertas
require_once __DIR__ . '/controllers/AlertSensorsController.php';

$router->addRoute('GET', '/health', 'HealthController', 'check');
$router->addRoute('GET', '/health/detailed', 'HealthController', 'detailed');

// Autenticación
$router->addRoute('POST', '/auth/login', 'AuthController', 'login');
$router->addRoute('POST', '/auth/logout', 'AuthController', 'logout');
$router->addRoute('GET', '/auth/me', 'AuthController', 'getCurrentUser');
$router->addRoute('POST', '/auth/users', 'AuthController', 'createUser');

// Dashboard
$router->addRoute('GET', '/dashboard/overview', 'DashboardController', 'overview');
$router->addRoute('GET', '/dashboard/stats', 'DashboardController', 'stats');

// Sensores
$router->addRoute('GET', '/sensors', 'SensorsController', 'list');
$router->addRoute('GET', '/sensors/{id}', 'SensorsController', 'get');
$router->addRoute('POST', '/sensors', 'SensorsController', 'create');
$router->addRoute('PUT', '/sensors/{id}', 'SensorsController', 'update');
$router->addRoute('DELETE', '/sensors/{id}', 'SensorsController', 'delete');
$router->addRoute('GET', '/sensors/types', 'SensorsController', 'getTypes');
$router->addRoute('GET', '/sensors/station/{stationId}', 'SensorsController', 'getByStation');

// Datos de sensores
$router->addRoute('POST', '/sensor-data/receive', 'SensorDataController', 'receiveData');
$router->addRoute('GET', '/sensor-data/latest', 'SensorDataController', 'getLatestData');
$router->addRoute('GET', '/sensor-data/historical', 'SensorDataController', 'getHistoricalData');
$router->addRoute('GET', '/sensor-data/statistics', 'SensorDataController', 'getStatistics');
$router->addRoute('GET', '/sensor-data/parcela/{parcelaId}', 'SensorDataController', 'getParcelaData');
$router->addRoute('GET', '/sensor-data/export', 'SensorDataController', 'exportData');

// Zonas
$router->addRoute('GET', '/zones', 'ZonesController', 'list');
$router->addRoute('GET', '/zones/{id}', 'ZonesController', 'get');
$router->addRoute('POST', '/zones', 'ZonesController', 'create');
$router->addRoute('PUT', '/zones/{id}', 'ZonesController', 'update');
$router->addRoute('DELETE', '/zones/{id}', 'ZonesController', 'delete');

// Parcelas
$router->addRoute('GET', '/parcels', 'ParcelsController', 'list');
$router->addRoute('GET', '/parcels/{id}', 'ParcelsController', 'get');
$router->addRoute('POST', '/parcels', 'ParcelsController', 'create');
$router->addRoute('PUT', '/parcels/{id}', 'ParcelsController', 'update');
$router->addRoute('DELETE', '/parcels/{id}', 'ParcelsController', 'delete');
$router->addRoute('GET', '/parcels/zone/{zoneId}', 'ParcelsController', 'getByZone');

// Estaciones
$router->addRoute('GET', '/stations', 'StationsController', 'list');
$router->addRoute('GET', '/stations/{id}', 'StationsController', 'get');
$router->addRoute('POST', '/stations', 'StationsController', 'create');
$router->addRoute('PUT', '/stations/{id}', 'StationsController', 'update');
$router->addRoute('DELETE', '/stations/{id}', 'StationsController', 'delete');
$router->addRoute('GET', '/stations/parcela/{parcelaId}', 'StationsController', 'getByParcela');

// Alertas generadas (visualizadores pueden ver solo activas)
$router->addRoute('GET', '/alerts', 'AlertsController', 'list');
$router->addRoute('GET', '/alerts/active', 'AlertsController', 'active');
$router->addRoute('POST', '/alerts/{id}/acknowledge', 'AlertsController', 'acknowledge');
$router->addRoute('POST', '/alerts/{id}/resolve', 'AlertsController', 'resolve');

// Alertas configuradas (solo admin y operador)
$router->addRoute('GET', '/alerts/configured', 'AlertsController', 'listConfigured');
$router->addRoute('GET', '/alerts/configured/{id}', 'AlertsController', 'getConfigured');
$router->addRoute('POST', '/alerts/configured', 'AlertsController', 'createConfigured');
$router->addRoute('PUT', '/alerts/configured/{id}', 'AlertsController', 'updateConfigured');
$router->addRoute('DELETE', '/alerts/configured/{id}', 'AlertsController', 'deleteConfigured');

$router->addRoute('PUT', '/alerts/configured/{id}/toggle', 'AlertsController', 'toggleConfigured');
$router->addRoute('POST', '/alerts/configured/bulk-toggle', 'AlertsController', 'bulkToggle');

// Evaluación de alertas (solo admin)
$router->addRoute('POST', '/alerts/evaluate', 'AlertsController', 'evaluateAlerts');

// Estadísticas de alertas
$router->addRoute('GET', '/alerts/statistics', 'AlertsController', 'statistics');

// Test de emails
$router->addRoute('POST', '/alerts/configured/{id}/test-email', 'AlertsController', 'sendTestEmail');
$router->addRoute('GET', '/alerts/email-methods-stats', 'AlertsController', 'getEmailMethodsStats');

// Sensores de alertas
$router->addRoute('GET', '/alerts/configured/{id}/sensors', 'AlertSensorsController', 'getAlertSensors');
$router->addRoute('POST', '/alerts/configured/sensors', 'AlertSensorsController', 'addSensorToAlert');
$router->addRoute('PUT', '/alerts/configured/sensors/{id}', 'AlertSensorsController', 'updateAlertSensor');
$router->addRoute('PUT', '/alerts/configured/sensors/{id}/toggle', 'AlertSensorsController', 'toggleSensorStatus');
$router->addRoute('DELETE', '/alerts/configured/sensors/{id}', 'AlertSensorsController', 'removeSensorFromAlert');
$router->addRoute('POST', '/alerts/configured/sensors/bulk', 'AlertSensorsController', 'bulkAddSensors');

// Additional routes for alert sensors management
$router->addRoute('GET', '/alerts/configured/{id}/sensors/details', 'AlertSensorsController', 'getSensorDetails');
$router->addRoute('POST', '/alerts/configured/{id}/sensors/priority', 'AlertSensorsController', 'setSensorPriority');

// Usuarios
$router->addRoute('GET', '/users', 'UsersController', 'list');
$router->addRoute('GET', '/users/{id}', 'UsersController', 'get');
$router->addRoute('POST', '/users', 'UsersController', 'create');
$router->addRoute('PUT', '/users/{id}', 'UsersController', 'update');
$router->addRoute('DELETE', '/users/{id}', 'UsersController', 'delete');

// Auditoría
$router->addRoute('GET', '/audit', 'AuditController', 'list');
$router->addRoute('GET', '/audit/{id}', 'AuditController', 'get');
$router->addRoute('GET', '/audit/user/{userId}', 'AuditController', 'getByUser');
$router->addRoute('GET', '/audit/module/{module}', 'AuditController', 'getByModule');

// Permisos
$router->addRoute('GET', '/permissions', 'PermissionsController', 'list');
$router->addRoute('GET', '/permissions/user/{userId}', 'PermissionsController', 'getUserPermissions');
$router->addRoute('POST', '/permissions/user/{userId}', 'PermissionsController', 'assignPermission');
$router->addRoute('DELETE', '/permissions/user/{userId}/{permission}', 'PermissionsController', 'revokePermission');
$router->addRoute('GET', '/permissions/role/{role}', 'PermissionsController', 'getRolePermissions');
