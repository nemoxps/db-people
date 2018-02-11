let mapValues = require('lodash/mapValues');
let nth = require('lodash/nth');


let sortBy = {
    firstName(ascending = true) {
        let asc = (ascending) ? 1 : -1;
        return this.sort((entryA, entryB) => {
            let nameA = entryA.name.split(' ')[0];
            let nameB = entryB.name.split(' ')[0];
            return (nameA > nameB) ? asc : (nameA < nameB) ? -asc : 0;
        });
    },
    lastName(ascending = true) {
        let asc = (ascending) ? 1 : -1;
        return this.sort((entryA, entryB) => {
            let nameA = nth(entryA.name.split(' '), -1);
            let nameB = nth(entryB.name.split(' '), -1);
            return (nameA > nameB) ? asc : (nameA < nameB) ? -asc : 0;
        });
    },
    bDate(ascending = true) {
        let asc = (ascending) ? 1 : -1;
        return this.sort((entryA, entryB) => {
            let [dA, mA] = entryA.bDate.split('.').map(Number);
            let [dB, mB] = entryB.bDate.split('.').map(Number);
            return (
              (mA > mB || mA === mB && dA > dB) ? asc :
              (mA < mB || mA === mB && dA < dB) ? -asc :
              0
            );
        });
    },
    age(ascending = true) {
        let asc = (ascending) ? 1 : -1;
        return this.sort((entryA, entryB) => {
            let [dA, mA, yA] = entryA.bDate.split('.').map(Number);
            let [dB, mB, yB] = entryB.bDate.split('.').map(Number);
            return (
              (yA > yB || yA === yB && (mA > mB || mA === mB && dA > dB)) ? -asc :
              (yA < yB || yA === yB && (mA < mB || mA === mB && dA < dB)) ? asc :
              0
            );
        });
    },
};
let filterBy = {
    private() {
        return this.filter((entry) => entry._private === true);
    },
    public() {
        return this.filter((entry) => entry._private === false);
    },
};

class Entries extends Array {
    get sortBy() {
        return mapValues(sortBy, (fn) => fn.bind(this));
    }
    get filterBy() {
        return mapValues(filterBy, (fn) => fn.bind(this));
    }
}


module.exports = Entries;