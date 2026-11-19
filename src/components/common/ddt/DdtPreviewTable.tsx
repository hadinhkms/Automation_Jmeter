import type { CsvPreview } from '../../../utils/ddt/csvPreviewParser'

interface DdtPreviewTableProps {
  preview: CsvPreview
  varNames: string[]
  varErrors: Record<number, string>
  disabled: boolean
  onRename: (index: number, value: string) => void
}

const DELIMITER_LABEL: Record<string, string> = { ',': 'comma (,)', ';': 'semicolon (;)', '\t': 'tab' }

/** First 5 data rows, with an editable `${var}` name under every column header. */
export function DdtPreviewTable({ preview, varNames, varErrors, disabled, onRename }: DdtPreviewTableProps) {
  return (
    <div className="ddt-preview">
      <div className="ddt-preview-meta">
        <span>{preview.headers.length} columns · {preview.totalRows} data row{preview.totalRows === 1 ? '' : 's'}</span>
        <span>Delimiter: {DELIMITER_LABEL[preview.delimiter]}</span>
        {preview.quoted ? <span>Quoted values</span> : null}
      </div>
      <div className="ddt-table-scroll">
        <table className="ddt-table">
          <thead>
            <tr>
              {preview.headers.map((header, index) => (
                <th key={`${header}-${index}`} scope="col">
                  <span className="ddt-col-name">{header}</span>
                  <label className="ddt-var-input">
                    <span aria-hidden="true">{'${'}</span>
                    <input
                      type="text"
                      value={varNames[index] ?? ''}
                      disabled={disabled}
                      aria-label={`Variable name for column ${header}`}
                      aria-invalid={Boolean(varErrors[index])}
                      onChange={(e) => onRename(index, e.target.value)}
                    />
                    <span aria-hidden="true">{'}'}</span>
                  </label>
                  {varErrors[index] ? <span className="ddt-var-error" role="alert">{varErrors[index]}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} title={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ddt-preview-note">Showing the first {preview.rows.length} of {preview.totalRows} rows. The header row is skipped at run time.</p>
    </div>
  )
}
