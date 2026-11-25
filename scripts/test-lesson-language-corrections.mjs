import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function lesson(number) {
  const context = vm.createContext({ window: {} });
  const prefix = "ch" + number + "-";
  const files = ["grammar-ruby", ...["data", "grammar-extra-data", "vocabulary-data", "conversation-data"].map(key => prefix + key)];
  if (number === 17) files.push(prefix + "vocabulary-audit");
  if (number >= 18) files.push(prefix + "grammar-ruby");
  for (const file of files) {
    vm.runInContext(await readFile("assets/" + file + ".js", "utf8"), context, { filename: file });
  }
  return context.window;
}

const [sixteen, seventeen, eighteen, nineteen, twenty] = await Promise.all([16, 17, 18, 19, 20].map(lesson));
const word = (data, id) => data.JPY5_VOCABULARY.items.find(item => item.id === id);
const pattern = (data, id) => data.JPY5_DATA.patterns.find(item => item.id === id);

assert.match(word(sixteen, 107).note, /足を骨折する/);
assert.equal(word(seventeen, 16).kana, "せいかつしゅうかんびょう");
assert.match(word(seventeen, 23).type, /自$/);
assert.doesNotMatch(word(seventeen, 65).meaning, /[5五]/);
assert.match(word(seventeen, 84).note, /太陰太陽暦/);
assert.equal(word(eighteen, 53).verbGroup, "Ⅰ");
assert.match(word(eighteen, 33).meaning, /下定決心/);
assert.match(word(eighteen, 67).meaning, /修理師傅/);
assert.match(word(eighteen, 68).meaning, /不時地（看）/);
assert.match(word(eighteen, 74).written, /走らします$/);
assert.equal(word(eighteen, 97).type, "接頭語");
assert.equal(word(nineteen, 51).transitivity, "他");
assert.equal(word(nineteen, 124).transitivity, "自");
assert.match(word(nineteen, 36).meaning, /口碑/);
assert.equal(word(nineteen, 97).meaning, "警員");
assert.equal(word(nineteen, 150).meaning, "車輪");
assert.match(word(twenty, 103).note, /子を授かる/);
assert.match(word(twenty, 89).meaning, /尺八/);
assert.equal(word(twenty, 98).meaning, "日本箏");

const necessity = pattern(twenty, "shikanakatta");
const extension = twenty.JPY5_GRAMMAR_EXTRA.find(card => card.grammarIds.includes(necessity.id));
for (const card of [necessity, extension]) {
  assert.match(String(card.formation), /しかない／しかなかった/);
  assert.match(card.examples[1][0], /やめさせるしかなかった。$/);
}
assert.match(pattern(eighteen, "monoda").examples.find(([jp]) => jp.startsWith("会社の問題"))[1], /公司/);
assert.match(eighteen.JPY5GrammarRuby.render("金というのは"), /金<rt>かね/);
for (const [base, reading] of [["出せ", "だせ"], ["出し", "だし"], ["出す", "だす"]]) {
  assert(eighteen.JPY5GrammarRuby.render(base).includes(base + "<rt>" + reading));
}
assert.match(twenty.JPY5GrammarRuby.render("何度も"), /何度<rt>なんど/);
assert.equal(eighteen.JPY5_CONVERSATION.furigana["思い出"], "おもいで");
assert.equal(eighteen.JPY5_CONVERSATION.furigana["思い出す"], "おもいだす");
assert.equal(nineteen.JPY5_CONVERSATION.translation[7][0], "安妮");
assert.match(twenty.JPY5_CONVERSATION.translation[6][1], /第二屆大賽/);
console.log("Lesson 16–20 study forms, readings, word classes and translations passed.");
