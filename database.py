# -*- coding: utf-8 -*-
"""
Sistema de Base de Datos para Dashboard 5 Porqués
==================================================
Gestiona almacenamiento de análisis, evaluaciones y métricas.
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from contextlib import contextmanager


DB_PATH = Path(__file__).parent / "analisis_5w.db"


@contextmanager
def get_db():
    """Context manager para conexión a BD"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Permite acceso por nombre de columna
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    """Inicializa la base de datos con todas las tablas necesarias"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tabla de análisis 5W
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analisis_5w (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoria TEXT NOT NULL,
                tipo_5w TEXT,
                ruta TEXT NOT NULL,
                fecha DATE,
                orden TEXT,
                problema TEXT NOT NULL,
                por_que_1 TEXT NOT NULL,
                por_que_2 TEXT NOT NULL,
                por_que_3 TEXT NOT NULL,
                por_que_4 TEXT,
                causa_raiz TEXT NOT NULL,
                plan_accion TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Tabla de evaluaciones IA
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evaluaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analisis_id INTEGER NOT NULL,
                score REAL NOT NULL,
                grade TEXT NOT NULL,
                nivel_analisis TEXT,
                chain_coherence REAL,
                root_cause_alignment REAL,
                action_plan_alignment REAL,
                strengths TEXT,
                weaknesses TEXT,
                suggestions TEXT,
                tips TEXT,
                detail TEXT,
                evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (analisis_id) REFERENCES analisis_5w(id) ON DELETE CASCADE
            )
        """)
        
        # Tabla de métricas agregadas (para gráficos)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS metricas_diarias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha DATE NOT NULL UNIQUE,
                categoria TEXT,
                total_analisis INTEGER DEFAULT 0,
                promedio_score REAL,
                promedio_coherencia REAL,
                promedio_causa_raiz REAL,
                promedio_plan_accion REAL,
                distribuciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Índices para mejorar performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analisis_categoria ON analisis_5w(categoria)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_analisis_fecha ON analisis_5w(fecha)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_evaluaciones_analisis ON evaluaciones(analisis_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_metricas_fecha ON metricas_diarias(fecha)")
        
        conn.commit()
        print(f"✅ Base de datos inicializada: {DB_PATH}")


class AnalisisDB:
    """Gestor de operaciones de base de datos para análisis 5W"""
    
    @staticmethod
    def crear_analisis(data: Dict) -> int:
        """Crea un nuevo análisis y retorna su ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            
            # 🔥 VERIFICAR SI YA EXISTE (evitar duplicados)
            cursor.execute("""
                SELECT id FROM analisis_5w 
                WHERE ruta = ? AND fecha = ? AND problema = ?
                LIMIT 1
            """, (
                data['ruta'],
                data.get('fecha'),
                data['problema']
            ))
            
            existing = cursor.fetchone()
            if existing:
                print(f"⚠️ Duplicado detectado: Ruta {data['ruta']}, Fecha {data.get('fecha')} ya existe (ID: {existing['id']})")
                return existing['id']  # Retornar ID existente en lugar de crear duplicado
            
            # Si no existe, crear nuevo registro
            cursor.execute("""
                INSERT INTO analisis_5w 
                (categoria, tipo_5w, ruta, fecha, orden, problema, por_que_1, por_que_2, 
                 por_que_3, por_que_4, causa_raiz, plan_accion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data['categoria'],
                data.get('tipo_5w'),
                data['ruta'],
                data.get('fecha'),
                data.get('orden'),
                data['problema'],
                data['por_que_1'],
                data['por_que_2'],
                data['por_que_3'],
                data.get('por_que_4', ''),
                data['causa_raiz'],
                data['plan_accion']
            ))
            return cursor.lastrowid
    
    @staticmethod
    def obtener_analisis(analisis_id: int) -> Optional[Dict]:
        """Obtiene un análisis por ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM analisis_5w WHERE id = ?", (analisis_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    @staticmethod
    def listar_analisis(categoria: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Lista análisis con filtros opcionales"""
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM analisis_5w"
            params = []
            
            if categoria:
                query += " WHERE categoria = ?"
                params.append(categoria)
            
            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    @staticmethod
    def actualizar_analisis(analisis_id: int, data: Dict) -> bool:
        """Actualiza un análisis existente"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE analisis_5w 
                SET problema=?, por_que_1=?, por_que_2=?, por_que_3=?, 
                    por_que_4=?, causa_raiz=?, plan_accion=?, updated_at=CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                data['problema'], data['por_que_1'], data['por_que_2'],
                data['por_que_3'], data.get('por_que_4', ''),
                data['causa_raiz'], data['plan_accion'], analisis_id
            ))
            return cursor.rowcount > 0
    
    @staticmethod
    def eliminar_analisis(analisis_id: int) -> bool:
        """Elimina un análisis (y sus evaluaciones por CASCADE)"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM analisis_5w WHERE id = ?", (analisis_id,))
            return cursor.rowcount > 0
    
    @staticmethod
    def contar_analisis(categoria: Optional[str] = None) -> int:
        """Cuenta total de análisis"""
        with get_db() as conn:
            cursor = conn.cursor()
            if categoria:
                cursor.execute("SELECT COUNT(*) FROM analisis_5w WHERE categoria = ?", (categoria,))
            else:
                cursor.execute("SELECT COUNT(*) FROM analisis_5w")
            return cursor.fetchone()[0]


