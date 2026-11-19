"""
OpenAI Service - KI-Abstraktionsschicht für die Befundgenerierung.

Dieses Modul abstrahiert die verschiedenen KI-Provider (OpenAI, Azure, Uni-API)
und stellt eine einheitliche Schnittstelle für die Befundgenerierung bereit.

Unterstützte Provider (konfiguriert via AI_PROVIDER in .env):
- "openai": Direkte OpenAI API
- "azure": Azure OpenAI Service
- "uni": Universitäts-Proxy-API (verwendet GPT-5 mit reasoning_effort="low")

Haupt-Funktionen:
- get_ai_client(): Factory für den passenden API-Client
- get_model_name(): Gibt den konfigurierten Modellnamen zurück
- get_completion(): Generiert Befundtext aus Eingabe und Template
"""

import time
from openai import OpenAI, AzureOpenAI
from ..core.config import settings


def get_ai_client():
    """
    Factory-Funktion zur Erstellung des passenden KI-Clients.

    Erstellt basierend auf der AI_PROVIDER-Konfiguration den entsprechenden
    API-Client (OpenAI, Azure oder Uni).

    Returns:
        OpenAI oder AzureOpenAI: Der konfigurierte API-Client

    Raises:
        ValueError: Wenn die Konfiguration unvollständig ist

    Beispiel:
        client = get_ai_client()
        response = client.chat.completions.create(...)
    """
    if settings.AI_PROVIDER == "azure":
        if not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_ENDPOINT:
            raise ValueError("Azure OpenAI configuration is incomplete. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.")
        
        return AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_API_VERSION,
        )
    elif settings.AI_PROVIDER == "uni":
        # University API endpoint (Azure proxy)
        if not settings.UNI_API_KEY:
            raise ValueError("University API key is not configured. Please set UNI_API_KEY.")
        
        # Use Azure OpenAI client with university proxy endpoint
        return AzureOpenAI(
            azure_endpoint=settings.UNI_API_ENDPOINT,
            api_key=settings.UNI_API_KEY,
            api_version="2025-01-01-preview",  # Use same API version as Azure
        )
    else:  # Default to OpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is not configured. Please set OPENAI_API_KEY.")
        
        return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_model_name():
    """
    Gibt den konfigurierten Modellnamen basierend auf dem Provider zurück.

    Modellzuordnung:
    - "openai": OPENAI_MODEL (Standard: gpt-4o)
    - "azure": AZURE_OPENAI_MODEL (Standard: gpt-4o)
    - "uni": UNI_API_MODEL (Standard: gpt-5)

    Returns:
        str: Der konfigurierte Modellname
    """
    if settings.AI_PROVIDER == "azure":
        return settings.AZURE_OPENAI_MODEL
    elif settings.AI_PROVIDER == "uni":
        return settings.UNI_API_MODEL
    else:
        return settings.OPENAI_MODEL


