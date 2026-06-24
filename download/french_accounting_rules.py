from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/French_Accounting_Tax_Rules_Guide.pdf",
    pagesize=A4,
    title="French Accounting and Tax Rules Guide",
    author="Z.ai",
    creator="Z.ai",
    subject="Comprehensive guide to French accounting and tax regulations for building accounting software"
)

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    name='Title',
    fontName='Times New Roman',
    fontSize=24,
    alignment=TA_CENTER,
    spaceAfter=30,
    textColor=colors.HexColor('#1F4E79')
)

heading1_style = ParagraphStyle(
    name='Heading1',
    fontName='Times New Roman',
    fontSize=16,
    spaceBefore=20,
    spaceAfter=12,
    textColor=colors.HexColor('#1F4E79'),
    fontWeight='bold'
)

heading2_style = ParagraphStyle(
    name='Heading2',
    fontName='Times New Roman',
    fontSize=13,
    spaceBefore=15,
    spaceAfter=8,
    textColor=colors.HexColor('#2E75B6')
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=10.5,
    leading=16,
    alignment=TA_JUSTIFY,
    spaceAfter=8
)

# Table styles
header_style = ParagraphStyle(
    name='TableHeader',
    fontName='Times New Roman',
    fontSize=10,
    textColor=colors.white,
    alignment=TA_CENTER
)

cell_style = ParagraphStyle(
    name='TableCell',
    fontName='Times New Roman',
    fontSize=9,
    alignment=TA_LEFT
)

cell_center = ParagraphStyle(
    name='TableCellCenter',
    fontName='Times New Roman',
    fontSize=9,
    alignment=TA_CENTER
)

story = []

# Title
story.append(Paragraph("<b>French Accounting and Tax Rules Guide</b>", title_style))
story.append(Paragraph("Comprehensive Guide for Building Accounting Software", ParagraphStyle(
    name='Subtitle',
    fontName='Times New Roman',
    fontSize=14,
    alignment=TA_CENTER,
    spaceAfter=20,
    textColor=colors.grey
)))
story.append(Spacer(1, 20))

# Introduction
story.append(Paragraph("<b>1. Introduction</b>", heading1_style))
story.append(Paragraph(
    "This document provides a comprehensive overview of French accounting and tax regulations essential for developing accounting software similar to platforms like Dougs, Indy, or Tiime. Understanding these rules is critical for ensuring compliance and building features that accurately calculate taxes, generate proper invoices, and manage financial records according to French law.",
    body_style
))
story.append(Paragraph(
    "French accounting standards are governed by the Plan Comptable General (PCG), which establishes the framework for financial reporting, bookkeeping, and tax calculations. The system is designed to ensure transparency, consistency, and legal compliance for all businesses operating in France, from auto-entrepreneurs to large corporations.",
    body_style
))
story.append(Spacer(1, 15))

# Section 2: TVA (VAT)
story.append(Paragraph("<b>2. TVA (Taxe sur la Valeur Ajoutee - VAT)</b>", heading1_style))

story.append(Paragraph("<b>2.1 VAT Rates in France</b>", heading2_style))
story.append(Paragraph(
    "Value Added Tax (TVA) is a consumption tax applied to goods and services in France. The standard rate and reduced rates apply depending on the nature of the transaction. Understanding these rates is essential for correct invoice generation and tax reporting.",
    body_style
))

vat_data = [
    [Paragraph('<b>Rate</b>', header_style), Paragraph('<b>Application</b>', header_style), Paragraph('<b>Examples</b>', header_style)],
    [Paragraph('20% (Standard)', cell_center), Paragraph('Most goods and services', cell_style), Paragraph('Electronics, clothing, professional services', cell_style)],
    [Paragraph('10% (Intermediate)', cell_center), Paragraph('Restoration, some services', cell_style), Paragraph('Restaurant meals, hotel accommodation, transport', cell_style)],
    [Paragraph('5.5% (Reduced)', cell_center), Paragraph('Essential goods and services', cell_style), Paragraph('Food products, books, cinema tickets', cell_style)],
    [Paragraph('2.1% (Super-reduced)', cell_center), Paragraph('Specific essential items', cell_style), Paragraph('Medicines, press publications, live performances', cell_style)],
]

