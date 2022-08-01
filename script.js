// noinspection JSCheckFunctionSignatures,JSUnresolvedVariable

let data = {};
const value_list = {};

const urlParams = new URLSearchParams(window.location.search);

let filter_obj;
let sort_arr;
let selection_arr;
let settings_obj;

// Try-catch spam is for "legacy" purposes, old JSON-links will still work for a while
try {
    filter_obj = JSON.parse(urlParams.get("filter")) ?? {};
} catch {
    filter_obj = parse_custom_url(urlParams.get("filter")) ?? {};
}

try {
    sort_arr = JSON.parse(urlParams.get("sort")) ?? [];
} catch {
    sort_arr = urlParams.get("sort")
            .split(',')
            .map(prop => {
                let reversed = prop.charAt(0) === '!';
                return {property: prop.substr(reversed), reversed: reversed}
            })
        ?? [];
}

try {
    selection_arr = JSON.parse(urlParams.get("selection")) ?? null;
} catch {
    if (urlParams.has("selection")) {
        selection_arr = [parse_custom_url(urlParams.get("selection")) || []].flat();
    } else {
        selection_arr = null;
    }
}

try {
    settings_obj = JSON.parse(urlParams.get("settings")) ?? {};
} catch {
    settings_obj = parse_custom_url(urlParams.get("settings")) ?? {};
}

let search = urlParams.get("search") ?? "";
let page, entry_header, exportable_list;

function load_data(filename) {
    page = document.body.dataset.page;
    switch (page) {
        case "block":
            entry_header = "Blocks";
            break;

        case "entity":
            entry_header = "Entities";
            break;

        case "item":
            entry_header = "Items";
    }

    initialize_page();
    $.ajax({
        'url': filename,
        'dataType': "json",
        'success': function (d) {
            data = d;
            display_selection();
            display_headers_and_table();
        }
    });
}


function display_selection() {
    $('#selection').children().remove();
    $('#selection').append(`<li>
    <div class="text-center">
        <span class="btn-group dropdown-actions" role="group">
            <a role="button" class="btn dropdown-btn btn-default deselect-all">
                <i class="far fa-square"></i>
            </a>
            <a role="button" class="btn dropdown-btn btn-default select-all">
                <i class="far fa-check-square"></i>
            </a>
        </span>
    </div>
    </li>`);
    if (selection_arr === null) {
        selection_arr = [];
        for (let [property_name, value] of Object.entries(data.properties)) {
            if (value.default_selection ?? false) {
                selection_arr.push(property_name);
            }
        }
    }
    function selection_dropdown(entry) {
        if (typeof entry === 'object') {
            if (Array.isArray(entry)) { // arr
                return entry.reduce((result, ent) => result + selection_dropdown(ent), "");
            } else { // obj
                return `
                <li class="custom-submenu">
                    <a role="button" class="selection-category submenu disabled">
                        <i class="fas fa-folder-open"></i> ${entry.category}&hellip;
                    </a>
                    <ul class="custom-collapsible list-unstyled">
                        ${selection_dropdown(entry.contents)}
                    </ul>
                </li>
                `;
            }
        } else { // entry
            const isSelected = selection_arr.includes(entry);
            return `
                <li>
                    <a 
                        role="button" 
                        class="dropdown-option select-option${isSelected ? ' selected' : ''}" 
                        property="${entry}"
                    >
                        ${(data.properties[entry] || {property_name: "Placeholder"}).property_name}
                        <span class="glyphicon glyphicon-ok" style="${isSelected ? 'display:inline-block' : 'display:none'}">
                        </span>
                    </a>
                </li>
            `;
        }
    }

    $('#selection').append(selection_dropdown(data.property_structure));

    $('.selection-category').siblings('ul').has('a.selected').siblings('a').addClass('selected');


    $('.selection-category').click(function (e) {
        e.stopPropagation();
    });

    $('a.submenu.selection-category').click(function () {
        let submenu = $(this).siblings('ul.custom-collapsible');
        if (submenu.hasClass('submenu-open')) {
            submenu.animate({
                'max-height': 0,
                'opacity': 0,
            }, 200, function () {
                submenu.css('display', 'none');
                submenu.removeClass('submenu-open');
            });
        } else {
            submenu.css('display', 'block');
            submenu.animate({
                'max-height': '100rem',
                'opacity': 1,
            }, 300, function () {
                submenu.addClass('submenu-open');
            });
        }
    });

    $('.select-option').click(function (e) {
        e.stopPropagation();
        const value = $(this).attr("property");
        if (selection_arr.includes(value)) {
            selection_arr.splice(selection_arr.indexOf(value), 1);
        } else {
            selection_arr.push(value);
        }
        $(this).children().toggle();
        $(this).toggleClass('selected');

        $('.selection-category').removeClass('selected');
        $('.selection-category').siblings('ul').has('a.selected').siblings('a').addClass('selected');

        update_window_history();
        display_headers_and_table();
    });

    $('.select-all').click(function (e) {
        e.stopPropagation();
        selection_arr = Object.keys(data.properties);
        update_window_history();
        display_selection();
        display_headers_and_table();
    });

    $('.deselect-all').click(function (e) {
        e.stopPropagation();
        selection_arr = [];
        update_window_history();
        display_selection();
        display_headers_and_table();
    });
}

