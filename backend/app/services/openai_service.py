from openai import OpenAI, AzureOpenAI
from ..core.config import settings


def get_ai_client():
    """Factory function to return appropriate AI client based on configuration"""
    if settings.AI_PROVIDER == "azure":
        if not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_ENDPOINT:
            raise ValueError("Azure OpenAI configuration is incomplete. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.")
        
        return AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_API_VERSION,
        )
    else:  # Default to OpenAI
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is not configured. Please set OPENAI_API_KEY.")
        
        return OpenAI(api_key=settings.OPENAI_API_KEY)


def get_model_name():
    """Get the appropriate model name based on provider"""
    if settings.AI_PROVIDER == "azure":
        return settings.AZURE_OPENAI_MODEL
    else:
        return settings.OPENAI_MODEL


def get_completion(input_text: str, template_text: str = None, custom_prompt: str = None) -> str:
    """
    Gets completion from AI service based on input text and optional template

    Args:
        input_text: The radiologist's input text/dictation
        template_text: Optional template structure to follow
        custom_prompt: Optional custom prompt to override default

    Returns:
        Generated report text
    """
    try:
        # Get appropriate client and model
        client = get_ai_client()
        model = get_model_name()

        # Create the system prompt
        if custom_prompt:
            system_prompt = custom_prompt
        else:
            system_prompt = """Du bist ein Assistent für Radiologinnen und Radiologen. Du erhältst als Eingabe unstrukturierte, teils fehlerhafte, frei formulierte Texte oder Diktate mit radiologischen Beobachtungen. Deine Aufgabe ist es, ausschließlich auf Grundlage dieser Angaben einen sprachlich korrekten, vollständig strukturierten radiologischen Befund in deutscher Sprache zu generieren.

Verbindliche Vorgaben:

- Verwende ausschließlich Informationen aus dem Eingabetext.
- Keine Ergänzungen, Vermutungen oder erfundenen Inhalte.
- Jeder Abschnitt des Templates muss im generierten Bericht vollständig enthalten sein.
- Wenn im Eingabetext keine Angaben zu einem Abschnitt gemacht wurden, ist die unauffällige Standardformulierung des Templates zu übernehmen.
- Nur explizite Informationen im Eingabetext dürfen den jeweiligen Abschnitt verändern.
- Die Reihenfolge der Abschnitte im Template darf unter keinen Umständen verändert werden.
- Der Befundtext muss als einzeiliger Fließtext ausgegeben werden – keine Segmentierung, keine Zwischenüberschriften, keine Absätze.
- Verwende den typischen, stichpunktartigen Stil radiologischer Befunde: kurz, sachlich, telegraphisch, ohne erklärende oder narrative Sprache."""

        # Add template instruction if provided
        if template_text:
            system_prompt += f"\n\nVerwende die folgende Vorlage und halte dich an diese Struktur:\n{template_text}"

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_text}
            ],
            temperature=0.2,  # Lower temperature for more consistent, clinical responses
            max_tokens=1000
        )
        return response.choices[0].message.content
    
    except ValueError as e:
        # Configuration error
        print(f"AI Service configuration error: {e}")
        return f"Konfigurationsfehler: {str(e)}"
    except Exception as e:
        # Log the error (ideally would use proper logging)
        provider_name = "Azure OpenAI" if settings.AI_PROVIDER == "azure" else "OpenAI"
        print(f"{provider_name} API error: {e}")
        return f"Fehler bei der Befunderstellung: {str(e)}"
