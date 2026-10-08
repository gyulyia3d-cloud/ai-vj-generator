import json, os, subprocess, sys, tempfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
d = tempfile.mkdtemp()
r = subprocess.run([sys.executable, os.path.join(HERE, "export_slices.py"), "--size", "10400x416", "--folds", "3744,7488", "--out-size", "3840x2160", "--name", "wall", "--out", d], capture_output=True, text=True, encoding="utf-8")
assert r.returncode == 0, r.stderr
root = ET.parse(os.path.join(d, "wall.slices.xml")).getroot()
sl = root.findall(".//Slice")
assert len(sl) == 3, len(sl)
# same layout as the reference file saved by Arena for this wall: pieces stack in rows, OutputRect = input rect moved so the piece lands at (0, row)
exp = [(0, 0), (-3744, 416), (-7488, 832)]
for s, (dx, dy) in zip(sl, exp):
    v0 = s.find("OutputRect").find("v")
    assert (int(v0.get("x")), int(v0.get("y"))) == (dx, dy), (v0.attrib, dx, dy)
    ir = s.find("InputRect").findall("v")
    assert (ir[1].get("x"), ir[2].get("y")) == ("10400", "416")
mk = [s.find("SliceMask").find(".//Rect").findall("v") for s in sl]
assert [(m[0].get("x"), m[1].get("x")) for m in mk] == [("0", "3744"), ("3744", "7488"), ("7488", "10400")]
assert root.find(".//OutputDeviceVirtual").get("width") == "3840"
m = json.load(open(os.path.join(d, "wall.map.json")))
assert sum(s["input"]["w"] for s in m["slices"]) == 10400
assert os.path.getsize(os.path.join(d, "wall.stageview.png")) > 1000
# big strip with no folds is split to fit the output width
r = subprocess.run([sys.executable, os.path.join(HERE, "export_slices.py"), "--size", "4500x800", "--out-size", "1920x1080", "--out", d], capture_output=True, text=True, encoding="utf-8")
assert r.returncode == 0 and "3 slice" in r.stdout and "3 output screen" in r.stdout, r.stdout + r.stderr
r = subprocess.run([sys.executable, os.path.join(HERE, "export_slices.py"), "--size", "100x3000", "--out", d], capture_output=True, text=True, encoding="utf-8")
assert r.returncode != 0 and "does not fit" in (r.stderr + r.stdout)
# same vocabulary as a file Arena itself saved (element and parameter names kept in references/arena-advanced-output-structure.json)
facts = json.load(open(os.path.join(HERE, "..", "references", "arena-advanced-output-structure.json"), encoding="utf-8"))
els = sorted({e.tag for e in root.iter()})
assert els == facts["elements"], (set(els) ^ set(facts["elements"]))
pnames = sorted({e.get("name") for e in root.iter() if e.tag.startswith("Param") and e.get("name")})
assert pnames == facts["parameters"], (set(pnames) ^ set(facts["parameters"]))
print("export_slices ok")
