# -*- coding: utf-8 -*-
"""
Evaluador Avanzado de 5 Porqués con IA - Versión Groq
======================================================
Misma lógica que ai_evaluator.py pero usando Groq API en lugar de Ollama.
Compatible con Railway y cualquier entorno cloud.

Requiere: pip install groq
Variable de entorno: GROQ_API_KEY
"""
from __future__ import annotations

import json
import os
from typing import Dict, List
from dataclasses import dataclass

# Importación lazy para no romper si groq no está instalado localmente
try:
    from groq import Groq
except ImportError:
    Groq = None


@dataclass
class EvaluacionAvanzada:
    """Resultado de evaluación con IA"""
    score: float
    grade: str
    nivel_analisis: str
    chain_coherence: float
    root_cause_alignment: float
    action_plan_alignment: float
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    tips: List[str]
    detail: str


class AIEvaluatorGroq:
    """Evaluador de calidad usando Groq API"""

    def __init__(self, model: str = "llama-3.1-8b-instant", api_key: str = None):
        if Groq is None:
            raise ImportError("Instala el SDK de Groq: pip install groq")

        self.model = model
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")

        if not self.api_key:
            raise ValueError("Se requiere GROQ_API_KEY como variable de entorno o parámetro")

        self.client = Groq(api_key=self.api_key)

    def evaluar(self, five_whys: Dict[str, str], categoria: str = "") -> EvaluacionAvanzada:
        """Evalúa un análisis 5W completo y retorna evaluación detallada con reintentos"""

        prompt = self._build_evaluation_prompt(five_whys, categoria)

        max_intentos = 3
        for intento in range(1, max_intentos + 1):
            try:
                print(f"🔄 Intento {intento}/{max_intentos} (Groq)...")

                response = self._call_groq(prompt)
                eval_data = self._parse_response(response)

                grade = self._calculate_grade(eval_data['score'])
                nivel = self._calculate_nivel(eval_data['score'])

                print(f"✅ Evaluación exitosa en intento {intento} (Groq)")

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

            except Exception as e:
                print(f"❌ Error en intento {intento} (Groq): {str(e)[:100]}")
                if intento < max_intentos:
                    # En el segundo intento usar prompt simplificado
                    if intento == 2:
                        prompt = self._build_simplified_prompt(five_whys, categoria)
                    continue

        print("⚠️ Todos los intentos fallaron (Groq), usando evaluación básica")
        return self._fallback_evaluation(five_whys, "Error después de 3 intentos con Groq")

    def _call_groq(self, prompt: str) -> str:
        """Llama a Groq API y retorna la respuesta en texto"""
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un experto en metodología 5 Porqués. "
                        "Evalúas la CALIDAD del análisis (no el problema operativo). "
                        "Respondes SOLO con JSON válido, sin markdown, sin texto adicional."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
            max_tokens=900,
            response_format={"type": "json_object"},
        )
        return completion.choices[0].message.content

    def _build_evaluation_prompt(self, fw: Dict[str, str], categoria: str) -> str:
        """Construye el prompt de evaluación"""

        problema = fw.get('problema', '').strip()
        pq1 = fw.get('por_que_1', '').strip()
        pq2 = fw.get('por_que_2', '').strip()
        pq3 = fw.get('por_que_3', '').strip()
        pq4 = fw.get('por_que_4', '').strip()
        causa = fw.get('causa_raiz', '').strip()
        plan = fw.get('plan_accion', '').strip()

        return f"""Evalúa la CALIDAD del análisis 5 Porqués (no el problema operativo). Sé crítico y objetivo.

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

JSON español:
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

    def _build_simplified_prompt(self, fw: Dict[str, str], categoria: str) -> str:
        """Prompt simplificado para reintentos"""

        problema = fw.get('problema', '').strip()[:200]
        pq1 = fw.get('por_que_1', '').strip()[:150]
        pq2 = fw.get('por_que_2', '').strip()[:150]
        pq3 = fw.get('por_que_3', '').strip()[:150]
        causa = fw.get('causa_raiz', '').strip()[:200]
        plan = fw.get('plan_accion', '').strip()[:200]

        return f"""Evalúa la CALIDAD del análisis 5W (no el problema operativo).

