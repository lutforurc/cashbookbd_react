# -*- coding: utf-8 -*-
"""
Builds a Word (.docx) document: what goes wrong in the accounts when a hotel
check-out leaves a balance with nobody's name on it.

No third-party packages: the .docx is written as an OOXML zip directly.
"""
import os
import zipfile
from xml.sax.saxutils import escape
import xml.etree.ElementTree as ET

ROOT = r"D:\cashbookbd_react"
OUT = os.path.join(ROOT, "docs", "Hotel_Checkout_Accounts_Receivable_Risks.docx")

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


# ---------------------------------------------------------------- XML helpers

def esc(text):
    return escape(text, {'"': "&quot;"})


def run(text, bold=False):
    rpr = "<w:rPr>"
    if bold:
        rpr += "<w:b/><w:bCs/>"
    rpr += "</w:rPr>"
    return f'<w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'


def runs_from_markup(text, base_bold=False):
    """**bold** inside a string becomes a bold run; the rest stays plain."""
    parts = text.split("**")
    out = []
    for i, part in enumerate(parts):
        if not part:
            continue
        out.append(run(part, base_bold or (i % 2 == 1)))
    return "".join(out) or run("")


def para(content, style=None, align=None, indent=None, hanging=None,
         space_before=None, space_after=None, keep_next=False):
    ppr = "<w:pPr>"
    if style:
        ppr += f'<w:pStyle w:val="{style}"/>'
    if keep_next:
        ppr += "<w:keepNext/>"
    # Schema order inside w:pPr: spacing, ind, jc.
    if space_before is not None or space_after is not None:
        ppr += "<w:spacing"
        if space_before is not None:
            ppr += f' w:before="{space_before}"'
        if space_after is not None:
            ppr += f' w:after="{space_after}"'
        ppr += "/>"
    if indent is not None:
        ppr += f'<w:ind w:left="{indent}"'
        if hanging:
            ppr += f' w:hanging="{hanging}"'
        ppr += "/>"
    if align:
        ppr += f'<w:jc w:val="{align}"/>'
    ppr += "</w:pPr>"
    return f"<w:p>{ppr}{content}</w:p>"


def p(text, **kw):
    return para(runs_from_markup(text), **kw)


def bullet(text):
    return para(
        run("•  ") + runs_from_markup(text),
        indent=340, hanging=220, space_after=80,
    )


def table(headers, rows, widths):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)

    def cell(text, bold, shade, width):
        tcpr = f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>'
        if shade:
            tcpr += f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>'
        tcpr += "</w:tcPr>"
        body = para(runs_from_markup(text, bold), space_after=0)
        return f"<w:tc>{tcpr}{body}</w:tc>"

    out = (
        "<w:tbl><w:tblPr>"
        '<w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="0" w:type="auto"/>'
        "</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
    )
    out += "<w:tr><w:trPr><w:tblHeader/></w:trPr>"
    out += "".join(cell(h, True, "D9E2F3", widths[i]) for i, h in enumerate(headers))
    out += "</w:tr>"
    for row in rows:
        out += "<w:tr>"
        out += "".join(cell(c, False, None, widths[i]) for i, c in enumerate(row))
        out += "</w:tr>"
    out += "</w:tbl>"
    return out + para("", space_after=0)


# ------------------------------------------------------------------- styles

STYLES = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{W_NS}">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Nirmala UI" w:hAnsi="Nirmala UI" w:cs="Nirmala UI"/>
        <w:sz w:val="22"/><w:szCs w:val="22"/>
        <w:lang w:val="bn-BD" w:eastAsia="bn-BD" w:bidi="bn-BD"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="80"/><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="44"/><w:szCs w:val="44"/><w:color w:val="1F3864"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="404040"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:color w:val="1F3864"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="2E5496"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="2E5496"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
  </w:style>
