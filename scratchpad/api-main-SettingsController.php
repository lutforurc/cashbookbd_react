<?php

namespace App\Http\Controllers\settings;

use App\Http\Controllers\Controller;
use App\Models\Acc\CoaLevel4;
use App\Models\Acc\VoucherType;
use App\Models\Admin\PaperSize;
use App\Models\Com\Branch;
use App\Models\Com\BranchType;
use App\Models\Com\BusinessType;
use App\Models\Com\Company;
use App\Models\InventorySystem;
use App\Models\Settings\SoftwareInfo;
use App\Models\TutorialVideo;
use App\Services\Role\CompanyRoleScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use App\Models\UserThemeSetting;

class SettingsController extends Controller
{
    public $user;

    public function __construct(private CompanyRoleScope $companyRoleScope)
    {
        $this->user = Auth::user();
    }

    public function getSettings()
    {
        $user = Auth::user();
        $user->use_filter_parameter = meta($user->id, $user->branch_id, 'use_filter_parameter');
        $user->sidebar_menu = meta($user->id, $user->branch_id, 'sidebar_menu');

        // What this user chose the software to look like. The web app writes
        // them onto the root element as CSS variables the moment these arrive,
        // so the colours are on the first screen rather than after a reload.
        foreach (UserThemeSetting::payloadFor((int) $user->id) as $key => $value) {
            $user->{$key} = $value;
        }
        $settings = [
            'user'        => $user,
            'trx_dt'      => us_to_bd_date(currentTransactionDate()),
            'permissions' => $this->getPermissions(),
            'company'     => $this->company($user),
            'branch'      => $this->branch($user),
            'software'    => SoftwareInfo::first(),
            'env'         => config('app.env'),
            // One map per platform, both sent to both apps: the payload is
            // shared, each client reads the key that is its own, and neither
            // needs the server to work out what it is running on.
            'tutorial_videos'        => $this->tutorialVideos('web_url'),
            'tutorial_videos_mobile' => $this->tutorialVideos('mobile_url'),
            'is_platform_admin'   => $this->isPlatformOperator($user),
            // Only an operator can register a screen, and only they need to
            // know which ones are already on file, so everyone else is spared
            // a couple of hundred strings they would never read.
            'tutorial_video_keys' => $this->isPlatformOperator($user)
                ? TutorialVideo::pluck('screen_key')->all()
                : [],
        ];

        return foundData($settings);
    }

    /**
     * screen_key => URL for every screen with a walkthrough on one platform.
     *
     * Rides along with the settings payload rather than getting an endpoint of
     * its own: it is a few hundred bytes, every screen that needs it already
     * waits on this response, and a per-screen request would cost a round trip
     * to render one icon.
     *
     * Rows without a URL are dropped here instead of in the front end, so a
     * screen seeded ahead of its recording simply finds nothing and shows no
     * link. A screen recorded for the web only is therefore in the web map and
     * absent from the mobile one -- deliberately, since a web walkthrough does
     * not describe the app's version of the same job.
     *
     * @param string $column 'web_url' or 'mobile_url'.
     */
    private function tutorialVideos(string $column): object
    {
        $videos = TutorialVideo::where('status', 1)
            ->whereNotNull($column)
            ->where($column, '<>', '')
            ->pluck($column, 'screen_key')
            ->all();

        // Cast so an empty map reaches the front end as {} rather than the []
        // an empty PHP array would encode to.
        return (object) $videos;
    }

    /**
     * Whether this user runs the platform rather than a tenant of it.
     *
     * Same rule the PlatformAdmin middleware enforces, mirrored here so the
     * front end can decide whether to offer operator-only behaviour instead of
     * finding out from a 403.
     */
    private function isPlatformOperator($user): bool
    {
        return in_array(
            (int) $user->company_id,
            config('subscription.platform_company_ids', [1]),
            true
        );
    }

    private function company($user)
    {
        $companyId = $user->company_id;
        $company = Company::find($companyId);

        return $company;
    }

