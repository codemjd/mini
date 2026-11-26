import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const files = [
  ["vendor/nabra-tts/LICENSE", "public/vendor/nabra-tts/LICENSE"],
  ["vendor/nabra-tts/THIRD_PARTY_NOTICES.md", "public/vendor/nabra-tts/THIRD_PARTY_NOTICES.md"],
  ["vendor/nabra-tts/licenses/GPL-3.0-or-later.txt", "public/vendor/nabra-tts/GPL-3.0-or-later.txt"]
];

for (const [source, destination] of files) {
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
console.log("Copied Nabra and eSpeak license notices into the public build.");
