import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Skeleton } from "../shimmer-loader";
import styles from "./data-table.module.css";

/*
 * DataTable — for records people compare in columns (employer: my vacancies, applicants list).
 * For browsing opportunities use cards (VacancyCard), not a table.
 * Row actions go in the last column as a DropdownMenu ("⋯"); a clickable row opens the record.
 */

export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Value used for sorting; the column is sortable when set */
  sortValue?: (row: T) => string | number;
  align?: "start" | "end";
  width?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Accessible name of the table, e.g. "Your vacancies" */
  label: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Rendered instead of the table body when there are no rows (use EmptyState) */
  empty?: ReactNode;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  "data-testid"?: string;
};

export function DataTable<T>({
  columns, rows, getRowId, label, onRowClick, loading, empty, defaultSort, ...rest
}: DataTableProps<T>) {
  const [sort, setSort] = useState(defaultSort);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!col?.sortValue || !sort) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a);
      const y = col.sortValue!(b);
      return x < y ? -dir : x > y ? dir : 0;
    });
  }, [rows, columns, sort]);

  if (!loading && rows.length === 0 && empty) {
    return <div className={styles.card} data-testid={rest["data-testid"]}><div className={styles.state}>{empty}</div></div>;
  }

  return (
    <div className={styles.card} data-testid={rest["data-testid"]}>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={label} aria-busy={loading || undefined}>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={styles.th}
                    data-align={c.align}
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className={styles.sort}
                        onClick={() =>
                          setSort(active && sort!.direction === "desc" ? { key: c.key, direction: "asc" } : { key: c.key, direction: "desc" })
                        }
                      >
                        {c.header}
                        <Icon
                          name={active ? "chevronDown" : "sort"}
                          size={14}
                          style={active && sort!.direction === "asc" ? { transform: "rotate(180deg)" } : undefined}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} className={styles.row}>
                    {columns.map((c) => (
                      <td key={c.key} className={styles.td}><Skeleton height={12} width={c.align === "end" ? 40 : "60%"} /></td>
                    ))}
                  </tr>
                ))
              : sorted.map((row) => (
                  <tr
                    key={getRowId(row)}
                    className={styles.row}
                    data-clickable={onRowClick ? "" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? (e) => {
                      // clicks on buttons/links inside the row keep their own behaviour
                      if ((e.target as HTMLElement).closest("button, a, input")) return;
                      onRowClick(row);
                    } : undefined}
                    onKeyDown={onRowClick ? (e) => e.key === "Enter" && e.target === e.currentTarget && onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={styles.td} data-align={c.align}>{c.render(row)}</td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
