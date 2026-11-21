/** Openly licensed photographs from Wikimedia Commons, credited wherever they appear. */
export interface PhotoInfo {
  src: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export const PHOTOS = {
  smogSkyline: {
    src: "/images/smog-delhi.jpg",
    width: 1280,
    height: 857,
    alt: "Central Delhi's towers fading into a brown haze, the sun a dim disc behind the smog.",
    credit: "wili hybrid",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Smog_in_the_skies_of_Delhi,_India.jpg",
  },
  smogRoad: {
    src: "/images/smog-road.jpg",
    width: 1280,
    height: 950,
    alt: "Auto-rickshaws and cycle-rickshaws on Chelmsford Road, New Delhi, at 9 am with the road ahead lost in grey smog.",
    credit: "Sumita Roy Dutta",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Low_visibility_due_to_Smog_in_entry_of_Chelmsford_Road_New_Delhi_31st_Dec_2017_9AM_DSCN8819_1.jpg",
  },
  metro: {
    src: "/images/metro.jpg",
    width: 1280,
    height: 960,
    alt: "A Delhi Metro red line train waiting at Shaheed Sthal station.",
    credit: "Ravi Dwivedi",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Delhi_Metro_train_red_line_at_Shaheed_Sthal_metro_station.jpg",
  },
  hepaFilter: {
    src: "/images/hepa-filter.jpg",
    width: 1280,
    height: 960,
    alt: "A black activated-carbon pre-filter beside a white pleated HEPA filter from a home air purifier.",
    credit: "Home Air Quality Guides",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Rectangular_air_purifier_HEPA_filter_%26_activated_carbon_filter.jpg",
  },
} satisfies Record<string, PhotoInfo>;