    private function branch($user)
    {
        $branchId = $user->branch_id;
        $branch = Branch::find($branchId);

        $branch->money_format       = meta($branch->id, $branch->id, 'money_format');
        $branch->is_opening         = meta($branch->id, $branch->id, 'is_opening');
        $branch->have_is_guaranter  = meta($branch->id, $branch->id, 'have_is_guaranter');
        $branch->have_customer_nominee  = meta($branch->id, $branch->id, 'have_customer_nominee');
        $branch->invoice_label      = meta($branch->id, $branch->id, 'invoice_label');
        // What the sales invoice calls its four handwritten figures. The screen
        // falls back to the standard names when these are blank.
        $branch->manual_voucher_no_label   = meta($branch->id, $branch->id, 'manual_voucher_no_label');
        $branch->manual_voucher_date_label = meta($branch->id, $branch->id, 'manual_voucher_date_label');
        $branch->manual_challan_no_label   = meta($branch->id, $branch->id, 'manual_challan_no_label');
        $branch->manual_challan_date_label = meta($branch->id, $branch->id, 'manual_challan_date_label');
        $branch->stock_report_type  = meta($branch->id, $branch->id, 'stock_report_type');
        // Branch Setup > Invoice Setup > "Show Product Information in Ledger
        // Details". The Purchase and Sales ledgers read it to decide whether
        // their Product & Details column draws the product lines. Blank for a
        // branch that has never been asked, which the ledgers read as on -- the
        // column they have always drawn.
        $branch->ledger_show_product_details = meta($branch->id, $branch->id, 'ledger_show_product_details');
        $branch->deduct_stock_on_delivery = flagMeta($branch->id, 'deduct_stock_on_delivery', false) ? 1 : 0;
        $branch->need_product_group  = meta($branch->id, $branch->id, 'need_product_group');
        $branch->need_package  = meta($branch->id, $branch->id, 'need_package');
        $branch->need_code  = meta($branch->id, $branch->id, 'need_code');
        // Branch Setup -> Product Setup -> "Editable Measurement on Product
        // List?". On, the Product List draws the four measurement/package
        // columns as inputs that save as each box is left. Off, it does not
        // draw them at all.
        $branch->product_list_inline_edit  = meta($branch->id, $branch->id, 'product_list_inline_edit');
        $branch->show_instalment_list  = meta($branch->id, $branch->id, 'show_instalment_list');
        $branch->show_spelling_of_money  = meta($branch->id, $branch->id, 'show_spelling_of_money');
        $branch->show_sales_balance_summary = flagMeta($branch->id, 'show_sales_balance_summary', false) ? 1 : 0;
        $branch->need_customer_contact_person  = meta($branch->id, $branch->id, 'need_customer_contact_person');
        $branch->due_list_with_address  = meta($branch->id, $branch->id, 'due_list_with_address');
        $branch->due_list_show_area  = flagMeta($branch->id, 'due_list_show_area', true) ? 1 : 0;
        $branch->mobile_number_format  = meta($branch->id, $branch->id, 'mobile_number_format');
        $branch->need_relation_info  = meta($branch->id, $branch->id, 'need_relation_info');
        $branch->need_customer_mother_name  = meta($branch->id, $branch->id, 'need_customer_mother_name');
        $branch->need_customer_sex  = meta($branch->id, $branch->id, 'need_customer_sex');
        $branch->salutation_male  = meta($branch->id, $branch->id, 'salutation_male');
        $branch->salutation_female  = meta($branch->id, $branch->id, 'salutation_female');
        $branch->salutation_other  = meta($branch->id, $branch->id, 'salutation_other');
        $branch->letter_signature  = meta($branch->id, $branch->id, 'letter_signature');
        // Branch Setup -> Product Setup -> "Product Tracking?". The cash
        // received and cash payment screens read it to decide whether their
        // product box stays on the form: on, it is there for every party, with
        // "-- No Product --" where that party has nothing tracked. Off, the
        // form is the form it always was. The branch edit screen has had this
        // for a while; the settings payload had not, so the voucher screens
        // could not see it.
        $branch->product_tracking  = meta($branch->id, $branch->id, 'product_tracking');
        // Branch Setup -> Product Setup -> "Delete With Opening Invoice?".
        // Product List shows its second delete button only when this is on.
        $branch->delete_with_opening_invoice  = meta($branch->id, $branch->id, 'delete_with_opening_invoice');
        $branch->delete_with_opening_invoice_date  = meta($branch->id, $branch->id, 'delete_with_opening_invoice_date');
        // Company scheme: whether the Electronics invoice offers the switch, and
        // the days after the sale its default due date falls on. Unset is 30.
        $branch->company_scheme  = meta($branch->id, $branch->id, 'company_scheme');
        $branch->company_scheme_due_days  = numericMeta($branch->id, 'company_scheme_due_days') ?? 30;
        // A weekday (0 Sunday .. 6 Saturday) wins over the days when set.
        $branch->company_scheme_due_weekday  = numericMeta($branch->id, 'company_scheme_due_weekday');
        $branch->need_customer_date_of_birth  = meta($branch->id, $branch->id, 'need_customer_date_of_birth');
        $branch->need_customer_occupation  = meta($branch->id, $branch->id, 'need_customer_occupation');
        $branch->need_customer_permanent_address  = meta($branch->id, $branch->id, 'need_customer_permanent_address');
        $branch->need_customer_photo  = meta($branch->id, $branch->id, 'need_customer_photo');
        // The customer forms (web and mobile) show the National ID field only
        // when the branch asks for it; without this line the toggle saved on
        // the branch screen never reached them.
        $branch->need_customer_national_id  = meta($branch->id, $branch->id, 'need_customer_national_id');
        $branch->need_nominee_photo  = meta($branch->id, $branch->id, 'need_nominee_photo');
        $branch->need_customer_area  = meta($branch->id, $branch->id, 'need_customer_area');
        // Branch Setup -> Customer Setup -> "Customer Handle By Employee". On,
        // the Add and Edit Customer forms offer a picker of this branch's own
        // staff and List Customers gains a filter and a column beside the
        // address. Unset reads as off, like the other need_customer_* switches.
        $branch->need_customer_handle_by_employee  = meta($branch->id, $branch->id, 'need_customer_handle_by_employee');
        $branch->show_voucher_image  = meta($branch->id, $branch->id, 'show_voucher_image');
        // Whether screens offer their walkthrough video. The branch setup form
        // has carried this switch for some time but nothing was ever told about
        // it, so the links showed whether or not a branch wanted them.
        $branch->need_demo_tutorial  = meta($branch->id, $branch->id, 'need_demo_tutorial');
        // Drives the order form: one product (the historical form) or many.
        $branch->multi_product_order  = meta($branch->id, $branch->id, 'multi_product_order');
        // What an allotment letter's reference number starts with, so the screen
        // issuing one can offer the branch's own numbering before it is edited.
        $branch->letter_ref_prefix  = meta($branch->id, $branch->id, 'letter_ref_prefix');
        // Whether a letter carries its reference at all. Settled here rather
        // than passed on raw, since unset has to mean on.
        $branch->print_letter_ref  = flagMeta($branch->id, 'print_letter_ref', true) ? 1 : 0;
        // The date the branch's letters carry, offered the same way. Unset, the
        // screen offers today instead.
        $branch->letter_ref_date  = meta($branch->id, $branch->id, 'letter_ref_date');
        // Whether a print draws its own pad head, and how deep the pre-printed
        // one is when it does not.
        $branch->pad_print_mode  = meta($branch->id, $branch->id, 'pad_print_mode');
        $branch->preprinted_pad_height  = numericMeta($branch->id, 'preprinted_pad_height');
        // Branch Setup -> Print Setup -> Pad Logo: whether the company mark is
        // drawn on the pad head, where it sits, how large it is and how far it
        // stands from the paper's edges. Read from here by every print, so a
        // saved answer reaches the paper without another request.
        $branch->pad_logo_enabled  = flagMeta($branch->id, 'pad_logo_enabled', false) ? 1 : 0;
        $branch->pad_logo_position = (string) (meta($branch->id, $branch->id, 'pad_logo_position') ?: 'right');
        $branch->pad_logo_width  = numericMeta($branch->id, 'pad_logo_width');
        $branch->pad_logo_height  = numericMeta($branch->id, 'pad_logo_height');
        $branch->pad_logo_margin_top  = numericMeta($branch->id, 'pad_logo_margin_top');
        $branch->pad_logo_margin_right  = numericMeta($branch->id, 'pad_logo_margin_right');
        $branch->pad_logo_margin_left  = numericMeta($branch->id, 'pad_logo_margin_left');
        $branch->decimal_places  = meta($branch->id, $branch->id, 'decimal_places');
        $branch->dashboard_top_sales_days  = meta($branch->id, $branch->id, 'dashboard_top_sales_days');
        // How far back the transaction report button on List Customers opens.
        // Unset, a month -- settled here so every client inherits the same
        // reading rather than each one inventing a fallback of its own.
        $branch->default_report_days  = numericMeta($branch->id, 'default_report_days') ?? 30;
        $branch->device_identifier_text  = meta($branch->id, $branch->id, 'device_identifier_text');
        $branch->show_category_in_invoice  = meta($branch->id, $branch->id, 'show_category_in_invoice');
        $branch->show_brand_in_invoice  = meta($branch->id, $branch->id, 'show_brand_in_invoice');
        $branch->show_description_in_invoice  = meta($branch->id, $branch->id, 'show_description_in_invoice');
        $branch->combined_invoice_note  = meta($branch->id, $branch->id, 'combined_invoice_note');
        // Branch Setup -> Invoice Setup: which existing form each invoice
        // category opens on. Blank is Automatic -- the screen keeps choosing
        // the form from the business type as it always has.
        $branch->invoice_variant_purchase  = (string) (meta($branch->id, $branch->id, 'invoice_variant_purchase') ?: '');
        $branch->invoice_variant_sales  = (string) (meta($branch->id, $branch->id, 'invoice_variant_sales') ?: '');
        $branch->invoice_variant_purchase_return  = (string) (meta($branch->id, $branch->id, 'invoice_variant_purchase_return') ?: '');
        $branch->invoice_variant_sales_return  = (string) (meta($branch->id, $branch->id, 'invoice_variant_sales_return') ?: '');
        $branch->invoice_variant_combined  = (string) (meta($branch->id, $branch->id, 'invoice_variant_combined') ?: '');
        // Branch Setup -> Forms Setup: the preferred cash/bank form. Blank is
        // Automatic -- the screen keeps choosing its own.
        $branch->form_variant_cash_received  = (string) (meta($branch->id, $branch->id, 'form_variant_cash_received') ?: '');
        $branch->form_variant_cash_payment  = (string) (meta($branch->id, $branch->id, 'form_variant_cash_payment') ?: '');
        $branch->form_variant_bank_received  = (string) (meta($branch->id, $branch->id, 'form_variant_bank_received') ?: '');
        $branch->form_variant_bank_payment  = (string) (meta($branch->id, $branch->id, 'form_variant_bank_payment') ?: '');
        // Branch Setup -> Forms Setup: unified or separate, each side its own.
        // Blank is Automatic.
        $branch->received_entry_mode  = (string) (meta($branch->id, $branch->id, 'received_entry_mode') ?: '');
        $branch->payment_entry_mode  = (string) (meta($branch->id, $branch->id, 'payment_entry_mode') ?: '');
        // Branch Setup -> Product Dropdown: which lines the product search box
        // shows beside a product's name. Settled the same way as
        // print_letter_ref above, since five of the seven have to read as on
        // for a branch that has never been asked.
        $branch->product_ddl_show_name  = flagMeta($branch->id, 'product_ddl_show_name', true) ? 1 : 0;
        $branch->product_ddl_show_category  = flagMeta($branch->id, 'product_ddl_show_category', true) ? 1 : 0;
        $branch->product_ddl_show_brand  = flagMeta($branch->id, 'product_ddl_show_brand', false) ? 1 : 0;
        $branch->product_ddl_show_group  = flagMeta($branch->id, 'product_ddl_show_group', false) ? 1 : 0;
        $branch->product_ddl_show_purchase_price  = flagMeta($branch->id, 'product_ddl_show_purchase_price', true) ? 1 : 0;
        $branch->product_ddl_show_sales_price  = flagMeta($branch->id, 'product_ddl_show_sales_price', true) ? 1 : 0;
        $branch->product_ddl_show_unit  = flagMeta($branch->id, 'product_ddl_show_unit', true) ? 1 : 0;
        $branch->product_ddl_show_balance  = flagMeta($branch->id, 'product_ddl_show_balance', false) ? 1 : 0;
        // 'single' or 'multiple', settled for the same reason as the switches
        // above: a branch that has never been asked has always had multiple.
        $branch->product_ddl_lines  = meta($branch->id, $branch->id, 'product_ddl_lines') === 'single' ? 'single' : 'multiple';
        // Branch Setup -> Customer / Supplier Dropdown: the same, for the party
        // search box on the invoice screens. This is the copy the front end
        // actually reads -- see DdlMultiline.
        $branch->party_ddl_show_code  = flagMeta($branch->id, 'party_ddl_show_code', true) ? 1 : 0;
        $branch->party_ddl_show_mobile  = flagMeta($branch->id, 'party_ddl_show_mobile', true) ? 1 : 0;
        $branch->party_ddl_show_address  = flagMeta($branch->id, 'party_ddl_show_address', true) ? 1 : 0;
        $branch->party_ddl_show_father  = flagMeta($branch->id, 'party_ddl_show_father', true) ? 1 : 0;
        $branch->party_ddl_lines  = meta($branch->id, $branch->id, 'party_ddl_lines') === 'single' ? 'single' : 'multiple';


        return $branch;
    }