def get_completion(input_text: str, template_text: str = None, custom_prompt: str = None, _meta: dict = None) -> str:
    """
    Generiert einen radiologischen Befund aus Eingabetext und Template.

    Diese Hauptfunktion nimmt die Stichpunkte des Radiologen und generiert
    daraus einen vollständigen, strukturierten Befund. Sie verwendet
    den konfigurierten KI-Provider und wendet ggf. ein Template an.

    Args:
        input_text (str): Stichpunkte/Diktat des Radiologen
        template_text (str, optional): Struktur-Template für den Befund
        custom_prompt (str, optional): Benutzerdefinierter System-Prompt

    Returns:
        str: Der generierte Befundtext oder Fehlermeldung

    Provider-spezifische Parameter:
        - GPT-5 (Uni): reasoning_effort="low" für schnellere Antworten
        - Andere: temperature=0.2 für konsistente, klinische Antworten

    Fehlerbehandlung:
        Bei Fehlern wird eine deutschsprachige Fehlermeldung zurückgegeben,
        keine Exception geworfen.
    """
    try:
        # Get appropriate client and model
        client = get_ai_client()
        model = get_model_name()
        if _meta is not None:
            _meta["model"] = model

        # Create the system prompt
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            system_prompt = """Du fungierst als Assistentin bzw. Assistent für Radiologinnen und Radiologen. Deine Aufgabe ist es, aus unstrukturierten, frei diktierten radiologischen Beobachtungen einen sprachlich korrekten, vollständig strukturierten Befund in deutscher Sprache zu erstellen. Bitte beachte die folgenden strikten Vorgaben:
Exklusive Nutzung des Eingabetextes: Basierend nur auf den inhaltlichen Informationen des diktierten Textes. Verzichte auf Ergänzungen, Vermutungen oder Spekulationen.
Umfassende Dokumentation aller pathologischen Befunde: Stelle sicher, dass sämtliche beschriebenen Auffälligkeiten in die entsprechenden Abschnitte des Befund-Templates übernommen werden. Fehlerhafte Grammatik oder umgangssprachliche Formulierungen dürfen das Verständnis nicht beeinträchtigen; extrahiere jedes pathologische Detail und strukturiere es korrekt.
Vollständige Bearbeitung des Templates: Jeder Abschnitt des vorgegebenen Befund-Templates ist auszufüllen. Wo keine Informationen im diktierten Text vorhanden sind, nutze die Standardformulierung aus dem Template für diesen Abschnitt (z. B. „unauffällig" oder „kein pathologischer Befund").
Festgelegte Abschnitts-Reihenfolge: Die Reihenfolge der Abschnitte im Template darf nicht verändert werden. Halte dich genau an die Struktur, auch wenn einzelne Abschnitte keine spezifischen Informationen erhalten.
Prägnanter Stil: Nutze den typischen, telegraphischen Stil radiologischer Befundung: kurz, sachlich und präzise, ohne narrative Ausschmückungen.
 
Wichtig: Achte besonders darauf, dass kein pathologischer Befund aus dem diktierten Text unter den Tisch fällt oder weggelassen wird, auch wenn der Text uneinheitlich oder grammatikalisch fehlerhaft ist. Jede relevante Beobachtung muss sich im finalen Bericht widerspiegeln."""

        # Add template instruction if provided
        if template_text:
            system_prompt += f"\n\nVerwende die folgende Vorlage und halte dich an diese Struktur:\n{template_text}"

        if _meta is not None:
            _meta["system_prompt"] = system_prompt
        _t0 = time.monotonic()

        # Different parameters for gpt-5
        if settings.AI_PROVIDER == "uni" and model == "gpt-5":
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text}
                ],
                reasoning_effort="low",  # Minimize thinking time for faster responses
                max_completion_tokens=2000  # Reduced since less reasoning tokens needed
            )
        else:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text}
                ],
                temperature=0.2,  # Lower temperature for more consistent, clinical responses
                max_tokens=1000
            )
        content = response.choices[0].message.content
        if _meta is not None:
            _fill_response_meta(_meta, response, _t0, content)
        return content
    
    except ValueError as e:
        # Configuration error
        if _meta is not None:
            _meta["error"] = True
        print(f"AI Service configuration error: {e}")
        return f"Konfigurationsfehler: {str(e)}"
    except Exception as e:
        # Log the error (ideally would use proper logging)
        if settings.AI_PROVIDER == "azure":
            provider_name = "Azure OpenAI"
        elif settings.AI_PROVIDER == "uni":
            provider_name = "University API"
        else:
            provider_name = "OpenAI"
        print(f"{provider_name} API error: {e}")
        if _meta is not None:
            _meta["error"] = True
            if "_t0" in locals():
                _meta["generation_ms"] = int((time.monotonic() - _t0) * 1000)
        return f"Fehler bei der Befunderstellung: {str(e)}"


def _fill_response_meta(meta: dict, response, t0: float, content) -> None:
    """Überträgt Latenz, Abbruchgrund und Token-Verbrauch der KI-Antwort in meta."""
    meta["generation_ms"] = int((time.monotonic() - t0) * 1000)
    try:
        meta["finish_reason"] = response.choices[0].finish_reason
    except Exception:
        pass
    usage = getattr(response, "usage", None)
    if usage is not None:
        meta["prompt_tokens"] = getattr(usage, "prompt_tokens", None)
        meta["completion_tokens"] = getattr(usage, "completion_tokens", None)
        details = getattr(usage, "completion_tokens_details", None)
        if details is not None:
            meta["reasoning_tokens"] = getattr(details, "reasoning_tokens", None)
    # Leere Antwort (z.B. alle Tokens fürs Reasoning verbraucht) ist für die Studie ein Fehlerfall
    if not content or not str(content).strip():
        meta["error"] = True


def get_completion_with_meta(input_text: str, template_text: str = None, custom_prompt: str = None):
    """
    Wie get_completion(), liefert zusätzlich Metadaten für die Studien-Auswertung.

    Returns:
        tuple[str, dict]: (Befundtext, meta) mit meta-Schlüsseln provider, model,
        system_prompt, generation_ms, finish_reason, prompt_tokens, completion_tokens,
        reasoning_tokens, error (True bei Fehlertext oder leerer Antwort)
    """
    meta = {
        "provider": settings.AI_PROVIDER,
        "model": None,
        "system_prompt": None,
        "generation_ms": None,
        "finish_reason": None,
        "prompt_tokens": None,
        "completion_tokens": None,
        "reasoning_tokens": None,
        "error": False,
    }
    text = get_completion(input_text, template_text, custom_prompt, _meta=meta)
    return text, meta
