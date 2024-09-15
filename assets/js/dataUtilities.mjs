export { getFirstValue, getSortIndex, sortMixedList, isNum, getAllValues, levDist, getClosestLevDistFromList };

function getFirstValue(value) {
    if (typeof value == 'object') {
        return getFirstValue(Object.values(value)[0]);
    } else {
        return value;
    }
}

const sorting_collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})

function getSortIndex(a, b) {
	if (isNum(a) && isNum(b)) {
        return a - b;
    } else if (isNum(b)) {
        return -1;
    } else if (isNum(a)) {
        return 1;
    }
	return sorting_collator.compare(a, b);
}

function sortMixedList(list) {
	return list.sort(getSortIndex);
}

function isNum(val){
    if(val === "") return false;
    return !isNaN(val)
}

function getAllValues(input, unique_only = false) {
    if (typeof input == 'object') {
        let return_arr = [];
        for (let value in input) {
            return_arr = return_arr.concat(...getAllValues(input[value]));
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
function levDist(s, t) {
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

function getClosestLevDistFromList(word, list) {
	return list.sort((a, b) => levDist(word, a) - levDist(word, b))[0]
}

