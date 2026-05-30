export { get_first_value, get_sort_index, sort_mixed_list, is_num, get_all_values, lev_dist, get_closest_lev_dist_from_list };

function get_first_value(value) {
    if (typeof value == 'object') {
        return get_first_value(Object.values(value)[0]);
    } else {
        return value;
    }
}


function natsort(options = {}) {
    // Adapted from the typescript version by https://github.com/bubkoo/natsort

    const ore = /^0/
    const sre = /\s+/g
    const tre = /^\s+|\s+$/g
    // unicode
    const ure = /[^\x00-\x80]/
    // hex
    const hre = /^0x[0-9a-f]+$/i
    // numeric
    const nre = /(0x[\da-fA-F]+|(^[\+\-]?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?(?=\D|\s|$))|\d+)/g
    // datetime
    const dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/
    const toLowerCase = String.prototype.toLocaleLowerCase || String.prototype.toLowerCase

    const GREATER = options.desc ? -1 : 1
    const SMALLER = -GREATER
    const normalize = options.insensitive
        ? (s) => toLowerCase.call(`${s}`).replace(tre, '')
        : (s) => (`${s}`).replace(tre, '')

    function tokenize(s) {
        return s.replace(nre, '\0$1\0')
            .replace(/\0$/, '')
            .replace(/^\0/, '')
            .split('\0')
    }

    function parse(s, l) {
        // normalize spaces; find floats not starting with '0',
        // string or 0 if not defined (Clint Priest)
        return (!s.match(ore) || l === 1)
            && parseFloat(s)
            || s.replace(sre, ' ').replace(tre, '')
            || 0
    }

	return function natsort(a, b) {

        // trim pre-post whitespace
        const aa = normalize(a)
        const bb = normalize(b)

        // return immediately if at least one of the values is empty.
        // empty string < any others
        if (!aa && !bb) {
            return 0
        }

        if (!aa && bb) {
            return SMALLER
        }

        if (aa && !bb) {
            return GREATER
        }

        // tokenize: split numeric strings and default strings
        const aArr = tokenize(aa)
        const bArr = tokenize(bb)

        // hex or date detection
        const aHex = aa.match(hre)
        const bHex = bb.match(hre)
        const av = (aHex && bHex) ? parseInt(aHex[0], 16) : (aArr.length !== 1 && Date.parse(aa))
        const bv = (aHex && bHex)
            ? parseInt(bHex[0], 16)
            : av && bb.match(dre) && Date.parse(bb) || null

        // try and sort Hex codes or Dates
        if (bv) {
            if (av === bv) {
                return 0
            }

            if (av < bv) {
                return SMALLER
            }

            if (av > bv) {
                return GREATER
            }
        }

        const al = aArr.length
        const bl = bArr.length

        // handle numeric strings and default strings
        for (let i = 0, l = Math.max(al, bl); i < l; i += 1) {

            const af = parse(aArr[i] || '', al)
            const bf = parse(bArr[i] || '', bl)

            // handle numeric vs string comparison.
            // numeric < string
            if (isNaN(af) !== isNaN(bf)) {
                return isNaN(af) ? GREATER : SMALLER
            }

            // if unicode use locale comparison
            if (ure.test((af) + (bf)) && (af).localeCompare) {
                const comp = (af).localeCompare(bf)

                if (comp > 0) {
                    return GREATER
                }

                if (comp < 0) {
                    return SMALLER
                }

                if (i === l - 1) {
                    return 0
                }
            }

            if (af < bf) {
                return SMALLER
            }

            if (af > bf) {
                return GREATER
            }

            if (`${af}` < `${bf}`) {
                return SMALLER
            }

            if (`${af}` > `${bf}`) {
                return GREATER
            }
        }

        return 0
    }
}
let natsort_compare = natsort({ insensitive: true })

function get_sort_index(a, b) {
	if (is_num(a) && is_num(b)) {
        return a - b;
    } else if (is_num(b)) {
        return -1;
    } else if (is_num(a)) {
        return 1;
    }
	return natsort_compare(a, b);
}

function sort_mixed_list(list) {
	return list.sort(get_sort_index);
}

function is_num(val){
    if(val === "") return false;
    return !isNaN(val)
}

function get_all_values(input, unique_only = false) {
    if (typeof input == 'object') {
        let return_arr = [];
        for (let value in input) {
			if (value.startsWith("_")) continue
            return_arr = return_arr.concat(...get_all_values(input[value]));
        }
        if (unique_only) {
            return_arr = [...new Set(return_arr)]
        }
        return return_arr;
    } else {
        return [input];
    }
}

// https://stackoverflow.com/a/11958496/13224225
function lev_dist(s, t) {
	var d = []; //2d matrix

	// Step 1
	var n = s.length;
	var m = t.length;

	if (n == 0) return m;
	if (m == 0) return n;

	//Create an array of arrays in javascript (a descending loop is quicker)
	for (var i = n; i >= 0; i--) d[i] = [];

	// Step 2
	for (var i = n; i >= 0; i--) d[i][0] = i;
	for (var j = m; j >= 0; j--) d[0][j] = j;

	// Step 3
	for (var i = 1; i <= n; i++) {
		var s_i = s.charAt(i - 1);

		// Step 4
		for (var j = 1; j <= m; j++) {

			//Check the jagged ld total so far
			if (i == j && d[i][j] > 4) return n;

			var t_j = t.charAt(j - 1);
			var cost = (s_i == t_j) ? 0 : 1; // Step 5

			//Calculate the minimum
			var mi = d[i - 1][j] + 1;
			var b = d[i][j - 1] + 1;
			var c = d[i - 1][j - 1] + cost;

			if (b < mi) mi = b;
			if (c < mi) mi = c;

			d[i][j] = mi; // Step 6

			//Damerau transposition
			if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
			}
		}
	}

	// Step 7
	return d[n][m];
}

function get_closest_lev_dist_from_list(word, list) {
	return list.sort((a, b) => lev_dist(word, a) - lev_dist(word, b))[0]
}

