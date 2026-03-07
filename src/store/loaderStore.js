import { defineStore } from "pinia";
export const useLoaderStore = defineStore("loaderStore", {
  state: () => ({
    loader: false,
  }),
});
