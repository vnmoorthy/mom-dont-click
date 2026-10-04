#!/usr/bin/env python3
"""
Post-processor for the Mom, Don't Click deck.

pptxgenjs cannot write theme colours, slide transitions or animations, so this
script takes the package build-deck.js wrote and adds them:

  * the deck's own colour scheme in ppt/theme/theme1.xml
  * a <p:transition> on every slide (fade / push / cover, and Morph with a fade fallback)
  * a <p:timing> tree per slide: entrance effects chained "after previous" so they
    play on their own, and autoplay for the embedded video

    python3 animate.py [deck-raw.pptx] [anim-plan.json] [../mom-dont-click.pptx]

Slide XML is only ever *read* with a parser (defusedxml.minidom). All edits are
string insertions at exact anchors, so namespace prefixes are never rewritten.
"""
import json
import os
import re
import sys
import zipfile
from pathlib import Path

from defusedxml import minidom

HERE = Path(__file__).resolve().parent
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "deck-raw.pptx"
PLAN = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "anim-plan.json"
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else HERE.parent / "mom-dont-click.pptx"

SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]
ANCHOR = "</p:clrMapOvr>"
# Debug switch for bisecting a file an app refuses, e.g. ANIM_SKIP=timing,morph
SKIP = set(filter(None, os.environ.get("ANIM_SKIP", "").split(",")))

NS_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
NS_P159 = "http://schemas.microsoft.com/office/powerpoint/2015/09/main"


# ------------------------------------------------------------------ theme
def patch_theme(xml: str, theme: dict) -> str:
    name = re.sub(r'[&<>"]', "", theme["name"])
    colors = theme["colors"]
    for slot in SLOTS:
        if not re.fullmatch(r"[0-9A-Fa-f]{6}", str(colors.get(slot, ""))):
            raise SystemExit(f"theme colour {slot} must be six hex digits")
    scheme = f'<a:clrScheme name="{name}">' + "".join(
        f'<a:{s}><a:srgbClr val="{colors[s].upper()}"/></a:{s}>' for s in SLOTS
    ) + "</a:clrScheme>"
    out, n = re.subn(r"<a:clrScheme\b.*?</a:clrScheme>", lambda _m: scheme, xml, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("theme1.xml has no <a:clrScheme> to replace")
    out = re.sub(r'(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"', lambda m: f'{m.group(1)}{name}"', out)
    return out


# ------------------------------------------------------------------ shapes
def dedupe_ids(xml: str) -> str:
    """pptxgenjs hard-codes id 25 for the slide-number placeholder, which collides with the
    24th object on a busy slide. Give any repeated id a fresh one (the later shape moves)."""
    pat = re.compile(r'<p:cNvPr id="(\d+)"')
    used = [int(m.group(1)) for m in pat.finditer(xml)]
    nxt = max(used + [1]) + 1
    seen = set()

    def fix(m):
        nonlocal nxt
        i = int(m.group(1))
        if i in seen:
            i, nxt = nxt, nxt + 1
        seen.add(i)
        return f'<p:cNvPr id="{i}"'

    return pat.sub(fix, xml)


def read_shapes(xml: str):
    """Top-level shapes of a slide, in z-order: name, id, kind, has text, has fill."""
    doc = minidom.parseString(xml.encode("utf-8"))
    tree = doc.getElementsByTagName("p:spTree")[0]
    shapes = []
    for el in tree.childNodes:
        if el.nodeType != el.ELEMENT_NODE or el.tagName not in ("p:sp", "p:pic", "p:cxnSp", "p:graphicFrame"):
            continue
        cnv = el.getElementsByTagName("p:cNvPr")[0]
        texts = [t.firstChild.data for t in el.getElementsByTagName("a:t") if t.firstChild is not None]
        sp_pr = el.getElementsByTagName("p:spPr")
        has_fill = False
        if sp_pr:
            for child in sp_pr[0].childNodes:
                if child.nodeType == child.ELEMENT_NODE and child.tagName in ("a:solidFill", "a:ln"):
                    has_fill = True
        ph = el.getElementsByTagName("p:ph")
        is_title = bool(ph) and ph[0].getAttribute("type") in ("title", "ctrTitle")
        shapes.append(
            {
                "name": "@title" if is_title else cnv.getAttribute("name"),
                "id": int(cnv.getAttribute("id")),
                "kind": el.tagName,
                "text": any(t.strip() for t in texts),
                "fill": has_fill,
            }
        )
    ids = [s["id"] for s in shapes]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"duplicate shape ids on a slide: {sorted(i for i in ids if ids.count(i) > 1)}")
    return shapes


