from openai import OpenAI
from ..core.config import settings


def get_completion(input_text: str, template_text: str = None, custom_prompt: str = None,
                   format_instructions: str = None) -> str:
    """
    Gets completion from OpenAI based on input text and optional template

    Args:
        input_text: The radiologist's input text/dictation
        template_text: Optional template structure to follow
        custom_prompt: Optional custom prompt to override default
        format_instructions: Optional formatting instructions (e.g. Markdown guidelines)

    Returns:
        Generated report text (potentially with markdown formatting)
    """
    # Create OpenAI client with API key
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Create the system prompt
    if custom_prompt:
        system_prompt = custom_prompt
    else:
        system_prompt = (
            "Du bist ein erfahrener Radiologe. Du erstellst präzise und "
            "professionelle radiologische Befunde. Verwende eine klare, "
            "strukturierte und fachlich korrekte Sprache."
        )

    # Add template instruction if provided
    if template_text:
        system_prompt += f"\n\nVerwende die folgende Vorlage und halte dich an diese Struktur:\n{template_text}"

    # Add formatting instruction if provided
    if format_instructions:
        system_prompt += f"\n\nWichtig zur Formatierung: {format_instructions}"
    else:
        # Default markdown formatting instructions
        system_prompt += """

        Formatiere deinen Bericht mit Markdown:
        - Verwende # für Hauptüberschriften (z.B. # BEFUND)
        - Verwende ## für Unterabschnitte (z.B. ## Lunge)
        - Verwende **fett** für wichtige Befunde oder Diagnosen
        - Verwende *kursiv* für Nebenbefunde oder Anmerkungen
        - Verwende Listen mit - oder 1. für Aufzählungen
        - Verwende > für Zitate oder wichtige Hinweise

        Beispiel:
        # BEFUND
        ## Lunge
        - Normales Lungenparenchym ohne Nachweis von **Infiltraten** oder Raumforderungen
        - Keine pleuralen Ergüsse

        ## Herz
        - Herzgröße normal
        - *Leichte* Sklerose der Aorta
        """

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": input_text}
            ],
            temperature=0.2,  # Lower temperature for more consistent, clinical responses
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        # Log the error (ideally would use proper logging)
        print(f"OpenAI API error: {e}")
        return f"Fehler bei der Befunderstellung: {str(e)}"