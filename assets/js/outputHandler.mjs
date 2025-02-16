export { header_outputter, table_body_generator };
import { sort_mixed_list } from './dataUtilities.mjs';
function header_outputter(page, entry_header) {
    $('#output-table').find('thead>tr>th').remove();

    for (const [_, property] of Object.entries(data.properties).filter(([e, _]) => selection_arr.includes(e))) {
        let size_factor = 1;
        if (typeof settings_obj.size_type !== 'undefined' && typeof property.size_type !== 'undefined') {
            size_factor /= (property.size_type === "pixel" ? 16 : 1);
            size_factor *= (settings_obj.size_type === "pixel" ? 16 : 1);
        }
        property.size_factor = size_factor;
    }

    // Add all unique values of a property to a list of possible values for said property
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
                if (is_num(val) && property.size_factor !== 1) {
                    val *= property.size_factor;
                }
                return String(val)
            });
            }
        );

    // Table headers
    $('#output-table').children('thead').children('tr').append(/*html*/`
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
                            <button class="btn dropdown-btn btn-default modify-sorting${
                                (sort_arr.some(e => e.property === page) 
                                    && !sort_arr.filter(e => e.property === page)[0].reversed) 
                                    ? ' active' 
                                    : ''
                                }" property="${page}" reversed="false"
                            >
                                <i class="fas fa-sort-amount-down-alt"></i>
                            </button>
                            <button class="btn dropdown-btn btn-default modify-sorting${
                                (sort_arr.some(e => e.property === page) 
                                    && sort_arr.filter(e => e.property === page)[0].reversed) 
                                    ? ' active' 
                                    : ''
                                }" property="${page}" reversed="true"
                            >
                                <i class="fas fa-sort-amount-up"></i>
                            </button>
                        </span>
                    </div>
                </li>
                <li>
                    <div class="btn-group-vertical" role="group" style="padding: 4px">
                        <button class="btn dropdown-btn btn-default export-csv"
                            title="Download a newline-separated list of all blocks that are currently shown">
                            <i class="fas fa-file-export"></i>Export CSV
                        </a>
                        <button class="btn dropdown-btn btn-default export-json"
                            title="Download a JSON string-array-formatted list of all blocks that are currently shown">
                            <i class="fas fa-file-export"></i>Export JSON
                        </a>
                        <button class="btn dropdown-btn btn-default copy-comma-separated"
                            title="Copy a Comma-Separated list of all blocks that are currently shown to clipboard.">
                            <i class="fas fa-copy"></i>Copy Comma-Separated List
                        </a>
                    </div>
                </li>
            </ul>
        </div>
    </th>`);

    $('.export-csv').off();
    $('.export-csv').click(function (e) {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + exportable_list.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", page + "list.csv");
        document.body.appendChild(link); // Required for FireFox

        link.click();
    });

    $('.export-json').off();
    $('.export-json').click(function (e) {
        const encodedUri = encodeURI("data:application/json;charset=utf-8," + JSON.stringify(exportable_data));
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", page + "list.json");
        document.body.appendChild(link); // Required for FireFox

        link.click();
    });

    $('.copy-comma-separated').off();
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

    selection_arr
        .filter((item, index) => selection_arr.indexOf(item) === index)
        .filter(property_id => Object.keys(data.properties).includes(property_id))
        .forEach(property_id => {

        let sorted = 0;
        if (sort_arr.some(e => e.property === property_id)) {
            if (sort_arr.filter(e => e.property === property_id)[0].reversed) {
                sorted = -1;
            } else {
                sorted = 1;
            }
        }

        // Header and dropdown buttons
        let append_data = /*html*/`
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
                                    <button
                                       title="Sort this column"
                                       class="btn dropdown-btn btn-default modify-sorting${sorted === 1 ? ' active' : ''}" 
                                       property="${property_id}" 
                                       reversed="false"
                                    >
                                        <i class="fas fa-sort-amount-down-alt"></i>
                                    </button>
                                    <button
                                       title="Sort this column in reverse"
                                       class="btn dropdown-btn btn-default modify-sorting${sorted === -1 ? ' active' : ''}" 
                                       property="${property_id}" 
                                       reversed="true">
                                        <i class="fas fa-sort-amount-up"></i>
                                    </button>
                                    <button
                                       title="Toggle all filter values"
                                       class="btn dropdown-btn btn-default toggle-select-all"
                                       property="${property_id}"
                                    >
                                        <i class="far fa-check-square"></i>
                                    </button>
                                    <button
                                       title="Remove/deselect this property"
                                       class="btn dropdown-btn btn-default remove-property"
                                       property="${property_id}"
                                    >
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </span>
                            </div>
                        </li>`;

        if (typeof data.properties[property_id].property_description !== 'undefined' && data.properties[property_id].property_description !== "") {
            append_data += /*html*/`<li class="dropdown-submenu">
                <a role="button" class="description-button">Description...</a>
                <ul class="dropdown-menu">
                    <p class="user-select-text">${value_parser(data.properties[property_id].property_description)}</p>
                </ul>
            </li>`;
        }
        if (typeof data.properties[property_id].definition !== 'undefined' && data.properties[property_id].definition !== "") {
            append_data += /*html*/`<li class="dropdown-submenu">
                <a role="button" class="description-button"><i class="fas fa-code"></i> Code definition...</a>
                <ul class="dropdown-menu">
                    <p class="user-select-all">
                        ${data.properties[property_id].definition}
                    </p>
                    <p>
                        <button 
                            class="btn btn-default"
                            onclick="navigator.clipboard.writeText('${data.properties[property_id].definition}')"
                            >Copy reference <i class="fas fa-copy"></i>
                        </button>
                        <a
                            class="btn btn-default"
                            href="https://linkie.shedaniel.dev/mappings?namespace=mojang&search=${encodeURIComponent(data.properties[property_id].definition.split('(')[0])}"
                            target="_blank" rel="noopener noreferrer" title="Search for this code definition on Linkie"
                            >Search on Linkie <i class="fas fa-external-link-alt"></i>
                        </a>
                    </p>
                </ul>
            </li>`;
        }
        append_data += /*html*/`<li class="divider"></li><div class="dropdown-scrollable">`;

        // Filter menu
        if (filter_obj[property_id] !== undefined) {
            filter_obj[property_id] = [filter_obj[property_id]].flat();
        }
        sort_mixed_list(value_list[property_id]).forEach(option => {
            const color = formatting_color(option, property_id, true);
            append_data += /*html*/`<li>
                    <a role="button" class="dropdown-option modify-filter" property="${property_id}" value="${option}">
                        <span class="dot ${color ? color : 'display-none'}"></span>
                        <span class="justify-start">${value_parser(option)}</span>
                        <span class="glyphicon glyphicon-ok${filter_obj[property_id]?.includes(String(option)) ? ' display-none' : ''}">
                        </span></a></li>`
        });
        append_data += /*html*/`</div></ul></div></th>`;

        $('#output-table').children('thead').children('tr').append(append_data);
    });

    $('.modify-filter').click(function (e) {
        e.stopPropagation();

        const property = $(this).attr("property");
        let value = $(this).attr("value");

        $(this).children().last().toggleClass("display-none")

        // Convert to double if applicable
        // value = (is_num(value)) ? value * 1 : value;
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
            filter_obj[property] = deep_copy(value_list[property]);
            $(this).parents('ul').find('.glyphicon').addClass('display-none');
        }

        update_window_history();
        display_results();
    });
    
    $('.remove-property').click(function (e) {
        e.stopPropagation();

        const property = $(this).attr("property");

        selection_arr.splice(selection_arr.indexOf(property), 1);

        update_window_history();
        display_selection();
        display_headers_and_table();
    });

    $('.description-button').click(function (e) {
        e.stopPropagation();
        $(this).parent().toggleClass('open')
    });
    
    $('.dropdown-submenu>.dropdown-menu').click(function (e) {
        e.stopPropagation();
    });
}

