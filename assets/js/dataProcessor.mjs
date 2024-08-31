import { getFirstValue, getSortIndex, isNum } from './dataUtilities.mjs';

export function dataProcessor(data, selection_arr, sort_arr, filter_obj, search, page, invert_filter = false) {
    let output_data = [];
    
    // Filtering and "pivoting" (from data to output_data)
    data.key_list.forEach(entry => {
        const output_entry = {[page]: entry};
        let filtered = false;
        for (let property_id of selection_arr) {
            const property = data.properties[property_id];
            const selected_element = property.entries[entry];
            const size_factor = property.size_factor ?? 1;

            output_entry[property_id] = pivot_element(selected_element, property, property_id, size_factor, filter_obj, invert_filter);

            if (output_entry[property_id] === undefined) {
                filtered = true;
            }

        }
        if (!filtered) {
            output_data.push(output_entry);
        }
    });

    // Search filtering:
    let variantsIsSelected = selection_arr.includes("variants");
    output_data = output_data.filter(row => {
        return Boolean(search.split('|').some(subsearch =>
            subsearch.split(' ').every(term =>
                row[page].toLowerCase().includes(term.toLowerCase())
                || (variantsIsSelected && get_all_values(row.variants).some(v => v.toLowerCase().includes(term.toLowerCase())))
            )
        ))
    })

    // For exporting as CSV:
    let exportable_list = output_data.map(entry => entry[page]);
	// For exporting as JSON:
	let exportable_data = output_data;
    // For entry count:
    let entry_count = output_data.length.toString();

    function sort_properties(data, sort_properties) {
        if (!sort_properties.length) {
            return data;
        }

        // Split
        let split_data = [];
        data.forEach(data_elm => {
            let split_elements = [deepCopy(data_elm)];

            sort_properties.forEach(property_map => {
                let property = property_map.property;
                let split_element_next = [];

                // Loop trough all currently split elements
                split_elements.forEach(val => {

                    split(val, [], property, split_element_next);
                    
                });
                split_elements = split_element_next;
            });
            split_data.push(...split_elements);
        });

        // Sort 
        sort_properties.reverse().forEach(({property: property_id, reversed}) => {
            split_data.sort((first_row, second_row) => {
                let a = first_row[property_id];
                let b = second_row[property_id];

                a = getFirstValue(a);
                b = getFirstValue(b);
                
                let i = getSortIndex(a, b);
                
                return reversed ? -i : i;
                
            });
        });

        // Recombine
        for (let i = 0; i < split_data.length - 1; i++) {
            let this_elm = split_data[i];
            let next_elm = split_data[i + 1];
            if(this_elm[page] === next_elm[page]) {
                Object.entries(this_elm).forEach(([property_id, this_value]) => {
                    let next_value = next_elm[property_id];
                    this_elm[property_id] = combine_elements(this_value, next_value);
                });
                split_data.splice(i + 1, 1);
                i--;
            }
        }

        function combine_elements(first, second) {
            // console.log(first, second)
            if(JSON.stringify(first) == JSON.stringify(second)) {
                return first;
            }
            if(Array.isArray(first)) {
                first.push(...second);
                return first;
            }
            if(Array.isArray(second)) {
                second.unshift(first);
                return second;
            }
            if(typeof first == 'object' && typeof second == 'object') {
                let path = Object.getOwnPropertyNames(second)[0];
                if(first.hasOwnProperty(path)) {
                    first[path] = combine_elements(first[path], second[path])
                } else {
                    first[path] = second[path];
                }
                return first;
            }
            return [first, second];
        }

        return split_data;
    }

    output_data = sort_properties(output_data, sort_arr);

    return { output_data, exportable_list, exportable_data, entry_count };
}

function pivot_element(input_element, property, property_id, size_factor, filter_obj, invert_filter) {
    if (typeof input_element == 'object') {
        if (Array.isArray(input_element)) {
            const output_arr = [];

            input_element.forEach(element => {
                const value = pivot_element(element, property, property_id, size_factor, filter_obj, invert_filter);
                if (value !== undefined) {
                    output_arr.push(value);
                }
            });
            if (output_arr.length === 0) {
                return;
            }
            return output_arr;
        } else {
            const output_obj = {};
            Object.keys(input_element).forEach(variant => {
                const value = pivot_element(input_element[variant], property, property_id, size_factor, filter_obj, invert_filter);
                if (value !== undefined) {
                    output_obj[variant] = value;
                }
            });
            if (Object.keys(output_obj).length === 0) {
                return;
            }
            return output_obj;
        }
    } else {
        input_element = input_element ?? property.default_value ?? "No default value has been assigned.";
        if (isNum(input_element) && size_factor !== 1) {
            input_element *= size_factor;
        }
        if ((filter_obj[property_id] || []).includes(String(input_element)) ^ invert_filter) {
            return;
        } else {
            return input_element;
        }
    }
}

function split(row, path, property, split_element_next) {
    const row_copy = deepCopy(row);

    let pointer = row_copy;
    path.forEach(key => {
        pointer = pointer[key];
    });

    if (typeof pointer[property] === 'object') {
        if (Array.isArray(pointer[property])) {
            const pointer_copy = deepCopy(pointer);
            for (let i = 0; i < pointer_copy[property].length; i++) {
                pointer[property] = [pointer_copy[property][i]];
                split(row_copy, path.concat(property), i, split_element_next);
            }

        } else {
            for (let [key, value] of Object.entries(pointer[property])) {
                pointer[property] = {[key]: value};
                split(row_copy, path.concat(property), key, split_element_next);
            }
        }
    } else {
        split_element_next.push(row_copy);
    }
}
