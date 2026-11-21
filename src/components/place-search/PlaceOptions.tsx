import type { Place } from "@/lib/schemas";
import styles from "../PlaceSearch.module.css";

interface Props {
  id: string;
  /** Prefix for option ids, so the input can point at the highlighted one. */
  optionId: (index: number) => string;
  places: Place[];
  active: number;
  hidden: boolean;
  onChoose: (place: Place) => void;
}

/** The combobox's popup list. Focus stays in the input; the highlighted option is aria-selected. */
export function PlaceOptions({ id, optionId, places, active, hidden, onChoose }: Props) {
  return (
    <ul id={id} role="listbox" aria-label="Matching places" className={styles.list} hidden={hidden}>
      {places.map((place, i) => (
        <li
          key={`${place.latitude},${place.longitude}`}
          id={optionId(i)}
          role="option"
          aria-selected={i === active}
          className={styles.option}
          // Keep focus in the input so the click lands before blur closes the list.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChoose(place)}
        >
          {place.name}
        </li>
      ))}
    </ul>
  );
}
