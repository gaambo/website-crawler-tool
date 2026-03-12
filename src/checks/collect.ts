import { Check } from "./index";

const collectCheck: Check = {
  key: "collect",
  name: "Collect URLs",
  description: "Collects all crawled URLs into a CSV",
  csvHeaders: [],
  check: async () => {
    return [{}];
  },
};

export default collectCheck;
