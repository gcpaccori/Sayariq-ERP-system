# Sistema de Alertas Automáticas - Documentación

## Resumen de Cambios

Este documento describe las mejoras implementadas en el sistema de alertas para resolver los problemas de evaluación automática y control de permisos.

## Problemas Resueltos

### 1. ✅ Evaluación Automática en Tiempo Real

**Problema anterior:** Las alertas solo se evaluaban cuando alguien accedía manualmente al endpoint `/alerts/evaluate`.

**Solución implementada:**
- Las alertas ahora se evalúan **automáticamente** cada vez que llegan nuevos datos de sensores
- El método `evaluateAlertsForNewData()` se ejecuta en `SensorDataController::receiveData()`
- Cada lectura de sensor dispara la evaluación de alertas relevantes en tiempo real

**Flujo de evaluación:**
```
Sensor envía datos → receiveData() → Guardar datos → evaluateAlertsForNewData() → Generar alertas + Enviar emails
```

### 2. ✅ Control de Permisos por Rol

**Problema anterior:** Los visualizadores podían acceder a alertas configuradas.

**Solución implementada:**
- Sistema de permisos basado en roles integrado en el Router
- Rutas protegidas con verificación de permisos antes de ejecutar

**Permisos por rol:**

| Rol | Permisos de Alertas |
|-----|---------------------|
| **Admin** | - Ver alertas activas<br>- Ver/crear/editar/eliminar alertas configuradas<br>- Activar/desactivar alertas<br>- Evaluar alertas manualmente<br>- Ver estadísticas |
| **Operador** | - Ver alertas activas<br>- Ver/crear/editar alertas configuradas<br>- Activar/desactivar alertas<br>- Reconocer/resolver alertas |
| **Visualizador** | - Ver alertas activas únicamente<br>- Reconocer alertas |

**Rutas protegidas:**
- `/alerts/configured/*` - Requiere permiso `manage_alerts`
- `/alerts/evaluate` - Requiere permiso `manage_alerts`
- `/alerts/configured/bulk-toggle` - Requiere permiso `manage_alerts`

### 3. ✅ Activar/Desactivar Alertas

**Problema anterior:** No existía funcionalidad para activar/desactivar alertas configuradas.

**Solución implementada:**

#### Nuevos Endpoints:

**Activar/Desactivar una alerta:**
```http
PUT /api-v3/alerts/configured/{id}/toggle
Content-Type: application/json

{
  "activo": true  // o false
}
```

**Activar/Desactivar múltiples alertas:**
```http
POST /api-v3/alerts/configured/bulk-toggle
Content-Type: application/json

{
  "ids": [1, 2, 3],
  "activo": false
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Alerta activada exitosamente",
  "data": {
    "id": 1,
    "activo": true
  }
}
```

## Arquitectura del Sistema

### Evaluación Automática

```
┌─────────────────┐
│  Sensor IoT     │
└────────┬────────┘
         │ POST /sensor-data/receive
         ▼
┌─────────────────────────────────┐
│  SensorDataController           │
│  - receiveData()                │
│  - Validar datos                │
│  - Guardar en BD                │
│  - evaluateAlertsForNewData()   │◄─── EVALUACIÓN AUTOMÁTICA
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Evaluación de Alertas          │
│  1. Buscar alertas activas      │
│  2. Verificar condiciones       │
│  3. Aplicar debounce            │
│  4. Generar alertas             │
│  5. Enviar emails               │
└─────────────────────────────────┘
```

### Cron Job (Respaldo)

Aunque la evaluación es automática, el cron job sigue disponible como respaldo:

```bash
# Ejecutar cada 10 minutos
*/10 * * * * /usr/bin/php /path/to/api-v3/cron/evaluate-alerts.php >> /var/log/alert-evaluation.log 2>&1
```

## Ejemplos de Uso

### 1. Crear una Alerta Configurada

```http
POST /api-v3/alerts/configured
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Temperatura Alta",
  "descripcion": "Alerta cuando la temperatura supera 35°C",
  "categoria": "temperatura",
  "campo_sensor": "temp_ambiente",
  "operador": ">",
  "valor_umbral": 35,
  "nivel_severidad": "HIGH",
  "debounce_minutos": 30,
  "aplica_a_todas_parcelas": true,
  "enviar_email": true,
  "emails_destino": ["admin@example.com"],
  "mensaje_personalizado": "¡Alerta! Temperatura crítica detectada",
  "activo": true
}
```

### 2. Desactivar una Alerta

```http
PUT /api-v3/alerts/configured/1/toggle
Authorization: Bearer {token}
Content-Type: application/json

{
  "activo": false
}
```

### 3. Ver Alertas Activas (Todos los roles)

```http
GET /api-v3/alerts/active
Authorization: Bearer {token}
```

### 4. Ver Alertas Configuradas (Solo Admin/Operador)

```http
GET /api-v3/alerts/configured
Authorization: Bearer {token}
```

## Seguridad

### Validación de Permisos

El Router verifica permisos antes de ejecutar cualquier acción:

1. **Autenticación:** Verifica token válido
2. **Autorización:** Verifica permisos del usuario
3. **Ejecución:** Solo si pasa las validaciones

### Respuestas de Error

**Sin autenticación:**
```json
{
  "success": false,
  "message": "Token de autenticación requerido",
  "error_code": 401
}
```

**Sin permisos:**
```json
{
  "success": false,
  "message": "No tienes permisos para acceder a este recurso",
  "error_code": 403
}
```

## Logs y Debugging

El sistema registra todas las operaciones importantes:

```php
error_log("[SensorDataController] Evaluating alerts for new data - dataId: 123");
error_log("[SensorDataController] Found 5 active alerts to evaluate");
error_log("[SensorDataController] Alert generated: ID 456 for config Temperatura Alta");
error_log("[Router] Permission granted for user 1 on path /alerts/configured");
```

## Monitoreo

### Estadísticas de Alertas

```http
GET /api-v3/alerts/statistics
Authorization: Bearer {token}
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "total_configuradas": 10,
    "activas": 8,
    "total_evaluaciones": 1500,
    "total_alertas_generadas": 45,
    "por_categoria": {
      "temperatura": {"total": 3, "alertas_generadas": 15},
      "humedad": {"total": 2, "alertas_generadas": 10}
    }
  }
}
```

## Mejores Prácticas

1. **Debounce:** Configure tiempos de debounce apropiados (30-60 minutos) para evitar spam de alertas
2. **Emails:** Use emails específicos por tipo de alerta para mejor organización
3. **Activación:** Desactive alertas durante mantenimiento para evitar falsas alarmas
4. **Monitoreo:** Revise las estadísticas regularmente para optimizar umbrales

## Próximos Pasos

- [ ] Implementar notificaciones push
- [ ] Agregar webhooks para integraciones externas
- [ ] Dashboard de monitoreo de alertas en tiempo real
- [ ] Historial de cambios en alertas configuradas