Problema: {problema}
1: {pq1}
2: {pq2}
3: {pq3}
Causa: {causa}
Plan: {plan}

JSON español:
{{"score":<0-100>,"chain_coherence":<0-100>,"root_cause_alignment":<0-100>,"action_plan_alignment":<0-100>,"strengths":["fortaleza 1","fortaleza 2"],"weaknesses":["debilidad 1","debilidad 2"],"suggestions":["mejora metodológica 1","mejora 2"],"tips":["tip 1","tip 2"],"detail":"oportunidad de mejora"}}"""

    def _parse_response(self, response: str) -> Dict:
        """Parsea la respuesta JSON de Groq"""
        try:
            response = response.strip()
            # Groq con response_format json_object normalmente ya devuelve JSON limpio,
            # pero limpiamos por si acaso
            if response.startswith("```json"):
                response = response[7:]
            if response.endswith("```"):
                response = response[:-3]

            data = json.loads(response)

            if 'score' not in data:
                raise ValueError("Falta campo 'score' en respuesta")

            data['score'] = float(data.get('score', 0))
            data['chain_coherence'] = float(data.get('chain_coherence', 0))
            data['root_cause_alignment'] = float(data.get('root_cause_alignment', 0))
            data['action_plan_alignment'] = float(data.get('action_plan_alignment', 0))

            for field in ['strengths', 'weaknesses', 'suggestions', 'tips']:
                if field not in data or not isinstance(data[field], list):
                    data[field] = []

            return data

        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Error parseando respuesta Groq: {e}\nRespuesta: {response[:200]}")

    def _calculate_grade(self, score: float) -> str:
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
        """Evaluación heurística de fallback si falla Groq"""

        score = 50.0
        campos = ['problema', 'por_que_1', 'por_que_2', 'por_que_3', 'causa_raiz', 'plan_accion']
        completos = sum(1 for c in campos if fw.get(c, '').strip() and len(fw[c]) > 10)
        score += (completos / 6) * 30

        if all(len(fw.get(c, '')) > 20 for c in campos):
            score += 10

        return EvaluacionAvanzada(
            score=round(score, 1),
            grade=self._calculate_grade(score),
            nivel_analisis=self._calculate_nivel(score),
            chain_coherence=score * 0.8,
            root_cause_alignment=score * 0.85,
            action_plan_alignment=score * 0.75,
            strengths=[f"✅ {completos}/6 campos completos"],
            weaknesses=[f"⚠️ Error en evaluación Groq: {error[:100]}"],
            suggestions=["💡 Verifica que GROQ_API_KEY esté configurada correctamente"],
            tips=["🎯 Revisa los logs del servidor para más detalles del error"],
            detail=f"Evaluación básica (fallback). Error: {error[:200]}"
        )


# Test rápido
if __name__ == "__main__":
    evaluator = AIEvaluatorGroq()

    test_5w = {
        "problema": "Salimos tarde del centro de distribución (15 minutos de retraso)",
        "por_que_1": "Porque el camión DS0009 aún estaba siendo cargado",
        "por_que_2": "Porque faltaba producto Golden en la carga inicial",
        "por_que_3": "Porque almacén no detectó el faltante hasta el último momento",
        "por_que_4": "Porque no se hizo inventario la noche anterior",
        "causa_raiz": "Falta de proceso de verificación de inventario nocturno",
        "plan_accion": "Implementar checklist obligatorio de inventario cada noche a las 22:00, supervisado por jefe de almacén"
    }

    print("🧪 Probando evaluador Groq...")
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