class EvaluacionDB:
    """Gestor de operaciones para evaluaciones IA"""
    
    @staticmethod
    def crear_evaluacion(analisis_id: int, evaluacion: Dict) -> int:
        """Crea una evaluación y retorna su ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            # Determinar nivel si no fue provisto
            nivel = evaluacion.get('nivel_analisis')
            if not nivel:
                # Calcular nivel a partir del score (5 niveles)
                score_val = float(evaluacion.get('score', 0))
                if score_val < 40:
                    nivel = 'Crítico'
                elif score_val < 60:
                    nivel = 'Básico'
                elif score_val < 80:
                    nivel = 'Intermedio'
                elif score_val < 90:
                    nivel = 'Bueno'
                else:
                    nivel = 'Excelente'

            cursor.execute("""
                INSERT INTO evaluaciones 
                (analisis_id, score, grade, nivel_analisis, chain_coherence, root_cause_alignment, 
                 action_plan_alignment, strengths, weaknesses, suggestions, tips, detail)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analisis_id,
                evaluacion['score'],
                evaluacion['grade'],
                nivel,
                evaluacion.get('chain_coherence', 0),
                evaluacion.get('root_cause_alignment', 0),
                evaluacion.get('action_plan_alignment', 0),
                json.dumps(evaluacion.get('strengths', []), ensure_ascii=False),
                json.dumps(evaluacion.get('weaknesses', []), ensure_ascii=False),
                json.dumps(evaluacion.get('suggestions', []), ensure_ascii=False),
                json.dumps(evaluacion.get('tips', []), ensure_ascii=False),
                evaluacion.get('detail', '')
            ))
            return cursor.lastrowid
    
    @staticmethod
    def obtener_evaluacion(analisis_id: int) -> Optional[Dict]:
        """Obtiene la evaluación más reciente de un análisis"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM evaluaciones 
                WHERE analisis_id = ? 
                ORDER BY evaluated_at DESC LIMIT 1
            """, (analisis_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            result = dict(row)
            # Parsear JSON fields
            for field in ['strengths', 'weaknesses', 'suggestions', 'tips']:
                if result.get(field):
                    result[field] = json.loads(result[field])
            
            return result
    
    @staticmethod
    def listar_evaluaciones_recientes(limit: int = 50) -> List[Dict]:
        """Lista evaluaciones más recientes"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT e.*, a.categoria, a.ruta, a.fecha
                FROM evaluaciones e
                JOIN analisis_5w a ON e.analisis_id = a.id
                ORDER BY e.evaluated_at DESC
                LIMIT ?
            """, (limit,))
            
            results = []
            for row in cursor.fetchall():
                result = dict(row)
                for field in ['strengths', 'weaknesses', 'suggestions', 'tips']:
                    if result.get(field):
                        result[field] = json.loads(result[field])
                results.append(result)
            
            return results


