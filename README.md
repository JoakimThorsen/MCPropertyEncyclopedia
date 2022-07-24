# The Minecraft Property Encyclopedia
**(the name is still being debated. ~~Felt cute might change later~~)*  
A comprehensive repository of information about blocks, entities and items, compiled in a powerful and easy-to-use online tool.  
The website can be found at [https://JoakimThorsen.github.io/MCPropertyEncyclopedia](https://JoakimThorsen.github.io/MCPropertyEncyclopedia).

## Discord!
There exists a public discord server (mostly) dedicated to this project at [https://discord.gg/RUEVmTahYg](https://discord.gg/RUEVmTahYg), which is the main place to go for updates, discussion, suggestions, corrections and questions :)

Additions, corrections and suggestions via pull requests and reports on the issue tracker are also welcome.

## A Note of caution
This project is in-development by a small group of volunteers. Some properties are either not yet automated, or are virtually impossible to automate, and are therefore manually curated. This means that some of the information may be incomplete, or even incorrect, despite the efforts of our contributors. Again, corrections and suggestions welcome :)

For the full list of contributors, make sure to check out the [About Page](https://JoakimThorsen.github.io/MCPropertyEncyclopedia/about.html).

## Joa mama
In order to effectivize the compiling of different properties, ensure accuracy, and speed up the updating of the website's information for new game versions, a mod named [Joa mama](https://github.com/JoakimThorsen/joa-mama) is being developed in order to extract the properties from the game code directly, though solely focused on blocks for the time being. It works by checking every block in the registry against each property, and compiles a list of the results of each check. This is then converted to the format described below via an external tool. Originally developed by bldhf, later forked by JoaBro

## Technical details
The project is hosted through GitHub Pages. It operates entirely clientside and written in vanilla js, with [jQuery 3.6](https://jquery.com/) and [Bootstrap 3.3.7](https://getbootstrap.com/docs/3.3/) being used for the interface. Most icons used are from [Font Awesome](https://fontawesome.com/).  

The data is currently being stored in JSON files under `data/<thing>_data.json` which all follow this current format:
```
*the root tag* {Obj}
│   
├─"conditional_formatting": {Obj}
│   └─ <*value>: (Str): The CSS formatting class to apply to the cell with this value.
│
├─"key_list": [Arr]
│   └─ <*entry key>: a list of every block/entity/item, depending on the page.
│
├─"sprites": {Obj} 
│   └─ <*entry key>: [Arr]
│       ├─ 0: (Str): a "sprite type" that specifies which sprite sheet to use for this sprite icon. Options are: "block-sprite", "entity-sprite", "item-sprite".
│       ├─ 1: (Int): x-offset of the sprite on the sprite sheet.
│       └─ 2: (Int): y-offset of the sprite on the sprite sheet.
│
├─"property_structure": [Arr]
│   ├─ <*property_id>
│   └─ {*Obj}
│       ├─ "category": (Str): the name of the category/folder that shows up in the selection dropdown.
│       └─ "contents": [Arr]
│           └─ ... more IDs and categories, nested recursively.
│
└─"properties": {Obj}
    └─ <*property_id>: {Obj}
        ├─ "property_name": (Str): the name that shows up on headers and in the selection menu. 
        ├─ "property_description": (Str): the description that shows up under the table header's "Description..." section.
        ├─ "default_value": (Str)|(Int)|null: the value to use if a block/entity/item is not listed in "entries".
        ├─ (optional) "default_selection": true|false: whether this shows up in the default selection when you first visit the page.
        ├─ (optional) "relative_gradient": true|false: used to enable relative gradient coloring, where values are colored relative to their position in the value/filter list.
        ├─ (optional) "size_type": (Str): determines the unit used, in order to allow for unit conversion. Options are: "block", "pixel".
        ├─ (optional) "max": (Int): The highest value to use as the "cap" for number colors.
        └─ "entries": [Arr]
            ├─ <*entry key>: (Int)|(Float)|(String): A standard value.
            ├─ <*entry key>: {Obj}
            │   └─ <*state/variant/other>: (Any): An object is used when different variants or states of any one entry have different values. Objects and arrays can be nested for further specificity.
            └─ <*entry key>: [Arr]
                └─ (Any): An array of values is used when there are multiple correct values for a given property. Value Arrays seldom contain objects or other arrays.
```
