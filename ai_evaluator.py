# -*- coding: utf-8 -*-
"""
Evaluador Avanzado de 5 Porqués con IA
=======================================
Genera notas, análisis detallado, tips y recomendaciones usando Ollama.
Versión mejorada con scoring más preciso y feedback constructivo.
"""
from __future__ import annotations

import json
import requests
from typing import Dict, List
from dataclasses import dataclass, asdict


@dataclass
class EvaluacionAvanzada:
    """Resultado de evaluación con IA"""
    score: float  # 0-100
    grade: str  # A+, A, B+, B, C+, C, D, F
    nivel_analisis: str  # Básico, Intermedio, Sostenible
    chain_coherence: float  # 0-100
    root_cause_alignment: float  # 0-100
    action_plan_alignment: float  # 0-100
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    tips: List[str]
    detail: str


class AIEvaluator:
    """Evaluador de calidad usando Ollama"""
    
    def __init__(self, model: str = "llama3.1:8b", base_url: str = "http://127.0.0.1:11434", timeout: int = 180):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout  # Aumentado a 180s (3 minutos) para análisis complejos
    
    def evaluar(self, five_whys: Dict[str, str], categoria: str = "") -> EvaluacionAvanzada:
        """Evalúa un análisis 5W completo y retorna evaluación detallada con reintentos"""
        
        # Construir prompt de evaluación (ya en español)
        prompt = self._build_evaluation_prompt(five_whys, categoria)
        
        # Sistema de reintentos (máximo 3 intentos)
        max_intentos = 3
        for intento in range(1, max_intentos + 1):
            try:
                print(f"🔄 Intento {intento}/{max_intentos}...")
                
                # Llamar a Ollama
                response = self._call_ollama(prompt)
                
                # Parsear respuesta JSON
                eval_data = self._parse_response(response)
                
                # Calcular grade y nivel basado en score
                grade = self._calculate_grade(eval_data['score'])
                nivel = self._calculate_nivel(eval_data['score'])
                
                print(f"✅ Evaluación exitosa en intento {intento}")
                
                return EvaluacionAvanzada(
                    score=eval_data['score'],
                    grade=grade,
                    nivel_analisis=nivel,
                    chain_coherence=eval_data.get('chain_coherence', 0),
                    root_cause_alignment=eval_data.get('root_cause_alignment', 0),
                    action_plan_alignment=eval_data.get('action_plan_alignment', 0),
                    strengths=eval_data.get('strengths', []),
                    weaknesses=eval_data.get('weaknesses', []),
                    suggestions=eval_data.get('suggestions', []),
                    tips=eval_data.get('tips', []),
                    detail=eval_data.get('detail', '')
                )
            
            except requests.exceptions.Timeout as e:
                print(f"⏱️ Timeout en intento {intento}: {str(e)[:100]}")
                if intento < max_intentos:
                    print(f"🔄 Reintentando con prompt simplificado...")
                    # Simplificar más el prompt para el próximo intento
                    prompt = self._build_simplified_prompt(five_whys, categoria)
                continue
            
            except Exception as e:
                print(f"❌ Error en intento {intento}: {str(e)[:100]}")
                if intento < max_intentos:
                    continue
        
        # Si todos los intentos fallan, usar fallback
        print(f"⚠️ Todos los intentos fallaron, usando evaluación básica")
        return self._fallback_evaluation(five_whys, "Timeout después de 3 intentos")
    
    def _build_evaluation_prompt(self, fw: Dict[str, str], categoria: str) -> str:
        """Construye el prompt de evaluación para Ollama"""
        
        problema = fw.get('problema', '').strip()
        pq1 = fw.get('por_que_1', '').strip()
        pq2 = fw.get('por_que_2', '').strip()
        pq3 = fw.get('por_que_3', '').strip()
        pq4 = fw.get('por_que_4', '').strip()
        causa = fw.get('causa_raiz', '').strip()
        plan = fw.get('plan_accion', '').strip()
        
        prompt = f"""Evalúa la CALIDAD del análisis 5 Porqués (no el problema operativo). Sé crítico y objetivo.

ANÁLISIS:
Problema: {problema}
1° Por qué: {pq1}
2° Por qué: {pq2}
3° Por qué: {pq3}
4° Por qué: {pq4 or 'No especificado'}
Causa Raíz: {causa}
Plan: {plan}

EVALÚA (0-100):
1. chain_coherence: ¿Cada porqué conecta lógicamente? ¿Profundiza o hay saltos?
2. root_cause_alignment: ¿La causa raíz se deriva de los porqués? ¿Es verdadera raíz o síntoma?
3. action_plan_alignment: ¿El plan ataca la causa raíz? ¿Es concreto y medible?

IMPORTANTE: Las sugerencias/tips deben ser sobre CÓMO MEJORAR EL ANÁLISIS (metodología, profundidad, datos, redacción), NO sobre resolver el problema operativo.

Ejemplo CORRECTO: "Agregar métricas cuantificables en el problema inicial"
Ejemplo INCORRECTO: "Implementar sistema de monitoreo del clima"

JSON español sin markdown:
{{
  "score": <0-100>,
  "chain_coherence": <0-100>,
  "root_cause_alignment": <0-100>,
  "action_plan_alignment": <0-100>,
  "strengths": ["<fortaleza del análisis 1>", "<fortaleza 2>", "<fortaleza 3>"],
  "weaknesses": ["<debilidad del análisis 1>", "<debilidad 2>", "<debilidad 3>"],
  "suggestions": ["<cómo mejorar metodología>", "<cómo profundizar>", "<cómo hacer robusto>"],
  "tips": ["<tip metodológico 1>", "<tip 2>", "<tip 3>"],
  "detail": "<Oportunidad de mejora del análisis en 2 líneas>"
}}"""
        
        return prompt
    
    def _build_simplified_prompt(self, fw: Dict[str, str], categoria: str) -> str:
        """Construye un prompt ultra-simplificado para casos de timeout"""
        
        # Truncar textos largos
        problema = fw.get('problema', '').strip()[:200]
        pq1 = fw.get('por_que_1', '').strip()[:150]
        pq2 = fw.get('por_que_2', '').strip()[:150]
        pq3 = fw.get('por_que_3', '').strip()[:150]
        pq4 = fw.get('por_que_4', '').strip()[:150]
        causa = fw.get('causa_raiz', '').strip()[:200]
        plan = fw.get('plan_accion', '').strip()[:200]
        
        prompt = f"""Evalúa la CALIDAD del análisis 5W (no el problema operativo).

Análisis:
Problema: {problema}
1: {pq1}
2: {pq2}
3: {pq3}
Causa: {causa}
Plan: {plan}

Evalúa coherencia, profundidad, alineación. 
Sugerencias deben ser sobre CÓMO MEJORAR EL ANÁLISIS, no sobre resolver la operación.

JSON español sin markdown:
{{"score":<0-100>,"chain_coherence":<0-100>,"root_cause_alignment":<0-100>,"action_plan_alignment":<0-100>,"strengths":["fortaleza del análisis 1","fortaleza 2"],"weaknesses":["debilidad del análisis 1","debilidad 2"],"suggestions":["cómo mejorar el análisis 1","mejora 2"],"tips":["tip metodológico 1","tip 2"],"detail":"oportunidad de mejora del análisis"}}"""
        
        return prompt
    
    def _call_ollama(self, prompt: str) -> str:
        """Llama a Ollama API y retorna la respuesta"""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.4,  # Más bajo = más consistente y rápido
                "num_predict": 800,  # Reducido para respuestas más rápidas
                "top_k": 30,
                "top_p": 0.85,
                "num_ctx": 4096  # Contexto balanceado (suficiente para análisis complejos)
            }
        }
        
        response = requests.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "{}")
    
    def _translate_to_spanish(self, eval_data: Dict) -> Dict:
        """Traduce el feedback de inglés a español usando IA"""
        try:
            print(f"🔄 Traduciendo evaluación al español...")
            print(f"   Original strengths: {len(eval_data.get('strengths', []))} items")
            print(f"   Original weaknesses: {len(eval_data.get('weaknesses', []))} items")
            
            # Construir prompt de traducción
            translate_prompt = f"""Translate this 5 Whys analysis feedback from English to Spanish. Keep the same JSON structure but translate all text fields.

INPUT JSON:
{json.dumps(eval_data, indent=2)}

RESPOND WITH THE SAME JSON STRUCTURE BUT ALL TEXT IN SPANISH:
"""
            
            # Llamar a Ollama para traducir
            response = self._call_ollama(translate_prompt)
            translated = json.loads(response.strip().replace("```json", "").replace("```", ""))
            
            # Preservar valores numéricos originales y asegurar listas
            translated['score'] = eval_data['score']
            translated['chain_coherence'] = eval_data.get('chain_coherence', 0)
            translated['root_cause_alignment'] = eval_data.get('root_cause_alignment', 0)
            translated['action_plan_alignment'] = eval_data.get('action_plan_alignment', 0)
            
            # Asegurar que las listas existen y tienen contenido
            for field in ['strengths', 'weaknesses', 'suggestions', 'tips']:
                if field not in translated or not isinstance(translated[field], list):
                    translated[field] = eval_data.get(field, [])
                elif len(translated[field]) == 0 and len(eval_data.get(field, [])) > 0:
                    # Si la traducción perdió items, usar originales
                    translated[field] = eval_data[field]
            
            print(f"✅ Traducción completada:")
            print(f"   Strengths: {len(translated.get('strengths', []))} items")
            print(f"   Weaknesses: {len(translated.get('weaknesses', []))} items")
            print(f"   Suggestions: {len(translated.get('suggestions', []))} items")
            print(f"   Tips: {len(translated.get('tips', []))} items")
            
            return translated
            
        except Exception as e:
            print(f"⚠️ Error traduciendo: {e}, usando versión original")
            return eval_data
    
    def _parse_response(self, response: str) -> Dict:
        """Parsea la respuesta JSON de Ollama"""
        try:
            # Limpiar posibles caracteres extras
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.endswith("```"):
                response = response[:-3]
            
            data = json.loads(response)
            
            # Validar campos requeridos
            if 'score' not in data:
                raise ValueError("Missing 'score' field")
            
            # Asegurar tipos correctos
            data['score'] = float(data.get('score', 0))
            data['chain_coherence'] = float(data.get('chain_coherence', 0))
            data['root_cause_alignment'] = float(data.get('root_cause_alignment', 0))
            data['action_plan_alignment'] = float(data.get('action_plan_alignment', 0))
            
            # Asegurar listas
            for field in ['strengths', 'weaknesses', 'suggestions', 'tips']:
                if field not in data or not isinstance(data[field], list):
                    data[field] = []
            
            return data
        
        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Error parsing Ollama response: {e}\nResponse: {response[:200]}")
    
    def _calculate_grade(self, score: float) -> str:
        """Calcula el grade basado en el score"""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "A-"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "B-"
        elif score >= 65:
            return "C+"
        elif score >= 60:
            return "C"
        elif score >= 55:
            return "D"
        else:
            return "F"
    
    def _calculate_nivel(self, score: float) -> str:
        """Calcula el nivel de análisis basado en el score
        
        Clasificación en 5 niveles:
        - Crítico: 0-39 (Requiere acción inmediata)
        - Básico: 40-59 (Necesita mejora significativa)
        - Intermedio: 60-79 (Aceptable, puede mejorar)
        - Bueno: 80-89 (Muy buen análisis)
        - Excelente: 90-100 (Análisis ejemplar)
        """
        if score < 40:
            return "Crítico"
        elif score < 60:
            return "Básico"
        elif score < 80:
            return "Intermedio"
        elif score < 90:
            return "Bueno"
        else:
            return "Excelente"
    
    def _fallback_evaluation(self, fw: Dict[str, str], error: str) -> EvaluacionAvanzada:
        """Evaluación básica de fallback si falla la IA"""
        
        # Evaluación heurística simple
        score = 50.0
        weaknesses = [f"⚠️ Error en evaluación IA: {error[:100]}"]
        
        # Verificar completitud
        campos = ['problema', 'por_que_1', 'por_que_2', 'por_que_3', 'causa_raiz', 'plan_accion']
        completos = sum(1 for c in campos if fw.get(c, '').strip() and len(fw[c]) > 10)
        score += (completos / 6) * 30
        
        # Verificar longitud razonable
        if all(len(fw.get(c, '')) > 20 for c in campos):
            score += 10
        
        strengths = [f"✅ {completos}/6 campos completos"]
        suggestions = ["💡 Revisa la conexión del servicio Ollama para evaluación completa"]
        tips = ["🎯 Asegúrate que Ollama esté corriendo en http://127.0.0.1:11434"]
        
        return EvaluacionAvanzada(
            score=round(score, 1),
            grade=self._calculate_grade(score),
            nivel_analisis=self._calculate_nivel(score),
            chain_coherence=score * 0.8,
            root_cause_alignment=score * 0.85,
            action_plan_alignment=score * 0.75,
            strengths=strengths,
            weaknesses=weaknesses,
            suggestions=suggestions,
            tips=tips,
            detail=f"Evaluación básica (fallback). Error: {error[:200]}"
        )