vat_table = Table(vat_data, colWidths=[2*cm, 5*cm, 7*cm])
vat_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(vat_table)
story.append(Spacer(1, 15))

story.append(Paragraph("<b>2.2 VAT Thresholds (Franchise en Base) 2025</b>", heading2_style))
story.append(Paragraph(
    "Small businesses may be exempt from charging VAT if their annual turnover falls below certain thresholds. This regime is called 'Franchise en Base de TVA'. However, recent legislative changes have modified these thresholds significantly.",
    body_style
))

threshold_data = [
    [Paragraph('<b>Business Type</b>', header_style), Paragraph('<b>Standard Threshold</b>', header_style), Paragraph('<b>Majorated Threshold</b>', header_style)],
    [Paragraph('Services (BIC)', cell_style), Paragraph('37,500 EUR', cell_center), Paragraph('42,500 EUR', cell_center)],
    [Paragraph('Sale of Goods (BIC)', cell_style), Paragraph('85,000 EUR', cell_center), Paragraph('94,000 EUR', cell_center)],
    [Paragraph('Liberal Professions (BNC)', cell_style), Paragraph('37,500 EUR', cell_center), Paragraph('42,500 EUR', cell_center)],
]

threshold_table = Table(threshold_data, colWidths=[5*cm, 4.5*cm, 4.5*cm])
threshold_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(threshold_table)
story.append(Spacer(1, 10))

story.append(Paragraph(
    "<b>Important Note:</b> The 2025 Finance Bill proposed lowering the threshold to 25,000 EUR for all activities, but this measure was rejected. The thresholds above remain applicable. Software must monitor these thresholds automatically and alert users when they approach the limits.",
    body_style
))
story.append(Spacer(1, 15))

story.append(Paragraph("<b>2.3 VAT Declaration Frequencies</b>", heading2_style))
story.append(Paragraph(
    "VAT declarations must be filed according to specific schedules based on the company's VAT liability. The frequency determines how often tax calculations and payments must be submitted to the French tax authorities.",
    body_style
))

freq_data = [
    [Paragraph('<b>Annual VAT</b>', header_style), Paragraph('<b>Threshold</b>', header_style), Paragraph('<b>Due Date</b>', header_style)],
    [Paragraph('Monthly (CA3)', cell_style), Paragraph('VAT > 15,000 EUR/year', cell_center), Paragraph('By 19th of following month', cell_center)],
    [Paragraph('Quarterly (CA3)', cell_style), Paragraph('VAT 4,000-15,000 EUR/year', cell_center), Paragraph('By 19th of following quarter', cell_center)],
    [Paragraph('Annual (CA12)', cell_style), Paragraph('VAT < 4,000 EUR/year', cell_center), Paragraph('2nd working day after May 1st', cell_center)],
]

freq_table = Table(freq_data, colWidths=[4*cm, 5*cm, 5*cm])
freq_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(freq_table)
story.append(Spacer(1, 20))

# Section 3: Corporate Tax
story.append(Paragraph("<b>3. Impot sur les Societes (IS - Corporate Tax)</b>", heading1_style))

story.append(Paragraph("<b>3.1 Corporate Tax Rates 2025</b>", heading2_style))
story.append(Paragraph(
    "The Impot sur les Societes (IS) is the corporate income tax levied on company profits. France applies different rates based on company size and profit levels. Understanding these rates is essential for profit calculations and tax provisions in accounting software.",
    body_style
))

is_data = [
    [Paragraph('<b>Rate</b>', header_style), Paragraph('<b>Application</b>', header_style), Paragraph('<b>Conditions</b>', header_style)],
    [Paragraph('15%', cell_center), Paragraph('First 42,500 EUR of profit', cell_style), Paragraph('Turnover < 10M EUR, capital fully paid', cell_style)],
    [Paragraph('25%', cell_center), Paragraph('Remaining profit', cell_style), Paragraph('Standard rate for all companies', cell_style)],
]

is_table = Table(is_data, colWidths=[2.5*cm, 5.5*cm, 6*cm])
is_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(is_table)
story.append(Spacer(1, 10))