</w:styles>'''


# ------------------------------------------------------------------ content

blocks = []


def h1(text):
    blocks.append(("raw", para(runs_from_markup(text), style="Heading1")))


def h2(text):
    blocks.append(("raw", para(runs_from_markup(text), style="Heading2")))


def h3(text):
    blocks.append(("raw", para(runs_from_markup(text), style="Heading3")))


def text(t):
    blocks.append(("raw", p(t)))


def bl(t):
    blocks.append(("raw", bullet(t)))


def tbl(headers, rows, widths):
    blocks.append(("raw", table(headers, rows, widths)))


# --- Cover
h1("হোটেল চেক-আউটে বাকি টাকা")
blocks.append(("raw", para(
    runs_from_markup("Accounts Receivable-এ নাম না দিলে কী কী সমস্যা হয় — বিস্তারিত বিশ্লেষণ"),
    style="Subtitle",
)))
blocks.append(("raw", para(
    run("প্রস্তুতির তারিখ: ২৭ অক্টোবর ২০২৬"),
    align="center", space_after=360,
)))

# --- 1
h1("১. সারসংক্ষেপ")
text(
    "হোটেলের বুকিং শেষ করে অতিথি চেক-আউট করার সময় যদি বিলের চেয়ে জমা কম থাকে, "
    "অর্থাৎ টাকা বাকি থাকে, তাহলে সেই বাকি অবশ্যই একজন নির্দিষ্ট কাস্টমার বা পার্টির "
    "নামে **Accounts Receivable** (প্রাপ্য হিসাব) হিসেবে দাঁড়াতে হবে। বাকি টাকা কারও "
    "নাম ছাড়া ফেলে রাখা, অথবা ভুল খাতায় (যেমন সরাসরি আয় বা বিক্রয়) বসিয়ে দেওয়া — "
    "দুটোই হিসাবরক্ষণের দৃষ্টিতে গুরুতর ত্রুটি।"
)
text("সিস্টেমে এই নিয়মটি এভাবে কাজ করে:")
bl("চেক-আউটের সময় বিলের চেয়ে জমা কম হলে (ব্যালেন্স > ০) সিস্টেম জিজ্ঞেস করে "
   "**“কে এই টাকা দেবে?”** — অর্থাৎ পার্টি/Customer নির্বাচন বাধ্যতামূলক।")
bl("পার্টি নির্বাচন করা হলে সার্ভার একটি ভাউচার লেখে: **ডেবিট — পার্টি (Accounts "
   "Receivable), ক্রেডিট — Advance Against Booking**।")
bl("পার্টি ছাড়া চেক-আউট সম্পন্ন হয় না — কারণ নামহীন প্রাপ্য কেউ কখনো আদায় করতে "
   "পারে না, কাউকে দায়বদ্ধও করা যায় না।")
text(
    "এই নিয়ম না মানলে নিচের সমস্যাগুলো একে একে দেখা দেয়। প্রতিটি সমস্যা আলাদা "
    "হলেও বাস্তবে এগুলো একসাথে ঘটে, এবং একটি অন্যটিকে আরও জটিল করে তোলে।"
)

# --- 2
h1("২. সঠিক হিসাবের কাঠামো")
text(
    "হোটেলের পুরো আর্থিক চক্রটাই চলে **Advance Against Booking** নামের একটি দায় "
    "(liability) খাতের মধ্য দিয়ে। টাকা আসে দায় হিসেবে, বিল হলে দায় থেকে আয়ে "
    "রূপান্তরিত হয়, আর চেক-আউটে যা বাকি থাকে তা পার্টির প্রাপ্যে গিয়ে দাঁড়ায়। "
    "পাঁচটি মূল এন্ট্রি নিচের ছকে:"
)
tbl(
    ["ঘটনা", "ডেবিট (Dr)", "ক্রেডিট (Cr)"],
    [
        ["অগ্রিম বা পরিশোধ গ্রহণ", "Cash / Bank", "Advance Against Booking"],
        ["রাত ও অন্যান্য চার্জ বিল", "Advance Against Booking",
         "Room Rent / Other Income / Service Charge / VAT Payable"],
        ["রিফান্ড প্রদান", "Advance Against Booking", "Cash / Bank"],
        ["**চেক-আউটে বাকি টাকা**", "**Customer / Party (A/R)**",
         "**Advance Against Booking**"],
        ["বাতিলে কেটে রাখা চার্জ", "Advance Against Booking",
         "Hotel Cancellation Charge"],
    ],
    [2700, 2900, 3426],
)

h2("২.১ চেক-আউটে আয় কেন আবার লেখা হয় না")
text(
    "রাতগুলোর বিল যখন হয়, তখনই **Room Rent Income** (এবং VAT, Service Charge) আয় "
    "হিসেবে ক্রেডিট হয়েছে; বিপরীতে ডেবিট হয়েছে Advance Against Booking। অর্থাৎ "
    "আয় আগেই স্বীকৃত। চেক-আউটে শুধু অবশিষ্ট দায়টি পার্টির প্রাপ্যে **স্থানান্তর** হয় "
    "— নতুন কোনো আয় তৈরি হয় না।"
)
text(
    "**সতর্কতা:** কেউ যদি ভুল করে লেখেন “ডেবিট — Accounts Receivable, ক্রেডিট — Room "
    "Rent Income”, তাহলে একই টাকা দুইবার আয় হিসেবে গণ্য হবে। এতে লাভ অতিরিক্ত "
    "দেখাবে, VAT ও আয়কর ভুল হবে। সঠিক পোস্টিং সর্বদা: **ডেবিট পার্টি, ক্রেডিট "
    "Advance Against Booking**।"
)

# --- 3
h1("৩. সিস্টেম না মানলে Accounts-এ যে সমস্যাগুলো হয়")

h2("৩.১ নামহীন প্রাপ্য — আদায় কার্যত অসম্ভব")
text(
    "পার্টির নাম না থাকলে বাকি টাকার বিপরীতে কেউ দাঁড়ায় না। Due List, Ageing Report "
    "বা Customer Statement-এ সেই টাকা দেখাবে না; ফলে ফোন, এসএমএস, চিঠি বা আইনি "
    "নোটিশ দেওয়ার কোনো ঠিকানা থাকে না। বাস্তবে এ ধরনের বাকি বছরের পর বছর বইয়ে "
    "পড়ে থাকে এবং শেষে Bad Debt হিসেবে শোধ করতে হয় — যা সরাসরি মুনাফা কমায়।"
)

h2("৩.২ Customer/Party Ledger ও Statement ভুল হয়")
text(
    "প্রতিটি কাস্টমারের লেজারে তার সব বাকি ও পরিশোধের সম্পূর্ণ চিত্র থাকা উচিত। "
    "নামহীন বাকি বাদ পড়লে কাস্টমার স্টেটমেন্ট অসম্পূর্ণ হবে; কাস্টমার হয়তো মনে করবে "
    "সব পরিশোধ করেছে, আবার প্রতিষ্ঠান মনে করবে কিছুই বাকি নেই। পরবর্তীতে একই "
    "কাস্টমারের সাথে নতুন লেনদেন বা সমন্বয়ে তীব্র দ্বন্দ্ব তৈরি হয়।"
)

h2("৩.৩ Due List ও Ageing Report ভুল দিক দেখায়")
text(
    "Due List এবং Ageing (০–৩০, ৩১–৬০, ৬১–৯০, ৯০+ দিন) রিপোর্ট পার্টি-ভিত্তিক। "
    "নামহীন বাকি এই রিপোর্টে আসে না, ফলে বকেয়ার প্রকৃত পরিমাণ কম দেখায় এবং "
    "পুরোনো বকেয়া সময়মতো শনাক্ত হয় না। ব্যবস্থাপনা ভুলভাবে ধরে নেয় আদায় পরিস্থিতি "
    "নিয়ন্ত্রণে আছে।"
)

h2("৩.৪ Advance Against Booking চিরকাল খোলা থাকে")
text(
    "বুকিংয়ের অগ্রিম একটি দায়। বিল হওয়ার পরও চেক-আউটে বাকি অংশটি পার্টির নামে "
    "স্থানান্তর না হলে সেই টাকা Advance Against Booking-এ পড়ে থাকে। বছরের শেষে এই "
    "খাতের ব্যালেন্স ফুলে ওঠে; কোন টাকা কোন অতিথির বা কোন বুকিংয়ের, তা আর আলাদা "
    "করে শনাক্ত করা যায় না।"
)

h2("৩.৫ Trial Balance ও Balance Sheet বিকৃত হয়")
text(
    "নামহীন বাকি থাকলে **Accounts Receivable কম** দেখায় এবং **Advance Against "
    "Booking (দায়) বেশি** দেখায়। অর্থাৎ সম্পদ ও দায় — দুটোই ভুল হবে। ব্যালেন্স শিটে "
    "প্রতিষ্ঠানের অবস্থা প্রকৃতপক্ষে যতটা ভালো, তার চেয়ে ভালো দেখাবে; আর প্রকৃত "
    "প্রাপ্য লুকিয়ে যাবে। ব্যাংক বা বিনিয়োগকারীর কাছে উপস্থাপনের সময় এটি মারাত্মক "
    "ভুল বার্তা দেয়।"
)

h2("৩.৬ আয় দুইবার গণনার ঝুঁকি")
text(
    "চেক-আউটে বাকি টাকা সরাসরি আয়ের খাতে (Room Rent Income) ক্রেডিট করলে একই বিলের "
    "টাকা দুইবার আয় হিসেবে গণ্য হবে — একবার রাত বিল হওয়ার সময়, আরেকবার চেক-আউটে। "
    "ফলে মুনাফা অতিরিক্ত দেখাবে, VAT ও আয়করও বেশি দিতে হবে, এবং পরবর্তীতে "
    "সংশোধন করতে হলে সমন্বয় এন্ট্রি ও ব্যাখ্যার প্রয়োজন হবে।"
)

h2("৩.৭ Cash/Bank ও দৈনিক কালেকশন মিলবে না")
text(
    "ফ্রন্ট ডেস্কের দৈনিক ক্যাশ রিপোর্ট, ফোলিও ও ব্যাংক জমার সাথে হিসাবের মিল "
    "থাকতে হবে। নামহীন বা ভুল পোস্টিং থাকলে কোনও বুকিংয়ের টাকা ব্যাংকে না এসেও "
    "প্রাপ্য হিসেবে দেখাবে না — ফলে ক্যাশ শর্ট বা এক্সেস ধরা পড়ে না, তদন্ত কঠিন "
    "হয় এবং দায় নির্ধারণ করা যায় না।"
)

h2("৩.৮ কর্পোরেট ও কোম্পানি বিলিং ভুল হয়")
text(
    "কর্পোরেট বুকিংয়ে বিল যায় কোম্পানির নামে (billed_to_party_id)। চেক-আউটে পার্টি "
    "ঠিকভাবে না বসালে কোম্পানির প্রাপ্য ভুল পার্টিতে যাবে বা কোথাও যাবে না। পরে "
    "Bill Transfer করে সংশোধন করতে গেলে ভাউচার, ট্রান্সফার রেকর্ড ও অনুমোদন — সব "
    "আলাদা করে করতে হয়; সময় বাড়ে, ভুলের ঝুঁকি বাড়ে এবং কোম্পানির সাথে সম্পর্ক "
    "ক্ষতিগ্রস্ত হতে পারে।"
)

h2("৩.৯ Audit Trail ও ভাউচার নম্বর অনুপস্থিত")
text(
    "প্রতিটি প্রাপ্য ও আদায়ের পেছনে একটি ভাউচার নম্বর থাকা দরকার। নামহীন বাকির "
    "ক্ষেত্রে ভাউচার হয় না; ফলে অডিটে দেখানো যায় না — কখন, কেন, কার নির্দেশে এই "
    "বাকি তৈরি হলো। অভ্যন্তরীণ বা বাহ্যিক নিরীক্ষায় প্রশ্ন উঠলে প্রতিরক্ষার ভিত্তি "
    "থাকে না।"
)

h2("৩.১০ VAT/মূসক ও কর রেকর্ডের ঝুঁকি")
text(
    "হোটেল বিলে VAT ও সেবা চার্জ থাকে। চেক-আউটে ভুল পোস্টিং হলে VAT Payable ও আয়ের "
    "অঙ্ক পরস্পরের সাথে মিলবে না। মূসক ৬.৩ ইস্যু করা থাকলে পরে সংশোধন আরও জটিল; "
    "কর নিরীক্ষায় ফারাক ধরা পড়লে জরিমানা, সুদ ও ব্যাখ্যার ঝামেলা হয়।"
)

h2("৩.১১ Bad Debt ও Provision করা যায় না")
text(
    "প্রাপ্য যদি পার্টির নামে না থাকে, তবে কত টাকা খারাপ ঋণ (bad debt) হতে পারে "
    "তার হিসাব করা যায় না। বছরের শেষে Expected Credit Loss বা provision দাঁড় "
    "করানো অসম্ভব হয়ে পড়ে; ফলে লাভের অঙ্ক অতিরিক্ত দেখায় এবং আর্থিক বিবরণী "
    "প্রকৃত ঝুঁকি প্রকাশ করে না।"
)

h2("৩.১২ রিফান্ড, বাতিল ও অগ্রিম সমন্বয় জটিল হয়ে পড়ে")
text(
    "পরে অতিথি টাকা দিতে এলে কোন বুকিংয়ের বিপরীতে, কোন পার্টির নামে জমা হবে — তা "
    "খুঁজে বের করা কঠিন। বাতিল, রিফান্ড বা অগ্রিম সমন্বয়ে একাধিক ম্যানুয়াল এন্ট্রি "
    "করতে হয়; ভুলের সম্ভাবনা বাড়ে এবং একই টাকা দুই জায়গায় থেকে যাওয়ার ঝুঁকি "
    "তৈরি হয়।"
)

h2("৩.১৩ Credit Control ও কর্মচারী জালিয়াতির সুযোগ")
text(
    "নামহীন বাকি মানে কোনো ক্রেডিট লিমিট, অনুমোদন বা ব্যক্তিগত দায়বদ্ধতা নেই। "
    "ডেস্কের কেউ ইচ্ছাকৃতভাবে বা ভুলে অতিথিকে বাকি নিয়ে ছেড়ে দিলে তা ধরা পড়ে না; "
    "ক্যাশ আদায় করে দেখানো না হলেও হিসাবে ধরা পড়ে না। এটি অভ্যন্তরীণ নিয়ন্ত্রণের "
    "(internal control) সবচেয়ে বড় ফাঁক — এবং সবচেয়ে বিপজ্জনক, কারণ সমস্যাটি "
    "স্বচ্ছন্দে পুনরাবৃত্তি করা যায়।"
)

h2("৩.১৪ ব্যবস্থাপনার সিদ্ধান্ত ও রিপোর্ট ভুল হয়")
text(
    "মালিক বা ম্যানেজমেন্ট Receivable রিপোর্ট দেখে সিদ্ধান্ত নেন। প্রকৃত প্রাপ্য কম "
    "দেখালে তারা ভাববেন আদায় ভালো হচ্ছে; ফলে খরচ, সম্প্রসারণ, ঋণ বা বিনিয়োগের "
    "সিদ্ধান্ত ভুল ভিত্তির উপর দাঁড়াবে। একটি ভুল সংখ্যা শুধু রিপোর্ট নষ্ট করে না — "
    "সেই সংখ্যার উপর নেওয়া প্রতিটি সিদ্ধান্তকেও নষ্ট করে।"
)

h2("৩.১৫ বছরের শেষ Reconciliation ও Dead Account")
text(
    "প্রতি বছর শেষে Advance Against Booking ও Accounts Receivable মিলিয়ে দেখা হয়। "
    "হাজারো নামহীন বা অর্ধ-সম্পূর্ণ এন্ট্রি নিয়ে reconciliation করতে গেলে বিশাল সময় "
    "লাগবে; কিছু বাকি চিরতরে হারিয়ে যাবে, আবার কিছু ভুল পার্টিতে বসে যাবে। ফলাফল: "
    "হিসাব বন্ধ করা বিলম্বিত হয় এবং নিরীক্ষার মন্তব্য (audit qualification) আসার "
    "ঝুঁকি তৈরি হয়।"
)

# --- 4
h1("৪. বাস্তব উদাহরণ")

h2("উদাহরণ ১ — ১৫,০০০ টাকার বিল, ৫,০০০ অগ্রিম, ১০,০০০ বাকি")
tbl(
    ["বিবরণ", "সঠিক হিসাব (নিয়ম মানলে)", "নিয়ম না মানলে"],
    [
        ["রাতের বিল ১৫,০০০", "Dr Advance Against Booking ১৫,০০০ / Cr Room Rent ১৫,০০০",
         "একই"],
        ["অগ্রিম জমা ৫,০০০", "Dr Cash ৫,০০০ / Cr Advance Against Booking ৫,০০০",
         "একই"],
        ["চেক-আউটে বাকি ১০,০০০", "Dr Customer (A/R) ১০,০০০ / Cr Advance ১০,০০০",
         "কোনো এন্ট্রি নেই"],
        ["হিসাবে ফলাফল", "A/R ১০,০০০; Advance ০",
         "A/R ০; Advance ৫,০০০; ১০,০০০ কোথাও নেই"],
    ],
    [2400, 3400, 3226],
)
text(
    "দেখুন, ভুলের ক্ষেত্রে মোট ১০,০০০ টাকা কোনো খাতেই নেই — অথচ অতিথি হোটেল থেকে "
    "চলে গেছে। এই টাকা আদায়ের কোনো রেকর্ড নেই, এবং হিসাবও বলছে সব মিটে গেছে।"
)

h2("উদাহরণ ২ — ভুল খাতে পোস্টিং (আয় দুইবার)")
text(
    "কেউ চেক-আউটে লেখলেন: **Dr Accounts Receivable ১০,০০০ / Cr Room Rent Income "
    "১০,০০০**। কিন্তু ১৫,০০০ আয় আগেই স্বীকৃত হয়েছে। ফলে মোট আয় দেখাবে ২৫,০০০, "
    "যেখানে প্রকৃত আয় ১৫,০০০। অতিরিক্ত ১০,০০০ আয়ের উপর VAT ও আয়কর গণনা হবে, "
    "মুনাফা অতিরিক্ত দেখাবে, এবং পরে সংশোধন করতে হলে সমন্বয় এন্ট্রি, ব্যাখ্যা ও "
    "সম্ভবত সংশোধিত রিটার্নের প্রয়োজন পড়বে।"
)

h2("উদাহরণ ৩ — একটি “House Account”-এ সব বাকি")
text(
    "অনেকে সব walk-in অতিথির বাকি একটি সাধারণ “House Account”-এ ফেলে রাখেন। "
    "হিসাবের দৃষ্টিতে এটি নামহীন বাকির চেয়ে ভালো, কারণ লেজার মেলে। কিন্তু কোন "
    "অতিথি কত দেবে তা আর আলাদা করা যায় না; আদায় করতে হলে বুকিং, ফোলিও ও তারিখ "
    "ধরে ম্যানুয়ালি খুঁজতে হয়। ফলে আদায় বিলম্বিত হয় এবং ভুল ব্যক্তির কাছে "
    "দাবি করার ঝুঁকি তৈরি হয়।"
)

# --- 5
h1("৫. সঠিক নিয়ম মানলে যা পাওয়া যায়")
bl("প্রতিটি বাকি টাকার একটি নাম, একটি ভাউচার এবং একটি তারিখ থাকে — আদায় ও তদন্ত সহজ।")
bl("Customer Ledger, Statement, Due List ও Ageing Report — সবই নির্ভুল ও পরস্পর মিলে যায়।")
bl("Advance Against Booking নিয়মিত শূন্যে ফেরে; বছরের শেষে সমন্বয় সহজ।")
bl("Trial Balance ও Balance Sheet প্রকৃত অবস্থা দেখায়; প্রাপ্য ও দায় সঠিক থাকে।")
bl("আয় একবারই গণনা হয় — মুনাফা, VAT ও আয়কর নির্ভুল থাকে।")
bl("কর্পোরেট বিলিং, Bill Transfer ও রিফান্ড — সব পথে স্পষ্ট audit trail থাকে।")
bl("Credit control ও অনুমোদন ব্যবস্থা কাজ করে; কর্মচারী জালিয়াতির সুযোগ কমে।")
bl("Bad debt provision ও আর্থিক বিশ্লেষণ সম্ভব হয়।")

# --- 6
h1("৬. সুপারিশকৃত বাস্তবায়ন")
text(
    "সমস্যার সমাধান “পার্টি বাধ্যতামূলক” নিয়মটি তুলে দেওয়া নয় — বরং পার্টি নির্বাচনকে "
    "এত সহজ করা যেন ডেস্ক আটকে না পড়ে:"
)
blocks.append(("raw", p("**১. চেক-আউট স্ক্রিনেই কাস্টমার খোঁজা ও তৈরি করার সুবিধা।** "
                       "অতিথির মোবাইল, নাম বা NID দিয়ে কাস্টমার খুঁজুন; না পাওয়া গেলে "
                       "সেই তথ্য দিয়ে এক ক্লিকে Customer তৈরি করে নির্বাচন করুন।")))
blocks.append(("raw", p("**২. বুকিংয়ে আগেই পার্টি থাকলে স্বয়ংক্রিয় নির্বাচন।** "
                       "কর্পোরেট বা পূর্বনির্ধারিত পার্টির ক্ষেত্রে ডেস্ককে আবার খুঁজতে না হয়।")))
blocks.append(("raw", p("**৩. পাশে “এখনই পরিশোধ” বাটন।** ফোলিওতে টাকা নেওয়ার পথটি "
                       "স্পষ্ট রাখুন, যেন বাকি না রেখে নগদে মিটিয়ে দেওয়াও সহজ হয়।")))
blocks.append(("raw", p("**৪. শাখা-পর্যায়ে সেটিং।** “বাকি নিয়ে চেক-আউট অনুমোদিত” "
                       "ডিফল্ট চালু রাখুন; প্রয়োজনে শাখাভেদে নিয়ন্ত্রণ করুন।")))
blocks.append(("raw", p("**৫. অনুমোদন ও সীমা।** নির্দিষ্ট সীমার বেশি বাকির ক্ষেত্রে "
                       "ম্যানেজারের অনুমোদন বাধ্যতামূলক করুন; কর্পোরেট বুকিংয়ে লিখিত শর্ত রাখুন।")))
blocks.append(("raw", p("**৬. মাসিক Reconciliation।** প্রতি মাসে Accounts Receivable "
                       "Ageing ও Advance Against Booking মিলিয়ে দেখুন; নামহীন কোনো "
                       "ব্যালেন্স আছে কিনা যাচাই করুন।")))

# --- 7
h1("৭. ডেস্ক ও Accounts-এর চেকলিস্ট")
bl("☐ প্রতিটি বাকি বুকিংয়ে পার্টি/Customer-এর নাম নিশ্চিত করা হয়েছে।")
bl("☐ অতিথির মোবাইল বা NID যাচাই করা হয়েছে এবং লেজারে যুক্ত হয়েছে।")
bl("☐ চেক-আউটের ভাউচার নম্বর সংরক্ষিত আছে।")
bl("☐ দৈনিক ক্যাশ ও ব্যাংক জমা ফোলিওর সাথে মিলেছে।")
bl("☐ Advance Against Booking-এ কোনো পুরোনো, নামহীন ব্যালেন্স নেই।")
bl("☐ মাসিক Due List ও Ageing Report পর্যালোচনা হয়েছে।")
bl("☐ কোনো ম্যানুয়াল জার্নাল দিয়ে হোটেলের বাকি “সাফ” করা হয়নি।")
bl("☐ কর্পোরেট বুকিংয়ে বিল সঠিক পার্টির নামে আছে।")

# --- 8
h1("৮. উপসংহার")
text(
    "সংক্ষেপে: **বাকি টাকা কারও নামে না দাঁড়ালে সেটি আর প্রাপ্য নয় — সেটি হারিয়ে "
    "যাওয়া টাকা।** চেক-আউটে পার্টি নির্বাচন বাধ্যতামূলক রাখা কোনো অতিরিক্ত কঠোরতা "
    "নয়; এটি হিসাবরক্ষণ, আদায় ও জবাবদিহির ভিত্তি।"
)
text(
    "হোটেলের আয়, VAT, অগ্রিম, রিফান্ড ও প্রাপ্য — সবকিছু একটি শৃঙ্খলে যুক্ত। "
    "চেক-আউটের একটি নামহীন এন্ট্রি সেই শৃঙ্খল ভেঙে দেয়, আর ভাঙা শৃঙ্খল মেরামত করতে "
    "যত সময় ও শ্রম লাগে, একই কাজ সঠিকভাবে করার সময় তার চেয়ে অনেক কম। তাই "
    "নিয়মটি না ভেঙে বরং পার্টি নির্বাচনকে সহজ ও দ্রুত করার দিকেই বিনিয়োগ করা উচিত।"
)
blocks.append(("raw", para(run("— সমাপ্ত —"), align="center", space_before=360)))

# --- Appendix
h1("পরিশিষ্ট: সিস্টেমে এই নিয়মটি কোথায় আছে")
bl("চেক-আউট স্ক্রিনে বিলের চেয়ে জমা কম হলে পার্টি নির্বাচন ছাড়া চেক-আউট বাটন সক্রিয় হয় না।")
bl("চেক-আউট সম্পন্ন হলে সিস্টেম যে ভাউচার লেখে: **Dr পার্টি (Accounts Receivable) / Cr Advance Against Booking**।")
bl("হোটেল বুকিং স্পেসিফিকেশনের “The five entries” অংশে এই পাঁচটি এন্ট্রির কাঠামো নির্ধারিত আছে।")
bl("Bill Transfer, রিফান্ড ও অগ্রিম সমন্বয়ের ক্ষেত্রেও একই ভাউচার-ভিত্তিক নিয়ম প্রযোজ্য।")


# --------------------------------------------------------------- package

document_body = "".join(b[1] if b[0] == "raw" else "" for b in blocks)
sect = (
    "<w:sectPr>"
    '<w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
    'w:header="720" w:footer="720" w:gutter="0"/>'
    "</w:sectPr>"
)
DOCUMENT = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<w:document xmlns:w="{W_NS}"><w:body>{document_body}{sect}</w:body></w:document>'
)

CONTENT_TYPES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

CORE = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>হোটেল চেক-আউটে বাকি টাকা — Accounts Receivable Risks</dc:title>
  <dc:subject>Accounts Receivable, Advance Against Booking, hotel checkout dues</dc:subject>
  <dc:creator>Cashbook BD</dc:creator>
  <cp:lastModifiedBy>Cashbook BD</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-10-27T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-27T00:00:00Z</dcterms:modified>
</cp:coreProperties>'''

APP = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Cashbook BD</Company>
  <AppVersion>16.0000</AppVersion>
</Properties>'''


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    parts = {
        "[Content_Types].xml": CONTENT_TYPES,
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": DOCUMENT,
        "word/styles.xml": STYLES,
        "word/_rels/document.xml.rels": DOC_RELS,
        "docProps/core.xml": CORE,
        "docProps/app.xml": APP,
    }
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in parts.items():
            zf.writestr(name, content.encode("utf-8"))

    # Validate every XML part parses.
    with zipfile.ZipFile(OUT) as zf:
        bad = zf.testzip()
        if bad:
            raise SystemExit(f"corrupt zip entry: {bad}")
        for name in zf.namelist():
            if name.endswith(".xml") or name.endswith(".rels"):
                ET.fromstring(zf.read(name))
    print(f"OK {OUT} ({os.path.getsize(OUT)} bytes)")


if __name__ == "__main__":
    main()
