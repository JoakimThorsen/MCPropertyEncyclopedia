
var block_data;
var value_list = {};
urlParams = new URLSearchParams(window.location.search);
var filter_obj = JSON.parse(urlParams.get("filter")) ?? {};
var sort_arr = JSON.parse(urlParams.get("sort")) ?? [];

$.ajax({
'url': "block_data.json",
'dataType': "json",
'success': function (data) {
    block_data = data;
    display_headers();
    display_results();
}});

function display_headers() {
    
    $('#output_table').find('thead>tr>th').remove();
    
    // Add all unique values to a list of possible values for each property (recursively so for objects)
    Object.keys(block_data.properties).forEach(property => {
        value_list[property] = [];
        value_list[property].push(block_data.properties[property].default);
        add_value(value_list[property], block_data.properties[property].entries);
    });
    function add_value(list, property) {
        Object.values(property).forEach(entry => {
            if(typeof(entry) == 'object') { 
                add_value(list, entry);
            } else if(!list.includes(entry)){
                list.push(entry);
            }
        });
    }
    

    // Table headers
    $('#output_table').children('thead').children('tr').append(`<th><div class=\" dropdown\"><a class="table-header dropdown-toggle justify-start" data-toggle="dropdown">Blocks<span class="icons">
    <span class="glyphicon glyphicon-triangle-bottom"></span>
    <span class="glyphicon glyphicon-sort-by-attributes" style="${sort_arr.some(e => e.property === "blocks") && !sort_arr.filter(e => e.property === "blocks")[0].reversed ? 'display:inline-block':'display:none'}"></span>
    <span class="glyphicon glyphicon-sort-by-attributes-alt" style="${sort_arr.some(e => e.property === "blocks") && sort_arr.filter(e => e.property === "blocks")[0].reversed ? 'display:inline-block':'display:none'}"></span>
    </span></a><ul class="dropdown-menu"><li><a class="dropdown-option" property="block">Toggle sorting</a></li></ul></div></th>`);
    Object.keys(block_data.properties).forEach(property => {
        append_data = "";
        
        append_data = `<th><div class="dropdown"><a class="table-header dropdown-toggle justify-start" data-toggle="dropdown">
                ${block_data.properties[property].property_name}
                <span class="icons">
                <span class="glyphicon glyphicon-triangle-bottom"></span>
                <span class="glyphicon glyphicon-sort-by-attributes" style="${sort_arr.some(e => e.property === property) && !sort_arr.filter(e => e.property === property)[0].reversed ? 'display:inline-block':'display:none'}"></span>
                <span class="glyphicon glyphicon-sort-by-attributes-alt" style="${sort_arr.some(e => e.property === property) && sort_arr.filter(e => e.property === property)[0].reversed ? 'display:inline-block':'display:none'}"></span>
                </span></a><ul class="dropdown-menu"><li><a class="dropdown-option" property="${property}">Toggle sorting</a></li><li role="separator" class="divider"></li>`;

        value_list[property].sort().sort((a, b) => (a - b)).forEach(option => {
            append_data += `<li><a role="button" class="dropdown-option" property="${property}" value="${option}">${option}<span class="glyphicon glyphicon-ok" style="${filter_obj[property] !== undefined && filter_obj[property].includes(option) ? 'display:none':'display:inline-block'}"></span></a></li>`
        });
        append_data += `</ul></div></th>`;
        
        $('#output_table').children('thead').children('tr').append(append_data);
        
        // <th>
        //     <div class="dropdown">
        //         <a class="table-header dropdown-toggle" data-toggle="dropdown">
        //             [JavaScript: property.property_name]
        //             <span class="glyphicon glyphicon-triangle-bottom"></span>
        //         </a>
        //         <ul class="dropdown-menu">
        //             <li><a class="dropdown-option" property="e.g. hardness">Toggle sorting</a></li>
        //             <li role="separator" class="divider"></li>
        //             <li><a class="dropdown-option" property="e.g. hardness" value="1">1</a></li>
        //             <li><a class="dropdown-option" property="e.g. hardness" value="2">2</a></li>
        //             <li><a class="dropdown-option" property="e.g. hardness" value="3">3</a></li>
        //             <li><a class="dropdown-option" property="e.g. hardness" value="4">4</a></li>
        //         </ul>
        //     </div>
        // </th>
    });

    $('.dropdown-option').click(function (e) {
    
        e.stopPropagation();
        if($(this).attr("value")!=undefined) {
            modify_filter($(this).attr("property"), $(this).attr("value"),$(this));
        } else {
            modify_sort($(this).attr("property"), $(this));
        }
        display_results();
    });

    function modify_filter(property, value, jQuerythis) {
        jQuerythis.children().attr('style', function(_, attr){
            return attr == 'display:none' ? 'display:inline-block' : 'display:none';
        });

        // Convert to double if applicable
        value = (value*1 == value) ? value*1 : value;
        if(!Object.keys(filter_obj).includes(property)) { filter_obj[property] = []; }

        if(filter_obj[property].includes(value)) {
            filter_obj[property].splice(filter_obj[property].indexOf(value), 1);
        } else {
            filter_obj[property].push(value);
        }
        if(filter_obj[property].length == 0) { delete filter_obj[property]; }
        window.history.pushState("", "", window.location.origin + window.location.pathname + "?filter=" + JSON.stringify(filter_obj) + "&sort=" + JSON.stringify(sort_arr));
    }

    function modify_sort(property, jQuerythis) {

        if(sort_arr.some(e => e.property === property)) {
            if(!sort_arr.filter(e => e.property === property)[0].reversed) {
                // If already filtered normally: reverse it
                sort_arr[sort_arr.findIndex(e => e.property === property)].reversed = true;
            } else {
                // If already filtered reverse: remove it
                sort_arr.splice(sort_arr.findIndex(e => e.property === property), 1);
            }
        } else {
            sort_arr.push({"property":property,"reversed":false});
        }
        window.history.pushState("", "", window.location.origin + window.location.pathname + "?filter=" + JSON.stringify(filter_obj) + "&sort=" + JSON.stringify(sort_arr));
        // slightly lazy:
        display_headers();
        display_results();
    }
}

