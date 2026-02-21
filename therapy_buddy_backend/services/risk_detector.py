from typing import Tuple

# Phrases that indicate potential crisis
HIGH_RISK_PHRASES = [
    "i want to die",
    "i want to disappear",
    "end my life",
    "kill myself",
    "no reason to live",
    "better off without me",
    "can't go on",
    "can't do this anymore",
    "want it to stop",
    "there's no point",
    "nothing matters",
    "i give up",
    "i'm done",
    "don't want to be here",
]

MEDIUM_RISK_PHRASES = [
    "feel hopeless",
    "feel worthless",
    "feel numb",
    "can't feel anything",
    "everything is pointless",
    "no one cares",
    "i hate myself",
    "i'm a burden",
    "exhausted all the time",
    "can't keep going",
]


def detect_risk(text: str) -> Tuple[float, bool]:
    """
    Returns:
        risk_score: float between 0.0 (safe) and 1.0 (high risk)
        requires_escalation: bool — True means show crisis resources
    """
    if not text:
        return 0.0, False

    text_lower = text.lower()

    for phrase in HIGH_RISK_PHRASES:
        if phrase in text_lower:
            return 0.9, True

    matches = sum(1 for phrase in MEDIUM_RISK_PHRASES if phrase in text_lower)
    if matches >= 2:
        return 0.6, True
    elif matches == 1:
        return 0.4, False

    return 0.1, False


CRISIS_RESPONSE = """
I hear you, and I want you to know that what you're feeling matters deeply.
You don't have to face this alone.

Please reach out to a crisis support line right now:
• **988 Suicide & Crisis Lifeline**: Call or text 988 (US)
• **Crisis Text Line**: Text HOME to 741741
• **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/

Leo is here to support your wellness journey, but in moments like this, 
please connect with a trained human who can truly help. 💙
"""