function initialize_page() {
    if (!localStorage.getItem("MCProperty-discord-promoted")) {
        $(".shameless-self-promo").removeClass("display-none")
    }
    
    $(window).on('popstate', function () {
        location.reload(true);
    });

    $('.radio-settings, .toggle-settings').each(function () {
        const setting = $(this).attr("setting");
        const value = $(this).attr("value") ?? "true";
        if (settings_obj[setting] === value) {
            $(this).addClass('active');
        }
    });
    
    $('.radio-settings, .toggle-settings').click(function () {
        const setting = $(this).attr("setting");
        const value = $(this).attr("value") ?? "true";
        const rerender = $(this).attr("rerender");
        if (settings_obj[setting] === value) {
            delete settings_obj[setting];
        } else {
            settings_obj[setting] = value;
        }
        $(this).siblings('a.radio-settings').removeClass('active');
        $(this).toggleClass('active');
        update_window_history();
        if(rerender !== "false") {
            display_headers_and_table();
        }
    });

    $('#search').val(search);
    $('#search').on('input', function () {
        search = $(this).val();
        update_window_history();
        display_results();
    });
}

// This functions only handles headers, but calls display_results()
function display_headers_and_table() {

    un_datatable();

    $('#output_table').find('thead>tr>th').remove();

    for (const [_, property] of Object.entries(data.properties).filter(([e, _]) => selection_arr.includes(e))) {
        let size_factor = 1;
        if (typeof settings_obj.size_type !== 'undefined' && typeof property.size_type !== 'undefined') {
            size_factor /= (property.size_type === "pixel" ? 16 : 1);
            size_factor *= (settings_obj.size_type === "pixel" ? 16 : 1);
        }
        property.size_factor = size_factor;
    }

    // Add all unique values of a property to a list of possible values for said property (recursively so for objects)
    Object.entries(data.properties)
        .filter(([property_name, _]) => selection_arr.includes(property_name))
        .forEach(([property_name, property]) => {
            let values;
            if (property.default_value != null) {
                values = [property.entries, property.default_value];
            } else {
                values = property.entries;
            }
            value_list[property_name] = get_all_values(values, true).map(val => {
                if (val * 1 == val && property.size_factor !== 1) {
                    val *= property.size_factor;
                }
                return String(val)
            });
            }
        );

    // Table headers
    $('#output_table').children('thead').children('tr').append(`
    <th>
        <div class="text-center">
            <span class="table-header" id="entry_count" title="Number of rows">
            </span>
        </div>
    </th>
    <th>
        <div class="dropdown">
            <a class="table-header dropdown-toggle justify-start" data-toggle="dropdown">
                ${entry_header} 
                <span class="icons">
                    <i class="fas fa-sort-amount-down-alt${
                        sort_arr.some(e => e.property === page) && !sort_arr.filter(e => e.property === page)[0].reversed 
                            ? '' 
                            : ' display-none'
                        } sorted"></i>
                    <i class="fas fa-sort-amount-up${
                        sort_arr.some(e => e.property === page) && sort_arr.filter(e => e.property === page)[0].reversed 
                            ? '' 
                            : ' display-none'
                    } sorted-reverse"></i>
                
                    <span class="glyphicon glyphicon-triangle-bottom"></span>
                </span>
            </a>
            <ul class="dropdown-menu">
                <li>
                    <div class="text-center">
                        <span class="btn-group dropdown-actions" role="group">
                            <a role="button" class="btn dropdown-btn btn-default modify-sorting${
                                (sort_arr.some(e => e.property === page) 
                                    && !sort_arr.filter(e => e.property === page)[0].reversed) 
                                    ? ' active' 
                                    : ''
                                }" property="${page}" reversed="false"
                            >
                                <i class="fas fa-sort-amount-down-alt"></i>
                            </a>
                            <a role="button" class="btn dropdown-btn btn-default modify-sorting${
                                (sort_arr.some(e => e.property === page) 
                                    && sort_arr.filter(e => e.property === page)[0].reversed) 
                                    ? ' active' 
                                    : ''
                                }" property="${page}" reversed="true"
                            >
                                <i class="fas fa-sort-amount-up"></i>
                            </a>
                        </span>
                        <a role="button" class="btn dropdown-btn btn-default export-csv">
                            <i class="fas fa-file-export"></i>Export CSV
                        </a>
                        <a role="button" class="btn dropdown-btn btn-default copy-comma-separated">
                            <i class="fas fa-copy"></i>Copy Comma-Separated List
                        </a>
                    </div>
                </li>
            </ul>
        </div>
    </th>
    `);

    $('.export-csv').click(function (e) {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + exportable_list.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", page + "list.csv");
        document.body.appendChild(link); // Required for FireFox

        link.click();
    });

    $('.copy-comma-separated').click(function (e) {
        let text = exportable_list.join(', ');
        // from: https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
        var input = document.createElement('textarea');
        input.innerHTML = text;
        document.body.appendChild(input);
        input.select();
        var result = document.execCommand('copy');
        document.body.removeChild(input);
        if(result) {
            console.log("List copied successfully");
        }
        return result;
    });

    selection_arr.forEach(property_id => {

        let sorted = 0;
        if (sort_arr.some(e => e.property === property_id)) {
            if (sort_arr.filter(e => e.property === property_id)[0].reversed) {
                sorted = -1;
            } else {
                sorted = 1;
            }
        }

        // Header and dropdown buttons
        let append_data = `
            <th>
                <div class="dropdown noselect">
                    <a property="${property_id}" 
                       class="table-header dropdown-toggle justify-start noselect" 
                       data-toggle="dropdown"
                    >
                        ${data.properties[property_id].property_name}
                        <span class="icons">
                            <i class="fas fa-filter${typeof filter_obj && filter_obj[property_id] ? '' : ' display-none'} filtered"></i>
                            <i class="fas fa-sort-amount-down-alt${sorted === 1 ? '' : ' display-none'} sorted"></i>
                            <i class="fas fa-sort-amount-up${sorted === -1 ? '' : ' display-none'} sorted-reverse"></i>
                            <span class="glyphicon glyphicon-triangle-bottom"></span>
                        </span>
                    </a>
                    <ul class="dropdown-menu">
                        <li>
                            <div class="text-center">
                                <span class="btn-group dropdown-actions" role="group">
                                    <a role="button" 
                                       class="btn dropdown-btn btn-default modify-sorting${sorted === 1 ? ' active' : ''}" 
                                       property="${property_id}" 
                                       reversed="false"
                                    >
                                        <i class="fas fa-sort-amount-down-alt"></i>
                                    </a>
                                    <a role="button" 
                                       class="btn dropdown-btn btn-default modify-sorting${sorted === -1 ? ' active' : ''}" 
                                       property="${property_id}" 
                                       reversed="true">
                                        <i class="fas fa-sort-amount-up"></i>
                                    </a>
                                    <a role="button" 
                                       class="btn dropdown-btn btn-default toggle-select-all"
                                       property="${property_id}"
                                    >
                                        <i class="far fa-check-square"></i>
                                    </a>
                                </span>
                            </div>
                        </li>`;

        if (typeof data.properties[property_id].property_description !== 'undefined') {
            append_data += `<li class="dropdown-submenu">
                                <a role="button" class="description-button">Description...</a>
                                <ul class="dropdown-menu">
                                    <p>${data.properties[property_id].property_description}</p>
                                </ul>
                            </li>`;
        }
        append_data += `<li class="divider"></li><div class="dropdown-scrollable">`;

        // Filter menu
        if (filter_obj[property_id] !== undefined) {
            filter_obj[property_id] = [filter_obj[property_id]].flat();
        }
        sort_mixed_types(value_list[property_id]).forEach(option => {
            const color = formatting_color(option, property_id, true);
            append_data += `<li>
                    <a role="button" class="dropdown-option modify-filter" property="${property_id}" value="${option}">
                        <span class="dot ${color ? color : 'display-none'}"></span>
                        <span class="justify-start">${option}</span>
                        <span class="glyphicon glyphicon-ok${filter_obj[property_id]?.includes(String(option)) ? ' display-none' : ''}">
                        </span></a></li>`
        });
        append_data += `</div></ul></div></th>`;

        $('#output_table').children('thead').children('tr').append(append_data);
    });

    $('.modify-filter').click(function (e) {
        e.stopPropagation();

        const property = $(this).attr("property");
        let value = $(this).attr("value");

        $(this).children().last().toggleClass("display-none")

        // Convert to double if applicable
        // value = (value * 1 == value) ? value * 1 : value;
        if (!Object.keys(filter_obj).includes(property)) {
            filter_obj[property] = [];
        }

        if (filter_obj[property].includes(value)) {
            filter_obj[property].splice(filter_obj[property].indexOf(value), 1);
        } else {
            filter_obj[property].push(value);
            $(this).parents('.dropdown').find('.filtered').removeClass('display-none');
        }

        if (filter_obj[property].length === 0) {
            delete filter_obj[property];
            $(this).parents('.dropdown').find('.filtered').addClass('display-none');
        }
        update_window_history();
        display_results();
    });

    $('.modify-sorting').click(function (e) {
        e.stopPropagation();

        const property = $(this).attr("property");
        const reversed = $(this).attr("reversed") === 'true';

        if (sort_arr.some(e => e.property === property)) {
            if (sort_arr.filter(e => e.property === property)[0].reversed !== reversed) {
                // If already sorted in the opposite order, reverse the sorting
                sort_arr[sort_arr.findIndex(e => e.property === property)].reversed = reversed;

                $(this).parents('.dropdown').find('.sorted').toggleClass('display-none');
                $(this).parents('.dropdown').find('.sorted-reverse').toggleClass('display-none');
            } else {
                // If already sorted in the same order, remove it
                sort_arr.splice(sort_arr.findIndex(e => e.property === property), 1);

                $(this).parents('.dropdown').find('.sorted').addClass('display-none');
                $(this).parents('.dropdown').find('.sorted-reverse').addClass('display-none');
            }
        } else {
            // If not sorted, sort according to selection
            sort_arr.push({"property": property, "reversed": reversed});

            $(this).parents('.dropdown').find(reversed ? '.sorted-reverse' : '.sorted').removeClass('display-none');
        }
        $(this).siblings('a').removeClass('active');
        $(this).toggleClass('active');
        update_window_history();
        display_results();
    });

    $('.toggle-select-all').click(function (e) {
        e.stopPropagation();

        const property = $(this).attr("property");

        if (filter_obj[property] && value_list[property].every(e => filter_obj[property].includes(e))) {
            delete filter_obj[property];
            $(this).parents('ul').find('.glyphicon').removeClass('display-none');
        } else {
            filter_obj[property] = deepCopy(value_list[property]);
            $(this).parents('ul').find('.glyphicon').addClass('display-none');
        }

        update_window_history();
        display_results();
    });
    $('.description-button').click(function (e) {
        e.stopPropagation();
        $(this).parent().toggleClass('open')
    });
    $('.dropdown-submenu>.dropdown-menu').click(function (e) {
        e.stopPropagation();
    });
    display_results();

}

