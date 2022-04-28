function load_data(filename) {
    page = document.body.dataset.page;
    entry_header = "Blocks";

    $.ajax({
        'url': filename,
        'dataType': "json",
        'success': function (d) {
            data = d;
            initialize_page();
            new_game();
        }
    });
}

function initialize_page() {
    $('datalist#blocks').append(data.key_list.map(block => `<option value="${block}" />`))

    $('#search').keyup(function(e){
        if(e.keyCode == 13)
        {
            guess(this.value);
        }
    });
}

function new_game() {
    
    // Clear existing header and table body data
    $('#output_table').find('thead>tr>th').remove();
    $('#output_table').find('tbody>tr').remove();
    
    // random block
    secret_block = data.key_list[(Math.random() * data.key_list.length) | 0];
    guesses = [];

    // select 10 random properties, but exclude variants
    delete data.properties.variants;
    selection_arr = Object.keys(data.properties).sort(() => .5 - Math.random()).slice(0,10)
    
    value_list = {};
    Object.entries(data.properties)
        .filter(([property_name, _]) => selection_arr.includes(property_name))
        .forEach(([property_name, property]) => {
            if(property.default_value != null) {
                values = [property.entries, property.default_value];
            } else {
                values = property.entries;
            }
            value_list[property_name] = get_all_values(values, true);
        }
    );

    // Add table headers
    $('#output_table').children('thead').children('tr').append(`<th></th>
    <th><div class="dropdown"><a class="table-header dropdown-toggle justify-start" data-toggle="dropdown">${entry_header}</a></div></th>`);

    selection_arr.forEach(property_id => {
        
        // Header and dropdown
        // Header and dropdown buttons
        append_data = `<th><div class="dropdown noselect"><a property="${property_id}" class="table-header dropdown-toggle justify-start noselect" data-toggle="dropdown">
                ${data.properties[property_id].property_name}
                <span class="icons">
                <span class="glyphicon glyphicon-triangle-bottom"></span>
                </span></a><ul class="dropdown-menu">`;
        
        if(typeof data.properties[property_id].property_description !== 'undefined') {
            append_data += `<li class="dropdown-submenu">
                        <a role="button" class="description-button">Description...</a>
                        <ul class="dropdown-menu">
                            <p>${data.properties[property_id].property_description}</p>
                        </ul>
                    </li>`;
        }
        append_data += `<li class="divider"></li><div class="dropdown-scrollable">`;

        filter_obj = {}
        // ~~"Filter" menu~~ -> option menu
        sort_mixed_types(value_list[property_id]).forEach(option => {
            // var color = formatting_color(option, property_id, true);
            // TODO: gray for now. I want this to show the colors of all the ones that have been "revealed"/"exposed" or whatever
            var color = `" style="background-color: rgb(50%,50%,50%)!important"`;
            append_data += `<li>
                    <a role="button" class="dropdown-option modify-filter" property="${property_id}" value="${option}">
                    <span class="dot ${color ? color : 'display-none'}"></span>
                    <span class="justify-start">${option}</span>
                    </span></a></li>`
        });
        append_data += `</div></ul></div></th>`;

        $('#output_table').children('thead').children('tr').append(append_data);
    });

    var sprite = data.sprites[secret_block];
    
    $('#sprite-hint').html(`Average sprite color: \ \ \ \ <span class="sprite unicolor-block-sprite" style="background-position:${sprite[1]}px ${sprite[2]}px"></span>`);

}

