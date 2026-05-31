import json
from argparse import ArgumentParser, FileType
from collections import defaultdict, Counter
from typing import Any

import asyncio

import sprites

# EXAMPLE USAGE:
# `python preprocess.py -i ..\outputs\output_blockstate.json -o ..\data\block_data_experimental.json -p ..\data\block_data.json -t block`

def preprocess(property_data: dict):

    # remap names from namespaced entry id to english translated names
    if "translated_name" not in property_data.keys():
        print("No name translations present...")
    else:
        print("Translating names")
        mapping = property_data["translated_name"]["entries"].copy()
        for prop in property_data.values():
            for untranslated_key in prop["entries"].copy().keys():
                translated_name = mapping.get(untranslated_key, property_data["translated_name"].get("default_value", f"untranslated name: {untranslated_key}"))
                assert isinstance(translated_name, str), f"Translated name was not valid: {translated_name}"
                prop["entries"][translated_name] = prop["entries"].pop(untranslated_key)

    print(f"Processing {len(property_data)} properties")
    # process the values within each property
    for prop in property_data.values():
        entries: dict[str, str|int|float|bool|list[Any]|dict[str, Any]] = prop["entries"]

        default_val = prop.get("default_value") # or Counter(prop["entries"].values()).most_common(1)[0][0]
        if default_val is not None:
            # delete entries that match the default value
            # for entry_key, e_val in entries.copy().items():
            #     if e_val == default_val:
            #         del entries[entry_key]

            # Preprocess the default value
            prop["default_value"] = preprocess_mixed_val(default_val)
            

        # process each value:
        for entry_key, entry_val in entries.items():
            entries[entry_key] = preprocess_mixed_val(entry_val)

        entries = dict(sorted(entries.items()))

        prop["entries"] = entries
    
    return property_data

def preprocess_mixed_val(entry_val: str | int | float | bool | list[Any] | dict[str, Any]):
    if isinstance(entry_val, list):
        return [*sorted(preprocess_mixed_val(value) for value in entry_val)]

    if isinstance(entry_val, bool):
        if entry_val:
            return "Yes"
        else:
            return "No"

    if isinstance(entry_val, dict): # means it has multiple states

        new_states_dict = {}
        for state_attributes, value in entry_val.items():
            # sort list of attributes within the states of each entry alphabetically
            state_attributes = ", ".join(sorted(state_attributes.split(", ")))

            # preprocess each value within a multi-state entry:
            value = preprocess_mixed_val(value)

            new_states_dict[state_attributes] = value
        entry_val = new_states_dict

        # sort the list of states
        entry_val = dict(sorted(entry_val.items()))

        # Assemble the tree-structure of attributes by splitting the flattened state strings and merging
        tree: dict = {}
        for state_attributes, value in entry_val.items():
            attributes_list = state_attributes.split(", ")
            tree = merge(attributes_list, value, tree)
        # Simplify the resulting tree by iterating through all sub-trees and removing unneeded attributes
        tree = simplify_redundant_branches(tree)
        entry_val = tree

        return entry_val

    return entry_val


def merge(attributes: list[str], value, tree: dict):
    """
    Traverses a list of keys in order to merge multiple state-combinations into one tree
    """
    if not len(attributes):
        return value
    attr = attributes.pop(0)
    inner_tree = tree.get(attr, {})
    tree[attr] = merge(attributes, value, inner_tree)
    return tree

def simplify_redundant_branches(tree: dict | Any):
    """
    Remove redundant attributes at each level of the tree by comparing the json.dumps-representation of
    all the values for a given attribute, removing any redundant layers and joining together the values
    that contain identical sub-trees.

    Relies on previous attribute-sorting to ensure it's comparing equivalent attributes
    """
    if isinstance(tree, dict):
        unique_subtrees = defaultdict(list)

        for attribute, subtree in tree.items():
            unique_subtrees[json.dumps(subtree)].append(attribute)

        if len(unique_subtrees) == 1:
            first_subtree = next(iter(tree.values()))
            return simplify_redundant_branches(first_subtree)

        new_tree = {}
        for attributes in unique_subtrees.values():
            new_tree["<br>".join(attributes)] = simplify_redundant_branches(tree[attributes[0]])
    
        return new_tree
    return tree

# As an example, for the Opacity property of Slabs, the `merge` and `simplify_redundant_branches` steps would look like:
#     raw data: {
#         "type: bottom, waterlogged: false": 0,
#         "type: bottom, waterlogged: true": 1,
#         "type: double, waterlogged: false": 15
#         "type: double, waterlogged: true": 15,
#         "type: top, waterlogged: false": 0,
#         "type: top, waterlogged: true": 1,
#     }
#     merged: {
#         "type: bottom": {
#             waterlogged: false": 0,
#             waterlogged: true": 1,
#         },
#         "type: double": {
#             waterlogged: false": 15
#             waterlogged: true": 15,
#         },
#         "type: top": {
#             waterlogged: false": 0,
#             waterlogged: true": 1,
#         }
#     }
#     first simplify_redundant_branches pass: {
#         "{\"waterlogged: false\": 0,\"waterlogged: true\": 1}": ["type: bottom", "type: top"],
#         "{\"waterlogged: false\": 15,\"waterlogged: true\": 15}": ["type: double"]
#     } -> "bottom" and "top" attributes have identical sub-tree representations, joined
#     
#         "type: bottom/top" sub-pass: {
#             0: ["waterlogged: false"],
#             1: ["waterlogged: true"]
#         } -> distinct, kept as-is
#     
#         "type: double" sub-pass: {
#             15: ["waterlogged: false", "waterlogged: true"]
#         } -> attribute is redundant in this sub-tree, removed entirely
#     
#     result: {
#         "type: bottom<br>type: top": {
#             "waterlogged: false": 0,
#             "waterlogged: true": 1
#         },
#         "type: double": 15
#     }

def main(input_file, output_file, old_output_file, sprite_types):
    print("Reading input file")
    property_data = json.load(input_file)
    if old_output_file:
        old_data = json.load(old_output_file)
    else:
        old_data = {
            "conditional_formatting": {},
            "default_selection": [],
            "property_structure": [],
            "properties": {},
        }

    property_data = preprocess(property_data)

    key_list = [*sorted(property_data["translated_name"]["entries"].values())]

    print("Fetching sprites")
    loop = asyncio.new_event_loop()
    sprites_mapping = loop.run_until_complete(sprites.main(key_list, sprite_types, False, None))

    print("Reconstructing data file")
    output = {
        "conditional_formatting": {
            **old_data["conditional_formatting"],
            "false": "cf-no",
            "true": "cf-yes",
            "None": "cf-invalid",
        },
        "key_list": key_list,
        "sprites": sprites_mapping,
        "property_structure": [
            {
                "category": "New Properties",
                "contents": [
                    *sorted([key for key in property_data.keys() if key not in old_data["properties"].keys()]),
                ],
            },
            *old_data.get("property_structure", [])
        ],
        "default_selection": [prop for prop in old_data.get("default_selection", []) if prop in property_data],
        "properties": property_data,
    }
    
    json.dump(output, output_file, indent="\t")


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("-i", "--input", type=FileType('r'))
    parser.add_argument("-o", "--output", type=FileType('w'))
    parser.add_argument("-t", "--get-sprites-from-types", type=str, choices=("block", "entity", "item", "biome"), nargs="+")
    parser.add_argument("-p", "--previous-file", type=FileType('r'))
    args = parser.parse_args()
    main(args.input, args.output, args.previous_file, args.get_sprites_from_types)
    print("Done!")
