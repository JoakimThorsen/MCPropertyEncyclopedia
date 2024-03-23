function load_data(filename) {
    page = document.body.dataset.page;
    entry_header = "Blocks";

    $.ajax({
        'url': '../data/block_data.json',
        'dataType': "json",
        'success': function (d) {
            data_latest = d;
            initialize_page();
        }
    });

    $.ajax({
        'url': '../data/block_data_1.12.json',
        'dataType': "json",
        'success': function (d) {
            data_12 = d;
        }
    });
}

function initialize_page() {

    $('#search').keyup(function(e){
        if(e.keyCode == 13)
        {
            guess(this.value);
        }
    });

    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        var $target = $(this).next();
        $target.toggle("toggle"); // With toggle animation/delay
        // $target.toggle(); // No toggle animation/delay
    });

    countdown();
    function countdown() {
        setTimeout(countdown, 999);
        // 60 * 60 * 24 = 86400
        let time = 86400 - Math.floor(Date.now() / 1000 % 86400);
        let h = time / 60 / 60 | 0;
        let m = time / 60 % 60 | 0;
        let s = time % 60;
        document.getElementById("countdown").innerHTML = h+":"+m+":"+s;
    }
}

function new_game(daily_game = false) {
    if(twelve_mode == true){
        data = data_12;
        $('.twelve').text('1.12 ');
    } else {
        data = data_latest;
        $('.twelve').text('');
    }
    
    $('datalist#blocks').children().remove();
    $('datalist#blocks').append(data.key_list.map(block => `<option value="${block}" />`))

    // Switch to game controls
    $('#start-game').addClass('display-none');
    $('#game-inputs').removeClass('display-none');
    $('#explanation-toggle-button').removeClass('display-none');
    
    // Clear existing header and table body data
    $('#output-table').find('thead>tr>th').remove();
    $('#output-table').find('tbody>tr').remove();
    
    if (localStorage.getItem("Propertydle-hide-explanation") != 'true') {
        $('#about-body').toggle(false);
    }
    $("#countdown-text").addClass('display-none');

    let random;
    if(daily_game) {
        // get current day by dividing unix time by 1000*60*60*24
        // then offset it to 25th of july 2022 because who cares about the 1970s?
        current_day = Math.floor(Date.now() / 86400000 - 19197);
        random = mulberry32(current_day)
        $("#current-day").text(current_day);
        $("#infinite-mode").addClass('display-none');
        $("#daily-mode").removeClass('display-none');
    } else {
        $("#daily-mode").addClass('display-none');
        $("#infinite-mode").removeClass('display-none');
        random = Math.random;
    }
    
    // exclude "variants" and "wiki page" "properties"
    delete data.properties.variants;
    delete data.properties.wiki_page;
    delete data.properties.onenineteen;
    delete data.properties.block_entity_data;
    
    delete data.properties.int_rep;
    delete data.properties.binary_rep;
    delete data.properties.skyblock_obtainable;
    
    delete data.properties.material;
    // delete data.properties.map_color;
    // delete data.properties.instrument;
    delete data.properties.numerical_id;
    
    delete data.properties.instant_shape_updater;
    delete data.properties.instant_block_updater;
    delete data.properties.instant_updater;
    delete data.properties.shape_update_on_interaction;
    delete data.properties.shape_update_from_environment;
    delete data.properties.material;
    delete data.properties.material_is_liquid;
    delete data.properties.material_is_solid;
    delete data.properties.material_blocks_movement;
    delete data.properties.material_is_burnable;
    delete data.properties.material_is_replaceable;
    delete data.properties.material_blocks_light;
    
    Object.keys(data.properties).forEach(key => {
        if(key.startsWith("tag_")) {
            delete data.properties[key];
        }
    })

    // block selection/unique property selector 
    selection: while(true) {
        // random block
        secret_block = data.key_list[(random() * data.key_list.length) | 0];
        var random_order_props = Object.keys(data.properties).map(elem => [elem, random()]).sort((a, b) => a[1] - b[1]).map(elem => elem[0]);
        selection_arr = random_order_props.slice(0,8);
        random_order_props = random_order_props.slice(8, random_order_props.length);

        var prev_unique_solutions = unique_solutions(secret_block, selection_arr).length;
        var max_attempts = random_order_props.length;
        for (let attempts = 0; attempts < max_attempts; attempts++) {
            selection_arr.push(random_order_props.shift());
            
            current_unique_solutions = unique_solutions(secret_block, selection_arr).length;
            if(current_unique_solutions == 1) {
                break selection;
            }
            if(current_unique_solutions == prev_unique_solutions) {
                selection_arr.pop();
            };
            prev_unique_solutions = current_unique_solutions;
        }
    }
    
    selection_arr = selection_arr.map(elem => [elem, random()]).sort((a, b) => a[1] - b[1]).map(elem => elem[0]);

    function unique_solutions(secret_block, selection_arr) {
        var options_left = deepCopy(data.key_list);
        selection_arr.forEach(property_id => {
            var entries = data.properties[property_id].entries;
            var def = data.properties[property_id].default_value;
            var secret_value = get_all_values((entries[secret_block] || [def]), true)
            options_left = options_left.filter(block => {
                var block_value = get_all_values((entries[block] || [def]), true);
                if(secret_value.every(e => block_value.includes(e)) ) {
                    return true;
                }
                return false;
            })

        });
        return options_left;
    }
    
    guesses = [];
    
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
    $('#output-table').children('thead').children('tr').append(`<th></th>
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
        // Option menu (usually a Filter menu)
        sort_mixed_types(value_list[property_id]).forEach(option => {
            // var color = formatting_color(option, property_id, true);
            // TODO: gray for now. I want this to show the colors of all the ones that have been "revealed"/"exposed" or whatever
            if(property_id != 'map_color') {
                var color = `" style="background-color: rgb(50%,50%,50%)!important"`;
            }
            append_data += `<li>
                    <a role="button" class="dropdown-option modify-filter" property="${property_id}" value="${option}">
                    <span class="dot ${color ? color : 'display-none'}"></span>
                    <span class="justify-start">${value_parser(option)}</span>
                    </span></a></li>`
        });
        append_data += `</div></ul></div></th>`;

        $('#output-table').children('thead').children('tr').append(append_data);
    });

    if(!daily_game) {
        var sprite = data.sprites[secret_block] ?? ["block-sprite", -240, -16];
        // $('#sprite-hint').removeClass("display-none");
        $('#sprite-hint').html(`<button class="btn btn-default" onclick="toggle_sprite_hint(this)"><span>Click to reveal sprite hint</span><span class="display-none">Average sprite color:\ \ \ \ </span><span class="sprite unicolor-block-sprite display-none" style="background-position:${sprite[1]}px ${sprite[2]}px"></span></button>`);
    }

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
        var sprite = data.sprites[entry[page]] ?? ["block-sprite", -240, -16];
        append_string += "<tr>";
        append_string += `<td><span class="sprite ${sprite[0]}" style="background-position:${sprite[1]}px ${sprite[2]}px"></span></td>`;
        for(var [property_id, value] of Object.entries(entry)) {
            append_string += get_data_cell(latest_guess, value, property_id);
        };
        append_string += "</tr>";
    });
    $('#output-table').children('tbody').append(append_string);

    // Toggle functionality of 'Expand' buttons 
    $('body').off('click.collapse-next.data-api');
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        const $target = $(this).next();
        $target.toggle();

        let label = $(this).find('td');
        if(label.text() === "Expand...") {
            label.text("Collapse...");
        } else if (label.text() === "Collapse...") {
            label.text("Expand...");
        }
    });
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-siblings]', function (_e) {
        const $target = $(this).siblings();
        $target.toggleClass("display-none");
        
        let label = $(this).find('td');
        if(label.text() === "Expand...") {
            label.text("Collapse...");
        } else if (label.text() === "Collapse...") {
            label.text("Expand...");
        }
    });

    if(latest_guess == secret_block) {
        $('#modalLabel').text(`You did it!`);
        $('#modalBody').text(`You got the answer in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`)
        $('#modal').modal('show');
        $("#countdown-text").removeClass('display-none');
        setTimeout(function () {
            $('#modalButton').focus();
        }, 500);
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

function get_data_cell(latest_guess, entry, property_id, top_level = true) {
    var return_data;
    if(typeof(entry) == 'object' && entry != null) {
        if(top_level && (get_all_values(entry).length > 2 || (Object.keys(entry).join().match(/<br>/g) || []).length > 2)) {
            return_data = `<td class="nested-cell"><a class="expand-btn type="button" data-toggle="collapse-siblings"><table class="table table-bordered nested-table expand-btn"><tbody><tr><td>Expand...</td></tr></tbody></table></a>`
            
            if(get_all_values(entry, true).join("  ").length <= 40) {
                return_data += /*html*/`<table class="table table-bordered table-hover nested-table expandable preview-table">
                    <tbody>
                        <tr>${get_nested_table_contents(latest_guess, sort_mixed_types(get_all_values(entry, true)), property_id, true)}</tr>
                    </tbody>
                </table>`;
            }
            
            return_data += /*html*/`<table class="table table-bordered table-hover nested-table expandable display-none"><tbody>`;
        } else {
            return_data = `<td class="nested-cell"><table class="table table-bordered table-hover nested-table"><tbody>`;
        }
        
        if(Array.isArray(entry)) {
            entry.forEach(value => {
                return_data += `<tr>${get_data_cell(latest_guess, value, property_id, false)}</tr>`;
            });
        } else {
            Object.keys(entry).forEach(key => {
                return_data += `<tr><td>${key}</td>${get_data_cell(latest_guess, entry[key], property_id, false)}</tr>`;
            });
        }
        return_data += "</tbody></table></td>";

    } else {
        return_data = `<td ${formatting_color(latest_guess, entry, property_id)}>${value_parser(entry)}</td>`;
    }
    return return_data;
}

function get_nested_table_contents(latest_guess, nested_data, property_name, horizontal_arr = false) {
    if (Array.isArray(nested_data)) {
        if(horizontal_arr) {
            return nested_data.reduce((acc, sub_entry) => {
                return acc + get_data_cell(latest_guess, sub_entry, property_name, false);
            }, "");
        } else {
            return nested_data.reduce((acc, sub_entry) => {
                return acc + `<tr>${get_data_cell(latest_guess, sub_entry, property_name, false)}</tr>`;
            }, "");
        }
    }
    return Object.keys(nested_data).reduce((acc, key) => {
        return acc + `<tr><td>${key}</td>${get_data_cell(latest_guess, nested_data[key], property_name, false)}</tr>`;
    }, "");
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

function formatting_color(latest_guess, value, property_id) {
    var color = "";
    if(property_id == "block") return "";
    
    property_entries = data.properties[property_id].entries
    
    var secret_value = property_entries[secret_block] ?? data.properties[property_id].default_value ?? "no default";
    if(value == secret_value || JSON.stringify(property_entries[latest_guess]) === JSON.stringify(property_entries[secret_block])) {
        color = `class="cf-yes"`;
        
    } else if(get_all_values(secret_value).includes(value)) {
        color = `class="cf-neutral"`;

    } else if(value*1 == value && get_all_values(secret_value).some(v => v*1 == v)){
        if(get_all_values(secret_value).every(v => v > value || v*1 != v)) {
            color = `class="lowercolor"`; // lower
        }
        if(get_all_values(secret_value).every(v => v < value || v*1 != v)) {
            color = `class="highercolor"`; // higher
        }
        if(get_all_values(secret_value).some(v => v < value || v*1 != v) && get_all_values(secret_value).filter(v => !isNaN(v)).some(v => v > value || v*1 != v)) {
            color = `class="inbetweencolor"`; // in between
        }

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

function toggle_sprite_hint(button) {
    $(button).children().toggleClass("display-none");
}

function save_explanation() {
    let hidden = localStorage.getItem("Propertydle-hide-explanation") == 'true';
    
    localStorage.setItem("Propertydle-hide-explanation", !hidden)
}

function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function value_parser(value) {
    if(typeof value === 'string') {
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
            return `<span class='dot ${args[1]}'></span> ${args[1]}`;
    }
    return string;
}