function guess(latest_guess) {
    latest_guess = data.key_list[data.key_list.map(e => e.toLowerCase()).indexOf(latest_guess.toLowerCase())]
    if(!data.key_list.map(e => e.toLowerCase()).includes(latest_guess.toLowerCase())) {
        alert("Invalid input! Watch your capitalization, or use the option list.")
    }
    guesses.push(latest_guess);
    $('#search').val('');

    // Table data
    output_data = [];

    // "pivoting" (from data to output_data)
    [latest_guess].forEach(entry => {
        var output_entry = {[page]: entry};
        for(var property_id of selection_arr) {
            var property = data.properties[property_id]
            var selected_element = property.entries[entry];
            var size_factor = property.size_factor ?? 1;
            
            function pivot_element(input_element) {
                if(typeof input_element == 'object') {
                    if(Array.isArray(input_element)) {
                        var output_arr = [];

                        input_element.forEach(element => {
                            var value = pivot_element(element);
                            if(value != undefined) {
                                output_arr.push(value);
                            }
                        });
                        if(output_arr.length == 0) {
                            return;
                        }
                        return output_arr;
                    } else {
                        var output_obj = {};
                        Object.keys(input_element).forEach(variant => {
                            var value = pivot_element(input_element[variant]);
                            if(value != undefined) {
                                output_obj[variant] = pivot_element(input_element[variant]);
                            }
                        });
                        if(Object.keys(output_obj).length == 0) { 
                            return;
                        }
                        return output_obj;
                    }
                } else {
                    input_element = input_element ?? property.default_value ?? "No defualt value has been assigned.";
                    if(input_element*1==input_element) {
                        input_element *= size_factor;
                    }
                    return input_element;
                    
                }
            }
            
            output_entry[property_id] = pivot_element(selected_element);
            
        }
        output_data.push(output_entry);
    });

    // Table outputting
    var append_string = "";
    output_data.forEach(entry => {
        var sprite = data.sprites[entry[page]];
        append_string += "<tr>";
        append_string += `<td><span class="sprite ${sprite[0]}" style="background-position:${sprite[1]}px ${sprite[2]}px"></span></td>`;
        for(var [property_id, value] of Object.entries(entry)) {
            append_string += get_data_cell(latest_guess, value, property_id);
        };
        append_string += "</tr>";
    });
    $('#output_table').children('tbody').append(append_string);

    $('body').off('click.collapse-next.data-api');
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        var $target = $(this).next();
        // Not sure which one I prefer:
        $target.toggle("toggle"); // With toggle animation/delay
        // $target.toggle(); // No toggle animation/delay
    });
    $('#output_table').on( 'column-reorder.dt', function () {
        reorder_selection_arr();
        update_window_history();
    } );

    if(latest_guess == secret_block) {
        alert('You did it!')
    }
}
function deepCopy(obj) {
    if(Array.isArray(obj)) {
        let result = [];
        
        for(let index in obj) {            
            result.push(deepCopy(obj[index]));
        }
        
        return result;
    } else if(typeof obj == 'object') {
        let result = {};
        
        for(let [key, value] of Object.entries(obj)) {
            result[key] = deepCopy(value);
        }
        
        return result;
    }
    
    return obj;
}

function get_data_cell(latest_guess, entry, property_name, top_level = true) {
    var return_data;
    if(typeof(entry) == 'object' && entry != null) {
        if(top_level && (get_all_values(entry).length > 2 || (Object.keys(entry).join().match(/<br>/g) || []).length > 2)) {
            return_data = `<td class="nested-cell"><button class="btn expand-btn" type="button" data-toggle="collapse-next">Expand</button>\n<table class="table table-bordered table-hover nested-table collapse"><tbody>`;
        } else {
            return_data = `<td class="nested-cell"><table class="table table-bordered table-hover nested-table"><tbody>`;
        }
        
        if(Array.isArray(entry)) {
            entry.forEach(value => {
                return_data += `<tr>${get_data_cell(latest_guess, value, property_name, false)}</tr>`;
            });
        } else {
            Object.keys(entry).forEach(key => {
                return_data += `<tr><td>${key}</td>${get_data_cell(latest_guess, entry[key], property_name, false)}</tr>`;
            });
        }
        return_data += "</tbody></table></td>";

    } else {
        return_data = `<td ${formatting_color(latest_guess, entry, property_name)}>${entry}</td>`;
    }
    return return_data;
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

function formatting_color(latest_guess, value, property_name) {
    var color = "";
    if(property_name == "block") return "";
    
    property_entries = data.properties[property_name].entries
    
    guess_value = property_entries[secret_block] ?? data.properties[property_name].default_value ?? "no default";
    if(value == guess_value || JSON.stringify(property_entries[latest_guess]) === JSON.stringify(property_entries[secret_block])) {
        // console.log("match!", value, guess_value)
        color = `class="cf-yes"`;
    } else if(get_all_values(guess_value).includes(value)) {
        // console.log("match!", value, guess_value)
        color = `class="cf-neutral"`;
    } else {
        // console.log("no match!", value, guess_value)
        color = `class="cf-no"`;
    }
    return color;
}

function get_all_values(input, unique_only = false) {
    if (typeof input == 'object') {
        var return_arr = [];
        for (let value in input) {
            return_arr = return_arr.concat(...get_all_values(input[value]));
        }
        if(unique_only) {
            return_arr = [...new Set(return_arr)]
        }
        return return_arr;
    } else {
        return [input];
    }
}
