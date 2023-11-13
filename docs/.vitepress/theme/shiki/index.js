import shiki from "shiki"
import { readFileSync } from "fs"
import path from 'path';

// Construct the relative path
const birdConfFilePath = path.join(__dirname, 'bird_conf.tmLanguage.json');

// Read and parse the JSON file
const birdConfGrammar = JSON.parse(readFileSync(birdConfFilePath));

export const birdConf = {
  id: "bird_conf",
  scopeName: "source.birdconf",
  grammar: birdConfGrammar,
  aliases: ['bird'],
}

// (async () => {
//   const highlighter = await shiki.getHighlighter();
//   await highlighter.loadLanguage(birdConf);
// })();