story.append(Paragraph(
    "<b>Example:</b> A company with 80,000 EUR profit would pay: (42,500 EUR x 15%) + (37,500 EUR x 25%) = 6,375 EUR + 9,375 EUR = 15,750 EUR corporate tax. Software should automatically apply the reduced rate to the first bracket and the standard rate to remaining profits.",
    body_style
))
story.append(Spacer(1, 15))

# Section 4: Social Charges
story.append(Paragraph("<b>4. Cotisations Sociales (Social Security Contributions)</b>", heading1_style))

story.append(Paragraph("<b>4.1 Employee Social Charges 2025</b>", heading2_style))
story.append(Paragraph(
    "Social security contributions in France are among the highest in Europe. They fund healthcare, retirement, unemployment benefits, and other social programs. Both employers and employees contribute, with different rates applying to each party.",
    body_style
))

social_data = [
    [Paragraph('<b>Contribution</b>', header_style), Paragraph('<b>Employee Rate</b>', header_style), Paragraph('<b>Employer Rate</b>', header_style)],
    [Paragraph('Health Insurance (Maladie)', cell_style), Paragraph('0%', cell_center), Paragraph('7%', cell_center)],
    [Paragraph('Old Age Pension (Vieillesse)', cell_style), Paragraph('0.40%', cell_center), Paragraph('1.90%', cell_center)],
    [Paragraph('CSG/CRDS', cell_style), Paragraph('9.20%', cell_center), Paragraph('0%', cell_center)],
    [Paragraph('Unemployment (Chomage)', cell_style), Paragraph('0%', cell_center), Paragraph('4.05%', cell_center)],
    [Paragraph('Retirement Complementaire', cell_style), Paragraph('Variable', cell_center), Paragraph('Variable', cell_center)],
    [Paragraph('Total Approximate', cell_style), Paragraph('22-25%', cell_center), Paragraph('40-45%', cell_center)],
]

social_table = Table(social_data, colWidths=[5*cm, 4.5*cm, 4.5*cm])
social_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(social_table)
story.append(Spacer(1, 10))

story.append(Paragraph(
    "The total cost of an employee is approximately 1.45 to 1.60 times the gross salary. For example, an employee with a 3,000 EUR gross salary actually costs the employer around 4,350-4,800 EUR. Accounting software must calculate these contributions accurately for payroll processing and budgeting purposes.",
    body_style
))
story.append(Spacer(1, 15))

story.append(Paragraph("<b>4.2 Auto-Entrepreneur Social Charges</b>", heading2_style))
story.append(Paragraph(
    "Auto-entrepreneurs (micro-entrepreneurs) pay simplified social contributions based on their turnover. These rates vary depending on the type of activity and whether the business sells goods or provides services. The rates have been updated for 2025.",
    body_style
))

auto_data = [
    [Paragraph('<b>Activity Type</b>', header_style), Paragraph('<b>Rate (2025)</b>', header_style)],
    [Paragraph('Sale of Goods (Vente)', cell_style), Paragraph('12.3%', cell_center)],
    [Paragraph('Services (Prestation de services)', cell_style), Paragraph('23.1%', cell_center)],
    [Paragraph('Liberal Professions (Profession liberale)', cell_style), Paragraph('23.1%', cell_center)],
]

auto_table = Table(auto_data, colWidths=[8*cm, 5*cm])
auto_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(auto_table)
story.append(Spacer(1, 20))

# Section 5: Invoice Requirements
story.append(Paragraph("<b>5. Invoice Mandatory Requirements</b>", heading1_style))

story.append(Paragraph("<b>5.1 Mandatory Invoice Elements</b>", heading2_style))
story.append(Paragraph(
    "French law requires specific elements on every invoice. Non-compliance can result in fines and the invoice being rejected for tax purposes. Accounting software must ensure all mandatory elements are present on every generated invoice.",
    body_style
))

