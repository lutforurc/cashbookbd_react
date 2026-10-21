/**
 * Product In / Product Out screens: the dialogs, the edit, the photos.
 *
 *     node _product_in_out_screens_check.mjs
 *
 * Reads the screens back and insists the pieces still point at each other:
 * no browser confirm() left on these screens, every question asked through the
 * app's own dialogs, a saved slip openable for editing and sent to update, and
 * the write-off's photos attached on save and shown on the list.
 */
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
let pass = 0;
let fail = 0;
const check = (label, ok) => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};

const dir = 'src/components/modules';
const outForm = read(`${dir}/product-out/ProductOut.tsx`);
const outList = read(`${dir}/product-out/ProductOutList.tsx`);
const outReason = read(`${dir}/product-out/ProductOutReason.tsx`);
const outSlice = read(`${dir}/product-out/productOutSlice.tsx`);
const inForm = read(`${dir}/product-in/ProductIn.tsx`);
const inList = read(`${dir}/product-in/ProductInList.tsx`);
const inReason = read(`${dir}/product-in/ProductInReason.tsx`);
const inSlice = read(`${dir}/product-in/productInSlice.tsx`);
const routes = read('src/components/services/apiRoutes.tsx');

console.log('No browser dialogs\n');
for (const [name, src] of Object.entries({ outForm, outList, outReason, inForm, inList, inReason })) {
  check(`${name}: no window.confirm / alert`, !/window\.(confirm|alert)\(/.test(src));
}

console.log('\nThe app\'s own dialogs\n');
check('Product Out shortage asks in StockShortageModal', /<StockShortageModal/.test(outForm) && /submit\(true\)/.test(outForm));
check('both lists: delete through ConfirmModal', /title="Confirm Deletion"/.test(outList) && /title="Confirm Deletion"/.test(inList));
check('both lists: approve / remove approval through ConfirmModal', /'Remove Approval' : 'Confirm Approval'/.test(outList) && /'Remove Approval' : 'Confirm Approval'/.test(inList));
check('both reason screens: remove through ConfirmModal', /title="Remove Reason"/.test(outReason) && /title="Remove Reason"/.test(inReason));

console.log('\nEditing a saved slip\n');
check('update URLs declared', /API_PRODUCT_OUT_UPDATE_URL = `\$\{API_BASE_URL\}\/product-out\/update`/.test(routes) && /API_PRODUCT_IN_UPDATE_URL = `\$\{API_BASE_URL\}\/product-in\/update`/.test(routes));
check('slices post to update/{id}', /\$\{API_PRODUCT_OUT_UPDATE_URL\}\/\$\{id\}/.test(outSlice) && /\$\{API_PRODUCT_IN_UPDATE_URL\}\/\$\{id\}/.test(inSlice));
check('lists offer Edit only on an unapproved slip', /canDelete && !row\?\.is_approved && onEdit/.test(outList) && /canDelete && !row\?\.is_approved && onEdit/.test(inList));
check('forms hand the list their edit handler', /onEdit=\{handleEditSlip\}/.test(outForm) && /onEdit=\{handleEditReceipt\}/.test(inForm));
check('forms send to update while editing', /editing \? updateProductOut\(editing\.id/.test(outForm) && /editing \? updateProductIn\(editing\.id/.test(inForm));
check('an approved slip is not opened for editing', /master\.is_approved/.test(outForm) && /master\.is_approved/.test(inForm));
check('Product In asks each line\'s rate again on edit', /API_PRODUCT_IN_RATE_URL\}\/\$\{line\.product_id\}/.test(inForm));
check('Save reads Update, Reset reads Cancel Edit, while editing', /editing \? 'Update' : 'Save'/.test(outForm) && /editing \? 'Cancel Edit' : 'Reset All'/.test(inForm));
check('reset leaves edit mode', /setEditing\(null\)/.test(outForm) && /setEditing\(null\)/.test(inForm));

console.log('\nWrite-off photos\n');
check('a file box for photos', /id="outPhotos"/.test(outForm) && /accept="image\/\*,\.pdf"/.test(outForm));
check("uploaded as images[] to the voucher uploader", /append\('images\[\]', file\)/.test(outForm) && /API_IMAGE_UPLOAD_URL\}\$\{mainTrxId\}/.test(outForm));
check('uploaded after the save, on the saved voucher', /response\?\.data\?\.data\?\.main_trx_id/.test(outForm) && /uploadPhotos\(mainTrxId\)/.test(outForm));
check('photos cleared with the form', /setPhotos\(\[\]\)/.test(outForm));
check('list shows them through ImagePopup', /<ImagePopup/.test(outList) && /branchPad=\{row\?\.branch_pad/.test(outList));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
