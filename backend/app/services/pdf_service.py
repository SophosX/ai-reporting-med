from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import cm
from io import BytesIO
import markdown
from reportlab.platypus.flowables import KeepTogether
import re

def strip_markdown(text):
    """Remove markdown formatting for plain text rendering"""
    # Remove headers
    text = re.sub(r'#+\s+(.*)', r'\1', text)
    # Remove bold/italic
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Remove lists
    text = re.sub(r'^\s*[-*+]\s+(.*)', r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+(.*)', r'\1', text, flags=re.MULTILINE)
    return text

def generate_pdf(report_data):
    """
    Generate a PDF for a medical report
    
    Args:
        report_data (dict): Report data containing id, date, input, report_text
        
    Returns:
        bytes: PDF as bytes
    """
    buffer = BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=1,  # Center alignment
        spaceAfter=12
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=6,
        spaceBefore=12
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Create document content
    story = []
    
    # Title
    story.append(Paragraph("Medical Report", title_style))
    story.append(Spacer(1, 0.5 * cm))
    
    # Report Details Section
    story.append(Paragraph("Report Details", heading_style))
    
    # Format report details as a table
    data = [
        ["Report ID:", f"{report_data['id']}"],
        ["Date:", f"{report_data['date']}"]
    ]
    
    details_table = Table(data, colWidths=[100, 350])
    details_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONT', (1, 0), (1, -1), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(details_table)
    story.append(Spacer(1, 0.5 * cm))
    
    # Input Section
    story.append(Paragraph("Input", heading_style))
    story.append(Paragraph(report_data['input'], normal_style))
    story.append(Spacer(1, 0.5 * cm))
    
    # Medical Report Findings Section
    story.append(Paragraph("Medical Report Findings", heading_style))
    
    # Process the report text (handle markdown)
    clean_text = strip_markdown(report_data['report_text'])
    story.append(Paragraph(clean_text, normal_style))
    
    # Build the PDF
    doc.build(story)
    
    # Get the PDF data from the buffer
    buffer.seek(0)
    return buffer.getvalue() 