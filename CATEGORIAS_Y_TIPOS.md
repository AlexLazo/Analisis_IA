# 📋 Sistema de Categorías y Tipos en Análisis 5W

## 🔄 Dos Conceptos Diferentes

El sistema maneja **dos campos independientes** que a veces se confunden:

### 1️⃣ `categoria` - Área Operacional
**Campo en DB**: `categoria` (TEXT)
**Valores posibles**: `Almacén`, `Distribución`, etc.
**Propósito**: Indica el área o departamento donde ocurre el problema

### 2️⃣ `tipo_5w` - Tipo de Problema
**Campo en DB**: `tipo_5w` (TEXT)
**Valores definidos**: 
- `TR` - Tiempo en Ruta
- `TML` - Tiempo de Liberación
- `PNP` - Paradas No Planificadas
- `DEV` - Devoluciones
- `DQI` - Delivery Quality Index (Averías/Productos Quebrados)
- `MOD` - Modulación de Devoluciones

**Propósito**: Indica el tipo específico de análisis 5W que se está realizando

---

## 🎯 ¿Cuál Usar en Cada Caso?

### Para Evaluación con IA
✅ **USAR**: `tipo_5w`
❌ **NO USAR**: `categoria`

**Razón**: El evaluador necesita saber el **tipo de problema** para aplicar criterios específicos, no el área donde ocurre.

**Ejemplo**:
```python
# ✅ CORRECTO
tipo_analisis = analisis.get('tipo_5w') or 'GENERAL'
evaluacion = evaluator.evaluar(analisis, tipo_analisis)

# ❌ INCORRECTO
evaluacion = evaluator.evaluar(analisis, analisis['categoria'])
```

### Para Filtros en Dashboard
✅ **USAR AMBOS**: 
- Filtro por `categoria`: Para ver problemas por área
- Filtro por `tipo_5w`: Para ver problemas por tipo

---

## 📊 Ejemplos de Combinaciones

| categoria | tipo_5w | Descripción |
|-----------|---------|-------------|
| Distribución | TR | Retraso en ruta de distribución |
| Distribución | DQI | Producto quebrado en distribución |
| Almacén | TML | Demora en carga desde almacén |
| Distribución | PNP | Parada no planificada en ruta |
| Distribución | DEV | Devolución de producto |

---

## 🔧 Configuración Actual

### En `app.py`:
```python
# ✅ Ahora usa tipo_5w para evaluación
tipo_analisis = analisis.get('tipo_5w') or analisis.get('categoria', 'GENERAL')
evaluacion = evaluator.evaluar(analisis, tipo_analisis)
```

### En `ai_evaluator.py`:
El evaluador tiene **contextos específicos** para cada tipo:
- `TR`: Criterios para tiempo en ruta
- `TML`: Criterios para tiempo de liberación
- `PNP`: Criterios para paradas no planificadas
- `DEV`: Criterios para devoluciones
- `DQI`: Criterios para calidad de entrega (NEW! ✨)
- `MOD`: Criterios para modulación

Si recibe un tipo no definido (ej: "Distribución"), usa un contexto genérico inteligente.

---

## 🎨 Cómo Agregar Nuevos Tipos

Si necesitas agregar un nuevo tipo de análisis (ej: "SEGURIDAD"):

### 1. Actualizar `formulario_5porques_tml_ia.py`:
```python
# En línea ~1161
parser.add_argument("--categoria", 
    choices=["TR", "TML", "PNP", "DEV", "MOD", "DQI", "SEGURIDAD"],  # ← Agregar aquí
    ...
)

# En función llenar_pagina_2, agregar:
elif cat_up == "SEGURIDAD":
    indicador_target = "Seguridad"
```

### 2. Agregar grupos estáticos en `RESPUESTAS_5_PORQUES`:
```python
# GRUPO XX: INCIDENTES DE SEGURIDAD
{
    "por_que_1": "Por qué ocurrió el incidente de seguridad",
    "por_que_2": "Por qué no se detectó el riesgo antes",
    ...
}
```

### 3. Actualizar `five_whys_ollama.py`:
```python
# Agregar ejemplo en EJEMPLOS_POR_CATEGORIA
"SEGURIDAD": {
    "problema": "Se reportó un incidente de seguridad en la ruta R0123",
    ...
}

# Agregar guía en GUIAS_CATEGORIA
"SEGURIDAD": """
Para problemas de SEGURIDAD:
- Enfócate en prevención de riesgos
- Identifica fallas en protocolos de seguridad
...
"""
```

### 4. Actualizar `ai_evaluator.py`:
```python
def _get_category_context(self, categoria: str) -> str:
    contextos = {
        ...
        "SEGURIDAD": """SEGURIDAD:
        Análisis enfocado en incidentes o riesgos de seguridad.
        Causas comunes: falta de capacitación, equipos defectuosos, protocolos incompletos.
        Buena causa raíz: identifica fallas en procesos de prevención, capacitación, supervisión.
        Buen plan: incluye capacitación específica, equipamiento adecuado, protocolos claros."""
    }
```

### 5. Agregar datos de prueba:
```python
# Ejecutar script similar a populate_dqi_test.py
cursor.execute("UPDATE analisis_5w SET tipo_5w = 'SEGURIDAD' WHERE ...")
```

---

## 📝 Notas Importantes

1. **Compatibilidad hacia atrás**: Si `tipo_5w` es NULL, el sistema usa `categoria` como fallback
2. **Contexto genérico**: Si el tipo no está definido, el evaluador usa contexto genérico (no falla)
3. **Flexible**: Puedes tener categorías de área ("Distribución", "Almacén") independientes de tipos de problema
4. **Evaluación**: Siempre usa `tipo_5w` para criterios específicos, no `categoria`

---

## 🚀 Estado Actual

✅ Tipos configurados: TR, TML, PNP, DEV, DQI, MOD
✅ Evaluador actualizado para usar `tipo_5w`
✅ Fallback a contexto genérico si tipo no reconocido
✅ Dashboard filtra por ambos: `categoria` Y `tipo_5w`
✅ Base de datos con 1,186 registros DQI de prueba

---

## 🎯 Recomendación

**Para futuro**: Considera estandarizar el nombre del parámetro en todas las funciones:
- Cambiar `categoria` → `tipo_analisis` o `tipo_5w` para claridad
- Mantener `categoria` solo para área operacional
- Usar `tipo_5w` consistentemente para tipo de problema

Esto evitará confusiones y hará el código más mantenible.
