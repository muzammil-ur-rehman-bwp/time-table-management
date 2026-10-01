export function DataTable({ columns, rows, rowKey, onEdit, onDelete, emptyText }) {
  if (!rows.length) {
    return <p className="muted">{emptyText || 'Nothing here yet.'}</p>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {(onEdit || onDelete) && <th className="actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions-col">
                  {onEdit && (
                    <button className="link-btn" onClick={() => onEdit(row)}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button className="link-btn danger" onClick={() => onDelete(row)}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
