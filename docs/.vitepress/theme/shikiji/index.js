import grammar from "./bird_conf.tmLanguage.json";
export const birdConf = async () => {
  return {
    id: "bird_conf",
    scopeName: "source.birdconf",
    aliases: ["bird"],
    ...grammar,
  };
};
