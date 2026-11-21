import type { LabSettings } from "@/lib/labSettings";

/** Returns a change handler for one lab setting, so controls can be wired as `onChange={update("km")}`. */
export type UpdateSetting = <K extends keyof LabSettings>(key: K) => (value: LabSettings[K]) => void;

/** What each Impact Lab section receives. */
export interface SectionProps {
  settings: LabSettings;
  update: UpdateSetting;
}
