import grammar from './bird_conf.tmLanguage.json';
export const birdConf = {
  id: "bird_conf",
  scopeName: "source.birdconf",
  aliases: ['bird'],
  ...grammar,
}
