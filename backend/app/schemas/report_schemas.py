"""
Report Schemas - Pydantic-Modelle für Befund-bezogene API-Anfragen und -Antworten.

Dieses Modul definiert alle Pydantic-Schemas für Befundoperationen:
- Befunderstellung mit KI (ReportCreate)
- Manuelle Befunderstellung ohne KI (ManualReportCreate)
- Befundaktualisierung (ReportUpdate)
- Befundausgabe (ReportOut)

Die Schemas unterstützen sowohl KI-generierte als auch manuell erstellte Befunde
für wissenschaftliche Vergleichsstudien.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ReportCreate(BaseModel):
    """
    Schema für die KI-gestützte Befunderstellung.

    Wird verwendet, wenn ein Radiologe Stichpunkte eingibt und die KI
    daraus einen vollständigen Befund generiert.

    Attributes:
        input_text (str): Stichpunkte/Notizen des Radiologen als Eingabe für die KI
        template_id (str, optional): ID des zu verwendenden Befund-Templates
        custom_prompt (str, optional): Überschreibt den Standard-System-Prompt für diese Anfrage
        case_id (str, optional): Fall-ID für Studien-Tracking (Zuordnung KI vs. Manual)
    """
    input_text: str
    template_id: Optional[str] = None
    custom_prompt: Optional[str] = None
    case_id: Optional[str] = None  # Für Studien-Session-Tracking
    study_session_id: Optional[int] = None  # Verknüpft den Befund sofort mit der Studien-Session


class ManualReportCreate(BaseModel):
    """
    Schema für die manuelle Befunderstellung ohne KI-Unterstützung.

    Wird in wissenschaftlichen Studien verwendet, um Befunde zu erfassen,
    die der Radiologe komplett selbst geschrieben hat (Kontrollgruppe).

    Attributes:
        report_text (str): Der vollständig manuell verfasste Befundtext
        template_id (str, optional): ID des verwendeten Templates (als Vorlage)
        case_id (str, optional): Fall-ID für Studien-Tracking (Zuordnung zu KI-Befund)
    """
    report_text: str
    template_id: Optional[str] = None
    case_id: Optional[str] = None
    study_session_id: Optional[int] = None  # Verknüpft den Befund sofort mit der Studien-Session


class ReportUpdate(BaseModel):
    """
    Schema zum Aktualisieren eines bestehenden Befunds.

    Ermöglicht das nachträgliche Bearbeiten des Befundtextes.

    Attributes:
        report_text (str): Der neue/aktualisierte Befundtext
        edit_client_ms (int, optional): Browser-gemessene Bearbeitungsdauer
            (Klick auf "Bearbeiten" bis "Speichern") für die Studie
        edit_client_meta (dict, optional): Browser-Zählwerte der Bearbeitung
            (Tastenanschläge, Einfügen ...), keine Textinhalte
    """
    report_text: str
    edit_client_ms: Optional[int] = None
    edit_client_meta: Optional[Dict[str, Any]] = None


class ReportOut(BaseModel):
    """
    Schema für die Befundausgabe in API-Antworten.

    Enthält alle Befunddaten einschließlich Metriken für die
    wissenschaftliche Auswertung.

    Attributes:
        id (int): Eindeutige Befund-ID
        input_text (str): Original-Eingabetext des Radiologen
        report_text (str): Finaler Befundtext (KI-generiert oder manuell)
        created_at (datetime): Erstellungszeitpunkt
        user_id (int): ID des erstellenden Benutzers
        template_id (str, optional): ID des verwendeten Templates
        template_text (str, optional): Snapshot des Template-Texts bei Erstellung
        is_manual (bool): True = manuell erstellt, False = KI-generiert

    Wortanzahl-Metriken (für Effizienzanalyse):
        input_words (int): Anzahl Wörter im Eingabetext
        total_words (int): Gesamte Wortanzahl im finalen Befund
        generated_words (int): Anzahl KI-generierter Wörter
        saved_words (int): Eingesparte Wörter (total - input)

    Studien-Tracking:
        case_id (str, optional): Fall-ID für Zuordnung KI vs. Manual
        study_duration_seconds (int, optional): Session-Dauer in Sekunden

    Config:
        from_attributes: Ermöglicht direkte Konvertierung von SQLAlchemy-Objekten
    """
    id: int
    input_text: str
    report_text: str
    created_at: datetime
    user_id: int
    template_id: Optional[str] = None
    template_text: Optional[str] = None
    is_manual: bool = False

    # Wortanzahl-Metriken für Effizienzanalyse
    input_words: int = 0
    total_words: int = 0
    generated_words: int = 0
    saved_words: int = 0

    # Studien-Session-Tracking
    case_id: Optional[str] = None
    study_duration_seconds: Optional[int] = None

    class Config:
        from_attributes = True