// Displays all the table data
function display_results() {
    un_datatable();
    $('#output_table').find('tbody>tr').remove();

    // Table data
    let output_data = [];

    // Filtering and "pivoting" (from data to output_data)
    data.key_list.forEach(entry => {
        const output_entry = {[page]: entry};
        let filtered = false;
        for (let property_id of selection_arr) {
            const property = data.properties[property_id];
            const selected_element = property.entries[entry];
            const size_factor = property.size_factor ?? 1;

            function pivot_element(input_element) {
                if (typeof input_element == 'object') {
                    if (Array.isArray(input_element)) {
                        const output_arr = [];

                        input_element.forEach(element => {
                            const value = pivot_element(element);
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
                            const value = pivot_element(input_element[variant]);
                            if (value !== undefined) {
                                output_obj[variant] = pivot_element(input_element[variant]);
                            }
                        });
                        if (Object.keys(output_obj).length === 0) {
                            return;
                        }
                        return output_obj;
                    }
                } else {
                    input_element = input_element ?? property.default_value ?? "No default value has been assigned.";
                    if (input_element * 1 == input_element && size_factor !== 1) {
                        input_element *= size_factor;
                    }
                    if ((filter_obj[property_id] || []).includes(String(input_element))) {
                        return;
                    } else {
                        return input_element;
                    }
                }
            }

            output_entry[property_id] = pivot_element(selected_element);

            if (output_entry[property_id] === undefined) {
                filtered = true;
            }

        }
        if (!filtered) {
            output_data.push(output_entry);
        }
    });

    // Search filtering:
    output_data = output_data.filter(row => {
        return Boolean(search.split('|').some(subsearch =>
            subsearch.split(' ').every(term =>
                row[page].toLowerCase().includes(term.toLowerCase()))
            )
        )
    })

    // For exporting as CSV:
    exportable_list = output_data.map(entry => entry[page]);

    // // For entry count:
    // $('#entry_count').html(output_data.length.toString());
    $('#entry_count').html(output_data.length.toString());

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

                    split(val, [], property);

                    function split(row, path, property) {
                        const row_copy = deepCopy(row);

                        let pointer = row_copy;
                        path.forEach(key => {
                            pointer = pointer[key];
                        });

                        if (typeof pointer[property] == 'object') {
                            if (Array.isArray(pointer[property])) {
                                const pointer_copy = deepCopy(pointer);
                                for (let i = 0; i < pointer_copy[property].length; i++) {
                                    pointer[property] = [pointer_copy[property][i]];
                                    split(row_copy, path.concat(property), i);
                                }

                            } else {
                                for (let [key, value] of Object.entries(pointer[property])) {
                                    pointer[property] = {[key]: value};
                                    split(row_copy, path.concat(property), key);
                                }
                            }
                        } else {
                            split_element_next.push(row_copy);
                        }
                    }
                });
                split_elements = split_element_next;
            });
            split_data.push(...split_elements);
        });

        // Sort 
        sort_properties.reverse().forEach(property_entry => {
            let property = property_entry.property;
            let reversed = property_entry.reversed;
            split_data.sort((a, b) => {
                let val_0 = (reversed ? b : a)[property];
                let val_1 = (reversed ? a : b)[property];

                val_0 = get_value(val_0);
                val_1 = get_value(val_1);

                function get_value(value) {
                    if (typeof value == 'object') {
                        return get_value(Object.values(value)[0]);
                    } else {
                        return value;
                    }
                }

                let result = 0;
                if (typeof val_0 == 'string' || typeof val_1 == 'string') {
                    result = val_0.toString().localeCompare(val_1.toString(), undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
                } else {
                    result = val_0 > val_1 ? 1 : (val_0 === val_1 ? 0 : -1);
                }

                return result;
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

    // Table outputting
    let append_string = "";
    output_data.forEach(entry => {
        const sprite = data.sprites[entry[page]] ?? ["block-sprite", -240, -16]; // defaluts to the air sprite
        append_string += "<tr>";
        append_string += `<td><span class="sprite ${sprite[0]}" style="background-position:${sprite[1]}px ${sprite[2]}px"></span></td>`;
        if (search) {
            search.split(' ')
                .filter(e => e !== '')
                .every(term => entry[page] = entry[page].replace(new RegExp(term, "ig"), '{$&}'));
            entry[page] = entry[page].replace(/{/g, '<span class="search-highlight">').replace(/}/g, '</span>')
        }
        for (let [property_id, value] of Object.entries(entry)) {
            append_string += get_data_cell(value, property_id);
        }
        // append_string += `<td>:<input type="text">,</td>`;
        append_string += "</tr>";
    });
    $('#output_table').children('tbody').append(append_string);

    if(!('ontouchstart' in window)
    // && false
    ){
        $('#output_table').DataTable({
            colReorder: {
                fixedColumnsLeft: 2
            },
            paging: false,
            searching: false,
            ordering: false,
            info: false
        });
    }

    function get_data_cell(entry, property_name, top_level = true) {
        let return_data;
        if (typeof (entry) == 'object' && entry != null) {
            return_data = `<td class="nested-cell">`;
            if (top_level && (get_all_values(entry).length > 2 || (Object.keys(entry).join().match(/<br>/g) || []).length > 2)) {
                return_data += `<button class="btn expand-btn ${settings_obj.hide_expand_buttons ? `display-none` : ""}" type="button" data-toggle="collapse-next">Expand</button>\n`
                return_data += `<table class="table table-bordered table-hover nested-table expandable ${settings_obj.expand_tables ? "" : `display-none`}"><tbody>`;
            } else {
                return_data += `<table class="table table-bordered table-hover nested-table"><tbody>`;
            }

            if (Array.isArray(entry)) {
                entry.forEach(value => {
                    return_data += `<tr>${get_data_cell(value, property_name, false)}</tr>`;
                });
            } else {
                Object.keys(entry).forEach(key => {
                    return_data += `<tr><td>${key}</td>${get_data_cell(entry[key], property_name, false)}</tr>`;
                });
            }
            return_data += "</tbody></table></td>";

        } else {
            return_data = `<td ${formatting_color(entry, property_name)}>${entry}</td>`;
        }
        return return_data;
    }

    // Toggle functionality of 'Expand' buttons 
    $('body').off('click.collapse-next.data-api');
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        const $target = $(this).next();
        // Not sure which one I prefer:
        // $target.toggle("toggle"); // With toggle animation/delay
        // $target.toggle(); // No toggle animation/delay
        $target.toggleClass("display-none"); // uses a class instead
    });
    $('#output_table').on('column-reorder.dt', function () {
        reorder_selection_arr();
        update_window_history();
    });

}

function un_datatable() {
    if ($.fn.dataTable.isDataTable('#output_table')) {
        $('#output_table').DataTable().destroy();
    }
}

function reorder_selection_arr() {
    selection_arr = [];
    $('#output_table:not(.DTCR_clonedTable)>thead>tr>th>div>a').each(function () {
        const prop = $(this).attr('property');
        if (typeof prop === 'undefined') return;
        selection_arr.push(prop);
    });
}

function get_all_values(input, unique_only = false) {
    if (typeof input == 'object') {
        let return_arr = [];
        for (let value in input) {
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

function sort_mixed_types(list) {
    return list.sort((a, b) => {
        if (typeof a == 'number' && typeof b == 'number') {
            return a - b;
        } else if (typeof a == 'string' && typeof b == 'number') {
            return -1;
        } else if (typeof a == 'number' && typeof b == 'string') {
            return 1;
        } else {
            return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
        }
    });
}

function formatting_color(value, property_name, class_exists = false) {
    let color = "";
    // console.log(value, property_name);

    let found_key;
    if (found_key = Object.keys(data.conditional_formatting).find(key_regex => new RegExp(`^${key_regex}$`).test(value))) {
        color = data.conditional_formatting[found_key];
        if (!class_exists) {
            color = `class="${color}"`;
        }
        return color;
    }

    if (typeof data.properties[property_name] !== 'undefined' || value * 1 == value) {
        let hue, sat, lum;
        let hslA, hslB;
        let scale_value, max;
        if (value * 1 == value) {
            scale_value = value * 1;

            hslA = [276, 55, 66];
            hslB = [212, 100, 82];
        } else if (typeof data.properties[property_name].relative_gradient == 'undefined') {
            return "";
        }
        hslA ??= [223, 62, 68];
        hslB ??= [159, 70, 82];
        if (data.properties[property_name].relative_gradient) {
            scale_value = value_list[property_name].indexOf(value) / value_list[property_name].length;
            max = 1;
        } else {
            max = (data.properties[property_name].max ?? 17) * (data.properties[property_name].size_factor ?? 1);
            if (scale_value >= max) {
                [hue, sat, lum] = hslB;
            }
        }
        // console.log(scale_value, max, value, property_name);
        hue ??= scale(scale_value, max, hslA[0], hslB[0]);
        sat ??= scale(scale_value, max, hslA[1], hslB[1]);
        lum ??= scale(scale_value, max, hslA[2], hslB[2]);

        color = `style="background-color: hsl(${hue},${sat}%,${lum}%)!important"`;
        if (class_exists) {
            color = '"' + color;
        }
        return color;
    }
}

function scale(number, inMax, outMin, outMax) {
    // Minimum in value is assumed to be 0
    return Math.round(((number) * (outMax - outMin) / (inMax) + outMin) * 100) / 100;
}

function update_window_history() {
    let url = "";

    // if(selection_arr != undefined)              url += "&selection=" + JSON.stringify(selection_arr);
    // if(Object.keys(settings_obj).length > 0)    url += "&settings=" + JSON.stringify(settings_obj);
    // if(Object.keys(filter_obj).length > 0)      url += "&filter=" + JSON.stringify(filter_obj);
    // if(sort_arr.length > 0)                     url += "&sort=" + JSON.stringify(sort_arr);

    if (selection_arr !== undefined) {
        url += "&selection=" + serialize_custom_url(selection_arr);
    }
    if (Object.keys(settings_obj).length > 0) {
        url += "&settings=" + serialize_custom_url(settings_obj);
    }
    if (Object.keys(filter_obj).length > 0) {
        url += "&filter=" + serialize_custom_url(filter_obj);
    }
    if (sort_arr.length > 0) {
        url += "&sort=" + sort_arr.map(obj => obj.reversed ? '!' + obj.property : obj.property);
    }
    ;
    if (search.length > 0) {
        url += "&search=" + search;
    }

    if (url !== "") {
        url = '?' + url.substr(1) + '#';
    }
    url = window.location.origin + window.location.pathname + url;

    window.history.pushState("", "", url);
}

// Constructs the custom url parameters:
// "abc" -> abc
// ["a", "b", 123] -> a,b,123
// {key:val} -> (key:val)
// {key:val,foo:bar} -> (key:val);(foo:bar)
function serialize_custom_url(value) {
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.map(v => serialize_custom_url(v)).join(',')
        }
        return Object.entries(value).map(([key, v]) =>
            "(" + key + ":" + serialize_custom_url(v) + ")"
        ).join(';');
    } else {
        return value;
    }
}

// Only supports objects at the top level, nested objects will break parsing.
function parse_custom_url(value) {
    if (value.charAt(0) === '(') {
        const split = value.split(';');
        const result = {};
        split.forEach(obj_str => {
            obj_str = obj_str.substr(1, obj_str.length - 2);
            const [key, ...val] = obj_str.split(':');
            result[key] = parse_custom_url(val.join());
        })
        return result;
    }
    const split = value.split(',');
    if (split.length > 1) {
        return split.map(v => parse_custom_url(v))
    }
    if (value === '') {
        return false;
    }
    // if (value * 1 == value) {
    //     return parseFloat(value);
    // }
    return value
}

function deepCopy(obj) {
    if (Array.isArray(obj)) {
        let result = [];

        for (let index in obj) {
            result.push(deepCopy(obj[index]));
        }

        return result;
    } else if (typeof obj == 'object') {
        let result = {};

        for (let [key, value] of Object.entries(obj)) {
            result[key] = deepCopy(value);
        }

        return result;
    }

    return obj;
}

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function () {
    scrollFunction()
};

function scrollFunction() {
    let scrollButton = document.getElementById("scrollButton");
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        scrollButton.style.display = "block";
    } else {
        scrollButton.style.display = "none";
    }
}

// When the user clicks on the button, scroll to the top of the document
function scrollToTop() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

function stopPromo() {
    localStorage.setItem("MCProperty-discord-promoted", true)
}