def resolve(shapes, patterns, slide_no):
    """Names from the plan -> shapes. "prefix-*" matches by prefix, "@title" is the title placeholder."""
    hit = []
    for pat in patterns:
        if pat.endswith("*"):
            found = [s for s in shapes if s["name"].startswith(pat[:-1])]
        else:
            found = [s for s in shapes if s["name"] == pat]
        if not found:
            raise SystemExit(f"slide {slide_no}: nothing is named {pat!r}")
        for s in found:
            if s not in hit:
                hit.append(s)
    hit.sort(key=lambda s: shapes.index(s))  # z-order
    return hit


# ------------------------------------------------------------------ timing
class Ids:
    def __init__(self):
        self.n = 0

    def next(self):
        self.n += 1
        return self.n


def tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def set_visible(ids, spid):
    return (
        f'<p:set><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
        f"{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>"
        '<p:to><p:strVal val="visible"/></p:to></p:set>'
    )


def anim_effect(ids, spid, flt, dur):
    return f'<p:animEffect transition="in" filter="{flt}"><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}"/>{tgt(spid)}</p:cBhvr></p:animEffect>'


def anim_prop(ids, spid, attr, start, end, dur, decel=True):
    def val(v):
        return f'<p:fltVal val="{v}"/>' if isinstance(v, (int, float)) else f'<p:strVal val="{v}"/>'

    ease = ' decel="100000"' if decel else ""
    return (
        f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}"{ease} fill="hold"/>'
        f"{tgt(spid)}<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>"
        f'<p:tavLst><p:tav tm="0"><p:val>{val(start)}</p:val></p:tav><p:tav tm="100000"><p:val>{val(end)}</p:val></p:tav></p:tavLst></p:anim>'
    )


# effect name -> (presetID, presetSubtype, behaviours)
def behaviours(effect, ids, spid, dur):
    if effect == "fade":  # Fade
        return 10, 0, set_visible(ids, spid) + anim_effect(ids, spid, "fade", dur)
    if effect == "wipe":  # Wipe, from the left
        return 22, 8, set_visible(ids, spid) + anim_effect(ids, spid, "wipe(left)", dur)
    if effect == "zoom":  # Zoom: grows out of its own centre while fading in
        return 53, 16, (
            set_visible(ids, spid)
            + anim_prop(ids, spid, "ppt_w", 0, "#ppt_w", dur, decel=False)
            + anim_prop(ids, spid, "ppt_h", 0, "#ppt_h", dur, decel=False)
            + anim_effect(ids, spid, "fade", dur)
        )
    if effect == "rise":  # Float up: fades in while rising a little
        return 42, 0, (
            set_visible(ids, spid)
            + anim_effect(ids, spid, "fade", dur)
            + anim_prop(ids, spid, "ppt_x", "#ppt_x", "#ppt_x", dur)
            + anim_prop(ids, spid, "ppt_y", "#ppt_y+.05", "#ppt_y", dur)
        )
    if effect == "floatLeft":  # fades in while drifting in from the right
        return 42, 0, (
            set_visible(ids, spid)
            + anim_effect(ids, spid, "fade", dur)
            + anim_prop(ids, spid, "ppt_x", "#ppt_x+.08", "#ppt_x", dur)
            + anim_prop(ids, spid, "ppt_y", "#ppt_y", "#ppt_y", dur)
        )
    raise SystemExit(f"unknown effect {effect!r}")


SEQ_TAIL = (
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
)


def auto_group_open(ids):
    """The outer group PowerPoint writes when the first effect is 'After Previous': it starts with the slide."""
    return (
        f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
        '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
    )


