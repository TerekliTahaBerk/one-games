import { validateWordData } from "../lib/word/validation";

const errors = validateWordData();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "OneWord data is valid: 365 scheduled answers and a licensed accepted-word dictionary.",
);
