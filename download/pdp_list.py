from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document
doc = SimpleDocTemplate(
    "/home/z/my-project/download/Approved_E-Invoicing_Platforms_France.pdf",
    pagesize=A4,
    title="Approved E-Invoicing Platforms France",
    author="Z.ai",
    creator="Z.ai",
    subject="Official list of PDP platforms for French e-invoicing reform"
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    name='Title',
    fontName='Times New Roman',
    fontSize=18,
    alignment=TA_CENTER,
    spaceAfter=20,
    textColor=colors.HexColor('#1F4E79')
)

subtitle_style = ParagraphStyle(
    name='Subtitle',
    fontName='Times New Roman',
    fontSize=12,
    alignment=TA_CENTER,
    spaceAfter=15,
    textColor=colors.grey
)

body_style = ParagraphStyle(
    name='BodyStyle',
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    alignment=TA_LEFT,
    spaceAfter=10
)

header_style = ParagraphStyle(
    name='TableHeader',
    fontName='Times New Roman',
    fontSize=9,
    textColor=colors.white,
    alignment=TA_CENTER
)

cell_style = ParagraphStyle(
    name='TableCell',
    fontName='Times New Roman',
    fontSize=8,
    alignment=TA_LEFT
)

cell_center = ParagraphStyle(
    name='TableCellCenter',
    fontName='Times New Roman',
    fontSize=8,
    alignment=TA_CENTER
)

story = []

# Title
story.append(Paragraph("<b>Approved E-Invoicing Platforms (PDP) in France</b>", title_style))
story.append(Paragraph("Official List from impots.gouv.fr - March 2026", subtitle_style))
story.append(Spacer(1, 15))

# Introduction
story.append(Paragraph(
    "<b>What is a PDP?</b> A Plateforme de Dematerialisation Partenaire (PDP) is a certified platform authorized by the French government to issue, transmit, and receive electronic invoices under the e-invoicing reform. These platforms have passed interoperability tests with the Public Invoicing Portal (PPF).",
    body_style
))
story.append(Spacer(1, 10))

story.append(Paragraph(
    "<b>For SaaS developers:</b> To build accounting/invoicing software for France, you must either: (1) Become a certified PDP, (2) Integrate with an existing PDP, or (3) Use the free government PPF portal.",
    body_style
))
story.append(Spacer(1, 15))

