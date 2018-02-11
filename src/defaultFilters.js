let mapValues = require('lodash/mapValues');
let pick = require('lodash/pick');
let flatten = require('lodash/flatten');
let nth = require('lodash/nth');
let deburr = require('lodash/deburr');


let defaultFilters = {
    /**
     * Finds db entries whose id matches the query.
     *
     * @param {*} q A query.
     * @returns {boolean}
     */
    id(q, { mode, modes }) {
        if (typeof q !== 'string')
          return;
        
        return (entry, id) => {
            switch (mode)
            {
              case modes.strict:
                return q === id;
              
              case modes.normalize:
                return deburr(q) === deburr(id);
              
              case modes.adjustment:
                return deburr(q).toLowerCase() === deburr(id).toLowerCase();
            }
        };
    },
    
    /**
     * Finds db entries whose `bDate` matches the query.
     *
     * @param {*} q A query.
     * @returns {boolean}
     */
    bdate(q) {
        if (typeof q !== 'string' && typeof q !== 'number')
          return;
        q = String(q);
        
        /*
         * Selection syntax:
         * \d{1,2}                     : $month
         * \d{1,2}[.-]\d{1,2}          : $date + '.' + $month
         * \d{1,2}[.-]\d{1,2}[.-]\d{4} : $date + '.' + $month + '.' + $year
         * \d{1,2}\.                   : $date
         * \d{4}                       : $year
         */
        let match = q.match(/^(?:(\d{1,2})(?:([.-])(\d{1,2})(?:\2(\d{4}))?)?|(\d{1,2})\.|(\d{4}))$/);
        if (!match)
          return;
        
        let [, d, , m, y, D, Y] = match;
        if (d) d = d.padStart(2, '0');
        if (m) m = m.padStart(2, '0');
        if (D) D = D.padStart(2, '0');
        
        switch (true)
        {
          case !!(d && m && y):
            return ({ bDate }) => bDate === [d, m, y].join('.');
          
          case !!(d && m):
            return ({ bDate }) => bDate.slice(0, 5) === [d, m].join('.');
          
          case !!d:
            return ({ bDate }) => bDate.slice(3, 5) === d;
          
          case !!D:
            return ({ bDate }) => bDate.slice(0, 2) === D;
          
          case !!Y:
            return ({ bDate }) => bDate.slice(6, 10) === Y;
          
          default:
            throw new Error('DB#filter: This shouldn\'t happen.');
        }
    },
    
    /**
     * Finds db entries whose name(s) match the query.
     *
     * @param {*} q A query.
     * @returns {boolean}
     */
    name(q, { mode, modes }) {
        if (typeof q !== 'string')
          return;
        
        /*
         * Selection syntax:
         * $q      : $firstName + ' ' + $lastName
         *         | $..name
         *         | $..nick
         *         | $..alias
         * # ?$q   : $firstName
         *         | $..nick
         *         | $..alias
         * \+ ?$q  : $..name
         * \. ?$q  : $lastName
         * \* ?$q  : $..birthName
         * - ?$q   : $..roleFirstName + ' ' + $..roleLastName
         *         | $..roleNick + ' ' + $..roleLastName
         *         | $..roleName
         *         | $..roleNick
         * -# ?$q  : $..roleFirstName
         *         | $..roleNick
         * -\+ ?$q : $..roleName
         * -\. ?$q : $..roleLastName
         * -\$ ?$q : $..roleMovieName
         */
        let match = q.match(/^(?:(-#|-\+|-\.|-\$|-|#|\+|\.|\*) ?)?(.+)$/);
        if (!match)
          return;
        
        let [, flag = '', qq] = match;
        
        let createPatterns = (flag, { name: name_, nick, alias, bName: bName_, roles }) => {
            let name = name_.split(' ');
            let bName = bName_.split(' ');
            let rNames = roles.map(({ name }) => name.split(' '));
            let rNicks = roles.map(({ nick }) => nick);
            let rMovies = roles.map(({ movie }) => movie);
            
            switch (flag)
            {
              case '':
                return [
                    ...((name.length > 1) ? [name[0] + ' ' + nth(name, -1)] : []),
                    ...name,
                    ...nick,
                    ...alias,
                ];
              
              case '#':
                return [name[0], ...nick, ...alias];
              
              case '+':
                return [...name];
              
              case '.':
                return [nth(name, -1)];
              
              case '*':
                return [...bName];
              
              case '-':
                return [
                    ...rNames.reduce((r, rName) => (rName.length > 1) ? r.concat(rName[0] + ' ' + nth(rName, -1)) : r, []),
                    ...rNicks.reduce((r, rNick, index) => {
                        if (!rNick.length || rNames[index].length <= 1)
                          return r;
                        let rLastName = nth(rNames[index], -1);
                        return r.concat(rNick.map((rNick) => rNick + ' ' + rLastName));
                    }, []),
                    ...flatten(rNames),
                    ...flatten(rNicks),
                ];
              
              case '-#':
                return [...rNames.map((rName) => rName[0]), ...flatten(rNicks)];
              
              case '-+':
                return [...flatten(rNames)];
              
              case '-.':
                return [...rNames.map((rName) => nth(rName, -1))];
              
              case '-$':
                return [...rMovies];
              
              default:
                throw new Error('DB#filter: This shouldn\'t happen.');
            }
        };
        
        let pickDefaults = { name: '', nick: [], alias: [], bName: '', roles: [] };
        let pickDefaultsKeys = Object.keys(pickDefaults);
        let pickRoleDefaults = { name: '', nick: [], movie: '' };
        let pickFromEntry = (entry) => {
            let normalized = Object.assign({}, pickDefaults, pick(entry, pickDefaultsKeys));
            normalized.roles = normalized.roles.map((role) => {
                return Object.assign({}, pickRoleDefaults, role);
            });
            return normalized;
        };
        let transformKeyWith = (fn) => (val, key) => {
            switch (key)
            {
              case 'name':
              case 'bName':
                return fn(val);
              
              case 'nick':
              case 'alias':
                return val.map(fn);
              
              case 'roles':
                return val.map(({ name, nick, movie }) => ({
                    name: fn(name), nick: nick.map(fn), movie: fn(movie),
                }));
            }
        };
        
        return (entry) => {
            switch (mode)
            {
              case modes.strict:
                return createPatterns(flag, pickFromEntry(entry)).includes(qq);
              
              case modes.normalize:
                return createPatterns(flag, mapValues(
                    pickFromEntry(entry),
                    transformKeyWith((str) => deburr(str))
                )).includes(deburr(qq));
              
              case modes.adjustment:
                return createPatterns(flag, mapValues(
                    pickFromEntry(entry),
                    transformKeyWith((str) => deburr(str).toLowerCase())
                )).includes(deburr(qq).toLowerCase());
            }
        };
    },
};


module.exports = defaultFilters;