    private function getPermissions()
    {
        $user = Auth::user();

        if (!$user) {
            return collect();
        }

        // effectivePermissions(), not visiblePermissions(): the front end gates
        // buttons on this list, so it has to say what the user may do rather
        // than what they may hand out. The two differ for the platform
        // operator's administrators, who may hand out the whole table -- gating
        // on that showed them every button no matter what their role said.
        $permissions = $this->companyRoleScope
            ->effectivePermissions($user)
            ->unique('id')
            ->sortBy('name')
            ->map(fn ($permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'group_name' => $permission->group_name,
                'guard_name' => $permission->guard_name,
            ])
            ->values();

        if ($user->hasRole('Owner') && !$permissions->contains('name', 'ledger.view')) {
            $permissions->push((object) [
                'id' => null,
                'name' => 'ledger.view',
                'group_name' => 'Ledger',
                'guard_name' => 'web',
            ]);

            return $permissions
                ->sortBy('name')
                ->values();
        }

        return $permissions;
    }

    public function voucherTypes()
    {
        $voucherTypes = VoucherType::all();
        if ($voucherTypes) {
            return foundData($voucherTypes);
        }
        return notFound('No voucher types found.');
    }

    public function serviceList()
    {
        $services = CoaLevel4::whereIn('id', [41, 42, 43, 197, 198])->get(['id', 'name']);
        if (!$services->isEmpty()) {
            return foundData($services);
        }
        return notFound('No services found.');
    }

    public function getBranchSettings()
    {
        $branchSettings = [
            'businessType'     => BusinessType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get(),
            'branchType'       => BranchType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get(),
            'inventorySystem'  => InventorySystem::where('status', 1)->select('id', 'name')->orderBy('id', 'ASC')->get(),
            'paperSize'        => PaperSize::select('id', 'name')->orderBy('is_default', 'DESC')->orderBy('name')->get()
        ];

        return foundData($branchSettings);
    }
}
