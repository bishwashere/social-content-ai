// utils/randomizeOptions.ts

export const randomizeOptions = () => {
const styles = ["narrative", "descriptive", "persuasive", "expository"];
const tones = ["neutral", "formal", "casual", "humorous"];
const verbs = ["inform", "persuade", "entertain", "inspire"];
const goals = ["educate", "convince", "engage", "motivate"];
const themes = ["technology", "nature", "business", "personal"];

return {
  style: styles[Math.floor(Math.random() * styles.length)],
    tone: tones[Math.floor(Math.random() * tones.length)],
    verb: verbs[Math.floor(Math.random() * verbs.length)],
    goal: goals[Math.floor(Math.random() * goals.length)],
    theme: themes[Math.floor(Math.random() * themes.length)],
  };
};
