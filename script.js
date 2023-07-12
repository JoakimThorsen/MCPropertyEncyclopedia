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
let page, entry_header, exportable_list, exportable_data;

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

    $.ajax({
        'url': filename,
        'dataType': "json",
        'success': function (d) {
            data = d;
            initialize_page();
        }
    });
}

let dataProcessor, headerOutputter, tableBodyGenerator, getClosestLevDistFromList;
async function initialize_page() {
    ({ dataProcessor } = await import('./assets/js/dataProcessor.mjs'));
    ({ headerOutputter, tableBodyGenerator } = await import('./assets/js/outputHandler.mjs'));
    ({ getClosestLevDistFromList } = await import('./assets/js/dataUtilities.mjs'));

    if(!localStorage.getItem('theme')) {
        localStorage.setItem('theme', window?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
    if(localStorage.getItem('theme') === 'dark') {
        $('#dark-mode-toggle').children().toggleClass('display-none');
    }

    if (!localStorage.getItem("MCProperty-discord-promoted")) {
        $(".shameless-self-promo").removeClass("display-none")
    }
    
    $(window).on('popstate', function () {
        location.reload(true);
    });

    window.onerror = function (msg, url, lineNo, columnNo, error) {
        if(settings_obj['debug']) {
            alert("ERROR:\n" + JSON.stringify({msg, url, lineNo, columnNo, error}, undefined, ' '));
        }
    };

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
        if(rerender !== "false") {
            display_headers_and_table();
        }
        update_window_history();
    });

    $('#search').val(search);
    $('#search').on('input', function () {
        let override_history = Boolean(search);
        search = $(this).val();
        update_window_history(override_history);
        display_results();
    });

    $('#selection-search').on('input', function () {
        display_selection_search(this.value);
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
        if(typeof data.properties?.variants === 'undefined'
        || (selection_arr.length === 1 && selection_arr.includes('variants'))) {
            selection_arr = [];
        } else {
            selection_arr = ['variants'];
        }
        update_window_history();
        display_selection();
        display_headers_and_table();
    });

    display_selection();
    
    if(selection_arr.some(prop => !Object.keys(data.properties).includes(prop))) {
        make_popup(
            "Invalid selection",
            `The selection you have specified [${selection_arr.join(', ')}] is invalid. The following properties were not recognized: <ul>`
                + selection_arr.filter(prop => !Object.keys(data.properties).includes(prop)).map(unknown_prop => {
                    const found_prop = getClosestLevDistFromList(unknown_prop, Object.keys(data.properties));
                    return `<li>'${unknown_prop}': Did you mean '${found_prop}'? <a class="found-prop-correction" unknown-property="${unknown_prop}" found-property="${found_prop}" role="button" style="text-decoration: underline">Yes</a> </li>`;
                }).join('') +
            "</ul>"
        );
        $('.found-prop-correction').click(function (e) {
            e.stopPropagation();
            const unknown_prop = $(this).attr("unknown-property");
            const found_prop = $(this).attr("found-property");
            selection_arr = selection_arr.map(prop => prop === unknown_prop ? found_prop : prop);
    
            update_window_history();
            location.reload(true);
        });
    }

    display_headers_and_table();

}


function make_popup(title, content) {
    let html = /*html*/`<div class="panel panel-default popup-panel collapse in">
        <div class="panel-heading">
            ${title}
            <a role="button" style="float:right; color:gray" onclick="$(this).parent().parent().collapse('hide');">X</a>
        </div>
        <div class="panel-body">
            ${content}
        </div>
    </div>`;
    $('#popups').append(html);
}