function table_body_generator(output_data, page, search) {
    let append_string = "";
    output_data.forEach(entry => {
        const sprite = data.sprites[entry[page]] ?? ["block-sprite", -240, -16]; // defaluts to the air sprite
        if (search) {
            entry[page] = highlight_search_string(entry[page], search)
            if(typeof entry.variants !== 'undefined') {
                entry.variants = highlight_search_string(entry.variants, search)
            }
        }
        append_string += /*html*/`
            <tr>
                <td>
                    <span class="sprite ${sprite[0]}" style="background-position:${sprite[1]}px ${sprite[2]}px"></span>
                </td>`;
        for (let [property_id, value] of Object.entries(entry)) {
            append_string += get_data_cell_contents(value, property_id);
        }
        append_string += "</tr>";
    });
    return append_string;

}

function get_data_cell_contents(entry, property_id, top_level = true) {
    let return_data;
    if (typeof (entry) == 'object' && entry != null) {
        return_data = /*html*/`<td class="nested-cell">`;
        if (top_level && (get_all_values(entry).length > 2 || (Object.keys(entry).join().match(/<br>/g) || []).length > 2)) {
            // return_data += /*html*/`<button class="btn expand-btn ${settings_obj.hide_expand_buttons ? `display-none` : ""}" type="button" data-toggle="collapse-siblings">Expand</button>\n`
            return_data += /*html*/`<a class="expand-btn ${settings_obj.hide_expand_buttons ? `display-none` : ""}" type="button" data-toggle="collapse-siblings"><table class="table table-bordered nested-table expand-btn"><tbody><tr><td>Expand...</td></tr></tbody></table></a>\n`
            
            if(get_all_values(entry, true).join("  ").length <= 40) {
                return_data += /*html*/`<table class="table table-bordered table-hover nested-table expandable preview-table ${settings_obj.expand_tables ? "display-none" : ""}">
                    <tbody>
                        <tr>${get_nested_table_contents(sort_mixed_list(get_all_values(entry, true)), property_id, true)}</tr>
                    </tbody>
                </table>`;
            }
            
            return_data += /*html*/`<table class="table table-bordered table-hover nested-table expandable ${settings_obj.expand_tables ? "" : `display-none`}"><tbody>`;
        } else {
            return_data += /*html*/`<table class="table table-bordered table-hover nested-table"><tbody>`;
        }
        return_data += get_nested_table_contents(entry, property_id);
        
        return_data += "</tbody></table></td>";

    } else {
        return_data = /*html*/`<td class="${is_num(entry) && settings_obj.right_align_numbers ? "numeric-cell" : ""} ${formatting_color(entry, property_id, true)}">${value_parser(entry)}</td>`;
    }
    return return_data;
}

