import config from './config.js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { writeFileSync } from 'fs';

const include = config.include;
const version = config.version;
const language = config.language;
const ddragonURL = config.ddragonURL;

log(chalk.green('I'), chalk.bold.white(`${chalk.blue('League of Legends')} ${chalk.cyan('skribbl.io')} list generator`));
log(chalk.blue('C'), `${chalk.bold.underline('Current configuration:')}\n${chalk.bold('Language:')} ${language}\n${chalk.bold('Version:')} ${version}\n${chalk.bold('References:')} ${include.join(', ')}`);

const ver = await getVersion(version);
let champions = [];
let items = [];
let sumSpells = [];
let runes = [];
let abilities = [];
if (include.includes('champions')) {
    champions = await getChampionList(ver);
}
if (include.includes('items')) {
    items = await getItemList(ver);
}
if (include.includes('sumspells')) {
    sumSpells = await getSummonerSpellList(ver);
}
if (include.includes('runes')) {
    runes = await getRuneList(ver);
}
if (include.includes('abilities')) {
    abilities = await getAbilityList(ver);
}
const finalArr = [...champions, ...items, ...sumSpells, ...runes, ...abilities];
const str = finalArr.join(',');
await writeFileSync('list.txt', str, { encoding: 'utf8', flag: 'w' });
log(chalk.green('I'), `List with ${finalArr.length} items has been written to list.txt (${str.length}/10000 characters).`);
if (str.length > 10000) {
    log(chalk.yellow('W'), 'This list is over skribbl\'s 10k character limit. ');
    process.exit(1);
} 

async function getVersion(v) {
    log(chalk.green('I'), 'Checking League of Legends version...');
    const apiVersions = await fetch(ddragonURL + '/api/versions.json');
    const versions = await apiVersions.json();
    const latestVersion = versions[0];
    if (version !== 'latest' && !versions.includes(v)) {
        log(chalk.red('E'), 'Invalid version number!');
        log(chalk.red('E'), `Valid versions: ${versions.join(', ')}`);
        process.exit(1);
    }
    log(chalk.green('I'), `The latest League of Legends version is ${chalk.bold(latestVersion)}, using ${chalk.bold(v == 'latest' ? latestVersion : v)}.`);
    return v == 'latest' ? latestVersion : v;
}

async function getChampionList(v) {
    log(chalk.green('I'), 'Getting champion list...');
    const apiChampions = await fetch(ddragonURL + `/cdn/${v}/data/${language}/champion.json`);
    const champions = await apiChampions.json();
    const championList = [];
    Object.values(champions.data).forEach(champion => {
        championList.push(clean(champion.name));
    });
    return championList;
}

async function getItemList(v) {
    log(chalk.green('I'), 'Getting item list...');
    const apiItems = await fetch(ddragonURL + `/cdn/${v}/data/${language}/item.json`);
    const items = await apiItems.json();
    const itemList = [];
    const rawItemArr = Object.values(items.data);
    for (let i = 0; i < rawItemArr.length; i++) {
        if (rawItemArr[i].inStore && rawItemArr[i].inStore == false) continue;
        if (rawItemArr[i].name.toLowerCase().includes('placeholder')) continue;
        if (rawItemArr[i].name.toLowerCase().includes('silver serpents')) continue;
        itemList.push(clean(rawItemArr[i].name));
    }
    return itemList;
}

async function getSummonerSpellList(v) {
    log(chalk.green('I'), 'Getting summoner spell list...');
    const apiSum = await fetch(ddragonURL + `/cdn/${v}/data/${language}/summoner.json`);
    const sum = await apiSum.json();
    const sumList = [];
    const rawSumArr = Object.values(sum.data);
    for (let i = 0; i < rawSumArr.length; i++) {
        if (!rawSumArr[i].modes.includes('CLASSIC') && !rawSumArr[i].modes.includes('ARAM')) continue;
        sumList.push(clean(rawSumArr[i].name));
    }
    return sumList;
}

async function getRuneList(v) {
    log(chalk.green('I'), 'Getting rune list...');
    const apiRunes = await fetch(ddragonURL + `/cdn/${v}/data/${language}/runesReforged.json`);
    const runes = await apiRunes.json();
    const runeList = [];
    runes.forEach(rune => {
        rune.slots.forEach(slot => {
            slot.runes.forEach(rune => {
                runeList.push(clean(rune.name));
            });
        });
    });
    return runeList;
}

async function getAbilityList(v) {
    log(chalk.green('I'), 'Getting ability list...');
    const apiChampions = await fetch(ddragonURL + `/cdn/${v}/data/${language}/champion.json`);
    const champions = await apiChampions.json();
    const champIDs = Object.keys(champions.data);
    const abilityList = [];
    for (let i = 0; i < champIDs.length; i++) {
        const champ = await fetch(ddragonURL + `/cdn/${v}/data/${language}/champion/${champIDs[i]}.json`);
        const champData = await champ.json();
        const champAbilities = Object.values(champData.data[champIDs[i]].spells);
        for (let j = 0; j < champAbilities.length; j++) {
            if (champAbilities[j].name.includes(' / ')) {
                const split = champAbilities[j].name.split(' / ');
                split.forEach(str => {
                    abilityList.push(clean(str));
                });
            } else abilityList.push(clean(champAbilities[j].name));
        }
    }
    return abilityList;
}

function clean(text) {
    return text.replace(',', '');
}

function log(level, text) {
    const date = new Date();
    const time = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    const textML = text.split('\n');
    for (const line of textML) {
        console.log(`${chalk.bold.magenta(`[${time}]`)} ${chalk.bold(`[${level}]`)} ${line}`);
    }
}
