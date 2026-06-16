import csv
import os
import re
import json
from intervaltree import IntervalTree

INDIAN_NAMES = set()
INDIAN_CITIES = set()

def load_indian_names():
    global INDIAN_NAMES

    file_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "indian_names.csv"
    )
    file_path = os.path.abspath(file_path)

    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)

        for row in reader:
            if not row:
                continue

            name = row[-1]
            if name == "name": continue
            name = name.strip().lower()
            name = re.sub(r"[^a-z]", "", name)

            if name:
                INDIAN_NAMES.add(name)

def load_indian_cities():
    global INDIAN_CITIES
    file_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "indian_cities.json"
    )
    file_path = os.path.abspath(file_path)
    with open(file_path,encoding="utf-8") as fh:
        data = json.load(fh)
        for entry in data:
            city = entry.get("city","").strip().lower()
            if city:
                INDIAN_CITIES.add(city)
                

def calculate_entity_counts(entities):
    counts = {}
    for e in entities:
        t = e["type"]
        counts[t] = counts.get(t, 0) + 1
    return counts

def build_entity_tree(entities):
    tree = IntervalTree()
    for e in entities:
        start = e["start"]
        end = e["end"]
        if start < end:
            tree[start:end] = e
    return tree


def overlaps_tree(tree, start, end):
    if start >= end:
        return False
    return bool(tree[start:end])