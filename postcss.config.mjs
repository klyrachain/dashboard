import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Tailwind v4 scans for classes from this base. Default is the CSS file's dir (e.g. src/app/),
 *  so components in src/components/ were never scanned and color utilities were never generated.
 *  Point base at the project root so the whole src tree is scanned. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.resolve(__dirname, "."),
    },
  },
};

export default config;
