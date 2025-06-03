from openai import AzureOpenAI
from ..core.config import settings
endpoint = "https://ukatrki02.openai.azure.com/"
subscription_key = "003c87cb1b9a45e1aeca00b9cbd0eaec"

def get_completion(input_text: str, template_text: str = None, custom_prompt: str = None) -> str:
    """
    Gets completion from OpenAI based on input text and optional template

    Args:
        input_text: The radiologist's input text/dictation
        template_text: Optional template structure to follow
        custom_prompt: Optional custom prompt to override default

    Returns:
        Generated report text
    """
    # Create OpenAI client with API key
    client = AzureOpenAI(  
    	azure_endpoint=endpoint,  
    	api_key=subscription_key,  
    	api_version="2025-01-01-preview",
    )

    # Create the system prompt
    if custom_prompt:
        system_prompt = custom_prompt
    else:
        system_prompt = (
            "Du bist ein Assistent für Radiologinnen und Radiologen. Du erhältst als Eingabe unstrukturierte, teils fehlerhafte, frei formulierte Texte oder Diktate mit radiologischen Beobachtungen. Deine Aufgabe ist es, ausschließlich auf Grundlage dieser Angaben einen sprachlich korrekten, vollständig strukturierten radiologischen Befund in deutscher Sprache zu generieren."

            "**Verbindliche Vorgaben:**"

           " - Verwende ausschließlich Informationen aus dem Eingabetext."
           " - Keine Ergänzungen, Vermutungen oder erfundenen Inhalte."
           " - Jeder Aspekt des folgenden Templates muss vollständig berücksichtigt werden – auch wenn hierzu keine Angaben im Input enthalten sind. In diesem Fall ist die entsprechende unauffällige Normalformulierung (wie im Template) einzufügen."
           " - Die Reihenfolge der Abschnitte im Template darf unter keinen Umständen verändert werden."
           " - Der Befundtext muss als einzeiliger Fließtext ausgegeben werden – keine Segmentierung, keine Zwischenüberschriften, keine Absätze."
           " - Verwende den typischen, stichpunktartigen Stil radiologischer Befunde: kurz, sachlich, telegraphisch, ohne erklärende oder narrative Sprache."
        )

    # Add template instruction if provided
    if template_text:
        system_prompt += f"\n\nVerwende die folgende Vorlage und halte dich an diese Struktur:\n{template_text}"

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