# Test rápido
if __name__ == "__main__":
    evaluator = AIEvaluator()
    
    test_5w = {
        "problema": "Salimos tarde del centro de distribución (15 minutos de retraso)",
        "por_que_1": "Porque el camión DS0009 aún estaba siendo cargado",
        "por_que_2": "Porque faltaba producto Golden en la carga inicial",
        "por_que_3": "Porque almacén no detectó el faltante hasta el último momento",
        "por_que_4": "Porque no se hizo inventario la noche anterior",
        "causa_raiz": "Falta de proceso de verificación de inventario nocturno",
        "plan_accion": "Implementar checklist obligatorio de inventario cada noche a las 22:00, supervisado por jefe de almacén"
    }
    
    print("🧪 Probando evaluador IA...")
    resultado = evaluator.evaluar(test_5w, "TML")
    
    print(f"\n📊 Score: {resultado.score}/100 (Grade: {resultado.grade})")
    print(f"🏆 Nivel: {resultado.nivel_analisis}")
    print(f"🔗 Coherencia: {resultado.chain_coherence}/100")
    print(f"🎯 Causa Raíz: {resultado.root_cause_alignment}/100")
    print(f"📝 Plan: {resultado.action_plan_alignment}/100")
    
    print(f"\n✅ Fortalezas:")
    for s in resultado.strengths:
        print(f"  {s}")
    
    print(f"\n❌ Debilidades:")
    for w in resultado.weaknesses:
        print(f"  {w}")
    
    print(f"\n💡 Sugerencias:")
    for sg in resultado.suggestions:
        print(f"  {sg}")
    
    print(f"\n🎯 Tips:")
    for t in resultado.tips:
        print(f"  {t}")
