from argparse import ArgumentParser, FileType
import re
import json

import asyncio
import aiohttp
import aiofiles
import Levenshtein
import requests
from aiofiles import os

# HOW TO USE
# install the required deps^
# Run using `python sprites.py --json-data-file ..\data\item_data.json --types item block -d --output-dir ..\assets\sprites`

async def download_file(file: str, session: aiohttp.ClientSession, output_directory: str):
    async with session.get(f'https://minecraft.wiki/images/{file}') as response:
        stripped_filename = strip_filename(file)
        async with aiofiles.open(f"{output_directory}/{stripped_filename}", "wb") as fp:
            await fp.write(await response.content.read())
            print(f"Wrote file to disk: {stripped_filename}")

SPRITE_AND_SPRITEDOC_NAMES = re.compile(r'<img src="/images/([^"]*?\.png\?\w{5})" decoding="async" loading="lazy" width="16" height="16" class="mw-file-element" data-file-width="16" data-file-height="16" ?/?></a></span></div><ul class="spritedoc-names">((?:<li class="spritedoc-name"><code(?: class="spritedoc-deprecated")?><a class="text" href="https://minecraft.wiki/w/File:[^"]+?\.png\?redirect=no">(?:[^<>]+?)</a></code></li>)+)')
NAME_FROM_SPRITEDOC_NAMES = re.compile(r'<a class="text" href="https://minecraft.wiki/w/File:[^"]+?\.png\?redirect=no">([^<>]+?)</a>')

async def main(entry_list: list[str], types: list[str], download_sprites: bool, output_directory: str):
    sprite_aliases: dict[str, list[str]] = {}
    for type in types:
        
        resp = requests.get(f"https://minecraft.wiki/w/Template:{type}Sprite/doc")
        resp.raise_for_status()
        content = resp.text

        matches = SPRITE_AND_SPRITEDOC_NAMES.findall(content)

        for filename, aliases_body in matches:
            aliases = NAME_FROM_SPRITEDOC_NAMES.findall(aliases_body)
            # print(aliases)
            sprite_aliases[filename] = aliases

        # print(json.dumps(matches, indent=4))
        # print([match for match in matches if len(match) > 3])
    print("Total aliases found:", len(sprite_aliases))

    found_files = {}
    unmatched = []
    for entry_name in entry_list:
        normalized_name = entry_name.replace(" ", "-").lower()
        if filename := match_filename(normalized_name, sprite_aliases):
            found_files[entry_name] = filename
        else:
            unmatched.append(normalized_name)

    print(f"Matched file count: {len(found_files)}")
    if download_sprites:
        print("- Downloading found files")
        async with aiohttp.ClientSession() as session:
            await os.makedirs(output_directory, exist_ok=True)
            file_list = await os.listdir(output_directory)
            await asyncio.gather(
                *(
                    download_file(file, session, output_directory)
                    for file in found_files.values()
                    if strip_filename(file) not in file_list
                ))
            print("Done downloading files")
    else:
        print("- Not downloading files")

    for normalized_name in unmatched:
        closest = [
            filename.split("_")[-1].split("?")[0]
            for filename, _ in sorted(
                sprite_aliases.items(), key=lambda entry: min(
                    [Levenshtein.distance(normalized_name, alias) for alias in entry[1]]
                )
            )]
        print("Unmatched:", normalized_name, "-", ", ".join(closest[:3]))
    print(f"Unmatched sprites count: {len(unmatched)}")

    return {
        entry_name:strip_filename(filename)
        for entry_name, filename
        in found_files.items()
    }


def match_filename(normalized_name: str, sprite_aliases: dict[str, list[str]]):

    # specific overrides to fix imprecise names
    if normalized_name.endswith("-disc"):
        normalized_name = f"music-disc-{normalized_name.replace('-disc', '')}"

    if normalized_name == "spawner":
        normalized_name = "monster-spawner"

    for file, aliases in sprite_aliases.items():
        if normalized_name in aliases:
            return file

def strip_filename(file):
    return file.split('?')[0].split('/')[-1]

if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument("-j", "--json-data-file", type=FileType('r'))
    parser.add_argument("-t", "--types", type=str, choices=["block", "entity", "item", "biome"], nargs="+")
    parser.add_argument("-d", "--download-sprites", action='store_true')
    # parser.add_argument("-m", "--move-sprites", action='store_true')
    parser.add_argument("-o", "--output-dir", type=str, default=None)
    args = parser.parse_args()
    entry_list = json.load(args.json_data_file)["key_list"]
    asyncio.run(main(entry_list, args.types, args.download_sprites, args.output_dir))