function display_selection() {
    $('#selection').children('li').remove();
    if (selection_arr === null) {
        selection_arr = [];
        if(data.default_selection !== undefined) {
            selection_arr = data.default_selection;
        } else {
            for (let [property_name, value] of Object.entries(data.properties)) {
                if (value.default_selection ?? false) {
                    selection_arr.push(property_name);
                }
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

    if(selection_search !== "") {
        display_selection_search(selection_search);
    }

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
                'max-height': '600rem',
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

}
let selection_search = "";
function display_selection_search(_selection_search = selection_search) {
    selection_search = _selection_search.toLowerCase();
    if(selection_search == "") {
        $('.custom-collapsible').css({
            'display': 'none',
            'max-height': 0,
            'opacity': 0,
        });
        $('.custom-collapsible').removeClass('submenu-open');
    } else {
        $('.custom-collapsible').css({
            'display': 'block',
            'max-height': '300rem',
            'opacity': 1,
        });
        $('.custom-collapsible').addClass('submenu-open');
    }
    $('#selection').children('li').each(function () {
        if (matchesSearch(this, selection_search)) {
            $(this).removeClass('display-none');
        } else {
            $(this).addClass('display-none');
        }
    });
}

function matchesSearch(element, selection_search) {
    if ($(element).hasClass('custom-submenu')) {
        let matches = false;
        $(element).children('ul').children('li').each(function () {
            if (matchesSearch(this, selection_search)) {
                matches = true;
            }
        });
        if(matches) {
            $(element).removeClass('display-none');
        } else {
            $(element).addClass('display-none');
        }
        return matches;
    } else {
        let matches = $(element).children('a').attr('property')?.toLowerCase()?.includes(selection_search) ||
                      $(element).children('a').text().toLowerCase().includes(selection_search);
        if(matches) {
            $(element).removeClass('display-none');
        } else {
            $(element).addClass('display-none');
        }
        return matches;
    }
}

// This functions only handles headers, but calls display_results()
function display_headers_and_table() {

    headerOutputter(page, entry_header);
    
    display_results();
}

// Displays all the table data
function display_results() {
    $('#output-table').find('tbody>tr').remove();

    // Table data
    let { output_data, exportable_list: _list, exportable_data: _data, entry_count } = dataProcessor(data, selection_arr.filter(prop => Object.keys(data.properties).includes(prop)), sort_arr, filter_obj, search, page);

    exportable_list = _list;
    exportable_data = _data;
    
    $('#entry_count').html(entry_count);

    // Table outputting
    let table_body_contents = tableBodyGenerator(output_data, page, search);
    $('#output-table').children('tbody').append(table_body_contents);

    // Toggle functionality of 'Expand' buttons 
    $('body').off('click.collapse-next.data-api');
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        const $target = $(this).next();
        // Not sure which one I prefer:
        // $target.toggle("toggle"); // With toggle animation/delay
        // $target.toggle(); // No toggle animation/delay
        $target.toggleClass("display-none"); // uses a class instead
    });
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-siblings]', function (_e) {
        const $target = $(this).siblings();
        // Not sure which one I prefer:
        // $target.toggle("toggle"); // With toggle animation/delay
        // $target.toggle(); // No toggle animation/delay
        $target.toggleClass("display-none"); // uses a class instead
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
        if (isNum(a) && isNum(b)) {
            return a - b;
        } else if (isNum(b)) {
            return -1;
        } else if (isNum(a)) {
            return 1;
        } else {
            return (a < b ? -1 : (a > b ? 1 : 0));
        }
    });
}

function scale(number, inMax, outMin, outMax) {
    // Minimum in value is assumed to be 0
    return Math.round(((number) * (outMax - outMin) / (inMax) + outMin) * 100) / 100;
}

function update_window_history(override_history = false) {
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
        // url += "&filter=" + serialize_custom_url(filter_obj);
        let filter_str = serialize_custom_url(
            Object.fromEntries(
                Object.entries(filter_obj)
                    .filter(([property_id, _]) => selection_arr.includes(property_id)
            )));
        if(filter_str) {
            url += "&filter=" + filter_str;
        }
    }
    if (sort_arr.length > 0) {
        url += "&sort=" + sort_arr.map(obj => obj.reversed ? '!' + obj.property : obj.property);
    }
    
    if (search.length > 0) {
        url += "&search=" + search;
    }

    if (url !== "") {
        url = '?' + url.substr(1) + '#';
    }
    url = window.location.origin + window.location.pathname + url;

    if(override_history) {
        window.history.replaceState("", "", url);
    } else {
        window.history.pushState("", "", url);
    }
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
function parse_custom_url(value, fallback) {
    if (value === '' || value === null || value === undefined) {
        return fallback;
    }
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
    // if (isNum(value)) {
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

function stopPromo(popup_type = "MCProperty-discord-promoted") {
    localStorage.setItem(popup_type, true)
}

function toggleTheme() {
    let theme;
    switch (localStorage.getItem('theme')) {
        case 'dark':
            theme = 'light';
            break
        case 'light':
            theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    $('#dark-mode-toggle').children().toggleClass('display-none');
}

function highlightSearchString(input, search) {
    if(Array.isArray(input)) {
        return input.map(v => highlightSearchString(v, search));
    }
    if(typeof input === 'object') {
        for (let key of Object.keys(input)) {
            input[key] = highlightSearchString(input[key], search);
        }
        return input;
    }
    if(typeof input === 'undefined') return undefined;
    search.split(' ')
        .filter(e => e !== '')
        .forEach(search_term => {
            input = input.replace(new RegExp(search_term, "ig"), '{$&}');
        });
    input = input.replace(/{/g, '<span class="search-highlight">').replace(/}/g, '</span>');
    return input;
}

function isNum(val){
    if(val === "") return false;
    return !isNaN(val)
}
