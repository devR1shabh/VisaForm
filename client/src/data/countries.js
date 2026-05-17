import { getNames } from "country-list";

export const countries = getNames().sort((a, b) => a.localeCompare(b));
