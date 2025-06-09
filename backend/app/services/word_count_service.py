"""
Word count calculation service for reports
"""
import re
from typing import Dict, Tuple


def count_words(text: str) -> int:
    """
    Count words in a text, handling empty/null values
    
    Args:
        text: Text to count words in
        
    Returns:
        Word count
    """
    if not text or not isinstance(text, str):
        return 0
    
    # Remove markdown formatting and extra whitespace, then count words
    clean_text = re.sub(r'[#*_`]', '', text)  # Remove basic markdown characters
    clean_text = re.sub(r'\s+', ' ', clean_text)  # Replace multiple spaces with single space
    clean_text = clean_text.strip()
    
    if not clean_text:
        return 0
    
    return len([word for word in clean_text.split(' ') if word])


def calculate_word_metrics(input_text: str, ai_generated_text: str, final_report_text: str = None) -> Tuple[int, int, int, int]:
    """
    Calculate word count metrics for a report following the user's specification:
    - Input words: radiologist's initial short phrase
    - AI-generated words: full AI-generated report  
    - Final report words: after user edits (defaults to AI-generated if no edits)
    - Saved words: final_report_words - input_words
    
    Args:
        input_text: The original input text from the radiologist
        ai_generated_text: The AI-generated report text
        final_report_text: The final report text after edits (optional)
        
    Returns:
        Tuple of (input_words, ai_generated_words, final_report_words, saved_words)
    """
    input_words = count_words(input_text)
    ai_generated_words = count_words(ai_generated_text)  
    
    # If no final report text provided, use AI-generated text (for new reports)
    final_report_words = count_words(final_report_text) if final_report_text else ai_generated_words
    
    # Saved words = final report words - input words
    # This represents how many words the user didn't have to write manually
    saved_words = max(0, final_report_words - input_words)
    
    return input_words, ai_generated_words, final_report_words, saved_words


def calculate_edit_delta(ai_generated_words: int, final_report_words: int) -> int:
    """
    Calculate the edit delta (words added/removed by user)
    Positive means user added words, negative means user removed words
    
    Args:
        ai_generated_words: Original AI-generated word count
        final_report_words: Final report word count after edits
        
    Returns:
        Edit delta (final - ai_generated)
    """
    return final_report_words - ai_generated_words


def update_report_word_metrics(report, ai_generated_text: str = None) -> None:
    """
    Update word metrics for a report object (used during initial report creation)
    
    Args:
        report: Report model instance to update
        ai_generated_text: The original AI-generated text (for tracking purposes)
    """
    # For new reports, the report_text IS the AI-generated text
    ai_text = ai_generated_text if ai_generated_text else report.report_text
    
    input_words, ai_generated_words, final_report_words, saved_words = calculate_word_metrics(
        report.input_text,
        ai_text,
        report.report_text
    )
    
    # Store all metrics
    report.input_words = input_words
    report.total_words = final_report_words  # Keep existing field name for compatibility
    report.generated_words = ai_generated_words
    report.saved_words = saved_words


def get_report_efficiency_stats(report) -> Dict[str, int]:
    """
    Get comprehensive efficiency statistics for a report
    
    Args:
        report: Report model instance
        
    Returns:
        Dictionary with efficiency metrics
    """
    input_words = getattr(report, 'input_words', 0) or count_words(report.input_text)
    ai_generated_words = report.generated_words or 0
    final_words = report.total_words or 0
    saved_words = report.saved_words or 0
    
    # Calculate edit delta
    edit_delta = calculate_edit_delta(ai_generated_words, final_words)
    
    # Calculate efficiency percentages
    efficiency_vs_input = round((saved_words / max(1, input_words)) * 100)
    ai_utilization = round((min(ai_generated_words, final_words) / max(1, ai_generated_words)) * 100)
    
    return {
        'input_words': input_words,
        'ai_generated_words': ai_generated_words, 
        'final_words': final_words,
        'saved_words': saved_words,
        'edit_delta': edit_delta,
        'saved_words_initial': max(0, ai_generated_words - input_words),  # AI - Input
        'efficiency_vs_input': efficiency_vs_input,
        'ai_utilization': ai_utilization
    } 