invoice_data = [
    [Paragraph('<b>Element</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('Invoice Number', cell_style), Paragraph('Unique, sequential, no gaps', cell_style)],
    [Paragraph('Invoice Date', cell_style), Paragraph('Date the invoice is issued', cell_style)],
    [Paragraph('Sale/Service Date', cell_style), Paragraph('Date when goods/services were delivered', cell_style)],
    [Paragraph('Seller Identity', cell_style), Paragraph('Name, address, SIREN/SIRET number', cell_style)],
    [Paragraph('Buyer Identity', cell_style), Paragraph('Name, address (SIREN for B2B)', cell_style)],
    [Paragraph('VAT Number', cell_style), Paragraph('Required if VAT-registered', cell_style)],
    [Paragraph('Description', cell_style), Paragraph('Detailed description of goods/services', cell_style)],
    [Paragraph('Quantity', cell_style), Paragraph('Number of units or hours', cell_style)],
    [Paragraph('Unit Price', cell_style), Paragraph('Price per unit excluding VAT', cell_style)],
    [Paragraph('VAT Rate and Amount', cell_style), Paragraph('Applicable rate and calculated amount', cell_style)],
    [Paragraph('Total Amount', cell_style), Paragraph('Total including all taxes', cell_style)],
    [Paragraph('Payment Terms', cell_style), Paragraph('Due date, payment method, penalties', cell_style)],
]

invoice_table = Table(invoice_data, colWidths=[4.5*cm, 8.5*cm])
invoice_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 7), (-1, 7), colors.white),
    ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 9), (-1, 9), colors.white),
    ('BACKGROUND', (0, 10), (-1, 10), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 11), (-1, 11), colors.white),
    ('BACKGROUND', (0, 12), (-1, 12), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 13), (-1, 13), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(invoice_table)
story.append(Spacer(1, 10))

story.append(Paragraph(
    "<b>E-Invoicing Mandate:</b> Starting 2025-2026, electronic invoicing becomes mandatory for all B2B transactions in France. This requires software to generate invoices in specific formats (Factur-X/UBL) and transmit them through certified platforms (Chorus Pro for public sector, PPF for B2B).",
    body_style
))
story.append(Spacer(1, 20))

# Section 6: Accounting Obligations
story.append(Paragraph("<b>6. Accounting Obligations by Business Type</b>", heading1_style))

story.append(Paragraph("<b>6.1 Micro-Entrepreneur Requirements</b>", heading2_style))
story.append(Paragraph(
    "Micro-entrepreneurs benefit from simplified accounting requirements, but must still maintain certain records. These obligations are minimal compared to other business structures, making this regime attractive for small businesses and freelancers.",
    body_style
))

