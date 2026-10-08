import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { strToU8, zipSync } from "fflate"

interface Fixture {
  matchday: number | null
  groupNumber?: number | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  venue: { name: string } | null
  matchDate: string | null
  kickoffTime: string | null
  status: string
}

interface Competition {
  name: string
  season: string
  description: string | null
  logo?: string | null
  primaryColor?: string | null
  startDate: string
  endDate: string
  format: string
}

const defaultCompetitionColor = "#191B52"

function normalizedHexColor(value?: string | null): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.slice(1).toUpperCase()
    : defaultCompetitionColor.slice(1)
}

function parseHexColor(value?: string | null): [number, number, number] {
  const color = normalizedHexColor(value)
  return [
    Number.parseInt(color.slice(0, 2), 16),
    Number.parseInt(color.slice(2, 4), 16),
    Number.parseInt(color.slice(4, 6), 16)
  ]
}

function isLightHexColor(value: string): boolean {
  const channels = parseHexColor(`#${value}`).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  return luminance > 0.179
}

function contrastingTextColor(color: [number, number, number]): [number, number, number] {
  const hex = color.map((channel) => channel.toString(16).padStart(2, "0")).join("")
  return isLightHexColor(hex) ? [17, 24, 39] : [255, 255, 255]
}

function blendWithWhite(color: [number, number, number], whiteRatio: number): [number, number, number] {
  return color.map((channel) => Math.round(channel + (255 - channel) * whiteRatio)) as [number, number, number]
}

function blendHexWithWhite(color: string, whiteRatio: number): string {
  return blendWithWhite(parseHexColor(`#${color}`), whiteRatio)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

function getCompletePdfImageFormat(dataUrl: string): "PNG" | "JPEG" | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) return null

  try {
    const bytes = atob(match[2])
    if (match[1] === "png") {
      const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      const hasSignature = pngSignature.every((byte, index) => bytes.charCodeAt(index) === byte)
      const hasEndChunk = bytes.length >= 12 && bytes.slice(-8) === "IEND\xaeB`\x82"
      return hasSignature && hasEndChunk ? "PNG" : null
    }

    return bytes.length >= 3 && bytes.charCodeAt(0) === 0xff &&
      bytes.charCodeAt(1) === 0xd8 && bytes.charCodeAt(2) === 0xff &&
      bytes.charCodeAt(bytes.length - 2) === 0xff && bytes.charCodeAt(bytes.length - 1) === 0xd9
      ? "JPEG"
      : null
  } catch {
    return null
  }
}

