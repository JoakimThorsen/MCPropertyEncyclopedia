import json
from argparse import ArgumentParser, FileType
from typing import Any


def preprocess(dump: dict):

    # remap names from namespaced block id to english translated names
    if "translated_name" not in dump.keys():
        print("No name translations present...")
    else:
        print("Translating names")
        mapping = dump["translated_name"]["entries"]
        for prop in dump.values():
            for untranslated_key in prop["entries"].copy().keys():
                translated_name = mapping.get(untranslated_key, dump["translated_name"].get("default_value", f"untranslated name: {untranslated_key}"))
                assert isinstance(translated_name, str), f"Translated name was not valid: {translated_name}"
                prop["entries"][translated_name] = prop["entries"].pop(untranslated_key)


    # process the values within each property
    for prop in dump.values():
        entries: dict[str, str|int|float|bool|list[Any]|dict[str, Any]] = prop["entries"]

        default_val = prop.get("default_value")
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

    return dump

def preprocess_mixed_val(entry_val: str | int | float | bool | list[Any] | dict[str, Any]):
    if isinstance(entry_val, dict): # means it has multiple states
        
        # sort list of attributes within the states of each block alphabetically
        new_states_dict = {}
        for state_name, state_val in entry_val.items():
            state_name: str
            state_name = ", ".join(sorted(state_name.split(", ")))

            # preprocess each value within a multi-state entry:
            state_val = preprocess_mixed_val(state_val)

            new_states_dict[state_name] = state_val
        entry_val = new_states_dict

        # sort the list of states
        entry_val = dict(sorted(entry_val.items()))

        return entry_val
    
    if isinstance(entry_val, list):
        return [*sorted(preprocess_mixed_val(value) for value in entry_val)]

    if isinstance(entry_val, bool):
        if entry_val:
            return "Yes"
        else:
            return "No"
    
    return entry_val

def main(input_file, output_file, old_output_file):
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

    output = {
        "conditional_formatting": {
            **old_data["conditional_formatting"],
            "false": "cf-no",
            "true": "cf-yes",
            "None": "cf-invalid",
        },
        "key_list": [*sorted(property_data["translated_name"]["entries"].values())],
        "sprites": old_data["sprites"],
        "property_structure": [
            *sorted([key for key in property_data.keys() if key not in old_data["properties"].keys()]),
            *old_data.get("property_structure", [])
        ],
        "default_selection": old_data.get("default_selection", []),
        "properties": property_data,
    }
    
    json.dump(output, output_file, indent="\t")


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("-i", "--input", type=FileType('r'))
    parser.add_argument("-o", "--output", type=FileType('w'))
    parser.add_argument("-p", "--previous-file", type=FileType('r'))
    args = parser.parse_args()
    main(args.input, args.output, args.previous_file)
