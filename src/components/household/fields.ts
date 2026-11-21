import type { Household } from "@/lib/schemas";

/** Updates one household field; every field group receives the same setter. */
export type SetField = <K extends keyof Household>(key: K, value: Household[K]) => void;

/** What each household field group receives from the form. */
export interface FieldGroupProps {
  value: Household;
  set: SetField;
}
