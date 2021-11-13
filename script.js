
var block_data;
var value_list = {};
urlParams = new URLSearchParams(window.location.search);
var filter_obj = JSON.parse(urlParams.get("filter")) ?? {};

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
    $('#output_table').children('thead').children('tr').append("<th><div class=\" dropdown table-header\">Blocks</div></th>");
    Object.keys(block_data.properties).forEach(property => {
        append_data = "";
        
        append_data = `<th><div class="dropdown"><a class="table-header dropdown-toggle" data-toggle="dropdown">`;
        append_data += block_data.properties[property].property_name;
        append_data += `<span class="glyphicon glyphicon-triangle-bottom"></span></a><ul class="dropdown-menu" aria-labelledby="dropdownMenu1">`;
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
        //         <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">
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
        $(this).children().attr('style', function(_, attr){
            return attr == 'display:none' ? 'display:inline-block' : 'display:none';
        });
        modify_filter($(this).attr("property"), $(this).attr("value"));
        display_results();
    });

    function modify_filter(property, value) {
        // Convert to double if applicable
        value = (value*1 == value) ? value*1 : value;
        if(!Object.keys(filter_obj).includes(property)) { filter_obj[property] = []; }

        if(filter_obj[property].includes(value)) {
            filter_obj[property].splice(filter_obj[property].indexOf(value), 1);
        } else {
            filter_obj[property].push(value);
        }
        if(filter_obj[property].length == 0) { delete filter_obj[property]; }
        window.history.pushState("", "", window.location.origin+window.location.pathname+"?filter="+JSON.stringify(filter_obj));
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
            color = block_data.conditional_formatting["!numeric"];
        }
        else if(value in block_data.conditional_formatting){
            color = block_data.conditional_formatting[value]; 
        }
        return "<td" + (color ? " bgcolor=\"" + color + "\">" : ">") + value + "</td>"; 
    }
}




  