class MetricasDB:
    """Gestor de métricas agregadas para gráficos"""
    
    @staticmethod
    def actualizar_metricas_diarias(fecha: str = None):
        """Actualiza métricas agregadas del día"""
        if not fecha:
            fecha = datetime.now().strftime('%Y-%m-%d')
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Calcular métricas del día
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    AVG(e.score) as avg_score,
                    AVG(e.chain_coherence) as avg_coherence,
                    AVG(e.root_cause_alignment) as avg_causa,
                    AVG(e.action_plan_alignment) as avg_plan
                FROM evaluaciones e
                JOIN analisis_5w a ON e.analisis_id = a.id
                WHERE DATE(a.created_at) = ?
            """, (fecha,))
            
            metrics = cursor.fetchone()
            
            if metrics and metrics[0] > 0:
                # Distribución de grades
                cursor.execute("""
                    SELECT grade, COUNT(*) as count
                    FROM evaluaciones e
                    JOIN analisis_5w a ON e.analisis_id = a.id
                    WHERE DATE(a.created_at) = ?
                    GROUP BY grade
                """, (fecha,))
                
                distribuciones = {row[0]: row[1] for row in cursor.fetchall()}
                
                # Insertar o actualizar
                cursor.execute("""
                    INSERT OR REPLACE INTO metricas_diarias 
                    (fecha, total_analisis, promedio_score, promedio_coherencia, 
                     promedio_causa_raiz, promedio_plan_accion, distribuciones)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    fecha,
                    metrics[0],
                    round(metrics[1], 2) if metrics[1] else 0,
                    round(metrics[2], 2) if metrics[2] else 0,
                    round(metrics[3], 2) if metrics[3] else 0,
                    round(metrics[4], 2) if metrics[4] else 0,
                    json.dumps(distribuciones)
                ))
    
    @staticmethod
    def obtener_metricas_periodo(dias: int = 30) -> List[Dict]:
        """Obtiene métricas de los últimos N días"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM metricas_diarias
                WHERE fecha >= DATE('now', '-' || ? || ' days')
                ORDER BY fecha DESC
            """, (dias,))
            
            results = []
            for row in cursor.fetchall():
                result = dict(row)
                if result.get('distribuciones'):
                    result['distribuciones'] = json.loads(result['distribuciones'])
                results.append(result)
            
            return results
    
    @staticmethod
    def obtener_estadisticas_globales() -> Dict:
        """Obtiene estadísticas generales del sistema"""
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Total de análisis
            cursor.execute("SELECT COUNT(*) FROM analisis_5w")
            total_analisis = cursor.fetchone()[0]
            
            # Promedio general de scores
            cursor.execute("SELECT AVG(score) FROM evaluaciones")
            avg_score = cursor.fetchone()[0] or 0
            
            # Distribución por categoría con score promedio
            cursor.execute("""
                SELECT a.categoria, 
                       COUNT(*) as count,
                       COALESCE(AVG(e.score), 0) as avg_score
                FROM analisis_5w a
                LEFT JOIN evaluaciones e ON a.id = e.analisis_id
                GROUP BY a.categoria
                ORDER BY avg_score DESC
            """)
            por_categoria = {row[0]: {
                'count': row[1], 
                'avg_score': round(row[2], 2)
            } for row in cursor.fetchall()}
            
            # Distribución de grades
            cursor.execute("""
                SELECT grade, COUNT(*) as count
                FROM evaluaciones
                GROUP BY grade
                ORDER BY count DESC
            """)
            por_grade = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Mejores y peores análisis
            cursor.execute("""
                SELECT a.id, a.ruta, a.categoria, e.score, e.grade
                FROM analisis_5w a
                JOIN evaluaciones e ON a.id = e.analisis_id
                ORDER BY e.score DESC
                LIMIT 5
            """)
            mejores = [dict(row) for row in cursor.fetchall()]
            
            cursor.execute("""
                SELECT a.id, a.ruta, a.categoria, e.score, e.grade
                FROM analisis_5w a
                JOIN evaluaciones e ON a.id = e.analisis_id
                ORDER BY e.score ASC
                LIMIT 5
            """)
            peores = [dict(row) for row in cursor.fetchall()]
            
            return {
                'total_analisis': total_analisis,
                'promedio_score': round(avg_score, 2),
                'por_categoria': por_categoria,
                'por_grade': por_grade,
                'mejores': mejores,
                'peores': peores
            }


# Inicializar BD al importar
if __name__ == "__main__":
    init_database()
    print("✅ Base de datos inicializada correctamente")
