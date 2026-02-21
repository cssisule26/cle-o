from openai import OpenAI
from schemas.log_schema import TrendSummary, LeoResponse
from services.risk_detector import detect_risk, CRISIS_RESPONSE
from models.daily_log import DailyLog
from dotenv import load_dotenv
import os
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def build_prompt(log: DailyLog, trends: TrendSummary) -> str:
    flags_text = ", ".join(trends.pattern_flags) if trends.pattern_flags else "none"

    return f"""
You are Leo, a warm and empathetic mental wellness companion. 
You are NOT a therapist. You provide supportive coaching and behavioral insights only.

User's check-in today:
- Mood: {log.mood}/10
- Stress: {log.stress}/10
- Sleep: {log.sleep_hours} hours
- Exercise: {log.exercise_minutes} minutes
- Notes: "{log.notes or 'None provided'}"

7-day trends:
- Average mood: {trends.mood_avg}/10 ({trends.mood_trend})
- Average sleep: {trends.sleep_avg} hours
- Average stress: {trends.stress_avg}/10
- Average exercise: {trends.exercise_avg} minutes
- Pattern flags: {flags_text}

Based on this, respond ONLY as valid JSON with exactly these keys:
{{
  "summary": "A 2–3 sentence empathetic summary of how the user is doing",
  "physical_adjustment": "One specific physical habit to improve this week",
  "mental_reframe": "One cognitive reframing suggestion for their current stress/mood",
  "behavioral_action": "One concrete behavioral action they can take today",
  "encouragement": "A warm, personalized closing message"
}}

Be specific, warm, and actionable. Do NOT use generic advice.
Only return valid JSON, nothing else.
""".strip()


def generate_leo_response(log: DailyLog, trends: TrendSummary) -> LeoResponse:
    # Step 1: Check for crisis language first
    risk_score, requires_escalation = detect_risk(log.notes or "")

    if requires_escalation:
        return LeoResponse(
            summary="I noticed something in what you shared that I want to address with care.",
            physical_adjustment="Please focus on your immediate safety and wellbeing right now.",
            mental_reframe="Your feelings are valid, and you deserve real human support.",
            behavioral_action="Please reach out to a crisis line or trusted person today.",
            encouragement=CRISIS_RESPONSE,
            risk_level=risk_score,
            trend_summary=trends
        )

    # Step 2: Call GPT-4
    try:
        prompt = build_prompt(log, trends)
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Leo, a mental wellness companion. Always respond in valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=600
        )

        raw = completion.choices[0].message.content.strip()
        data = json.loads(raw)

        return LeoResponse(
            summary=data.get("summary", ""),
            physical_adjustment=data.get("physical_adjustment", ""),
            mental_reframe=data.get("mental_reframe", ""),
            behavioral_action=data.get("behavioral_action", ""),
            encouragement=data.get("encouragement", ""),
            risk_level=risk_score,
            trend_summary=trends
        )

    except json.JSONDecodeError:
        # Fallback if GPT doesn't return clean JSON
        return LeoResponse(
            summary="I had a moment processing your check-in. Let's try again.",
            physical_adjustment="Try a 10-minute walk today.",
            mental_reframe="One step at a time is always enough.",
            behavioral_action="Write down one thing you're grateful for right now.",
            encouragement="You showed up today, and that matters. 💙",
            risk_level=risk_score,
            trend_summary=trends
        )

    except Exception as e:
        raise RuntimeError(f"Leo engine failed: {str(e)}")