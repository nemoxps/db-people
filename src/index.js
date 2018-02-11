let DBBase = require('db-base');
let findKey = require('lodash/findKey');

let Entries = require('./Entries');
let defaultFilters = require('./defaultFilters');


let filterModes = Object.assign(Object.create(null), {
    strict: Symbol('DB~filterModes.strict'),
    normalize: Symbol('DB~filterModes.normalize'),
    adjustment: Symbol('DB~filterModes.adjustment'),
});

class DBPeople extends DBBase {
    /**
     * @param {(Object|Object[])} [db]
     */
    constructor(db) {
        super(db, {
            filters: defaultFilters,
            filterMixin: () => ({
                mode: this._filterMode,
                modes: filterModes,
            }),
        });
        this._filterMode = filterModes.strict;
    }
    
    get filterMode() {
        return findKey(filterModes, (val) => val === this._filterMode);
    }
    /**
     * @param {string} mode
     */
    set filterMode(mode) {
        if (!(mode in filterModes))
          throw new Error('DB#filterMode: Unsupported mode.');
        
        this._filterMode = filterModes[mode];
    }
    
    /**
     * @param {...*} args
     * @returns {Entries}
     */
    filter(...args) {
        return Entries.of(...super.filter(...args));
    }
}


module.exports = DBPeople;