def build_entrance_timing(shapes, steps, slide_no):
    ids = Ids()
    root, main = ids.next(), ids.next()  # 1, 2
    body = auto_group_open(ids)
    clock = 0
    build = []
    for step in steps:
        targets = resolve(shapes, step["match"], slide_no)
        dur, delay = int(step.get("dur", 500)), int(step.get("delay", 0))
        body += f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="{clock}"/></p:stCondLst><p:childTnLst>'
        for i, shape in enumerate(targets):
            eid = ids.next()
            preset, subtype, inner = behaviours(step["effect"], ids, shape["id"], dur)
            node = "afterEffect" if i == 0 else "withEffect"
            grp = ' grpId="0"' if shape["kind"] == "p:sp" else ""
            body += (
                f'<p:par><p:cTn id="{eid}" presetID="{preset}" presetClass="entr" presetSubtype="{subtype}" fill="hold"{grp} nodeType="{node}">'
                f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>{inner}</p:childTnLst></p:cTn></p:par>'
            )
            if shape["kind"] == "p:sp":
                bg = ' animBg="1"' if shape["fill"] or not shape["text"] else ""
                build.append(f'<p:bldP spid="{shape["id"]}" grpId="0"{bg}/>')
        body += "</p:childTnLst></p:cTn></p:par>"
        clock += delay + dur
    body += "</p:childTnLst></p:cTn></p:par>"
    bld = f'<p:bldLst>{"".join(build)}</p:bldLst>' if build else ""
    return (
        f'<p:timing><p:tnLst><p:par><p:cTn id="{root}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="{main}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{body}</p:childTnLst></p:cTn>'
        f"{SEQ_TAIL}</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>{bld}</p:timing>"
    )


def build_video_timing(shapes, video, slide_no):
    """Autoplay on slide start, click the picture to pause or resume: what PowerPoint writes for Start: Automatically."""
    spid = resolve(shapes, [video["match"]], slide_no)[0]["id"]
    dur = int(video["durMs"])
    ids = Ids()
    root, main = ids.next(), ids.next()
    play = (
        auto_group_open(ids)
        + f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        + f'<p:par><p:cTn id="{ids.next()}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect">'
        + '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        + f'<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}" fill="hold"/>{tgt(spid)}</p:cBhvr></p:cmd>'
        + "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>"
    )
    main_seq = (
        f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="{main}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{play}</p:childTnLst></p:cTn>'
        f"{SEQ_TAIL}</p:seq>"
    )
    media = (
        f'<p:video><p:cMediaNode vol="80000"><p:cTn id="{ids.next()}" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>'
        f"{tgt(spid)}</p:cMediaNode></p:video>"
    )
    click = f'<p:cond evt="onClick" delay="0">{tgt(spid)}</p:cond>'
    toggle = (
        f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="{ids.next()}" restart="whenNotActive" fill="hold" evtFilter="cancelBubble" nodeType="interactiveSeq">'
        f'<p:stCondLst>{click}</p:stCondLst><p:endSync evt="end" delay="0"><p:rtn val="all"/></p:endSync><p:childTnLst>'
        f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:par><p:cTn id="{ids.next()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:par><p:cTn id="{ids.next()}" presetID="2" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect">'
        '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:cmd type="call" cmd="togglePause"><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"/>{tgt(spid)}</p:cBhvr></p:cmd>'
        "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>"
        f"</p:childTnLst></p:cTn><p:nextCondLst>{click}</p:nextCondLst></p:seq>"
    )
    return (
        f'<p:timing><p:tnLst><p:par><p:cTn id="{root}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        f"{main_seq}{media}{toggle}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>"
    )