function display_results() {
    $('#output_table').find('tbody>tr').remove();
    
    // Table data
    output_data = [];

    // Filtering
    block_data.block_list.forEach(entry => {
        var block = {"block": entry};
        var filtered = false;
        for(var [property_id, property] of Object.entries(block_data.properties)) {

            if(typeof property.entries[entry] == 'object' & Object.keys(filter_obj).includes(property_id)) {
                block[property_id] = {};
                Object.keys(property.entries[entry])
                    .filter(variant => !filter_obj[property_id].includes(property.entries[entry][variant]))
                    .forEach(variant => {
                        block[property_id][variant] = property.entries[entry][variant];
                    });
                
                // These could maybe be combined?
                if(Object.keys(block[property_id]).length == 0) { 
                    filtered = true;
                    break;
                }
            // These could maybe be combined?
            } else if ((filter_obj[property_id] || []).includes((property.entries[entry] ?? property.default))){
                filtered = true;
                break;
            } else {
                block[property_id] = property.entries[entry] ?? property.default;
            }
        }
        if(!filtered) {
            output_data.push(block);
        }
    })

    // function filterBy(list, criteria) {
    //     return list.filter(candidate =>
    //         Object.keys(criteria).every(key =>
    //             !criteria[key].includes(candidate[key])
    //         )
    //     );
    // }    
    
    // output_data = filterBy(output_data, filter_obj);

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

    function sort_properties(data, sort_properties) {
        console.log(sort_properties);
        if(!sort_properties.length) {
            return data;
        }

        // Split
        let split_data = [];
        data.forEach(data_elm => {
            let split_elements = [ deepCopy(data_elm) ];
            
            sort_properties.forEach(property_map => {
                let property = property_map.property;
                let split_element_next = [];
                
                // Loop trough all currently split elements
                split_elements.forEach(val => {
                    let picked_element = val[property];
                    if (typeof picked_element == 'object') {
                        for(let [ key, value ] of Object.entries(picked_element)) {
                            let val_copy = deepCopy(val);
                            val_copy[property] = { [key]: value };
                            split_element_next.push(val_copy);
                        }
                    } else {
                        split_element_next.push(deepCopy(val));
                    }
                });
                
                split_elements = split_element_next;
            });
            
            split_data = split_data.concat(split_elements);
        }); 

        // Sort 
        sort_properties.reverse().forEach(property_entry => {
            let property = property_entry.property;
            let reversed = property_entry.reversed;
            split_data.sort((a, b) => {
                let val_0 = (reversed ? b:a)[property];
                let val_1 = (reversed ? a:b)[property];
                
                if (typeof val_0 == 'object') {
                    for (let prop in val_0) {
                        val_0 = val_0[prop];
                        break;
                    }
                }
                
                if (typeof val_1 == 'object') {
                    for (let prop in val_1) {
                        val_1 = val_1[prop];
                        break;
                    }
                }
                
                let result = 0;
                if (typeof val_0 == 'string' || typeof val_1 == 'string') {
                    result = val_0.toString().localeCompare(val_1.toString(), undefined, {numeric: true, sensitivity: 'base'});
                } else {
                    result = val_0 > val_1 ? 1: (val_0 == val_1 ? 0:-1);
                }

                return result;
            });
        });

        // sort().sort((a, b) => a - b) should deal with both strings and ints.

        // batch, and run recursive_sort() on each batch
        return split_data;
    }
    output_data = sort_properties(output_data, sort_arr);
    
    // Table outputting
    output_data.forEach(entry => {
        var append_string = "<tr>";
        for(var [property_name, value] of Object.entries(entry)) {
            if(typeof(value) == 'object') {
                append_string += "<td class=\"nested-cell\">" + nested_table(value); + "</td>";
            } else {
                append_string += formatted_cell(value ?? block_data.properties[property_name].default);
            }
        };
        append_string += "</tr>";
        $('#output_table').children('tbody').append(append_string);
    });
    
    // Toggle functionality of 'Expand' buttons
    $('body').off('click.collapse-next.data-api');
    $('body').on('click.collapse-next.data-api', '[data-toggle=collapse-next]', function (_e) {
        var $target = $(this).next();
        // Not sure which one I prefer:
        // $target.toggle("toggle"); // With toggle animation/delay
        $target.toggle(); // No toggle animation/delay
    });

    function nested_table(entry) {
        if(Object.values(entry).length > 2 || (Object.keys(entry).join().match(/<br>/g) || []).length > 2) {
            return_data = "<button class=\"btn collapse in\" type=\"button\" data-toggle=\"collapse-next\">Expand</button>\n<table class=\"table table-bordered table-hover nested-table collapse\"><tbody>";
        } else {
            return_data = "<table class=\"table table-bordered table-hover nested-table\"><tbody>";
        }
        
        Object.keys(entry).forEach(key=> {
            return_data += "<tr><td>" + key + "</td>" + formatted_cell(entry[key]) + "</tr>";
        });
        return_data += "</tbody></table>";
        return return_data;
    }

    function formatted_cell(value) {
        let color;
        if(value*1==value){ 
            // color = block_data.conditional_formatting["!numeric"];
            function scale (number, inMin, inMax, outMin, outMax) {
                return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
            }
            // not the greatest solution...
            value = value*1;
            
            color = `rgb(${scale(value, 1, 16, 81, 208)},${scale(value, 1, 16, 122, 235)},${scale(value, 1, 16, 198, 251)})!important`
        }
        else if(value in block_data.conditional_formatting){
            color = block_data.conditional_formatting[value]; 
        }
        return "<td" + (color ? " style=\"background-color: " + color + "\">" : ">") + value + "</td>"; 
    }

    
}