# Platform data
platforms = [
    ["@GP", "atgp.net", "contact.pdp@atgp.net"],
    ["@iPaidThat", "ipaidthat.io", "contact@ipaidthat.io"],
    ["@N2F PDP", "n2f.com", "sales@n2f.com"],
    ["ABBY", "abby.fr", "contact@abby.fr"],
    ["ACCENTURE", "accenture.com", "fr.contact.ecv@accenture.com"],
    ["ADEMICO SOFTWARE", "ademico-software.com", "info@ademico-software.com"],
    ["AGENA 3000", "agena3000.com", "www.agena3000.com/fr/contact"],
    ["AGICAP", "agicap.com", "contact-pdp@agicap.com"],
    ["ARTEVA", "arteva.fr", "contact-pdp@arteva.fr"],
    ["AVALARA", "avalara.com", "pdp-contact@avalara.com"],
    ["AXONAUT", "axonaut.com", "hello@axonaut.com"],
    ["AZOPIO", "azopio.com", "contact@azopio.com"],
    ["B2BRouter", "b2brouter.net", "comercial@b2brouter.net"],
    ["B4VALUE.NET", "b4value.net", "pdp@b4value.net"],
    ["BASWARE", "basware.com", "FranceMandate@basware.com"],
    ["BC SOLUTIONS", "bcsolutions.fr", "easinvoice.info@bcsolutions.fr"],
    ["BILLIT", "billit.eu", "support@billit.be"],
    ["CBS Corporate Business Solutions", "cbs-consulting.com", "kontakt@cbs-consulting.de"],
    ["CECURITY", "cecurity.com", "contact_cecurity@cecurity.com"],
    ["CEGEDIM", "cegedim.fr", "sy-pdp@cegedim.com"],
    ["CEGID", "cegid.com", "contact-pa@cegid.com"],
    ["CHAINTRUST", "chaintrust.io", "pdp-contact@visma.com"],
    ["COMARCH SA", "comarch.com", "contact.pa@comarch.com"],
    ["DARVA", "darva.com", "ofeli-pdp@darva.com"],
    ["DEXT", "dext.com", "pdp@dext.com"],
    ["DIGIPHARMACIE", "digipharmacie.fr", "jonathan.blajman@digipharmacie.fr"],
    ["DIGITAL TECHNOLOGIES", "digtechs.com", "info@digtechs.com"],
    ["DOCOON", "docoon.com", "contact@docoon.com"],
    ["DOCOON IMMO / FREEDZ", "docoon.immo", "pdp@docoon.com"],
    ["DOCPROCESS", "doc-process.com", "contact@doc-process.com"],
    ["DOCUWARE", "docuware.com", "infoline@docuware.com"],
    ["DOUGS Facturation", "dougs.fr", "support@dougs.fr"],
    ["DOXALLIA", "doxallia.com", "contact@doxallia.com"],
    ["ECOSIO", "ecosio.com", "einvoice@ecosio.com"],
    ["EDICOM Group", "edicomgroup.com", "info_france@edicomgroup.com"],
    ["EDICS France", "edics.fr", "support@edics.cloud"],
    ["EDT", "group-edt.fr", "marketing@edt.fr"],
    ["EEZI powered by VAT IT", "eezi.io", "PDP@eezi.io"],
    ["Effinum by SPEE", "effinum.fr", "contact@effinum.fr"],
    ["ENERJ", "enerj.fr", "contact@enerj.fr"],
    ["ENTROPICS", "entropics.fr", "contact.pdp@entropics.fr"],
    ["ESALINK", "esalink.com", "contact@esalink.com"],
    ["ESI", "esi-groupe.com", "contact.pdp@esi-groupe.com"],
    ["ESKER", "esker.com", "onboarding.pdp@esker.com"],
    ["EURO INFORMATION", "euro-information.com", "pdp.support@euro-information.com"],
    ["FACNOTE PDP", "facnote.com", "contact@facnote.com"],
    ["FIDUCIAL CLOUD", "fiducial.com", "supportsolutions@fiducial.com"],
    ["FLOWIE", "flowie.fr", "contact@flowie.fr"],
    ["FULLL", "fulll.co", "pdp@fulll.co"],
    ["GENERIX Group", "generix.com", "pdp@generix.com"],
    ["GESTAV", "gestav.com", "sav@gestav.com"],
    ["GROUPE SIGMA", "groupe-sigma.com", "comptabilite@groupe-sigma.com"],
    ["ICD International", "icd-international.com", "pdp@icd-international.com"],
    ["iEDI ApS", "iedi.eu", "info@iedi.eu"],
    ["IGA ASSURANCE", "iga.fr", "pdp@iga.fr"],
    ["INDICOM", "indicom.fr", "contact@indicom.fr"],
    ["INDY", "indy.fr", "contact@indy.fr"],
    ["INFOLOGIC", "infologic.fr", "pdp@infologic.fr"],
    ["INVOPOP", "invopop.com", "support@invopop.com"],
    ["IOPOLE", "iopole.fr", "contact@iopole.fr"],
    ["ITESOFT", "itesoft.com", "pdp@itesoft.com"],
    ["jefacture.com", "jefacture.com", "contact@jefacture.com"],
    ["KLEKOON", "klekoon.com", "contact@klekoon.com"],
    ["KOLECTO PDP", "kolecto.com", "contact@kolecto.com"],
    ["LE VILLAGE CONNECTE", "levillageconnecte.fr", "contact@levillageconnecte.fr"],
    ["LOGILEC", "logilec.fr", "contact@logilec.fr"],
    ["MACOMPTA.FR", "macompta.fr", "pdp@macompta.fr"],
    ["MAROSA", "marosa.eu", "contact@marosa.eu"],
    ["MEDIUS", "medius.com", "sales.fr@medius.com"],
    ["MyKinexo PDP", "mykinexo.com", "pdp@mykinexo.com"],
    ["MySupply Aps", "mysupply.dk", "info@mysupply.dk"],
    ["ONE UP", "one-up.com", "pdp@one-up.com"],
]

# Create table data
table_data = [[
    Paragraph('<b>#</b>', header_style),
    Paragraph('<b>Platform</b>', header_style),
    Paragraph('<b>Website</b>', header_style),
    Paragraph('<b>Contact Email</b>', header_style)
]]

for i, p in enumerate(platforms, 1):
    table_data.append([
        Paragraph(str(i), cell_center),
        Paragraph(p[0], cell_style),
        Paragraph(p[1], cell_style),
        Paragraph(p[2], cell_style)
    ])

# Create table
table = Table(table_data, colWidths=[1*cm, 4*cm, 4*cm, 6*cm])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))

# Add alternating row colors
for i in range(1, len(table_data)):
    if i % 2 == 0:
        table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F5F5F5'))]))
    else:
        table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.white)]))

story.append(table)
story.append(Spacer(1, 20))

# Footer note
story.append(Paragraph(
    "<b>Source:</b> https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees",
    ParagraphStyle(name='Source', fontName='Times New Roman', fontSize=9, textColor=colors.grey)
))

story.append(Spacer(1, 10))
story.append(Paragraph(
    "<b>Note:</b> All platforms listed have satisfied interoperability tests with the Public Invoicing Portal (PPF). Status 'rapport d'audit de conformite attendu' means awaiting final compliance audit report.",
    ParagraphStyle(name='Note', fontName='Times New Roman', fontSize=9, textColor=colors.grey)
))

# Build PDF
doc.build(story)
print("PDF generated successfully!")