function get_nested_table_contents(nested_data, property_id, horizontal_arr = false) {
    if (Array.isArray(nested_data)) {
        if(horizontal_arr) {
            return nested_data.reduce((acc, sub_entry) => {
                return acc + get_data_cell_contents(sub_entry, property_id, false);
            }, "");
        } else {
            return nested_data.reduce((acc, sub_entry) => {
                return acc + `<tr>${get_data_cell_contents(sub_entry, property_id, false)}</tr>`;
            }, "");
        }
    }
    return Object.keys(nested_data).reduce((acc, key) => {
        return acc + `<tr><td>${key}</td>${get_data_cell_contents(nested_data[key], property_id, false)}</tr>`;
    }, "");
}

function formatting_color(value, property_id, class_exists = false) {
    if(typeof data.properties[property_id] == 'undefined') { // First column
        return "";
    }

    if (Object.hasOwn(data.conditional_formatting, value)) {
        let color = data.conditional_formatting[value];
        if (!class_exists) {
            color = `class="${color}"`;
        }
        return color;
    }

    if (!is_num(value) && !data.properties[property_id].relative_gradient) {
        return "";
    }

    function get_HSL_values(isLightTheme, isNumerical) {
        if (isNumerical) {
            return isLightTheme
                ? { hslMin: [276, 55, 66], hslMax: [212, 100, 82] }
                : { hslMin: [276, 41.25, 19.8], hslMax: [212, 75, 25] }
        } else {
            return isLightTheme
                ? { hslMin: [223, 62, 68], hslMax: [159, 70, 82] }
                : { hslMin: [223, 46.5, 20.4], hslMax: [159, 52.5, 25] }
        }
    }

    const { hslMin, hslMax } = get_HSL_values(localStorage.getItem("theme") == "light", is_num(value));
    
    let scale_value, max;
    if (data.properties[property_id].relative_gradient) {
        scale_value = value_list[property_id].indexOf(value.toString()) / value_list[property_id].length;
        max = 1;
    } else {
        scale_value = value;
        max = (data.properties[property_id].max ?? 17) * (data.properties[property_id].size_factor ?? 1);
    }
    
    let hue, sat, lum;
    if (scale_value >= max) {
        [hue, sat, lum] = hslMax;
    } else {
        hue = scale(scale_value, max, hslMin[0], hslMax[0]);
        sat = scale(scale_value, max, hslMin[1], hslMax[1]);
        lum = scale(scale_value, max, hslMin[2], hslMax[2]);
    }

    let color = `style="background-color: hsl(${hue},${sat}%,${lum}%)!important"`;
    if (class_exists) {
        color = '"' + color;
    }
    return color;
}

function value_parser(value) {
    if(is_num(value)) return value;
    if(typeof value === 'string') {
        // Basic URL parsing:
        const url_regexp = /(https?:\/\/(\w*\.)+\w+\/?[^ ]*)/g;
        value = value.replace(url_regexp, `<a target="_blank" href="$1">$1</a>`);

        // {{abc|arg1}}
        const curly_syntax_regex = /\{\{([^\}]+?)\}\}/g
        value = value.replace(curly_syntax_regex, curly_syntax_handler)
        
        value = value.replace(/\n/g, "<br>\n");
    }
    return value;
}

function curly_syntax_handler(string, args) {
    // console.log(string, JSON.stringify(args));
    args = args.split('|');
    switch(args[0]) {
        case "mapColor":
            return /*html*/`<span class='dot ${args[1]}'></span> ${args[1]}`;
    }
    return string;
}
