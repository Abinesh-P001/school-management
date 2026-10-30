import * as XLSX from 'xlsx';

/**
 * Utility to export structured tabular data to Microsoft Excel (.xlsx) format.
 * Includes column width calculation and formatted worksheet setup.
 *
 * @param {Array<Object>} data - Array of row objects with clean display keys
 * @param {string} fileName - Destination filename (e.g. 'Student_List.xlsx')
 * @param {string} sheetName - Sheet name (default 'Sheet1')
 * @param {Array<Object>} [customCols] - Optional custom column widths [{ wch: 15 }, ...]
 */
export const exportToExcel = (data, fileName = 'Report.xlsx', sheetName = 'Report', customCols = null) => {
  if (!data || data.length === 0) {
    throw new Error('No data available to export');
  }

  // Create worksheet from JSON data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Compute readable column widths if not explicitly provided
  if (!customCols) {
    const keys = Object.keys(data[0]);
    worksheet['!cols'] = keys.map((key) => {
      let maxLen = key.length;
      for (const row of data) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          const strLen = String(val).length;
          if (strLen > maxLen) maxLen = strLen;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
    });
  } else {
    worksheet['!cols'] = customCols;
  }

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)); // Excel max sheet name is 31 chars

  // Ensure file extension is .xlsx
  const validFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  // Write and trigger download in browser
  XLSX.writeFile(workbook, validFileName);
};