export function exportFixturesToPDF(
  competition: Competition,
  fixtures: Fixture[],
  teamName?: string
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const bannerY = 12
  const bannerHeight = 38
  const textStartX = competition.logo ? 49 : 20
  const primaryColor = parseHexColor(competition.primaryColor)
  const primaryTextColor = contrastingTextColor(primaryColor)
  const kickoffTint = blendWithWhite(primaryColor, 0.88)

  doc.setFillColor(...primaryColor)
  doc.roundedRect(14, bannerY, pageWidth - 28, bannerHeight, 3, 3, "F")

  if (competition.logo) {
    const imageFormat = getCompletePdfImageFormat(competition.logo)
    if (imageFormat) {
      try {
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(18, 17, 25, 25, 2, 2, "F")
        doc.addImage(competition.logo, imageFormat, 19, 18, 23, 23)
      } catch (error) {
        console.warn("Could not embed competition logo in PDF:", error)
      }
    } else {
      console.warn("The saved competition logo is incomplete. Re-upload the original logo to include it in PDFs.")
    }
  }

  doc.setTextColor(...primaryTextColor)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(doc.splitTextToSize(competition.name, pageWidth - textStartX - 48)[0], textStartX, 27)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`FIXTURE SCHEDULE  |  ${competition.season}`, textStartX, 36)
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.text(String(fixtures.length), pageWidth - 20, 27, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.text("MATCHES", pageWidth - 20, 35, { align: "right" })
  doc.setTextColor(0, 0, 0)

  let contentStartY = bannerY + bannerHeight + 8
  if (teamName) {
    doc.setFontSize(10)
    doc.text(`Team fixtures: ${teamName}`, 14, contentStartY)
    contentStartY += 6
  }

  if (competition.description) {
    const descriptionLines = doc.splitTextToSize(competition.description, 180)
    doc.text(descriptionLines, 14, contentStartY)
    contentStartY += descriptionLines.length * 5
  }

  doc.setFontSize(10)
  doc.text(
    `Competition Period: ${new Date(competition.startDate).toLocaleDateString()} - ${new Date(competition.endDate).toLocaleDateString()}`,
    14,
    contentStartY
  )
  contentStartY += 10

  const fixtureSections = new Map<string, { matchday: number | null; groupNumber: number | null; fixtures: Fixture[] }>()
  for (const fixture of fixtures) {
    const groupNumber = fixture.groupNumber ?? null
    const sectionKey = `${groupNumber ?? 0}:${fixture.matchday ?? "TBC"}`
    const section = fixtureSections.get(sectionKey) ?? {
      matchday: fixture.matchday,
      groupNumber,
      fixtures: []
    }
    section.fixtures.push(fixture)
    fixtureSections.set(sectionKey, section)
  }

  let matchNumber = 1
  const sortedSections = [...fixtureSections.values()].sort((first, second) =>
    (first.groupNumber ?? 0) - (second.groupNumber ?? 0) ||
    (first.matchday ?? Number.MAX_SAFE_INTEGER) - (second.matchday ?? Number.MAX_SAFE_INTEGER)
  )

  for (const { matchday, groupNumber, fixtures: weekFixtures } of sortedSections) {
    if (contentStartY > doc.internal.pageSize.height - 35) {
      doc.addPage()
      contentStartY = 18
    }

    doc.setFillColor(...primaryColor)
    doc.roundedRect(14, contentStartY, 182, 9, 1.5, 1.5, "F")
    doc.setTextColor(...primaryTextColor)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    const sectionTitle = [
      groupNumber === null ? null : `GROUP ${String.fromCharCode(64 + groupNumber)}`,
      matchday === null ? "MW?" : `MW${matchday}`
    ].filter(Boolean).join(" · ")
    doc.text(sectionTitle, 18, contentStartY + 6)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`${weekFixtures.length} MATCH${weekFixtures.length === 1 ? "" : "ES"}`, 192, contentStartY + 6, { align: "right" })
    doc.setTextColor(0, 0, 0)
    contentStartY += 11

    autoTable(doc, {
      head: [["MATCH NO.", "DATE", "HOME TEAM", "KICKOFF", "AWAY TEAM", "VENUE", "STATUS"]],
      body: [...weekFixtures]
        .sort((first, second) => {
          const firstDate = first.matchDate ? new Date(first.matchDate).getTime() : Number.MAX_SAFE_INTEGER
          const secondDate = second.matchDate ? new Date(second.matchDate).getTime() : Number.MAX_SAFE_INTEGER
          return firstDate - secondDate ||
            (first.kickoffTime ?? "").localeCompare(second.kickoffTime ?? "") ||
            first.homeTeam.name.localeCompare(second.homeTeam.name)
        })
        .map((fixture) => [
          matchNumber++,
          fixture.matchDate ? new Date(fixture.matchDate).toLocaleDateString() : "TBC",
          { content: fixture.homeTeam.name, styles: { fontStyle: "bold" } },
          {
            content: fixture.kickoffTime || "TBC",
            styles: { fontStyle: "bold", fontSize: 9, textColor: primaryColor, fillColor: kickoffTint }
          },
          { content: fixture.awayTeam.name, styles: { fontStyle: "bold" } },
          fixture.venue?.name || "TBC",
          fixture.status.toUpperCase()
        ]),
      startY: contentStartY,
      margin: { left: 14, right: 14, bottom: 18 },
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: { top: 2.5, right: 1.5, bottom: 2.5, left: 1.5 }, minCellHeight: 8, lineColor: [225, 227, 235], lineWidth: 0.15, overflow: "linebreak" },
      headStyles: { fillColor: [244, 245, 249], textColor: [79, 83, 101], fontStyle: "bold", fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 24, halign: "center" },
        2: { cellWidth: 39, halign: "left" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 39, halign: "left" },
        5: { cellWidth: 28, halign: "left" },
        6: { cellWidth: 18, halign: "center" }
      },
      didDrawPage: () => {
        contentStartY = 18
      }
    })

    contentStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : contentStartY + 8
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(8)
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.text(
      `Generated by Digital Fixture Generator - ${new Date().toLocaleDateString()} - Page ${page} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    )
  }

  // Save the PDF
  const teamSuffix = teamName ? `_${teamName.replace(/\s+/g, "_")}` : ""
  doc.save(`${competition.name.replace(/\s+/g, "_")}${teamSuffix}_fixtures.pdf`)
}

export function exportFixturesToCSV(
  competition: Competition,
  fixtures: Fixture[]
): void {
  const headers = ["Match No.", "Matchweek", "Group", "Home Team", "Away Team", "Venue", "Date", "Time", "Status"]
  const rows = fixtures.map((fixture) => [
    fixtures.indexOf(fixture) + 1,
    fixture.matchday ?? "TBD",
    fixture.groupNumber ? `Group ${String.fromCharCode(64 + fixture.groupNumber)}` : "",
    fixture.homeTeam.name,
    fixture.awayTeam.name,
    fixture.venue?.name || "TBD",
    fixture.matchDate ? new Date(fixture.matchDate).toLocaleDateString() : "TBD",
    fixture.kickoffTime || "TBD",
    fixture.status
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${competition.name.replace(/\s+/g, "_")}_fixtures.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function excelColumn(index: number): string {
  let column = ""
  let remainder = index + 1

  while (remainder > 0) {
    const digit = (remainder - 1) % 26
    column = String.fromCharCode(65 + digit) + column
    remainder = Math.floor((remainder - 1) / 26)
  }

  return column
}

export function exportFixturesToExcel(
  competition: Competition,
  fixtures: Fixture[],
  teamName?: string
): void {
  const primaryColor = normalizedHexColor(competition.primaryColor)
  const kickoffColor = blendHexWithWhite(primaryColor, 0.88)
  const headerTextColor = isLightHexColor(primaryColor) ? "FF111827" : "FFFFFFFF"
  const sortedFixtures = [...fixtures].sort((first, second) =>
    (first.matchday ?? Number.MAX_SAFE_INTEGER) - (second.matchday ?? Number.MAX_SAFE_INTEGER) ||
    (first.matchDate ? new Date(first.matchDate).getTime() : Number.MAX_SAFE_INTEGER) -
      (second.matchDate ? new Date(second.matchDate).getTime() : Number.MAX_SAFE_INTEGER) ||
    (first.kickoffTime ?? "").localeCompare(second.kickoffTime ?? "") ||
    first.homeTeam.name.localeCompare(second.homeTeam.name)
  )
  const headers = ["Match No.", "Matchweek", "Group", "Date", "Home Team", "Kickoff", "Away Team", "Venue", "Status"]
  const rows = sortedFixtures.map((fixture, index) => [
    String(index + 1),
    fixture.matchday === null ? "TBC" : `MW${fixture.matchday}`,
    fixture.groupNumber ? `Group ${String.fromCharCode(64 + fixture.groupNumber)}` : "",
    fixture.matchDate ? new Date(fixture.matchDate).toLocaleDateString() : "TBC",
    fixture.homeTeam.name,
    fixture.kickoffTime || "TBC",
    fixture.awayTeam.name,
    fixture.venue?.name || "TBC",
    fixture.status.toUpperCase()
  ])
  const worksheetRows = [headers, ...rows]
  const lastRow = worksheetRows.length
  const sheetRowsXml = worksheetRows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1
    const cells = row.map((value, columnIndex) => {
      const cellRef = `${excelColumn(columnIndex)}${rowNumber}`
      const style = rowIndex === 0 ? 1 : rowIndex > 0 && columnIndex === 5 ? 2 : 0
      return `<c r="${cellRef}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join("")
    return `<row r="${rowNumber}"${rowIndex === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`
  }).join("")

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:I${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="13" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="4" width="15" customWidth="1"/><col min="5" max="5" width="28" customWidth="1"/><col min="6" max="6" width="13" customWidth="1"/><col min="7" max="7" width="28" customWidth="1"/><col min="8" max="8" width="26" customWidth="1"/><col min="9" max="9" width="14" customWidth="1"/></cols><sheetData>${sheetRowsXml}</sheetData><autoFilter ref="A1:I${lastRow}"/></worksheet>`
  const workbookName = `${competition.name}${teamName ? ` - ${teamName}` : ""}`
  const sheetName = (teamName ? `${teamName} Fixtures` : "Fixtures")
    .replace(/[\\/*?:\[\]]/g, " ")
    .slice(0, 31)
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="${headerTextColor}"/><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FF${primaryColor}"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${primaryColor}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${kickoffColor}"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE1E3EB"/></left><right style="thin"><color rgb="FFE1E3EB"/></right><top style="thin"><color rgb="FFE1E3EB"/></top><bottom style="thin"><color rgb="FFE1E3EB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(workbook),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheet),
    "xl/styles.xml": strToU8(styles),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Digital Fixture Generator</Application><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${xmlEscape(sheetName)}</vt:lpstr></vt:vector></TitlesOfParts></Properties>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(workbookName)}</dc:title><dc:creator>Digital Fixture Generator</dc:creator></cp:coreProperties>`)
  }
  const workbookBytes = zipSync(files, { level: 6 })
  const blob = new Blob([workbookBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const filename = `${competition.name.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_")}${teamName ? `_${teamName.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_")}` : ""}_fixtures.xlsx`
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