micro_data = [
    [Paragraph('<b>Obligation</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('Livre des recettes', cell_style), Paragraph('Chronological record of all income', cell_style)],
    [Paragraph('Invoices', cell_style), Paragraph('Issue for each sale/service', cell_style)],
    [Paragraph('Register of purchases', cell_style), Paragraph('For businesses selling goods', cell_style)],
    [Paragraph('Bank account', cell_style), Paragraph('Dedicated account (not mandatory but recommended)', cell_style)],
    [Paragraph('Document retention', cell_style), Paragraph('Keep records for 10 years', cell_style)],
]

micro_table = Table(micro_data, colWidths=[4.5*cm, 8.5*cm])
micro_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(micro_table)
story.append(Spacer(1, 15))

story.append(Paragraph("<b>6.2 Company (SARL, SAS, etc.) Requirements</b>", heading2_style))
story.append(Paragraph(
    "Companies with full accounting obligations must maintain double-entry bookkeeping according to the Plan Comptable General. This requires more sophisticated accounting software with features for journal entries, balance sheets, and income statements.",
    body_style
))

company_data = [
    [Paragraph('<b>Obligation</b>', header_style), Paragraph('<b>Frequency</b>', header_style), Paragraph('<b>Description</b>', header_style)],
    [Paragraph('Journal entries', cell_style), Paragraph('Daily', cell_center), Paragraph('Record all transactions chronologically', cell_style)],
    [Paragraph('General ledger', cell_style), Paragraph('Monthly', cell_center), Paragraph('Summarized account balances', cell_style)],
    [Paragraph('Balance sheet', cell_style), Paragraph('Annual', cell_center), Paragraph('Assets, liabilities, equity snapshot', cell_style)],
    [Paragraph('Income statement', cell_style), Paragraph('Annual', cell_center), Paragraph('Revenues and expenses summary', cell_style)],
    [Paragraph('Liasse fiscale', cell_style), Paragraph('Annual', cell_center), Paragraph('Complete tax return package', cell_style)],
    [Paragraph('Inventory', cell_style), Paragraph('Annual', cell_center), Paragraph('Physical count of stock/assets', cell_style)],
]

company_table = Table(company_data, colWidths=[4*cm, 2.5*cm, 6.5*cm])
company_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(company_table)
story.append(Spacer(1, 20))

# Section 7: Plan Comptable General
story.append(Paragraph("<b>7. Plan Comptable General (PCG) - Chart of Accounts</b>", heading1_style))

story.append(Paragraph("<b>7.1 Account Classes</b>", heading2_style))
story.append(Paragraph(
    "The French Plan Comptable General organizes accounts into classes. Each class represents a category of financial information. Understanding this structure is essential for proper double-entry bookkeeping and financial reporting in French accounting software.",
    body_style
))

pcg_data = [
    [Paragraph('<b>Class</b>', header_style), Paragraph('<b>Category</b>', header_style), Paragraph('<b>Account Types</b>', header_style)],
    [Paragraph('1', cell_center), Paragraph('Capital', cell_style), Paragraph('Equity, reserves, retained earnings', cell_style)],
    [Paragraph('2', cell_center), Paragraph('Fixed Assets', cell_style), Paragraph('Property, equipment, intangibles', cell_style)],
    [Paragraph('3', cell_center), Paragraph('Inventory', cell_style), Paragraph('Stock, raw materials, work in progress', cell_style)],
    [Paragraph('4', cell_center), Paragraph('Third Parties', cell_style), Paragraph('Customers, suppliers, tax authorities', cell_style)],
    [Paragraph('5', cell_center), Paragraph('Financial', cell_style), Paragraph('Bank accounts, cash, investments', cell_style)],
    [Paragraph('6', cell_center), Paragraph('Expenses', cell_style), Paragraph('Operating costs, purchases, wages', cell_style)],
    [Paragraph('7', cell_center), Paragraph('Revenue', cell_style), Paragraph('Sales, services, other income', cell_style)],
    [Paragraph('8', cell_center), Paragraph('Special', cell_style), Paragraph('Extraordinary items, provisions', cell_style)],
    [Paragraph('9', cell_center), Paragraph('Analytical', cell_style), Paragraph('Cost accounting (optional)', cell_style)],
]

pcg_table = Table(pcg_data, colWidths=[2*cm, 3.5*cm, 7.5*cm])
pcg_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 7), (-1, 7), colors.white),
    ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 9), (-1, 9), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(pcg_table)
story.append(Spacer(1, 20))

# Section 8: Key Deadlines
story.append(Paragraph("<b>8. Key Tax Deadlines</b>", heading1_style))
story.append(Paragraph(
    "Meeting tax deadlines is critical for compliance and avoiding penalties. Accounting software should include automated reminders and deadline tracking features to help businesses stay compliant. The following table summarizes the main annual deadlines.",
    body_style
))

deadline_data = [
    [Paragraph('<b>Declaration/Payment</b>', header_style), Paragraph('<b>Frequency</b>', header_style), Paragraph('<b>Deadline</b>', header_style)],
    [Paragraph('Corporate Tax (IS)', cell_style), Paragraph('Quarterly', cell_center), Paragraph('25th of month following quarter end', cell_center)],
    [Paragraph('VAT (CA3)', cell_style), Paragraph('Monthly/Quarterly', cell_center), Paragraph('19th of following month/quarter', cell_center)],
    [Paragraph('VAT (CA12)', cell_style), Paragraph('Annual', cell_center), Paragraph('2nd working day after May 1st', cell_center)],
    [Paragraph('Liasse Fiscale', cell_style), Paragraph('Annual', cell_center), Paragraph('3 months after fiscal year end', cell_center)],
    [Paragraph('CVAE (Taxe economique)', cell_style), Paragraph('Annual', cell_center), Paragraph('May 3rd (with CFE)', cell_center)],
    [Paragraph('CFE (Local tax)', cell_style), Paragraph('Annual', cell_center), Paragraph('December 15th', cell_center)],
]

deadline_table = Table(deadline_data, colWidths=[5*cm, 3.5*cm, 4.5*cm])
deadline_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(deadline_table)
story.append(Spacer(1, 20))

# Section 9: Software Requirements
story.append(Paragraph("<b>9. Software Implementation Requirements</b>", heading1_style))

