# Dashboard Admin - Sistema de Análisis 5 Porqués con IA

## 🎯 Características

- **Dashboard Interactivo**: Visualiza todos tus análisis 5W en una interfaz moderna
- **Evaluación con IA**: Cada análisis es evaluado automáticamente por Ollama
- **Puntuación Detallada**: Score de 0-100 con grades (A+, A, B, C, D, F)
- **Feedback Inteligente**: Fortalezas, debilidades, sugerencias y tips personalizados
- **Gráficos en Tiempo Real**: Visualiza tendencias, distribuciones y métricas
- **Importación Excel**: Carga análisis masivos desde DB_5P.xlsx
- **Base de Datos SQLite**: Almacenamiento persistente con histórico completo

## 🚀 Instalación

### 1. Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 2. Verificar que Ollama esté corriendo

```powershell
# Verificar Ollama
curl http://127.0.0.1:11434

# Si no está corriendo, iniciarlo
ollama serve
```

### 3. Inicializar la base de datos

```powershell
python database.py
```

### 4. Iniciar el servidor

```powershell
python app.py
```

El dashboard estará disponible en: **http://localhost:5000**

## 📊 Uso

### Dashboard Principal

1. Accede a http://localhost:5000
2. Verás estadísticas generales y gráficos
3. Lista completa de análisis con sus evaluaciones

### Crear Nuevo Análisis

1. Clic en "➕ Nuevo Análisis"
2. Completa el formulario de 5 Porqués
3. Marca "Evaluar automáticamente con IA"
4. Guarda y espera la evaluación (10-30 segundos)

### Importar desde Excel

1. Clic en "📥 Importar Excel"
2. Selecciona categoría (opcional)
3. Define límite de registros (opcional)
4. Marca "Evaluar automáticamente"
5. Espera a que se procesen todos

### Evaluar Análisis Existente

1. Busca el análisis en la lista
2. Clic en "🤖 Evaluar con IA"
3. Espera la evaluación completa

## 📈 Métricas y Evaluación

### Score General (0-100)
- **90-100**: A+ (Excelente)
- **85-89**: A (Muy Bueno)
- **80-84**: B+ (Bueno)
- **75-79**: B (Aceptable)
- **70-74**: C+ (Regular)
- **60-69**: C (Necesita mejora)
- **<60**: D/F (Insuficiente)

### Componentes Evaluados

1. **Coherencia de Cadena**: Conexión lógica entre niveles
2. **Alineación Causa Raíz**: Si la causa raíz es la correcta
3. **Alineación Plan de Acción**: Si el plan ataca la causa raíz

### Feedback IA

- ✅ **Fortalezas**: Qué está bien en el análisis
- ❌ **Debilidades**: Qué falta o está mal
- 💡 **Sugerencias**: Cómo mejorarlo específicamente
- 🎯 **Tips**: Consejos prácticos de redacción

## 🔌 API Endpoints

### Análisis
- `GET /api/analisis` - Listar análisis
- `POST /api/analisis` - Crear análisis
- `GET /api/analisis/:id` - Obtener análisis específico
- `PUT /api/analisis/:id` - Actualizar análisis
- `DELETE /api/analisis/:id` - Eliminar análisis

### Evaluación
- `POST /api/analisis/:id/evaluar` - Evaluar con IA
- `GET /api/evaluaciones/recientes` - Últimas evaluaciones

### Estadísticas
- `GET /api/estadisticas` - Estadísticas globales
- `GET /api/metricas?dias=30` - Métricas temporales

### Importación
- `POST /api/importar` - Importar desde Excel

## 🛠️ Estructura del Proyecto

```
Analisis_IA/
├── app.py                    # Backend Flask con API REST
├── database.py               # Modelos y operaciones de BD
├── ai_evaluator.py           # Evaluador con Ollama
├── analisis_5w.db           # Base de datos SQLite (auto-generada)
├── templates/
│   └── dashboard.html       # Frontend dashboard
├── static/
│   ├── css/
│   │   └── dashboard.css    # Estilos
│   └── js/
│       └── dashboard.js     # Lógica frontend
└── requirements.txt         # Dependencias Python
```

## 🎨 Capturas

### Dashboard Principal
- Vista general con estadísticas
- Gráficos de distribución y tendencias
- Lista de análisis con evaluaciones

### Card de Análisis
- Badge de categoría y ruta
- Score y grade visual
- Métricas de coherencia, causa raíz y plan
- Feedback expandible (fortalezas, debilidades, tips)

### Gráficos
- 📊 Distribución por categoría (Doughnut)
- 🏆 Distribución por calificación (Bar)
- 📈 Tendencia temporal de scores (Line)

## 🔧 Configuración Avanzada

### Cambiar Modelo de Ollama

En `app.py`, línea 27:
```python
evaluator = AIEvaluator(model="llama3.1:8b", timeout=90)
```

### Ajustar Timeout

Si las evaluaciones son lentas:
```python
evaluator = AIEvaluator(model="llama3.1:8b", timeout=120)
```

### Cambiar Puerto

En `app.py`, última línea:
```python
app.run(debug=True, host='0.0.0.0', port=8080)
```

## 📝 Notas

- **Ollama debe estar corriendo**: Verifica con `curl http://127.0.0.1:11434`
- **Primera evaluación puede ser lenta**: Ollama carga el modelo
- **Base de datos es local**: Archivo `analisis_5w.db` en el directorio
- **Backups automáticos**: SQLite mantiene backup en `.db-journal`

## 🤝 Soporte

Para problemas o mejoras, revisa:
1. Logs de Flask en la terminal
2. Console del navegador (F12)
3. Estado de Ollama: `ollama ps`

## 📄 Licencia

Uso interno - Sistema de Análisis 5W
