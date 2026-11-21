import { BuyingGuide } from "./home-air/BuyingGuide";
import { DiyFilter } from "./home-air/DiyFilter";
import { Myths } from "./home-air/Myths";
import { PurifierSizer } from "./home-air/PurifierSizer";
import { RoomChecklist } from "./home-air/RoomChecklist";
import styles from "./HomeAir.module.css";

/** The Home air page: purifier sizing, a room checklist, a buying guide, a DIY filter and myth-busting. */
export function HomeAir() {
  return (
    <>
      <div className={styles.twoUp}>
        <PurifierSizer />
        <RoomChecklist />
      </div>
      <BuyingGuide />
      <DiyFilter />
      <Myths />
    </>
  );
}
