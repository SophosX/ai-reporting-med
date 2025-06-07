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


def calculate_word_metrics(input_text: str, report_text: str, template_text: str = None) -> Tuple[int, int, int]:
    """
    Calculate word count metrics for a report
    
    Args:
        input_text: The original input text from the radiologist
        report_text: The final generated report text
        template_text: The template text used (if any)
        
    Returns:
        Tuple of (total_words, generated_words, saved_words)
    """
    total_words = count_words(report_text)
    
    # AI-generated words = the words from the original AI response
    # This should be the same as total_words when first created
    generated_words = total_words
    
    # Saved words = words written manually by user (initially 0)
    # This will be calculated as (current_total - original_ai_generated) when report is edited
    saved_words = 0
    
    return total_words, generated_words, saved_words


def update_report_word_metrics(report) -> None:
    """
    Update word metrics for a report object (used only during initial report creation)
    
    When a report is created, saved_words = 0 (no manual edits yet)
    When a report is edited later, saved_words = total_words - original_generated_words
    
    Args:
        report: Report model instance to update
    """
    total_words, generated_words, saved_words = calculate_word_metrics(
        report.input_text,
        report.report_text,
        report.template_text
    )
    
    report.total_words = total_words
    report.generated_words = generated_words
    report.saved_words = saved_words 