# ------------------------------------------------------------------ transitions
def build_transition(t):
    kind = t["type"]
    spd = t.get("spd", "med")
    if kind == "fade":
        inner = '<p:fade thruBlk="1"/>' if t.get("thruBlk") else "<p:fade/>"
    elif kind == "push":
        inner = f'<p:push dir="{t.get("dir", "l")}"/>'
    elif kind == "cover":
        inner = f'<p:cover dir="{t.get("dir", "d")}"/>'
    elif kind == "morph":
        # Morph is a 2015 extension: PowerPoint 2019 / 365 plays it, everything else takes the fade.
        return (
            f'<mc:AlternateContent xmlns:mc="{NS_MC}">'
            f'<mc:Choice xmlns:p159="{NS_P159}" Requires="p159"><p:transition spd="slow"><p159:morph option="byObject"/></p:transition></mc:Choice>'
            '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>'
            "</mc:AlternateContent>"
        )
    else:
        raise SystemExit(f"unknown transition {kind!r}")
    return f'<p:transition spd="{spd}">{inner}</p:transition>'


# ------------------------------------------------------------------ main
def main():
    plan = json.loads(PLAN.read_text())
    src = zipfile.ZipFile(RAW)
    names = src.namelist()
    parts = {n: src.read(n) for n in names}
    src.close()

    # theme colours
    theme_part = "ppt/theme/theme1.xml"
    parts[theme_part] = patch_theme(parts[theme_part].decode("utf-8"), plan["theme"]).encode("utf-8")
    for n, data in parts.items():
        if n.endswith(".xml"):
            bad = re.search(rb'<a:srgbClr val="((?![0-9A-Fa-f]{6}")[^"]*)"', data)
            if bad:
                raise SystemExit(f'{n}: <a:srgbClr val="{bad.group(1).decode()}"> is not a hex colour (a scheme colour was passed to a hex-only option)')

    report = []
    for key, spec in sorted(plan["slides"].items(), key=lambda kv: int(kv[0])):
        part = f"ppt/slides/slide{key}.xml"
        xml = parts[part].decode("utf-8")
        if xml.count(ANCHOR) != 1:
            raise SystemExit(f"{part}: expected exactly one {ANCHOR}")
        if "<p:transition" in xml or "<p:timing" in xml:
            raise SystemExit(f"{part}: already has a transition or timing; run on the raw deck")
        xml = dedupe_ids(xml)
        shapes = read_shapes(xml)
        extra = ""
        if spec.get("transition") and "transitions" not in SKIP:
            t = dict(spec["transition"])
            if t["type"] == "morph" and "morph" in SKIP:
                t["type"] = "fade"
            extra = build_transition(t)
        effects = 0
        if spec.get("video") and "video" not in SKIP:
            extra += build_video_timing(shapes, spec["video"], key)
        elif spec.get("steps") and "timing" not in SKIP and key not in SKIP:
            extra += build_entrance_timing(shapes, spec["steps"], key)
            effects = sum(len(resolve(shapes, s["match"], key)) for s in spec["steps"])
        xml = xml.replace(ANCHOR, ANCHOR + extra)
        for shape in shapes:  # pptxgenjs names the title placeholder "Text N"
            if shape["name"] == "@title":
                xml = re.sub(rf'(<p:cNvPr id="{shape["id"]}" name=")[^"]*"', r'\1Title"', xml, count=1)
        minidom.parseString(xml.encode("utf-8"))  # must still be well-formed
        parts[part] = xml.encode("utf-8")
        t = spec.get("transition", {}).get("type", "none")
        report.append(f"  slide {key}: transition={t}, " + ("video autoplay" if spec.get("video") else f"{len(spec.get('steps', []))} steps / {effects} effects"))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    order = ["[Content_Types].xml"] + [n for n in names if n != "[Content_Types].xml"]
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for n in order:
            method = zipfile.ZIP_STORED if n.lower().endswith((".mp4", ".png", ".jpg", ".jpeg")) else zipfile.ZIP_DEFLATED
            info = zipfile.ZipInfo(n, date_time=(2026, 10, 4, 12, 0, 0))
            # Real permissions, so `unzip` gives back folders you can open (ZipInfo defaults to 0600 for everything).
            if n.endswith("/"):
                info.external_attr = (0o40755 << 16) | 0x10
                method = zipfile.ZIP_STORED
            else:
                info.external_attr = 0o100644 << 16
            z.writestr(info, parts[n], compress_type=method)
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
    print("\n".join(report))


if __name__ == "__main__":
    main()
