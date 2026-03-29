import {
  ALL_FILTER_VALUE,
  type SidebarFilterValue,
} from "../../lib/data/sidebar";
import styles from "./sidebar.module.css";

interface SatelliteFilterGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  selectedValue: SidebarFilterValue<T>;
  onChange: (value: SidebarFilterValue<T>) => void;
}

export function SatelliteFilterGroup<T extends string>({
  label,
  options,
  selectedValue,
  onChange,
}: SatelliteFilterGroupProps<T>) {
  const filterOptions: SidebarFilterValue<T>[] = [ALL_FILTER_VALUE, ...options];

  return (
    <div className={styles.filterGroup}>
      <p className={styles.filterGroupLabel}>{label}</p>

      <div className={styles.filterButtons} role="list" aria-label={label}>
        {filterOptions.map((option) => {
          const isSelected = option === selectedValue;

          return (
            <button
              type="button"
              key={option}
              className={[
                styles.filterButton,
                isSelected ? styles.filterButtonActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(option)}
              aria-pressed={isSelected}
              aria-label={`${label} filter: ${option}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