story.append(Paragraph("<b>9.1 Core Features Required</b>", heading2_style))
story.append(Paragraph(
    "Building accounting software for the French market requires implementing specific features to ensure compliance with local regulations. The following table outlines essential features and their compliance purposes.",
    body_style
))

feature_data = [
    [Paragraph('<b>Feature</b>', header_style), Paragraph('<b>Purpose</b>', header_style), Paragraph('<b>Compliance</b>', header_style)],
    [Paragraph('Invoice Generation', cell_style), Paragraph('Create compliant invoices', cell_style), Paragraph('CGI Art. L441-9', cell_center)],
    [Paragraph('VAT Calculation', cell_style), Paragraph('Automatic tax computation', cell_style), Paragraph('CGI Art. 286', cell_center)],
    [Paragraph('Journal Entries', cell_style), Paragraph('Double-entry bookkeeping', cell_style), Paragraph('PCG Art. 111-1', cell_center)],
    [Paragraph('Balance Sheet', cell_style), Paragraph('Annual financial position', cell_style), Paragraph('PCG Art. 421-1', cell_center)],
    [Paragraph('Income Statement', cell_style), Paragraph('Annual profit/loss', cell_style), Paragraph('PCG Art. 421-1', cell_center)],
    [Paragraph('Tax Declarations', cell_style), Paragraph('Generate official forms', cell_style), Paragraph('CGI various articles', cell_center)],
    [Paragraph('Document Storage', cell_style), Paragraph('10-year retention', cell_style), Paragraph('CGI Art. L102B', cell_center)],
    [Paragraph('E-Invoicing', cell_style), Paragraph('Electronic transmission', cell_style), Paragraph('Law 2019-486', cell_center)],
]

feature_table = Table(feature_data, colWidths=[4*cm, 5*cm, 4*cm])
feature_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, 1), colors.white),
    ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 3), (-1, 3), colors.white),
    ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 5), (-1, 5), colors.white),
    ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F5F5F5')),
    ('BACKGROUND', (0, 7), (-1, 7), colors.white),
    ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor('#F5F5F5')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(feature_table)
story.append(Spacer(1, 15))

story.append(Paragraph("<b>9.2 Certification Requirements</b>", heading2_style))
story.append(Paragraph(
    "Accounting software in France may require certification to ensure compliance with tax regulations. The NF 525 certification is mandatory for certain software used by businesses subject to VAT. This certification verifies that the software meets requirements for data integrity, security, and compliance with French accounting standards.",
    body_style
))
story.append(Paragraph(
    "The certification process involves testing by accredited laboratories to verify that the software correctly handles invoice sequencing, prevents data manipulation, and maintains proper audit trails. Software developers should consider this certification requirement when designing their products for the French market.",
    body_style
))
story.append(Spacer(1, 20))

# Section 10: Official Sources
story.append(Paragraph("<b>10. Official Sources and References</b>", heading1_style))
story.append(Paragraph(
    "The information in this guide is derived from official French government sources. For the most current regulations and detailed guidance, consult these authoritative resources:",
    body_style
))

sources = [
    "Autorite des Normes Comptables (ANC) - www.anc.gouv.fr - Plan Comptable General",
    "Direction Generale des Finances Publiques - www.impots.gouv.fr - Tax regulations",
    "Urssaf - www.urssaf.fr - Social security contributions",
    "Service-Public.fr - www.service-public.fr - Government administrative information",
    "Legifrance - www.legifrance.gouv.fr - Official legal texts",
    "BOFIP - bofip.impots.gouv.fr - Official tax doctrine",
]

for source in sources:
    story.append(Paragraph(f"• {source}", body_style))

story.append(Spacer(1, 20))
story.append(Paragraph(
    "<b>Disclaimer:</b> This document is for informational purposes only and does not constitute legal or tax advice. Regulations change frequently, and businesses should consult qualified professionals for specific guidance. Software developers should verify all calculations and compliance requirements with current official sources.",
    ParagraphStyle(
        name='Disclaimer',
        fontName='Times New Roman',
        fontSize=9,
        textColor=colors.grey,
        alignment=TA_JUSTIFY
    )
))

# Build PDF
doc.build(story)
print("PDF generated successfully!")
