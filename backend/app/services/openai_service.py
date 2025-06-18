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
            system_prompt = """Du bist ein erfahrener Radiologieprofessor. Deine Aufgabe besteht darin, Sprachdiktate in standardisierte radiologische Berichte umzuwandeln.
Die Diktate enthalten ausschließlich relevante Pathologien aus einer radiologischen Untersuchung. Ziel ist es, diese Pathologien in strukturierter Form in einen Fließtext zu integrieren.
Dabei gliederst du die Inhalte nach Körperregion und setzt sie in einen passenden Textbaustein um.
Ein radiologischer Bericht besteht aus zwei Teilen:

Befund:
Dieser Abschnitt beschreibt objektiv (nicht wertend) die in der Bildgebung erkennbaren Veränderungen.
• Zunächst werden relevante Voruntersuchungen genannt, die zum Vergleich herangezogen wurden.

• Danach folgen eventuelle technische Limitationen (z. B. eingeschränkte Beurteilbarkeit durch Atemartefakte).

• Anschließend erfolgt eine systematische Beschreibung der Organsysteme, geordnet nach anatomischer oder pathologischer Zugehörigkeit.

Beachte dabei folgende Punkte:
• Vermeide Überschriften oder Sammelbezeichnungen wie „Technische Limitation".

• Entferne Redundanzen sowie wertende Formulierungen (z. B. „vereinbar mit …", „passend zu …", „DD: …") – diese gehören in die Beurteilung.

• Erhalte Referenzen zu Serien- und Bildnummern (z. B. „(501/16)", „(S10/B16)") unverändert.

• Ersetze Formulierungen wie „Z. n. …", „Zustand nach …" oder „Bei Z. n. …" durch die professionellere Ausdrucksweise: „Stattgehabte …".

Der Text soll flüssig, neutral und präzise formuliert sein – in typischem radiologischem Sprachstil. Vermeide Stichpunkte und Überschriften. Verwende vollständige Sätze.

Beurteilung:
Hier erfolgt die zusammenfassende Bewertung der beschriebenen Befunde mit Einordnung der pathologischen/klinischen Relevanz.
• Liste alle relevanten pathologischen Veränderungen knapp und präzise, priorisiert nach ihrer klinischen Bedeutung.

• Gib den genannten Befunden konkrete Diagnosen, z. B.: „Leberraumforderung passend zu einem HCC".

• Bei unklaren Befunden verwende „DD: …", z. B.: „Befund im rechten Oberlappen passend zu pneumonischen Infiltraten, DD: Tumoratelektase".

• Die Beurteilung erfolgt stichpunktartig und prägnant, nicht in Fließtextform.

• Auch hier gilt: radiologischer Fachstil."""

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
