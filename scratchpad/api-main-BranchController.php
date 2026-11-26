<?php

namespace App\Http\Controllers\Company;

use App\Http\Requests\Company\BranchStoreRequest;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Controllers\CommonFunction\Common;
use App\Services\Role\CompanyRoleScope;
use App\Models\Com\Branch;
use App\Models\Com\BranchType;
use App\Models\Com\Company;
use App\Models\Admin\Dayclose;
use App\Models\Admin\PaperSize;
use App\Models\Com\BusinessType;
use DataTables;
use Brian2694\Toastr\Facades\Toastr;
use App\Models\Meta;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use App\Enums\Constant;
use App\Services\Hotel\HotelAccountHead;
use App\Services\Hotel\ItemTax;
use App\Services\OpeningBalance\PartyOpeningBalanceService;
use App\Services\OpeningBalance\ProductOpeningBalanceService;
use App\Services\InterBranch\InterBranchAccountHead;
use App\Services\SubscriptionLimitService;
use Carbon\Carbon;

use SebastianBergmann\CodeCoverage\Driver\PhpdbgDriver;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */

    public function __construct(private CompanyRoleScope $companyRoleScope)
    {
        //$auth = auth()->user();
    }
    public function index()
    {
        $branches = Branch::where('status', '1')->orderBy('name')->get();

        // dd($branches);

        return view('branch.index', compact('branches'));
    }


    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        $branchtype    = BranchType::select('id', 'name')->orderBy('name')->get();
        $company       = Company::select('id', 'name')->get();
        $businesstypes = DB::select('SELECT id, `name`, `status` FROM business_type order by name');
        $papersizes     = PaperSize::select('id', 'name')->orderBy('is_default', 'DESC')->orderBy('name')->get();

        return view('branch.add-branch', [
            'branchtypes'   => $branchtype,
            'companies'     => $company,
            'businesstypes' => $businesstypes,
            'papersizes'    => $papersizes
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {

        $this->validate($request, [
            'name'          => 'required',
            'branchtype'    => 'required|numeric',
            'businesstype'  => 'required|numeric',
            'address'       => 'required',
            'contactperson' => 'required'
        ]);

        $branchQuotaMessage = $this->branchQuotaRefusalMessage((int) \Auth::user()->company_id);
        if ($branchQuotaMessage) {
            // This route's own convention (see the success path at the end of
            // this method): a flashed message and a redirect back to the list,
            // not a JSON body -- the legacy Blade form reads Session, not a
            // response payload.
            \Session::flash('error_message', $branchQuotaMessage);
            return redirect('accounts/branch');
        }

        DB::beginTransaction();
        try {

            $branch = $this->branchData($request);


            $id = DB::table('com_branches')->insertGetId($branch);

            // The head this branch will owe and be owed through. Opened now
            // rather than left for somebody to remember, because a branch
            // without one has nowhere to post a transfer the day it makes one.
            InterBranchAccountHead::ensureForBranch($id);

            $dayclose = $this->dateClose($id);
            DB::table('admin_day_closes')->insertGetId($dayclose);

            // Money Format
            $identify =  ['identify_id' => $id, 'branch_id'   => $id];
            $metaData = [
                [
                    'meta_key'   => 'money_format',
                    'meta_value' => $request->money_format,
                ],
                [
                    'meta_key'   => 'invoice_label',
                    'meta_value' => $request->invoice_label,
                ],
                // What the sales invoice calls its four handwritten figures.
                // Stored as text, so the branch can name them the way its own
                // counter does; left blank, the screen falls back to the
                // standard four names.
                [
                    'meta_key'   => 'manual_voucher_no_label',
                    'meta_value' => $request->manual_voucher_no_label,
                ],
                [
                    'meta_key'   => 'manual_voucher_date_label',
                    'meta_value' => $request->manual_voucher_date_label,
                ],
                [
                    'meta_key'   => 'manual_challan_no_label',
                    'meta_value' => $request->manual_challan_no_label,
                ],
                [
                    'meta_key'   => 'manual_challan_date_label',
                    'meta_value' => $request->manual_challan_date_label,
                ],
                // Whether this branch's party ledger shows a discounted bill
                // whole, with the discount broken out as a line of its own.
                // Nothing set -- null from an untouched form -- is "as it was".
                [
                    'meta_key'   => 'ledger_discount_split',
                    'meta_value' => $request->ledger_discount_split,
                ],
                // Whether this branch's Purchase and Sales ledgers print the
                // product lines inside their Product & Details column.
                [
                    'meta_key'   => 'ledger_show_product_details',
                    'meta_value' => $request->ledger_show_product_details,
                ],
                [
                    'meta_key'   => 'have_is_guaranter',
                    'meta_value' => $request->have_is_guaranter,
                ],
                [
                    'meta_key'   => 'is_opening',
                    'meta_value' => $request->is_opening,
                ],
                [
                    'meta_key'   => 'stock_report_type',
                    'meta_value' => $request->stock_report_type,
                ],
                [
                    'meta_key'   => 'need_product_group',
                    'meta_value' => $request->need_product_group,
                ],
                [
                    'meta_key'   => 'need_package',
                    'meta_value' => $request->need_package,
                ],
                [
                    'meta_key'   => 'need_code',
                    'meta_value' => $request->need_code,
                ],
                [
                    'meta_key'   => 'show_instalment_list',
                    'meta_value' => $request->show_instalment_list,
                ],
                [
                    // Every new branch starts with the demo tutorial on.
                    'meta_key'   => 'need_demo_tutorial',
                    'meta_value' => $request->need_demo_tutorial ?? '1',
                ],
                [
                    'meta_key'   => 'sms_service',
                    'meta_value' => $request->sms_service,
                ],
                [
                    'meta_key'   => 'received_sms',
                    'meta_value' => $request->received_sms,
                ],
                [
                    'meta_key'   => 'purchase_sms',
                    'meta_value' => $request->purchase_sms,
                ],
            ];

            $this->saveBranchMetas($identify, $metaData);
            DB::commit();

            \Session::flash('success_message', 'Branch saved successfully.');
        } catch (\Exception $e) {

            DB::rollback();
            return $e->getMessage();
        }


        return redirect('accounts/branch');
    }

    /**
     * Display the specified resource.
     *
     * @param  int $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        $branch = $this->companyRoleScope->findScopedBranch($id, Auth::user());

        if (! $branch) {
            abort(404);
        }
        $branchtypes = BranchType::all();

        //dd(meta( $branch['id'], $branch['id'], 'invoice_label')); 

        $businesstypes = DB::select('SELECT * FROM business_type');
        $papersizes     = PaperSize::select('id', 'name')->orderBy('is_default', 'DESC')->orderBy('name')->get();
        return view('branch.edit', compact('branch', 'branchtypes', 'businesstypes', 'papersizes'));
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request $request
     * @param  int $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {


        $request->validate([
            'name'          => 'required',
            'branchtype'    => 'required|numeric',
            'businesstype'  => 'required|numeric',
            'address'       => 'required',
            'contactperson' => 'required',
            'padd_heading'  => 'required',
            'print_size'    => 'required',
        ]);

        $branch = $this->companyRoleScope->findScopedBranch($id, Auth::user());

        try {
            if ($branch) {
                $branch->name                             = $request->name;
                $branch->name_local                       = $request->name_local ?: null;
                $branch->address_local                    = $request->address_local ?: null;
                $branch->branch_types_id                  = $request->branchtype;
                $branch->business_type_id                 = $request->businesstype;
                $branch->have_customer_sl                 = isset($request->serialnumber)  ? $request->serialnumber : 0;
                $branch->warranty_controll                = isset($request->warranty_controll)  ? $request->warranty_controll : 0;
                $branch->manufactur_control               = isset($request->manufactur_control)  ? $request->manufactur_control : 0;
                $branch->purchase_note                    = isset($request->purchase_note)  ? $request->purchase_note : null;
                $branch->sales_note                       = isset($request->sales_note)  ? $request->sales_note : null;
                $branch->have_warehouse                   = isset($request->have_warehouse)  ? $request->have_warehouse : 0;
                $branch->use_bangla                       = isset($request->use_bangla)  ? $request->use_bangla : 0;
                $branch->report_zero_bal                  = isset($request->report_zero_bal)  ? $request->report_zero_bal : 0;
                $branch->warn_negative_stock_sale         = (int) ($request->warn_negative_stock_sale ?? 0);
                $branch->block_negative_stock_sale        = (int) ($request->block_negative_stock_sale ?? 0);
                $branch->share_customer_with_other_branch = isset($request->share_customer_with_other_branch)  ? $request->share_customer_with_other_branch     : 0;
                $branch->share_product_with_other_branch  = isset($request->share_product_with_other_branch)  ? $request->share_product_with_other_branch     : 0;
                $branch->address                          = $request->address;
                $branch->phone                            = $request->phone;
                $branch->contact_person                   = $request->contactperson;
                $branch->notes                            = $request->note;
                $branch->pad_heading_print                = $request->padd_heading;
                $branch->print_size                       = $request->print_size;
                $branch->email                            = isset($request->email) ? $request->email : null;
                $branch->update_by                        = \Auth::user()->id;
                $branch->status                           = $request->branch_status ?? 1;
                $branch->updated_at                       = \Carbon\Carbon::now();
                $branch->save();

                \Session::flash('success_message', 'Branch update successfully.');

                // Money Format Update
                $identify =  ['identify_id' => $branch->id, 'branch_id'   => $branch->id];
                $metaData = [
                    [
                        'meta_key'   => 'money_format',
                        'meta_value' => $request->money_format,   // See app\Enums\Constant\MoneyFormat
                    ],
                    [
                        'meta_key'   => 'invoice_label',
                        'meta_value' => $request->invoice_label,   // See app\Enums\Constant\MoneyFormat
                    ],
                    // The four handwritten figures' names on the sales invoice.
                    [
                        'meta_key'   => 'manual_voucher_no_label',
                        'meta_value' => $request->manual_voucher_no_label,
                    ],
                    [
                        'meta_key'   => 'manual_voucher_date_label',
                        'meta_value' => $request->manual_voucher_date_label,
                    ],
                    [
                        'meta_key'   => 'manual_challan_no_label',
                        'meta_value' => $request->manual_challan_no_label,
                    ],
                    [
                        'meta_key'   => 'manual_challan_date_label',
                        'meta_value' => $request->manual_challan_date_label,
                    ],
                    // Whether this branch's party ledger shows a discounted bill
                    // whole, with the discount broken out as a line of its own.
                    // Nothing set -- null from an untouched form -- is "as it was".
                    [
                        'meta_key'   => 'ledger_discount_split',
                        'meta_value' => $request->ledger_discount_split,
                    ],
                    // Whether this branch's Purchase and Sales ledgers print the
                    // product lines inside their Product & Details column. Kept
                    // beside the add path above so Branch Edit saves it exactly
                    // as Branch Add does.
                    [
                        'meta_key'   => 'ledger_show_product_details',
                        'meta_value' => $request->ledger_show_product_details,
                    ],
                    [
                        'meta_key'   => 'have_is_guaranter',
                        'meta_value' => $request->have_is_guaranter,
                    ],
                    [
                        'meta_key'   => 'is_opening',
                        'meta_value' => $request->is_opening,
                    ],
                    [
                        'meta_key'   => 'show_instalment_list',
                        'meta_value' => $request->show_instalment_list,
                    ],
                ];
                $this->saveBranchMetas($identify, $metaData);

                Toastr::success(' (' . $request->name . ')' . ' Update success.', '', ["positionClass" => "toast-bottom-right"]);
                return \Redirect::back();
            }
        } catch (\Exception $e) {
            \DB::rollback();
            \Session::flash('error_message', 'Branch update not success.');
            return \Redirect::back();
        }
    }

    public function branchinfo($id)
    {
        // $brtype = \DB::select('
        //             select c.id cid, c.name company_name, b.id, b.name, b.address,
        //             u.name user_name, bt.id typeid, bt.name type,
        //             b.contact_person, b.notes, b.email email, b.phone, DATE_FORMAT(b.created_at, "%d/%m/%Y") crated_at
        //             from com_branches b
        //             join users u on b.created_by = u.id
        //             join com_branch_types bt on bt.id = b.branch_types_id
        //             join com_companies c on c.id=b.company_id
        //             where b.id=' . $id );
        // return $brtype;

        $branch = Branch::with(['creator', 'branchType', 'company'])
            // ->where('id', $id)
            ->get();
        return $branch;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

    public function ddlactivebranch()
    {
        $branch = Branch::select('id', 'name', 'name_local')
            ->where('status', 1)->get();
        return $branch;
    }

    public function ajax()
    {

        // $branches = DB::select("SELECT cb.id, cb.name branch_name, cb.contact_person, cb.phone,
        //                         cbt.name branch_type, bt.name business_type
        //                         FROM com_branches cb
        //                         JOIN com_branch_types cbt ON cbt.id = cb.branch_types_id
        //                         JOIN business_type bt ON bt.id = cb.business_type_id");

        // Current Query
        $branches = DB::table('com_branches as cb')
            ->join('com_branch_types as cbt', 'cbt.id', '=', 'cb.branch_types_id')
            ->join('business_type as bt', 'bt.id', '=', 'cb.business_type_id')
            ->select('cb.id', 'cb.name as branch_name', 'cb.contact_person', 'cb.phone', 'cbt.name as branch_type', 'bt.name as business_type')
            ->get();


        return DataTables::of($branches)
            ->addColumn('action', function ($branches) {
                $url = url('/accounts/branch/' . $branches->id . '/edit');
                $action = "<a href='" . $url . "'>Edit</a>";
                return  $action;
            })

            ->make(true);
    }

    /**
     * How many active branches this company's plan allows it to keep, or the
     * refusal to hand `apiStore()` when it has none left.
     *
     * Mirrors UserController::ensureUserQuotaAvailable() exactly -- same 200
     * status ("a business code, not the HTTP status" is this codebase's
     * convention), same {success:false, error:{code:200, message}} shape --
     * so the React/mobile clients that already know how to read a quota
     * refusal for Add User read this one the same way.
     */
    private function ensureBranchQuotaAvailable(int $companyId)
    {
        $message = $this->branchQuotaRefusalMessage($companyId);

        if (!$message) {
            return null;
        }

        return response()->json([
            'success' => false,
            'error' => [
                'code' => 200,
                'message' => $message,
            ],
        ], 200);
    }

    /**
     * The sentence to refuse a new branch with, or null when there's room.
     *
     * Shared between apiStore() (the React/mobile path) and the legacy
     * store() (still routed via web.php's Route::resource) -- unlike
     * UserController::store(), which api.php never wires up, this one is
     * reachable, so it needs the same check, just voiced in its own way.
     */
    private function branchQuotaRefusalMessage(int $companyId): ?string
    {
        $maxBranches = app(SubscriptionLimitService::class)->maxBranches($companyId);

        if ($maxBranches === null || $maxBranches <= 0) {
            return null;
        }

        $activeBranches = $this->activeCompanyBranchCount($companyId);

        if ($activeBranches < $maxBranches) {
            return null;
        }

        return "Branch quota reached ({$activeBranches}/{$maxBranches}).";
    }

    /**
     * Branches counted against the plan's cap. A disabled branch (status = 0)
     * is never deleted -- destroy() is a no-op -- so it must not go on
     * occupying a seat forever; same soft-disable convention
     * UserController::activeCompanyUserCount() already uses for users.
     */
    private function activeCompanyBranchCount(int $companyId): int
    {
        return (int) DB::table('com_branches')
            ->where('company_id', $companyId)
            ->where(function ($query) {
                $query->whereNull('status')->orWhere('status', 1);
            })
            ->count();
    }

    private function branchData($request)
    {

        $branch = [
            'name'                             => $request->name,
            'name_local'                       => $request->name_local ?: null,
            'address_local'                    => $request->address_local ?: null,
            'company_id'                       => \Auth::user()->company_id,
            'branch_types_id'                  => $request->branchtype ?? $request->branch_types_id,
            'business_type_id'                 => $request->businesstype ?? $request->business_type_id,
            'inventory_system_id'              => (int) ($request->inventory_system_id ?? 1),
            'have_customer_sl'                 => (int) ($request->have_customer_sl ?? $request->serialnumber ?? 0),
            'warranty_controll'                => (int) ($request->warranty_controll ?? 0),
            'manufactur_control'               => (int) ($request->manufactur_control ?? 0),
            'purchase_note'                    => isset($request->purchase_note)  ? $request->purchase_note : null,
            'sales_note'                       => isset($request->sales_note)  ? $request->sales_note : null,
            'have_warehouse'                   => (int) ($request->have_warehouse ?? 0),
            'use_bangla'                       => (int) ($request->use_bangla ?? 0),
            'report_zero_bal'                  => (int) ($request->report_zero_bal ?? 1),
            'warn_negative_stock_sale'         => (int) ($request->warn_negative_stock_sale ?? 0),
            'block_negative_stock_sale'        => (int) ($request->block_negative_stock_sale ?? 0),
            'deduct_stock_on_delivery'         => (int) ($request->deduct_stock_on_delivery ?? 0),
            'share_customer_with_other_branch' => (int) ($request->share_customer_with_other_branch ?? 0),
            'share_product_with_other_branch'  => (int) ($request->share_product_with_other_branch ?? 0),
            'address'                          => $request->address,
            'email'                            => $request->email,
            'phone'                            => $request->phone,
            'contact_person'                   => $request->contactperson ?? $request->contact_person,
            'notes'                            => $request->notes ?? $request->note,
            'pad_heading_print'                => (int) ($request->pad_heading_print ?? $request->padd_heading ?? 1),
            'print_size'                       => (int) ($request->print_size ?? 1),
            'paper_size'                       => (int) ($request->paper_size ?? 0),
            'status'                           => (int) ($request->status ?? 1),
            'created_by'                       => \Auth::user()->id,
            'update_by'                        => null,
        ];
        return $branch;
    }

    private function uploadPadHeaderImage(Request $request, ?Branch $branch = null): string
    {
        if ($branch && $branch->pad_header_image) {
            $oldImagePath = public_path(str_replace('public/', '', $branch->pad_header_image));
            if (File::exists($oldImagePath)) {
                File::delete($oldImagePath);
            }
        }

        $file = $request->file('pad_header_image');
        $destinationPath = public_path('images/company_image');

        if (!File::isDirectory($destinationPath)) {
            // 0755, not 0777: nothing needs to write here but the web user.
            File::makeDirectory($destinationPath, 0755, true, true);
        }

        $fileName = 'pad_header_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        $file->move($destinationPath, $fileName);

        return 'public/images/company_image/' . $fileName;
    }

    private function dateClose($id)
    {

        $lastday  = \DB::table('admin_day_closes')->latest('id')->first();
        $datee = date('d-m-Y', strtotime("+1 day", strtotime($lastday->trx_date)));
        $lastday = Common::dateConvertUsToBd($lastday->trx_date);

        $branch = [
            'trx_date'   => date("Y-m-d", strtotime("now")),
            'company_id' => \Auth::user()->company_id,
            'branch_id'  => $id,
            'status'     => true,
            'created_by' => \Auth::user()->id,
        ];
        return $branch;
    }

    /**
     * Platform settings, each with the permission that may write it.
     *
     * Keyed by permission rather than lumped under one, because the SaaS step is
     * expected to grow: the next setting added here brings its own permission
     * and this stays a two-line change. A single blanket permission would have
     * meant whoever could set the alert could set everything that followed it.
     */
    private const PLATFORM_META_PERMISSIONS = [
        'registration.alert.manage' => [
            'registration_alert',
            'registration_alert_sms',
            'registration_alert_mobile',
        ],
    ];

    /**
     * Drops the platform settings the caller may not write.
     *
     * Dropped rather than refused outright: saveBranchMetas only touches the
     * keys it is handed, so leaving them out means an ordinary user saving the
     * branch form keeps whatever was already set. Refusing the whole request
     * would stop them saving the other twenty settings they are entitled to.
     */
    /**
     * What a property that has not been asked yet is assumed to do.
     *
     * Noon out and two in -- what most of the trade runs on, and a two-hour
     * window for housekeeping between them. A guess, and labelled as one: the
     * spec lists check-in and check-out times among the things still to come
     * from the client (6.2), and a property that answers differently changes a
     * setting rather than any code.
     */
    private const HOTEL_DEFAULT_CHECK_IN  = '14:00';
    private const HOTEL_DEFAULT_CHECK_OUT = '12:00';

    /**
     * How long a tentative hold lasts when nobody names a date, in HOURS.
     *
     * ⚠️ TWO HOURS, AND IT WAS SEVEN DAYS. A HOLD IS NOT A BOOKING -- it is the
     * desk waiting for somebody who said they were coming. A week of waiting is
     * a room nobody can sell for a week on the strength of a telephone call,
     * which is a booking in everything but the name and the money.
     *
     * ⚠️ Hours rather than days, and it is not a unit conversion. A hold used
     * to run to the END OF ITS LAST DAY, so one taken at nine in the morning
     * and one taken at eleven at night lapsed at the same moment -- the second
     * lasted fourteen hours longer for no reason anybody chose. On the clock,
     * "we will keep it for you until four" is a sentence the desk can say to a
     * guest and the sweep will keep.
     *
     * A property that wants longer says so on its own branch form; this is only
     * what one that has never been asked gets.
     */
    private const HOTEL_DEFAULT_HOLD_HOURS = 2;

    /**
     * And the longest hold anybody may ask for.
     *
     * ⚠️ A ceiling on the DESK, not on this setting. A hold takes real
     * inventory -- one row per bed per night -- so a hold nobody chases keeps a
     * room off the market until the sweep reaches it, and the sweep only
     * reaches it when this says it may.
     *
     * A day, so "hold it until the morning" is possible and "hold it until next
     * month" is not. Ninety days, which this was, is not a length of waiting --
     * it is a reservation nobody has paid for.
     */
    private const HOTEL_DEFAULT_HOLD_MAX_HOURS = 24;

    /** A year. Longer than this is a typo, not a booking. */
    private const HOTEL_HOLD_CEILING_HOURS = 8760;

    private function platformMetasFor(array $metaData): array
    {
        // Asked of CompanyRoleScope rather than can(): the User model overrides
        // Spatie's permissions() onto a table not every tenant database carries,
        // so can() raises a query error there instead of answering.
        $permissions = $this->companyRoleScope->visiblePermissionNames(Auth::user());

        $forbidden = [];
        foreach (self::PLATFORM_META_PERMISSIONS as $permission => $keys) {
            if (!in_array($permission, $permissions, true)) {
                $forbidden = array_merge($forbidden, $keys);
            }
        }

        if (empty($forbidden)) {
            return $metaData;
        }

        return array_values(array_filter(
            $metaData,
            fn($meta) => !in_array($meta['meta_key'] ?? '', $forbidden, true)
        ));
    }

    /**
     * When the day turns over at a hotel, checked.
     *
     * ⚠️ CHECK-OUT MUST COME BEFORE CHECK-IN, and this is the only place that
     * says so.
     *
     * The booking engine counts nights and never hours. A stay of the 15th to
     * the 18th holds the nights of the 15th, 16th and 17th, and leaves the 18th
     * free for somebody else -- which is right only while the departing guest is
     * gone before the arriving one comes. Set check-out to 6pm and check-in to
     * 2pm and the same room is let to two parties for four hours, every turnover
     * day, with nothing anywhere to notice it.
     *
     * So the rule is enforced where the numbers are written rather than trusted
     * to whoever types them.
     *
     * @return array{in: string, out: string}|string  the times, or why not
     */
    private function hotelTimes(Request $request, int $branchId)
    {
        $tidy = function ($value, string $fallback): string {
            $value = trim((string) $value);

            // HH:MM, and nothing else. A time input sends exactly that; anything
            // else came from somewhere this form does not control.
            return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : $fallback;
        };

        $in = $tidy(
            $request->hotel_check_in_time,
            meta($branchId, $branchId, 'hotel_check_in_time') ?: self::HOTEL_DEFAULT_CHECK_IN
        );

        $out = $tidy(
            $request->hotel_check_out_time,
            meta($branchId, $branchId, 'hotel_check_out_time') ?: self::HOTEL_DEFAULT_CHECK_OUT
        );

        if ($out >= $in) {
            // Compared as text, which is safe for zero-padded HH:MM and is why
            // the format is pinned above.
            return "Check-out ({$out}) has to be earlier than check-in ({$in}) — "
                . 'otherwise the room is let to two guests at once on the day one leaves and the next arrives';
        }

        return ['in' => $in, 'out' => $out];
    }

    /**
     * How the property reads its rate card, checked.
     *
     * Two hotels differ not by law but by how they advertise: one prints a room
     * at 3,000 plus tax, the other prints 3,000 and means it. Both keep the same
     * books -- rent, service charge and VAT are separated either way -- so this
     * is a reading of the number on the card, not a second tax system.
     *
     * ⚠️ ONLY TWO ANSWERS EXIST, and anything else is the first of them. A
     * property whose meta says something this code has never heard of has to
     * keep billing the way it always did, not the way a value it cannot read
     * happens to be spelled. Read back from what is stored when the form does
     * not send it, so posting half the branch form cannot move the setting.
     */
    private function hotelVatMode(Request $request, int $branchId): string
    {
        if ($request->has('hotel_vat_mode')) {
            return ItemTax::normalizeMode($request->input('hotel_vat_mode'));
        }

        return ItemTax::vatMode($branchId);
    }

    /**
     * Customer or bill; read back from what is stored when the form does not
     * send it, so posting half the branch form cannot move the setting.
     */
    private function hotelDueMode(Request $request, int $branchId): string
    {
        if ($request->has('hotel_due_mode')) {
            return ItemTax::normalizeDueMode($request->input('hotel_due_mode'));
        }

        return ItemTax::dueMode($branchId);
    }

    /**
     * Income at the bill or at the settlement; read back from what is stored when
     * the form does not send it. Settlement needs the Guest Receivable head, so
     * without it the branch stays on the bill rather than claiming a mode it
     * cannot post.
     */
    private function hotelIncomeMode(Request $request, int $branchId, int $companyId): string
    {
        $mode = $request->has('hotel_income_mode')
            ? ItemTax::normalizeIncomeMode($request->input('hotel_income_mode'))
            : ItemTax::incomeMode($branchId);

        return HotelAccountHead::id($companyId, HotelAccountHead::GUEST_RECEIVABLE)
            ? $mode
            : ItemTax::INCOME_AT_BILL;
    }

    /**
     * How long a room is held for, checked.
     *
     * ⚠️ THE DEFAULT MAY NOT EXCEED THE MAXIMUM, and this is the only place
     * that says so. They are two numbers on one screen and it is easy to raise
     * one and forget the other -- and a default above the ceiling is a setting
     * that silently does not apply: BookingController takes the smaller of the
     * two, so every hold would quietly last the maximum instead of the number
     * on the screen, with nothing to say which one won.
     *
     * Both are read back from what is stored when the form does not send them,
     * so a caller that posts half the branch form cannot reset the other half
     * to a default the property had already moved away from.
     *
     * @return array{hours: int, max: int}|string  the hours, or why not
     */
    private function hotelHold(Request $request, int $branchId)
    {
        $whole = function ($value, int $fallback): int {
            $value = trim((string) $value);

            // Whole hours only. A field that takes 2.5 would have to answer
            // what half an hour means to a sweep that runs on the minute.
            return preg_match('/^\d{1,5}$/', $value) ? (int) $value : $fallback;
        };

        $hours = $whole(
            $request->hotel_hold_hours,
            (int) (meta($branchId, $branchId, 'hotel_hold_hours') ?: self::HOTEL_DEFAULT_HOLD_HOURS)
        );

        $max = $whole(
            $request->hotel_hold_max_hours,
            (int) (meta($branchId, $branchId, 'hotel_hold_max_hours') ?: self::HOTEL_DEFAULT_HOLD_MAX_HOURS)
        );

        if ($hours < 1 || $max < 1) {
            return 'A hold has to last at least an hour — a hold of nothing is a room nobody is holding';
        }

        if ($max > self::HOTEL_HOLD_CEILING_HOURS) {
            return 'The longest hold cannot be more than a year (' . self::HOTEL_HOLD_CEILING_HOURS . ' hours). '
                . 'A room held longer than that is a room off the market, not a booking';
        }

        if ($hours > $max) {
            return "A hold of {$hours} hours cannot be longer than the {$max} hours a hold is allowed to last — "
                . 'raise the longest hold first, or every hold would quietly stop at the shorter number';
        }

        return ['hours' => $hours, 'max' => $max];
    }

    private function saveBranchMetas(array $identify, array $metaData): void
    {
        $metaData = $this->platformMetasFor($metaData);

        // Only user 1 -- the account owner in a client's own database -- may
        // switch this on or off, or move its cutoff date. Anyone else saves
        // the rest of the branch form as usual; these two keys are dropped.
        if ((int) Auth::id() !== 1) {
            $metaData = array_values(array_filter(
                $metaData,
                static fn (array $entry): bool => !in_array(
                    $entry['meta_key'],
                    ['delete_with_opening_invoice', 'delete_with_opening_invoice_date'],
                    true
                )
            ));
        }
        $smsPermissions = [
            'received_sms' => 'branch.sms.received.update',
            'payment_sms' => 'branch.sms.payment.update',
            'sales_sms' => 'branch.sms.sales.update',
            'purchase_sms' => 'branch.sms.purchase.update',
            // A room booked is a sale, so whoever may switch the sales text
            // may switch this one -- no new permission row in every database.
            'booking_sms' => 'branch.sms.sales.update',
        ];
        $permissions = $this->companyRoleScope->visiblePermissionNames(Auth::user());
        $canManageService = (int) Auth::id() === 1;
        // Read the saved subscription for the target branch, never trust the caller's flag.
        $serviceActive = (string) Meta::where($identify)
            ->where('meta_key', 'sms_service')->value('meta_value') === '1';
        if ($canManageService) {
            foreach ($metaData as $entry) {
                if ($entry['meta_key'] === 'sms_service') {
                    $serviceActive = (string) $entry['meta_value'] === '1';
                }
            }
        }
        $metaData = array_filter($metaData, static function (array $entry) use (
            $smsPermissions, $permissions, $canManageService, $serviceActive
        ): bool {
            $key = $entry['meta_key'];
            if ($key === 'sms_service') return $canManageService;
            if (!isset($smsPermissions[$key])) return true;
            return $serviceActive && (in_array($smsPermissions[$key], $permissions, true)
                || in_array('*', $permissions, true));
        });

        foreach ($metaData as $meta) {
            $attributes = array_merge($identify, ['meta_key' => $meta['meta_key']]);
            $values = array_merge($identify, $meta);

            try {
                Meta::updateOrCreate($attributes, $values);
            } catch (\Illuminate\Database\QueryException $e) {
                if (!str_contains($e->getMessage(), "Field 'id' doesn't have a default value")) {
                    throw $e;
                }

                $this->saveMetaWithoutAutoIncrement($attributes, $values);
            }
        }
    }

    private function saveMetaWithoutAutoIncrement(array $attributes, array $values): void
    {
        $now = Carbon::now();

        $updated = DB::table('metas')
            ->where($attributes)
            ->update([
                'meta_value' => $values['meta_value'],
                'updated_at' => $now,
            ]);

        if ($updated) {
            return;
        }

        DB::table('metas')->insert([
            'id' => $this->nextMetaId(),
            'identify_id' => $values['identify_id'],
            'branch_id' => $values['branch_id'],
            'meta_key' => $values['meta_key'],
            'meta_value' => $values['meta_value'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function nextMetaId(): int
    {
        return ((int) DB::table('metas')->max('id')) + 1;
    }


    // for API compatibility
    public function getBranch(Request $request)
    {
        $this->companyRoleScope->initialize(auth()->user());
        $perPage = $request->per_page ?? 10;
        $page = max($request->page ?? 1, 1);
        $offset = ($page - 1) * $perPage;
        $user = auth()->user();

        $data = Branch::join('com_branch_types', 'com_branch_types.id', '=', 'com_branches.branch_types_id')
            ->join('business_type', 'business_type.id', '=', 'com_branches.business_type_id')
            ->where('com_branches.company_id', $user->company_id)
            ->where(function ($query) use ($request) {
                $query->where('com_branches.name', 'like', '%' . $request->search . '%')
                    ->orWhere('com_branches.contact_person', 'like', '%' . $request->search . '%')
                    ->orWhere('com_branches.phone', 'like', '%' . $request->search . '%');
            })
            ->select([
                'com_branches.id as id',
                'com_branches.name as name',
                'com_branches.name_local as name_local',
                'com_branches.contact_person as contact_person',
                'com_branches.phone as phone',
                'com_branch_types.name as branch_type',
                'business_type.name as business_type',
                'com_branches.status as status',
            ])
            ->orderBy('com_branches.name', 'ASC')
            ->paginate($perPage);


        // Map the data to add serial numbers based on the offset
        $data->getCollection()->transform(function ($item, $key) use ($offset) {
            $item->branch_id = the_hash($item->id); // Encrypt the ID
            $item->serial = $offset + $key + 1; // Serial number based on page and offset
            $item->status_label = Constant::status[$item->status] ?? 'Unknown';
            return $item;
        });

        if (!$data) {
            return notFound();
        }
        return foundData($data);
    }
    public function editBranch($id)
    {
        $branch = Branch::find($id);
        $branchType = BranchType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get();
        $businessType = BusinessType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get();
        $data = [
            'branch'       => $branch,
            'branchType'   => $branchType,
            'businessType' => $businessType
        ];
        if (!$data) {
            return notFound();
        }
        return foundData($data);
    }



    public function getBranchEdit($id)
    {
        $branch = [];
        $id = isset($id) ? get_hash($id) : null;
        if (isset($id)) {
            $branch = $this->companyRoleScope->findScopedBranch($id, Auth::user());

            if (!$branch) {
                return notFound('Branch not found!');
            }
        } else {
            return notFound('Branch not found!');
        }
        $branchType   = BranchType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get();
        $businessType = BusinessType::where('status', 1)->select('id', 'name')->orderBy('name', 'ASC')->get();

        $branch->money_format = meta($branch->id, $branch->id, 'money_format');
        $branch->invoice_label = meta($branch->id, $branch->id, 'invoice_label');
        $branch->manual_voucher_no_label = meta($branch->id, $branch->id, 'manual_voucher_no_label');
        $branch->manual_voucher_date_label = meta($branch->id, $branch->id, 'manual_voucher_date_label');
        $branch->manual_challan_no_label = meta($branch->id, $branch->id, 'manual_challan_no_label');
        $branch->manual_challan_date_label = meta($branch->id, $branch->id, 'manual_challan_date_label');
        $branch->ledger_discount_split = meta($branch->id, $branch->id, 'ledger_discount_split');
        // Whether the Purchase and Sales ledgers print the product lines inside
        // their Product & Details column. Answered as a settled 1 or 0 rather
        // than as the raw meta, so a branch that predates the switch reads back
        // on -- which is what its ledgers have always shown.
        $branch->ledger_show_product_details = flagMeta($branch->id, 'ledger_show_product_details', true) ? 1 : 0;
        $branch->deduct_stock_on_delivery = flagMeta($branch->id, 'deduct_stock_on_delivery', false) ? 1 : 0;
        $branch->have_is_guaranter = meta($branch->id, $branch->id, 'have_is_guaranter');
        $branch->have_customer_nominee = meta($branch->id, $branch->id, 'have_customer_nominee');
        $branch->is_opening = meta($branch->id, $branch->id, 'is_opening');
        // Whether an opening may still be rewritten after the product has moved
        // on another voucher. Off unless a branch asked for it -- see
        // ItemController::getProductQtyRate for what it lets through.
        $branch->multiple_opening_allow = meta($branch->id, $branch->id, 'multiple_opening_allow');
        $branch->stock_report_type = meta($branch->id, $branch->id, 'stock_report_type');
        $branch->need_product_group = meta($branch->id, $branch->id, 'need_product_group');
        $branch->need_package = meta($branch->id, $branch->id, 'need_package');
        $branch->need_code = meta($branch->id, $branch->id, 'need_code');
        // Branch Setup -> Product Setup -> "Editable Measurement on Product
        // List?". On, the Product List draws Measurement, Measurement Unit,
        // Package Size and Package Type as inputs that save as each box is
        // left. Off, the four columns are not drawn at all.
        $branch->product_list_inline_edit = meta($branch->id, $branch->id, 'product_list_inline_edit');
        $branch->need_demo_tutorial = meta($branch->id, $branch->id, 'need_demo_tutorial');
        $branch->need_customer_contact_person = meta($branch->id, $branch->id, 'need_customer_contact_person');
        $branch->due_list_with_address = meta($branch->id, $branch->id, 'due_list_with_address');
        // On unless a branch turned it off: the Area column was always there.
        $branch->due_list_show_area = flagMeta($branch->id, 'due_list_show_area', true) ? 1 : 0;
        $branch->mobile_number_format = meta($branch->id, $branch->id, 'mobile_number_format');
        $branch->need_relation_info = meta($branch->id, $branch->id, 'need_relation_info');
        $branch->need_customer_mother_name = meta($branch->id, $branch->id, 'need_customer_mother_name');
        $branch->need_customer_sex = meta($branch->id, $branch->id, 'need_customer_sex');
        $branch->salutation_male = meta($branch->id, $branch->id, 'salutation_male');
        $branch->salutation_female = meta($branch->id, $branch->id, 'salutation_female');
        $branch->salutation_other = meta($branch->id, $branch->id, 'salutation_other');
        $branch->letter_signature = meta($branch->id, $branch->id, 'letter_signature');
        $branch->need_customer_date_of_birth = meta($branch->id, $branch->id, 'need_customer_date_of_birth');
        $branch->need_customer_occupation = meta($branch->id, $branch->id, 'need_customer_occupation');
        $branch->need_customer_permanent_address = meta($branch->id, $branch->id, 'need_customer_permanent_address');
        $branch->need_customer_photo = meta($branch->id, $branch->id, 'need_customer_photo');
        $branch->need_customer_national_id = meta($branch->id, $branch->id, 'need_customer_national_id');
        $branch->need_nominee_photo = meta($branch->id, $branch->id, 'need_nominee_photo');
        $branch->need_customer_area = meta($branch->id, $branch->id, 'need_customer_area');
        // On the same footing as the switch beside it: without this line the
        // branch form would draw it OFF for a branch that had turned it on, and
        // saving anything else on that screen would then write the off back.
        $branch->need_customer_handle_by_employee = meta($branch->id, $branch->id, 'need_customer_handle_by_employee');
        $branch->show_voucher_image = meta($branch->id, $branch->id, 'show_voucher_image');
        $branch->multi_product_order = meta($branch->id, $branch->id, 'multi_product_order');
        // When the day turns over. Never null to the form: a property that has
        // not been asked yet still has to draw something, and the two the trade
        // runs on are the honest guess -- see HOTEL_DEFAULT_* below.
        $branch->hotel_check_in_time = meta($branch->id, $branch->id, 'hotel_check_in_time')
            ?: self::HOTEL_DEFAULT_CHECK_IN;
        $branch->hotel_check_out_time = meta($branch->id, $branch->id, 'hotel_check_out_time')
            ?: self::HOTEL_DEFAULT_CHECK_OUT;

        // Read as what they mean rather than as what is stored: a property
        // nobody has asked is held to the same numbers the booking engine has
        // always used, and the form shows those rather than an empty box that
        // reads as "no limit".
        $branch->hotel_hold_hours = (int) (meta($branch->id, $branch->id, 'hotel_hold_hours')
            ?: self::HOTEL_DEFAULT_HOLD_HOURS);
        $branch->hotel_hold_max_hours = (int) (meta($branch->id, $branch->id, 'hotel_hold_max_hours')
            ?: self::HOTEL_DEFAULT_HOLD_MAX_HOURS);
        // What the guest signs at check-in -- the small print under the
        // registration card. The property's own words, in whichever language
        // it writes them; empty prints a card with no terms, which is a card.
        $branch->hotel_registration_terms = (string) (meta($branch->id, $branch->id, 'hotel_registration_terms') ?: '');
        // How the property reads its rate card: the rate before the tax, or the
        // whole price with the tax inside. Never null to the form, for the same
        // reason as the times above -- a property nobody has asked has been
        // billing exclusive since the module was written, and the screen has to
        // draw that rather than a blank that reads as "not decided".
        $branch->hotel_vat_mode = ItemTax::vatMode((int) $branch->id);
        $branch->hotel_due_mode = ItemTax::dueMode((int) $branch->id);
        $branch->hotel_income_mode = ItemTax::incomeMode((int) $branch->id);
        $branch->hotel_guest_receivable_ready = (bool) HotelAccountHead::id(
            (int) $branch->company_id,
            HotelAccountHead::GUEST_RECEIVABLE
        );
        $branch->product_tracking = meta($branch->id, $branch->id, 'product_tracking');
        $branch->delete_with_opening_invoice = meta($branch->id, $branch->id, 'delete_with_opening_invoice');
        $branch->delete_with_opening_invoice_date = meta($branch->id, $branch->id, 'delete_with_opening_invoice_date');
        $branch->company_scheme = meta($branch->id, $branch->id, 'company_scheme');
        $branch->company_scheme_due_days = numericMeta($branch->id, 'company_scheme_due_days');
        $branch->company_scheme_due_weekday = numericMeta($branch->id, 'company_scheme_due_weekday');
        // Rates and measurements travel as numbers, not as the text the meta
        // table happens to store them in. Unset comes back null, so the form
        // shows its own default rather than a 0 nobody chose.
        $branch->delay_charge_percent = numericMeta($branch->id, 'delay_charge_percent');
        $branch->down_payment_percent = numericMeta($branch->id, 'down_payment_percent');
        $branch->down_payment_base = meta($branch->id, $branch->id, 'down_payment_base');
        $branch->letter_ref_prefix = meta($branch->id, $branch->id, 'letter_ref_prefix');
        // Answered as a settled 1 or 0 rather than as the raw meta, so a branch
        // that predates the switch reads back on -- which is what its letters
        // have always done.
        $branch->print_letter_ref = flagMeta($branch->id, 'print_letter_ref', true) ? 1 : 0;
        $branch->letter_ref_date = meta($branch->id, $branch->id, 'letter_ref_date');
        // Kept on the platform operator's own branch: who hears about a new
        // company signing up, and how. Meaningless on a tenant's branch, which
        // is why the form only offers them on the operator's.
        $branch->registration_alert = meta($branch->id, $branch->id, 'registration_alert');
        $branch->registration_alert_sms = meta($branch->id, $branch->id, 'registration_alert_sms');
        $branch->registration_alert_mobile = meta($branch->id, $branch->id, 'registration_alert_mobile');
        $branch->pad_print_mode = meta($branch->id, $branch->id, 'pad_print_mode');
        $branch->preprinted_pad_height = numericMeta($branch->id, 'preprinted_pad_height');
        // Branch Setup -> Print Setup -> Pad Logo. The mark itself belongs to
        // the company; these are this branch's answers about printing it on its
        // pad head. The switch is settled here -- never asked reads back off --
        // and the numbers travel as numbers, so the form draws the saved box
        // instead of the text the meta table happens to hold.
        $branch->pad_logo_enabled = flagMeta($branch->id, 'pad_logo_enabled', false) ? 1 : 0;
        $branch->pad_logo_position = (string) (meta($branch->id, $branch->id, 'pad_logo_position') ?: 'right');
        $branch->pad_logo_width = numericMeta($branch->id, 'pad_logo_width');
        $branch->pad_logo_height = numericMeta($branch->id, 'pad_logo_height');
        $branch->pad_logo_margin_top = numericMeta($branch->id, 'pad_logo_margin_top');
        $branch->pad_logo_margin_right = numericMeta($branch->id, 'pad_logo_margin_right');
        $branch->pad_logo_margin_left = numericMeta($branch->id, 'pad_logo_margin_left');


        // Invoice settings
        $branch->show_instalment_list = meta($branch->id, $branch->id, 'show_instalment_list');
        $branch->show_spelling_of_money = meta($branch->id, $branch->id, 'show_spelling_of_money');
        $branch->show_sales_balance_summary = flagMeta($branch->id, 'show_sales_balance_summary', false) ? 1 : 0;
        $branch->decimal_places = meta($branch->id, $branch->id, 'decimal_places');
        $branch->dashboard_top_sales_days = meta($branch->id, $branch->id, 'dashboard_top_sales_days');
        $branch->dashboard_top_purchase_days = meta($branch->id, $branch->id, 'dashboard_top_purchase_days');
        $branch->dashboard_due_soon_days = meta($branch->id, $branch->id, 'dashboard_due_soon_days');
        // How far back the transaction report on List Customers opens. Read as a
        // number rather than raw text so a branch that has never set it comes
        // back null and the form's own default stands.
        $branch->default_report_days = numericMeta($branch->id, 'default_report_days');
        $branch->device_identifier_text = meta($branch->id, $branch->id, 'device_identifier_text');
        $branch->show_category_in_invoice = meta($branch->id, $branch->id, 'show_category_in_invoice');
        $branch->show_brand_in_invoice = meta($branch->id, $branch->id, 'show_brand_in_invoice');
        $branch->show_description_in_invoice = meta($branch->id, $branch->id, 'show_description_in_invoice');
        $branch->combined_invoice_note = meta($branch->id, $branch->id, 'combined_invoice_note');

        // Branch Setup -> Invoice Setup: the branch's preferred form for each
        // invoice category. Blank is Automatic -- the screens keep choosing the
        // form from the business type as they always have.
        $branch->invoice_variant_purchase = (string) (meta($branch->id, $branch->id, 'invoice_variant_purchase') ?: '');
        $branch->invoice_variant_sales = (string) (meta($branch->id, $branch->id, 'invoice_variant_sales') ?: '');
        $branch->invoice_variant_purchase_return = (string) (meta($branch->id, $branch->id, 'invoice_variant_purchase_return') ?: '');
        $branch->invoice_variant_sales_return = (string) (meta($branch->id, $branch->id, 'invoice_variant_sales_return') ?: '');
        $branch->invoice_variant_combined = (string) (meta($branch->id, $branch->id, 'invoice_variant_combined') ?: '');

        // Branch Setup -> Forms Setup: the preferred cash/bank form. Blank is
        // Automatic -- the screen keeps choosing its own.
        $branch->form_variant_cash_received = (string) (meta($branch->id, $branch->id, 'form_variant_cash_received') ?: '');
        $branch->form_variant_cash_payment = (string) (meta($branch->id, $branch->id, 'form_variant_cash_payment') ?: '');
        $branch->form_variant_bank_received = (string) (meta($branch->id, $branch->id, 'form_variant_bank_received') ?: '');
        $branch->form_variant_bank_payment = (string) (meta($branch->id, $branch->id, 'form_variant_bank_payment') ?: '');

        // Branch Setup -> Forms Setup: unified or separate, each side its own.
        // Blank is Automatic.
        $branch->received_entry_mode = (string) (meta($branch->id, $branch->id, 'received_entry_mode') ?: '');
        $branch->payment_entry_mode = (string) (meta($branch->id, $branch->id, 'payment_entry_mode') ?: '');

        // Branch Setup -> Product Dropdown. Which lines the product search box
        // shows beside a product's name. Settled here rather than passed on raw,
        // for the same reason as print_letter_ref above: a branch that predates
        // the switch has to read back as the dropdown has always looked -- name,
        // category, both prices and the unit on; brand and group off.
        $branch->product_ddl_show_name           = flagMeta($branch->id, 'product_ddl_show_name', true) ? 1 : 0;
        $branch->product_ddl_show_category       = flagMeta($branch->id, 'product_ddl_show_category', true) ? 1 : 0;
        $branch->product_ddl_show_brand          = flagMeta($branch->id, 'product_ddl_show_brand', false) ? 1 : 0;
        $branch->product_ddl_show_group          = flagMeta($branch->id, 'product_ddl_show_group', false) ? 1 : 0;
        $branch->product_ddl_show_purchase_price = flagMeta($branch->id, 'product_ddl_show_purchase_price', true) ? 1 : 0;
        $branch->product_ddl_show_sales_price    = flagMeta($branch->id, 'product_ddl_show_sales_price', true) ? 1 : 0;
        $branch->product_ddl_show_unit           = flagMeta($branch->id, 'product_ddl_show_unit', true) ? 1 : 0;
        // Off unless asked for: the balance is the one detail that costs the
        // search anything to work out -- see apiDdlItems().
        $branch->product_ddl_show_balance        = flagMeta($branch->id, 'product_ddl_show_balance', false) ? 1 : 0;
        // One line per product in the search box, or the details on lines of
        // their own. Settled to one of the two, so a branch that has never been
        // asked reads back as multiple -- which is what the box has always done.
        $branch->product_ddl_lines               = meta($branch->id, $branch->id, 'product_ddl_lines') === 'single' ? 'single' : 'multiple';

        // Branch Setup -> Customer / Supplier Dropdown. The party search box on
        // the invoice screens, settled the same way and for the same reason: all
        // four of these have always been shown, so a branch that predates the
        // step has to read back with all four on.
        $branch->party_ddl_show_code             = flagMeta($branch->id, 'party_ddl_show_code', true) ? 1 : 0;
        $branch->party_ddl_show_mobile           = flagMeta($branch->id, 'party_ddl_show_mobile', true) ? 1 : 0;
        $branch->party_ddl_show_address          = flagMeta($branch->id, 'party_ddl_show_address', true) ? 1 : 0;
        $branch->party_ddl_show_father           = flagMeta($branch->id, 'party_ddl_show_father', true) ? 1 : 0;
        $branch->party_ddl_lines                 = meta($branch->id, $branch->id, 'party_ddl_lines') === 'single' ? 'single' : 'multiple';

        // SMS settings
        $branch->sms_service = meta($branch->id, $branch->id, 'sms_service');
        $branch->received_sms = meta($branch->id, $branch->id, 'received_sms');
        $branch->sales_sms = meta($branch->id, $branch->id, 'sales_sms');
        $branch->payment_sms = meta($branch->id, $branch->id, 'payment_sms');
        $branch->purchase_sms = meta($branch->id, $branch->id, 'purchase_sms');
        $branch->booking_sms = meta($branch->id, $branch->id, 'booking_sms');

        $branch->branch_id    = the_hash($branch->id);

        $data = [
            'branch'       => $branch,
            'branchType'   => $branchType,
            'businessType' => $businessType,
            // 'status'       => Constant::status,
        ];
        if (!$data) {
            return notFound();
        }
        return foundData($data);
    }

    /**
     * Puts a branch's opening balances back to zero so they can be entered anew.
     *
     * An opening balance is written once and then refuses to change, which
     * leaves a branch that mistyped one with no way forward. This clears the
     * figures -- the two older columns, and the per-branch customer rows that
     * have held the same figure since 2026-11-18 -- and only those.
     *
     * The journal and stock entries an opening also created are deliberately
     * left alone. A product's opening is recorded as an ordinary inventory
     * purchase, indistinguishable from a real one, so anything that tried to
     * delete it would be guessing at which rows to destroy; correcting the
     * accounts is a separate, deliberate act.
     *
     * Only the account the company was registered with may run it -- see
     * refuseUnlessCompanyAccount(). The permission is still required first, so
     * a company that does not want the button on the screen at all can take it
     * off the role and nothing changes for anyone.
     */
    public function clearBranchOpening(Request $request)
    {
        $user = Auth::user();
        $this->companyRoleScope->initialize($user);

        // Asked of CompanyRoleScope rather than can(): the User model overrides
        // Spatie's permissions() onto a table not every tenant database carries,
        // so can() raises a query error there instead of answering.
        $permissions = $this->companyRoleScope->visiblePermissionNames($user);

        if (!in_array('branch.opening.clear', $permissions, true)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to clear opening balances.',
                'error' => ['code' => 403],
            ], 403);
        }

        $id = isset($request->branch_id) ? get_hash($request->branch_id) : null;

        if (!$id) {
            return notFound('Invalid Branch ID!');
        }

        $branch = $this->companyRoleScope->findScopedBranch($id, $user);

        if (!$branch) {
            return notFound('Branch not found!');
        }

        if ($refusal = $this->refuseUnlessCompanyAccount($user, $branch, 'clear opening balances')) {
            return $refusal;
        }

        // Rows already at zero are skipped, so the count reported back is what
        // actually changed rather than how many rows the branch happens to hold.
        $cleared = DB::transaction(function () use ($branch, $user) {
            $zero = fn(string $table) => DB::table($table)
                ->where('branch_id', $branch->id)
                ->where('company_id', $branch->company_id)
                ->where('openingbalance', '!=', 0)
                ->update(['openingbalance' => 0]);

            /**
             * ⚠️ THE CUSTOMER FIGURE MOVED, AND THIS CLEAR HAD TO FOLLOW IT.
             * Since 2026-11-18 a customer's opening is held per branch in
             * branch_party_openings, so zeroing cust_party_infos.openingbalance
             * only reached the mirror: the list kept showing the branch's opening
             * while the screen reported a clear that had not happened.
             *
             * The voucher link is left alone, exactly as the column's own clear
             * leaves main_trx_id alone: this screen does not touch the books, and
             * a figure entered again rewrites that same voucher rather than
             * raising a second one.
             */
            $partyOpenings    = 0;
            $partyOpeningIds  = [];
            $productOpenings   = 0;
            $productOpeningIds = [];

            if (Schema::hasTable('branch_party_openings')) {
                $partyOpeningIds = DB::table('branch_party_openings')
                    ->where('branch_id', $branch->id)
                    ->where('company_id', $branch->company_id)
                    ->where('amount', '!=', 0)
                    ->pluck('party_id')
                    ->all();

                $partyOpenings = $partyOpeningIds === [] ? 0
                    : DB::table('branch_party_openings')
                        ->where('branch_id', $branch->id)
                        ->where('company_id', $branch->company_id)
                        ->where('amount', '!=', 0)
                        ->update(['amount' => 0, 'updated_by' => $user->id, 'updated_at' => now()]);
            }

            /* The product's opening moved the same way, one row per
               (product, branch) in branch_product_openings. Same rule: the figure
               is zeroed and the voucher link stays. */
            if (Schema::hasTable('branch_product_openings')) {
                $productOpeningIds = DB::table('branch_product_openings')
                    ->where('branch_id', $branch->id)
                    ->where('company_id', $branch->company_id)
                    ->where('quantity', '!=', 0)
                    ->pluck('product_id')
                    ->all();

                $productOpenings = $productOpeningIds === [] ? 0
                    : DB::table('branch_product_openings')
                        ->where('branch_id', $branch->id)
                        ->where('company_id', $branch->company_id)
                        ->where('quantity', '!=', 0)
                        ->update(['quantity' => 0, 'updated_by' => $user->id, 'updated_at' => now()]);
            }

            /* The mirrored columns are cleared next -- by filing branch -- so
               remember whose mirror that touches before it is zeroed, rows and
               columns alike. Without that, a figure filed under this branch but
               owned by a sister branch would lose its mirror and never get it
               back: the rebuild below only visits the ids collected here. */
            $mirrorPartyIds = DB::table('cust_party_infos')
                ->where('branch_id', $branch->id)
                ->where('company_id', $branch->company_id)
                ->where('openingbalance', '!=', 0)
                ->pluck('id')
                ->all();

            $mirrorProductIds = DB::table('product_items')
                ->where('branch_id', $branch->id)
                ->where('company_id', $branch->company_id)
                ->where('openingbalance', '!=', 0)
                ->pluck('id')
                ->all();

            $products = $zero('product_items');
            $parties  = $zero('cust_party_infos');

            // ⚠️ AFTER both zeroing steps: the shared column must not outlive the
            // row it mirrored, and $zero() has just cleared it for everything
            // filed under this branch. Rebuilt from the rows that survive.
            app(PartyOpeningBalanceService::class)
                ->refreshMirrors(array_merge($partyOpeningIds, $mirrorPartyIds));
            app(ProductOpeningBalanceService::class)
                ->refreshMirrors(array_merge($productOpeningIds, $mirrorProductIds));

            return [
                'products'         => $products,
                'parties'          => $parties,
                'party_openings'   => $partyOpenings,
                'product_openings' => $productOpenings,
            ];
        });

        return foundData($cleared, sprintf(
            'Opening cleared for %s: %d product(s), %d customer/supplier(s).',
            $branch->name,
            // The per-branch rows are the figures the screens actually show, so
            // they are the count that means something; the column beside them is
            // only the mirror and may already have been zeroed by an older clear.
            max($cleared['products'], $cleared['product_openings']),
            max($cleared['parties'], $cleared['party_openings'])
        ));
    }

    /**
     * Takes every voucher a branch holds out of its books.
     *
     * A branch that was opened with test entries, or entered against the wrong
     * books, has no way to start over: vouchers are deleted one at a time and
     * there can be thousands of them. This puts main_trx_master.status to 0 for
     * the whole branch in one go.
     *
     * Only that one column is written. Nothing is deleted and no other table is
     * touched -- every report, ledger and balance in the system reaches a
     * voucher through main_trx_master and asks for status = 1, so a zero takes
     * the voucher out of the accounts while the entry itself stays on record and
     * can be read back if anyone has to answer for what was cleared.
     *
     * Only the account the company was registered with may run it -- see
     * refuseUnlessCompanyAccount(). This used to be kept to the installation's
     * own administrator instead, which meant no company could put its own house
     * in order without ringing the platform; the owner of the books now decides
     * on their own books, and nobody below them does.
     */
    public function clearBranchTransactions(Request $request)
    {
        $user = Auth::user();
        $this->companyRoleScope->initialize($user);

        // Asked of CompanyRoleScope rather than can(), for the reason given in
        // clearBranchOpening() above.
        $permissions = $this->companyRoleScope->visiblePermissionNames($user);

        if (!in_array('branch.transaction.clear', $permissions, true)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to clear transactions.',
                'error' => ['code' => 403],
            ], 403);
        }

        $id = isset($request->branch_id) ? get_hash($request->branch_id) : null;

        if (!$id) {
            return notFound('Invalid Branch ID!');
        }

        $branch = $this->companyRoleScope->findScopedBranch($id, $user);

        if (!$branch) {
            return notFound('Branch not found!');
        }

        if ($refusal = $this->refuseUnlessCompanyAccount($user, $branch, 'clear transactions')) {
            return $refusal;
        }

        // Vouchers already at 0 are left out of the count, so what is reported
        // back is what this clear actually changed.
        $cleared = DB::transaction(function () use ($branch) {
            return DB::table('main_trx_master')
                ->where('branch_id', $branch->id)
                ->where('company_id', $branch->company_id)
                ->where('status', '!=', 0)
                ->update(['status' => 0]);
        });

        return foundData(['vouchers' => $cleared], sprintf(
            'Transactions cleared for %s: %d voucher(s).',
            $branch->name,
            $cleared
        ));
    }

    /**
     * Refuses anyone but the company's own account, or null to carry on.
     *
     * The permission on each of the two clears says who may see the button;
     * this says who may pull it, and it is a much narrower question. A tenant's
     * administrator holds every permission their company has, and one mistaken
     * click takes a whole branch's books out of every report at once -- so the
     * last word is kept with the account the company was registered with,
     * whoever else is trusted with the day-to-day controls.
     *
     * Asked of the BRANCH's company rather than the caller's. An account that
     * can see other companies' branches would otherwise pass this by being the
     * owner of its own company while clearing somebody else's books. For the
     * same reason it is checked after the branch is resolved, not before.
     *
     * On the server rather than by hiding the button, because a guard the
     * browser could skip is not a guard.
     */
    private function refuseUnlessCompanyAccount($user, $branch, string $action)
    {
        $owner = $this->companyAccountUserId((int) ($branch->company_id ?? 0));

        if ($owner !== null && (int) $user->id === $owner) {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Only the company account can ' . $action
                . '. Please ask the account this company was registered with.',
            // Nothing has gone wrong here -- the answer is simply no -- so the
            // browser reads this as a notice rather than a fault.
            'severity' => 'info',
            'error' => ['code' => 403],
        ], 403);
    }

    /**
     * The account a company was registered with.
     *
     * Nothing in the schema marks it, so it is read off the order the accounts
     * were created in: a company's own account exists before it can create
     * anybody, so it holds the lowest id of that company.
     *
     * created_by cannot answer this on its own. Every company's first account
     * is created by the platform (id 1) -- but so are the staff of the
     * platform's own company, which leaves the two indistinguishable by that
     * column. Lowest id separates them, and staff added later always sort
     * above.
     *
     * Returns null for a company with no users at all, which refuses rather
     * than letting the caller through: better a clear nobody can run than one
     * anybody can.
     */
    private function companyAccountUserId(?int $companyId): ?int
    {
        if (empty($companyId)) {
            return null;
        }

        $id = DB::table('users')->where('company_id', $companyId)->min('id');

        return $id ? (int) $id : null;
    }

    public function updateBranch(Request $request)
    {
        $this->companyRoleScope->initialize(Auth::user());
        /* ---------------- Resolve Branch ID ---------------- */
        $id = isset($request->branch_id) ? get_hash($request->branch_id) : null;

        if (!$id) {
            return notFound('Invalid Branch ID!');
        }

        $branch = $this->companyRoleScope->findScopedBranch($id, Auth::user());
        if (!$branch) {
            return notFound('Branch not found!');
        }

        $user = Auth::user();

        /* ---------------- Validation ---------------- */
        $request->validate([
            'name'              => 'required',
            'branch_types_id'   => 'required|numeric',
            'business_type_id'  => 'required|numeric',
            'pad_heading_print' => 'required',
            'print_size'        => 'required',
            'pad_header_image'  => 'nullable|image|mimes:jpg,jpeg,png,webp|max:512',

            // Branch Setup -> Invoice Setup: the preferred existing form for
            // each invoice category. Blank (an emptied box arrives as null) is
            // Automatic -- the screen keeps choosing the form from the business
            // type exactly as before. "both" keeps the two existing forms
            // reachable from the one Invoice menu entry and lets the invoice
            // screen ask which one this bill is; it names no form of its own.
            'invoice_variant_purchase' => 'nullable|string|in:both,tiles,electronics,construction,trading',
            'invoice_variant_sales' => 'nullable|string|in:both,tiles,electronics,company_scheme,trading,general',
            'invoice_variant_purchase_return' => 'nullable|string|in:tiles,standard',
            'invoice_variant_sales_return' => 'nullable|string|in:tiles,general',
            'invoice_variant_combined' => 'nullable|string|in:not_applicable,trading,tiles',

            // Branch Setup -> Forms Setup: the cash and bank screens' preferred
            // form. Blank is Automatic -- the screen keeps choosing its own.
            'form_variant_cash_received' => 'nullable|string|in:tiles,trading,general',
            'form_variant_cash_payment' => 'nullable|string|in:tiles,trading,general',
            'form_variant_bank_received' => 'nullable|string|in:tiles,general',
            'form_variant_bank_payment' => 'nullable|string|in:tiles,general',

            // Branch Setup -> Forms Setup: the unified-or-separate choice for
            // the received and the payment entries. Blank is Automatic.
            'received_entry_mode' => 'nullable|string|in:unified,separate',
            'payment_entry_mode' => 'nullable|string|in:unified,separate',

            // Branch Setup -> Print Setup -> Pad Logo. Blank is the default the
            // screen draws, so a caller that sends none is still valid. The size
            // and margins are only asked to be numbers: the screen and the print
            // both clamp them, and refusing the whole branch form over a typed
            // bound would cost more than the stray value does.
            'pad_logo_enabled' => 'nullable|boolean',
            'pad_logo_position' => 'nullable|string|in:right,left,top',
            'pad_logo_width' => 'nullable|numeric',
            'pad_logo_height' => 'nullable|numeric',
            'pad_logo_margin_top' => 'nullable|numeric',
            'pad_logo_margin_right' => 'nullable|numeric',
            'pad_logo_margin_left' => 'nullable|numeric',
        ]);

        DB::beginTransaction();

        try {
            /* ---------------- Image Upload ---------------- */
            if ($request->hasFile('pad_header_image')) {
                $branch->pad_header_image = $this->uploadPadHeaderImage($request, $branch);
            }

            /* ---------------- Branch Update ---------------- */
            $branch->name                             = $request->name;
            $branch->name_local                       = $request->name_local ?: null;
            $branch->address_local                    = $request->address_local ?: null;
            $branch->branch_types_id                  = $request->branch_types_id;
            $branch->business_type_id                 = $request->business_type_id;
            $branch->inventory_system_id              = (int) ($request->inventory_system_id ?? $branch->inventory_system_id ?? 1);

            $branch->have_customer_sl                 = (int) ($request->have_customer_sl ?? $request->serialnumber ?? 0);
            $branch->warranty_controll                = (int) ($request->warranty_controll ?? 0);
            $branch->manufactur_control               = (int) ($request->manufactur_control ?? 0);

            $branch->purchase_note                    = $request->purchase_note ?? null;
            $branch->sales_note                       = $request->sales_note ?? null;

            $branch->have_warehouse                   = (int) ($request->have_warehouse ?? 0);
            $branch->use_bangla                       = (int) ($request->use_bangla ?? 0);
            $branch->report_zero_bal                  = (int) ($request->report_zero_bal ?? 0);
            $branch->warn_negative_stock_sale         = (int) ($request->warn_negative_stock_sale ?? 0);
            $branch->block_negative_stock_sale        = (int) ($request->block_negative_stock_sale ?? 0);
            $branch->deduct_stock_on_delivery         = (int) ($request->deduct_stock_on_delivery ?? 0);

            $branch->share_customer_with_other_branch = (int) ($request->share_customer_with_other_branch ?? 0);
            $branch->share_product_with_other_branch  = (int) ($request->share_product_with_other_branch ?? 0);

            $branch->address                          = $request->address;
            $branch->phone                            = $request->phone;
            $branch->contact_person                   = $request->contact_person;
            $branch->notes                            = $request->notes ?? null;

            $branch->pad_heading_print                = $request->pad_heading_print;
            $branch->print_size                       = $request->print_size;
            $branch->paper_size                       = $request->paper_size;

            $branch->email                            = $request->email ?? null;
            $branch->status                           = (int) ($request->status ?? $request->branch_status ?? 1);

            $branch->update_by                        = $user->id;
            $branch->updated_at                       = Carbon::now();

            $branch->save();

            /* ---------------- Meta Update ---------------- */
            $identify = [
                'identify_id' => $branch->id,
                'branch_id'   => $branch->id,
            ];

            $times = $this->hotelTimes($request, $branch->id);

            if (is_string($times)) {
                DB::rollBack();

                return notFound($times, 422);
            }

            $hold = $this->hotelHold($request, $branch->id);

            if (is_string($hold)) {
                DB::rollBack();

                return notFound($hold, 422);
            }

            $metaData = [
                ['meta_key' => 'money_format', 'meta_value' => $request->money_format],
                ['meta_key' => 'invoice_label', 'meta_value' => $request->invoice_label],
                // The four handwritten figures' names on the sales invoice.
                ['meta_key' => 'manual_voucher_no_label', 'meta_value' => $request->manual_voucher_no_label],
                ['meta_key' => 'manual_voucher_date_label', 'meta_value' => $request->manual_voucher_date_label],
                ['meta_key' => 'manual_challan_no_label', 'meta_value' => $request->manual_challan_no_label],
                ['meta_key' => 'manual_challan_date_label', 'meta_value' => $request->manual_challan_date_label],
                // Whether this branch's party ledger shows a discounted bill whole,
                // with the discount broken out as a line of its own. '' from an
                // untouched form is "as it was".
                ['meta_key' => 'ledger_discount_split', 'meta_value' => $request->ledger_discount_split],
                // Whether this branch's Purchase and Sales ledgers print the
                // product lines inside their Product & Details column. Off
                // leaves the account and the note, and the quantity, rate and
                // total columns untouched.
                ['meta_key' => 'ledger_show_product_details', 'meta_value' => $request->ledger_show_product_details],
                // Branch Setup > Invoice Setup > "Enable Deduct Stock on
                // Delivery". Whether this branch's sales invoice may hold
                // its stock back for a delivery. Unset is off, which is
                // what every branch did before the switch existed.
                ['meta_key' => 'deduct_stock_on_delivery', 'meta_value' => $request->deduct_stock_on_delivery],
                ['meta_key' => 'have_is_guaranter', 'meta_value' => $request->have_is_guaranter],
                ['meta_key' => 'have_customer_nominee', 'meta_value' => $request->have_customer_nominee],
                ['meta_key' => 'is_opening', 'meta_value' => $request->is_opening],
                ['meta_key' => 'multiple_opening_allow', 'meta_value' => $request->multiple_opening_allow],
                ['meta_key' => 'stock_report_type', 'meta_value' => $request->stock_report_type],
                ['meta_key' => 'need_product_group', 'meta_value' => $request->need_product_group],
                ['meta_key' => 'need_package', 'meta_value' => $request->need_package],
                ['meta_key' => 'need_code', 'meta_value' => $request->need_code],
                // Product List's own inline edit: with the switch on, the four
                // measurement/package columns are drawn as inputs that save as
                // each box is left. Off, the list does not show them at all.
                ['meta_key' => 'product_list_inline_edit', 'meta_value' => $request->product_list_inline_edit],
                ['meta_key' => 'show_instalment_list', 'meta_value' => $request->show_instalment_list],
                ['meta_key' => 'show_spelling_of_money', 'meta_value' => $request->show_spelling_of_money],
                // Whether the sales invoice screens draw the Previous Balance /
                // Current Invoice / Discount / Received Amount / Total Tk. block.
                ['meta_key' => 'show_sales_balance_summary', 'meta_value' => $request->show_sales_balance_summary],
                ['meta_key' => 'need_demo_tutorial', 'meta_value' => $request->need_demo_tutorial],
                ['meta_key' => 'need_customer_contact_person', 'meta_value' => $request->need_customer_contact_person],
                ['meta_key' => 'due_list_with_address', 'meta_value' => $request->due_list_with_address],
                ['meta_key' => 'due_list_show_area', 'meta_value' => $request->due_list_show_area],
                ['meta_key' => 'mobile_number_format', 'meta_value' => $request->mobile_number_format],
                ['meta_key' => 'need_relation_info', 'meta_value' => $request->need_relation_info],
                ['meta_key' => 'need_customer_mother_name', 'meta_value' => $request->need_customer_mother_name],
                ['meta_key' => 'need_customer_sex', 'meta_value' => $request->need_customer_sex],
                ['meta_key' => 'salutation_male', 'meta_value' => $request->salutation_male],
                ['meta_key' => 'salutation_female', 'meta_value' => $request->salutation_female],
                ['meta_key' => 'salutation_other', 'meta_value' => $request->salutation_other],
                ['meta_key' => 'letter_signature', 'meta_value' => $request->letter_signature],
                ['meta_key' => 'need_customer_date_of_birth', 'meta_value' => $request->need_customer_date_of_birth],
                ['meta_key' => 'need_customer_occupation', 'meta_value' => $request->need_customer_occupation],
                ['meta_key' => 'need_customer_permanent_address', 'meta_value' => $request->need_customer_permanent_address],
                ['meta_key' => 'need_customer_photo', 'meta_value' => $request->need_customer_photo],
                ['meta_key' => 'need_customer_national_id', 'meta_value' => $request->need_customer_national_id],
                ['meta_key' => 'need_nominee_photo', 'meta_value' => $request->need_nominee_photo],
                ['meta_key' => 'need_customer_area', 'meta_value' => $request->need_customer_area],
                // Who looks after a customer: the Add/Edit forms offer a picker
                // of this branch's own staff and List Customers gains a filter
                // and a column beside the address. Off everywhere by default.
                ['meta_key' => 'need_customer_handle_by_employee', 'meta_value' => $request->need_customer_handle_by_employee],
                ['meta_key' => 'show_voucher_image', 'meta_value' => $request->show_voucher_image],
                // Whether this branch composes orders with more than one product.
                // Off keeps the single-product order form exactly as it was.
                ['meta_key' => 'multi_product_order', 'meta_value' => $request->multi_product_order],
                // Whether this branch records which product a receipt or payment
                // was for. Off hides the product field on the cash forms, so a
                // branch that does not keep product-wise accounts never sees it.
                ['meta_key' => 'product_tracking', 'meta_value' => $request->product_tracking],
                // Product List's second delete button: with the switch on, a
                // product can go together with the one old opening invoice that
                // brought it in. Off, the list shows only the plain delete.
                ['meta_key' => 'delete_with_opening_invoice', 'meta_value' => $request->delete_with_opening_invoice],
                ['meta_key' => 'delete_with_opening_invoice_date', 'meta_value' => $request->delete_with_opening_invoice_date],
                // Company scheme: the switch that shows the Company Scheme option on
                // the Electronics sales invoice, and how many days after the sale
                // the brand is due to pay (the invoice's default due date).
                ['meta_key' => 'company_scheme', 'meta_value' => $request->company_scheme],
                ['meta_key' => 'company_scheme_due_days', 'meta_value' => $request->company_scheme_due_days],
                ['meta_key' => 'company_scheme_due_weekday', 'meta_value' => $request->company_scheme_due_weekday],
                // What the allotment letter asks for, when the sale itself says
                // nothing: the down payment share and the monthly late-payment rate.
                ['meta_key' => 'down_payment_percent', 'meta_value' => $request->down_payment_percent],
                ['meta_key' => 'down_payment_base', 'meta_value' => $request->down_payment_base],
                // How the letter's reference number starts, e.g. "BST/ALLOT". The
                // year and the sale's serial are added to it, and the clerk can
                // still overwrite the whole thing when the letter is issued.
                ['meta_key' => 'letter_ref_prefix', 'meta_value' => $request->letter_ref_prefix],
                // Whether the reference reaches the paper at all. Off, the
                // letter prints with no Ref No line, for an office that writes
                // its own number on the sheet.
                ['meta_key' => 'print_letter_ref', 'meta_value' => $request->print_letter_ref],
                // The date the branch's letters carry. Whoever issues one still
                // sees it and can write another over it.
                ['meta_key' => 'letter_ref_date', 'meta_value' => $request->letter_ref_date],
                // Who hears about a new company registering, and how. Written
                // only for a caller holding 'registration.alert.manage' -- see
                // platformMetasFor(), which drops them for everybody else.
                ['meta_key' => 'registration_alert', 'meta_value' => $request->registration_alert],
                ['meta_key' => 'registration_alert_sms', 'meta_value' => $request->registration_alert_sms],
                ['meta_key' => 'registration_alert_mobile', 'meta_value' => $request->registration_alert_mobile],
                // Whether a print draws its own pad head, and how much of the
                // page a pre-printed one takes when it does not.
                ['meta_key' => 'pad_print_mode', 'meta_value' => $request->pad_print_mode],
                ['meta_key' => 'preprinted_pad_height', 'meta_value' => $request->preprinted_pad_height],
                // Branch Setup -> Print Setup -> Pad Logo. The mark itself is
                // the company's; these are this branch's answers about printing
                // it. Never asked reads back off, which is how the pad printed
                // before the setting existed.
                ['meta_key' => 'pad_logo_enabled', 'meta_value' => $request->pad_logo_enabled],
                ['meta_key' => 'pad_logo_position', 'meta_value' => (string) ($request->pad_logo_position ?? 'right')],
                ['meta_key' => 'pad_logo_width', 'meta_value' => $request->pad_logo_width],
                ['meta_key' => 'pad_logo_height', 'meta_value' => $request->pad_logo_height],
                ['meta_key' => 'pad_logo_margin_top', 'meta_value' => $request->pad_logo_margin_top],
                ['meta_key' => 'pad_logo_margin_right', 'meta_value' => $request->pad_logo_margin_right],
                ['meta_key' => 'pad_logo_margin_left', 'meta_value' => $request->pad_logo_margin_left],
                ['meta_key' => 'delay_charge_percent', 'meta_value' => $request->delay_charge_percent],
                ['meta_key' => 'decimal_places', 'meta_value' => $request->decimal_places],
                ['meta_key' => 'dashboard_top_sales_days', 'meta_value' => $request->dashboard_top_sales_days],
                ['meta_key' => 'dashboard_top_purchase_days', 'meta_value' => $request->dashboard_top_purchase_days],
                ['meta_key' => 'dashboard_due_soon_days', 'meta_value' => $request->dashboard_due_soon_days],
                // Default window of the transaction report button on List Customers.
                ['meta_key' => 'default_report_days', 'meta_value' => $request->default_report_days],
                ['meta_key' => 'device_identifier_text', 'meta_value' => $request->device_identifier_text],
                ['meta_key' => 'combined_invoice_note', 'meta_value' => $request->combined_invoice_note],
                // Branch Setup -> Invoice Setup: the branch's preferred form
                // for each invoice category. A blank is Automatic, so a branch
                // that has never chosen keeps resolving from its business type.
                ['meta_key' => 'invoice_variant_purchase', 'meta_value' => (string) ($request->invoice_variant_purchase ?? '')],
                ['meta_key' => 'invoice_variant_sales', 'meta_value' => (string) ($request->invoice_variant_sales ?? '')],
                ['meta_key' => 'invoice_variant_purchase_return', 'meta_value' => (string) ($request->invoice_variant_purchase_return ?? '')],
                ['meta_key' => 'invoice_variant_sales_return', 'meta_value' => (string) ($request->invoice_variant_sales_return ?? '')],
                ['meta_key' => 'invoice_variant_combined', 'meta_value' => (string) ($request->invoice_variant_combined ?? '')],
                ['meta_key' => 'show_category_in_invoice', 'meta_value' => $request->show_category_in_invoice],
                ['meta_key' => 'show_brand_in_invoice', 'meta_value' => $request->show_brand_in_invoice],
                ['meta_key' => 'show_description_in_invoice', 'meta_value' => $request->show_description_in_invoice],
                // Branch Setup -> Product Dropdown: which lines the product
                // search box shows beside a product's name. Sent raw; the
                // reading side settles an untouched branch onto the defaults.
                ['meta_key' => 'product_ddl_show_name', 'meta_value' => $request->product_ddl_show_name],
                ['meta_key' => 'product_ddl_show_category', 'meta_value' => $request->product_ddl_show_category],
                ['meta_key' => 'product_ddl_show_brand', 'meta_value' => $request->product_ddl_show_brand],
                ['meta_key' => 'product_ddl_show_group', 'meta_value' => $request->product_ddl_show_group],
                ['meta_key' => 'product_ddl_show_purchase_price', 'meta_value' => $request->product_ddl_show_purchase_price],
                ['meta_key' => 'product_ddl_show_sales_price', 'meta_value' => $request->product_ddl_show_sales_price],
                ['meta_key' => 'product_ddl_show_unit', 'meta_value' => $request->product_ddl_show_unit],
                ['meta_key' => 'product_ddl_show_balance', 'meta_value' => $request->product_ddl_show_balance],
                // 'single' or 'multiple'. Anything else reads back as multiple.
                ['meta_key' => 'product_ddl_lines', 'meta_value' => $request->product_ddl_lines],
                // Branch Setup -> Customer / Supplier Dropdown. See getBranchEdit().
                ['meta_key' => 'party_ddl_show_code', 'meta_value' => $request->party_ddl_show_code],
                ['meta_key' => 'party_ddl_show_mobile', 'meta_value' => $request->party_ddl_show_mobile],
                ['meta_key' => 'party_ddl_show_address', 'meta_value' => $request->party_ddl_show_address],
                ['meta_key' => 'party_ddl_show_father', 'meta_value' => $request->party_ddl_show_father],
                ['meta_key' => 'party_ddl_lines', 'meta_value' => $request->party_ddl_lines],

                ['meta_key' => 'sms_service', 'meta_value' => $request->sms_service],
                ['meta_key' => 'received_sms', 'meta_value' => $request->received_sms],
                ['meta_key' => 'sales_sms', 'meta_value' => $request->sales_sms],
                ['meta_key' => 'purchase_sms', 'meta_value' => $request->purchase_sms],
                ['meta_key' => 'payment_sms', 'meta_value' => $request->payment_sms],
                ['meta_key' => 'booking_sms', 'meta_value' => $request->booking_sms],

                // Branch Setup -> Forms Setup: the preferred cash/bank form.
                // A blank is Automatic, so a branch that has never chosen keeps
                // resolving the form the way it always did.
                ['meta_key' => 'form_variant_cash_received', 'meta_value' => (string) ($request->form_variant_cash_received ?? '')],
                ['meta_key' => 'form_variant_cash_payment', 'meta_value' => (string) ($request->form_variant_cash_payment ?? '')],
                ['meta_key' => 'form_variant_bank_received', 'meta_value' => (string) ($request->form_variant_bank_received ?? '')],
                ['meta_key' => 'form_variant_bank_payment', 'meta_value' => (string) ($request->form_variant_bank_payment ?? '')],

                // Branch Setup -> Forms Setup: the unified-or-separate choice
                // for each side. Blank is Automatic.
                ['meta_key' => 'received_entry_mode', 'meta_value' => (string) ($request->received_entry_mode ?? '')],
                ['meta_key' => 'payment_entry_mode', 'meta_value' => (string) ($request->payment_entry_mode ?? '')],

                // When the day turns over at this property.
                //
                // ⚠️ These two are not decoration. The booking engine counts
                // NIGHTS and never hours: a stay of the 15th to the 18th holds
                // three nights and leaves the 18th free for the next guest. That
                // is only true while check-out comes BEFORE check-in on the same
                // day. Reversed, the same room is occupied twice for the hours
                // between, and nothing in the engine would notice -- which is why
                // hotelTimes() below refuses to save them that way round.
                ['meta_key' => 'hotel_check_in_time', 'meta_value' => $times['in']],
                ['meta_key' => 'hotel_check_out_time', 'meta_value' => $times['out']],

                // How long a tentative hold keeps the room, in hours.
                //
                // ⚠️ A hold takes REAL INVENTORY -- one row per bed per night --
                // so this number is how long an unconfirmed enquiry may keep a
                // room off the market. Too long and the desk turns people away
                // for rooms nobody is coming to; too short and a guest who said
                // they would ring back finds their room sold.
                ['meta_key' => 'hotel_hold_hours', 'meta_value' => $hold['hours']],
                ['meta_key' => 'hotel_hold_max_hours', 'meta_value' => $hold['max']],

                // The terms printed under the registration card the guest
                // signs. Read back from what is stored when the form does not
                // send it, like the hold above, so a caller posting half the
                // branch form cannot blank it.
                ['meta_key' => 'hotel_registration_terms', 'meta_value' => $request->has('hotel_registration_terms')
                    ? trim((string) $request->hotel_registration_terms)
                    : (string) (meta($branch->id, $branch->id, 'hotel_registration_terms') ?: '')],

                // Hotel Setup -> VAT Setup: whether the rate card quotes the
                // room before the tax or the whole price with it inside.
                //
                // ⚠️ ONLY THE TWO ANSWERS ARE STORED. Anything else -- a form
                // from another version, a typo, an empty post -- reads back as
                // exclusive, which is the arithmetic every property had before
                // this setting existed. Storing the raw string would leave a
                // property in a mode nothing knows how to bill.
                ['meta_key' => 'hotel_vat_mode', 'meta_value' => $this->hotelVatMode($request, (int) $branch->id)],
                ['meta_key' => 'hotel_due_mode', 'meta_value' => $this->hotelDueMode($request, (int) $branch->id)],
                ['meta_key' => 'hotel_income_mode', 'meta_value' => $this->hotelIncomeMode($request, (int) $branch->id, (int) $branch->company_id)],
            ];

            $this->saveBranchMetas($identify, $metaData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Branch successfully updated',
                'data' => [
                    'branch' => $branch,
                    'pad_header_image_url' => $branch->pad_header_image
                        ? asset($branch->pad_header_image)
                        : null,
                ],
                'error' => ['code' => 0]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Branch update failed',
                'error' => [
                    'code' => 500,
                    'details' => $e->getMessage()
                ]
            ], 500);
        }
    }



    public function apiStore(BranchStoreRequest $request)
    {
        $branchQuotaCheck = $this->ensureBranchQuotaAvailable((int) \Auth::user()->company_id);
        if ($branchQuotaCheck instanceof \Illuminate\Http\JsonResponse) {
            return $branchQuotaCheck;
        }

        DB::beginTransaction();
        try {
            $branch   = $this->branchData($request);

            if ($request->hasFile('pad_header_image')) {
                $branch['pad_header_image'] = $this->uploadPadHeaderImage($request);
            }

            $id       = DB::table('com_branches')->insertGetId($branch);

            // As in store(): the branch gets its inter-branch head at birth.
            InterBranchAccountHead::ensureForBranch($id);

            $dayclose = dateClose($id);
            DB::table('admin_day_closes')->insertGetId($dayclose);

            $identify = [
                'identify_id' => $id,
                'branch_id'   => $id,
            ];

            $metaData = [
                ['meta_key' => 'money_format', 'meta_value' => $request->money_format],
                ['meta_key' => 'invoice_label', 'meta_value' => $request->invoice_label],
                // The four handwritten figures' names on the sales invoice.
                ['meta_key' => 'manual_voucher_no_label', 'meta_value' => $request->manual_voucher_no_label],
                ['meta_key' => 'manual_voucher_date_label', 'meta_value' => $request->manual_voucher_date_label],
                ['meta_key' => 'manual_challan_no_label', 'meta_value' => $request->manual_challan_no_label],
                ['meta_key' => 'manual_challan_date_label', 'meta_value' => $request->manual_challan_date_label],
                // Whether this branch's party ledger shows a discounted bill whole,
                // with the discount broken out as a line of its own. '' from an
                // untouched form is "as it was".
                ['meta_key' => 'ledger_discount_split', 'meta_value' => $request->ledger_discount_split],
                // Whether this branch's Purchase and Sales ledgers print the
                // product lines inside their Product & Details column. Off
                // leaves the account and the note, and the quantity, rate and
                // total columns untouched.
                ['meta_key' => 'ledger_show_product_details', 'meta_value' => $request->ledger_show_product_details],
                // Branch Setup > Invoice Setup > "Enable Deduct Stock on
                // Delivery". Whether this branch's sales invoice may hold
                // its stock back for a delivery. Unset is off, which is
                // what every branch did before the switch existed.
                ['meta_key' => 'deduct_stock_on_delivery', 'meta_value' => $request->deduct_stock_on_delivery],
                ['meta_key' => 'have_is_guaranter', 'meta_value' => $request->have_is_guaranter],
                ['meta_key' => 'have_customer_nominee', 'meta_value' => $request->have_customer_nominee],
                ['meta_key' => 'is_opening', 'meta_value' => $request->is_opening],
                ['meta_key' => 'multiple_opening_allow', 'meta_value' => $request->multiple_opening_allow],
                ['meta_key' => 'stock_report_type', 'meta_value' => $request->stock_report_type],
                ['meta_key' => 'need_product_group', 'meta_value' => $request->need_product_group],
                ['meta_key' => 'need_package', 'meta_value' => $request->need_package],
                ['meta_key' => 'need_code', 'meta_value' => $request->need_code],
                // Product List's own inline edit: with the switch on, the four
                // measurement/package columns are drawn as inputs that save as
                // each box is left. Off, the list does not show them at all.
                ['meta_key' => 'product_list_inline_edit', 'meta_value' => $request->product_list_inline_edit],
                ['meta_key' => 'show_instalment_list', 'meta_value' => $request->show_instalment_list],
                ['meta_key' => 'show_spelling_of_money', 'meta_value' => $request->show_spelling_of_money],
                // Whether the sales invoice screens draw the Previous Balance /
                // Current Invoice / Discount / Received Amount / Total Tk. block.
                ['meta_key' => 'show_sales_balance_summary', 'meta_value' => $request->show_sales_balance_summary],
                // Every new branch starts with the demo tutorial switched on;
                // the request may still send an explicit value to override it.
                ['meta_key' => 'need_demo_tutorial', 'meta_value' => $request->need_demo_tutorial ?? '1'],
                ['meta_key' => 'decimal_places', 'meta_value' => $request->decimal_places],
                ['meta_key' => 'dashboard_top_sales_days', 'meta_value' => $request->dashboard_top_sales_days],
                ['meta_key' => 'dashboard_top_purchase_days', 'meta_value' => $request->dashboard_top_purchase_days],
                ['meta_key' => 'dashboard_due_soon_days', 'meta_value' => $request->dashboard_due_soon_days],
                // Default window of the transaction report button on List Customers.
                ['meta_key' => 'default_report_days', 'meta_value' => $request->default_report_days],
                ['meta_key' => 'device_identifier_text', 'meta_value' => $request->device_identifier_text],

                ['meta_key' => 'combined_invoice_note', 'meta_value' => $request->combined_invoice_note],
                // Branch Setup -> Invoice Setup: the branch's preferred form
                // for each invoice category. A blank is Automatic, so a branch
                // that has never chosen keeps resolving from its business type.
                ['meta_key' => 'invoice_variant_purchase', 'meta_value' => (string) ($request->invoice_variant_purchase ?? '')],
                ['meta_key' => 'invoice_variant_sales', 'meta_value' => (string) ($request->invoice_variant_sales ?? '')],
                ['meta_key' => 'invoice_variant_purchase_return', 'meta_value' => (string) ($request->invoice_variant_purchase_return ?? '')],
                ['meta_key' => 'invoice_variant_sales_return', 'meta_value' => (string) ($request->invoice_variant_sales_return ?? '')],
                ['meta_key' => 'invoice_variant_combined', 'meta_value' => (string) ($request->invoice_variant_combined ?? '')],
                ['meta_key' => 'show_category_in_invoice', 'meta_value' => $request->show_category_in_invoice],
                ['meta_key' => 'show_brand_in_invoice', 'meta_value' => $request->show_brand_in_invoice],
                ['meta_key' => 'show_description_in_invoice', 'meta_value' => $request->show_description_in_invoice],
                // Branch Setup -> Product Dropdown. See updateBranch().
                ['meta_key' => 'product_ddl_show_name', 'meta_value' => $request->product_ddl_show_name],
                ['meta_key' => 'product_ddl_show_category', 'meta_value' => $request->product_ddl_show_category],
                ['meta_key' => 'product_ddl_show_brand', 'meta_value' => $request->product_ddl_show_brand],
                ['meta_key' => 'product_ddl_show_group', 'meta_value' => $request->product_ddl_show_group],
                ['meta_key' => 'product_ddl_show_purchase_price', 'meta_value' => $request->product_ddl_show_purchase_price],
                ['meta_key' => 'product_ddl_show_sales_price', 'meta_value' => $request->product_ddl_show_sales_price],
                ['meta_key' => 'product_ddl_show_unit', 'meta_value' => $request->product_ddl_show_unit],
                ['meta_key' => 'product_ddl_show_balance', 'meta_value' => $request->product_ddl_show_balance],
                ['meta_key' => 'product_ddl_lines', 'meta_value' => $request->product_ddl_lines],
                // Branch Setup -> Customer / Supplier Dropdown. See updateBranch().
                ['meta_key' => 'party_ddl_show_code', 'meta_value' => $request->party_ddl_show_code],
                ['meta_key' => 'party_ddl_show_mobile', 'meta_value' => $request->party_ddl_show_mobile],
                ['meta_key' => 'party_ddl_show_address', 'meta_value' => $request->party_ddl_show_address],
                ['meta_key' => 'party_ddl_show_father', 'meta_value' => $request->party_ddl_show_father],
                ['meta_key' => 'party_ddl_lines', 'meta_value' => $request->party_ddl_lines],

                ['meta_key' => 'need_customer_contact_person', 'meta_value' => $request->need_customer_contact_person],
                ['meta_key' => 'due_list_with_address', 'meta_value' => $request->due_list_with_address],
                ['meta_key' => 'due_list_show_area', 'meta_value' => $request->due_list_show_area],
                ['meta_key' => 'mobile_number_format', 'meta_value' => $request->mobile_number_format],
                ['meta_key' => 'need_relation_info', 'meta_value' => $request->need_relation_info],
                ['meta_key' => 'need_customer_mother_name', 'meta_value' => $request->need_customer_mother_name],
                ['meta_key' => 'need_customer_sex', 'meta_value' => $request->need_customer_sex],
                ['meta_key' => 'salutation_male', 'meta_value' => $request->salutation_male],
                ['meta_key' => 'salutation_female', 'meta_value' => $request->salutation_female],
                ['meta_key' => 'salutation_other', 'meta_value' => $request->salutation_other],
                ['meta_key' => 'letter_signature', 'meta_value' => $request->letter_signature],
                ['meta_key' => 'need_customer_date_of_birth', 'meta_value' => $request->need_customer_date_of_birth],
                ['meta_key' => 'need_customer_occupation', 'meta_value' => $request->need_customer_occupation],
                ['meta_key' => 'need_customer_permanent_address', 'meta_value' => $request->need_customer_permanent_address],
                ['meta_key' => 'need_customer_photo', 'meta_value' => $request->need_customer_photo],
                ['meta_key' => 'need_customer_national_id', 'meta_value' => $request->need_customer_national_id],
                ['meta_key' => 'need_nominee_photo', 'meta_value' => $request->need_nominee_photo],
                ['meta_key' => 'need_customer_area', 'meta_value' => $request->need_customer_area],
                // Who looks after a customer: the Add/Edit forms offer a picker
                // of this branch's own staff and List Customers gains a filter
                // and a column beside the address. Off everywhere by default.
                ['meta_key' => 'need_customer_handle_by_employee', 'meta_value' => $request->need_customer_handle_by_employee],
                ['meta_key' => 'show_voucher_image', 'meta_value' => $request->show_voucher_image],
                // Whether this branch composes orders with more than one product.
                // Off keeps the single-product order form exactly as it was.
                ['meta_key' => 'multi_product_order', 'meta_value' => $request->multi_product_order],
                // Whether this branch records which product a receipt or payment
                // was for. Off hides the product field on the cash forms, so a
                // branch that does not keep product-wise accounts never sees it.
                ['meta_key' => 'product_tracking', 'meta_value' => $request->product_tracking],
                // Product List's second delete button: with the switch on, a
                // product can go together with the one old opening invoice that
                // brought it in. Off, the list shows only the plain delete.
                ['meta_key' => 'delete_with_opening_invoice', 'meta_value' => $request->delete_with_opening_invoice],
                ['meta_key' => 'delete_with_opening_invoice_date', 'meta_value' => $request->delete_with_opening_invoice_date],
                // Company scheme: the switch that shows the Company Scheme option on
                // the Electronics sales invoice, and how many days after the sale
                // the brand is due to pay (the invoice's default due date).
                ['meta_key' => 'company_scheme', 'meta_value' => $request->company_scheme],
                ['meta_key' => 'company_scheme_due_days', 'meta_value' => $request->company_scheme_due_days],
                ['meta_key' => 'company_scheme_due_weekday', 'meta_value' => $request->company_scheme_due_weekday],
                // What the allotment letter asks for, when the sale itself says
                // nothing: the down payment share and the monthly late-payment rate.
                ['meta_key' => 'down_payment_percent', 'meta_value' => $request->down_payment_percent],
                ['meta_key' => 'down_payment_base', 'meta_value' => $request->down_payment_base],
                // How the letter's reference number starts, e.g. "BST/ALLOT". The
                // year and the sale's serial are added to it, and the clerk can
                // still overwrite the whole thing when the letter is issued.
                ['meta_key' => 'letter_ref_prefix', 'meta_value' => $request->letter_ref_prefix],
                // Whether the reference reaches the paper at all. Off, the
                // letter prints with no Ref No line, for an office that writes
                // its own number on the sheet.
                ['meta_key' => 'print_letter_ref', 'meta_value' => $request->print_letter_ref],
                // The date the branch's letters carry. Whoever issues one still
                // sees it and can write another over it.
                ['meta_key' => 'letter_ref_date', 'meta_value' => $request->letter_ref_date],
                // Who hears about a new company registering, and how. Written
                // only for a caller holding 'registration.alert.manage' -- see
                // platformMetasFor(), which drops them for everybody else.
                ['meta_key' => 'registration_alert', 'meta_value' => $request->registration_alert],
                ['meta_key' => 'registration_alert_sms', 'meta_value' => $request->registration_alert_sms],
                ['meta_key' => 'registration_alert_mobile', 'meta_value' => $request->registration_alert_mobile],
                // Whether a print draws its own pad head, and how much of the
                // page a pre-printed one takes when it does not.
                ['meta_key' => 'pad_print_mode', 'meta_value' => $request->pad_print_mode],
                ['meta_key' => 'preprinted_pad_height', 'meta_value' => $request->preprinted_pad_height],
                // Branch Setup -> Print Setup -> Pad Logo. A new branch starts
                // with the mark off; the position is stored settled so the
                // form and the print agree even before the branch chooses one.
                ['meta_key' => 'pad_logo_enabled', 'meta_value' => $request->pad_logo_enabled],
                ['meta_key' => 'pad_logo_position', 'meta_value' => (string) ($request->pad_logo_position ?? 'right')],
                ['meta_key' => 'pad_logo_width', 'meta_value' => $request->pad_logo_width],
                ['meta_key' => 'pad_logo_height', 'meta_value' => $request->pad_logo_height],
                ['meta_key' => 'pad_logo_margin_top', 'meta_value' => $request->pad_logo_margin_top],
                ['meta_key' => 'pad_logo_margin_right', 'meta_value' => $request->pad_logo_margin_right],
                ['meta_key' => 'pad_logo_margin_left', 'meta_value' => $request->pad_logo_margin_left],
                ['meta_key' => 'delay_charge_percent', 'meta_value' => $request->delay_charge_percent],

                // ['meta_key' => 'use_filter_parameter', 'meta_value' => $request->use_filter_parameter],
                // ['meta_key' => 'sidebar_menu', 'meta_value' => $request->sidebar_menu],
                ['meta_key' => 'sms_service', 'meta_value' => $request->sms_service],
                ['meta_key' => 'received_sms', 'meta_value' => $request->received_sms],
                ['meta_key' => 'sales_sms', 'meta_value' => $request->sales_sms],
                ['meta_key' => 'purchase_sms', 'meta_value' => $request->purchase_sms],
                ['meta_key' => 'payment_sms', 'meta_value' => $request->payment_sms],
                ['meta_key' => 'booking_sms', 'meta_value' => $request->booking_sms],
                // Branch Setup -> Forms Setup: the preferred cash/bank form.
                ['meta_key' => 'form_variant_cash_received', 'meta_value' => (string) ($request->form_variant_cash_received ?? '')],
                ['meta_key' => 'form_variant_cash_payment', 'meta_value' => (string) ($request->form_variant_cash_payment ?? '')],
                ['meta_key' => 'form_variant_bank_received', 'meta_value' => (string) ($request->form_variant_bank_received ?? '')],
                ['meta_key' => 'form_variant_bank_payment', 'meta_value' => (string) ($request->form_variant_bank_payment ?? '')],
                ['meta_key' => 'received_entry_mode', 'meta_value' => (string) ($request->received_entry_mode ?? '')],
                ['meta_key' => 'payment_entry_mode', 'meta_value' => (string) ($request->payment_entry_mode ?? '')],
            ];

            $this->saveBranchMetas($identify, $metaData);

            DB::commit();
            $data = Branch::find($id);

            return response()->json([
                'success' => true,
                'message' => 'Branch save successfully',
                'data' => [
                    'branch' => $data,
                    'pad_header_image_url' => $data->pad_header_image
                        ? asset($data->pad_header_image)
                        : null,
                ],
                'error' => ['code' => 0]
            ]);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'success' => false,
                'message' => 'Branch save failed',
                'error' => [
                    'code' => 500,
                    'details' => $e->getMessage()
                ]
            ], 500);
        }
    }

    /**
     * The company the caller is actually working in.
     *
     * Read off the working branch, not users.company_id: the two disagree for
     * anyone lent to another company's branch -- user 1 carries company_id 1
     * while sitting at branch 11, which belongs to company 11 -- and it is the
     * branch in front of them that decides what they may transfer to.
     */
    private function workingCompanyId(): ?int
    {
        $auth = Auth::user();
        if (!$auth) {
            return null;
        }

        $branchCompany = Branch::where('id', $auth->branch_id)->value('company_id');

        return $branchCompany !== null ? (int) $branchCompany : ($auth->company_id ?? null);
    }

    /**
     * @param Request $request own_company=1 keeps the list inside the caller's
     *                         own company even for a privileged user. Stock
     *                         cannot move between two companies' books, so the
     *                         transfer screens ask for that narrower list.
     */
    public function getDdlAllBranch(Request $request)
    {
        // $authBranch = Branch::find( Auth::user()->branch_id );
        // if($authBranch->branch_types_id == 1) {
        $ownCompanyId = $request->boolean('own_company') ? $this->workingCompanyId() : null;

        $data = $this->companyRoleScope
            ->branchesQuery(Auth::user())
            ->when($ownCompanyId !== null, fn($query) => $query->where('company_id', $ownCompanyId))
            ->where('status', 1)
            ->orderBy('name', 'ASC')
            // address/phone ride along so a report printed for another branch can
            // head the page with that branch's details, not the caller's.
            ->select('id', 'name', 'name_local', 'address', 'phone')
            ->get();
        // }else{
        //     $data = Branch::where('status', 1)
        //     ->orderBy('name', 'ASC')->select('id', 'name')->get();
        // }


        if (empty($data)) {
            return notFound('No branch found!');
        }
        return foundData($data);
    }

    /** @param Request $request own_company=1 -- see getDdlAllBranch(). */
    public function getDdlProtectedBranch(Request $request)
    {
        $auth = Auth::User();
        if (!$auth) {
            return notFound('You are not authenticated!');
        }
        $userBranch = Branch::find($auth->branch_id);
        $data = [];
        if ($this->companyRoleScope->isSuperAdmin($auth) || $userBranch?->branch_types_id == 1) {
            $data = $this->companyRoleScope
                ->branchesQuery($auth)
                ->when(
                    $request->boolean('own_company') && $this->workingCompanyId() !== null,
                    fn($query) => $query->where('company_id', $this->workingCompanyId())
                )
                ->where('status', 1)
                ->orderBy('name', 'ASC')
                // address/phone ride along so a report printed for another branch
                // can head the page with that branch's details, not the caller's.
                ->select('id', 'name', 'name_local', 'address', 'phone')
                ->get();
        } else {
            $data = $this->companyRoleScope
                ->branchesQuery($auth)
                ->where('status', 1)
                ->where('id',  $auth->branch_id)
                ->select('id', 'name', 'name_local', 'address', 'phone')->orderBy('name')->get();
        }
        if (empty($data)) {
            return notFound('No branch found!');
        }

        /**
         * ⚠️ "CUSTOMER HANDLE BY EMPLOYEE" TRAVELS WITH THE BRANCH.
         *
         * A report that can be run for ANOTHER branch (the Due List) has to know
         * whether THAT branch asks for the field at all. The reader's own
         * branch's setting is not the answer, and a filter that stayed hidden
         * while still narrowing the report would be the worst of both.
         *
         * Read through the same meta() the branch's own settings are read with,
         * so unset and '0' both come back as off -- one small indexed query per
         * branch, and the dropdown is a handful of rows.
         */
        $data->each(function ($branch) {
            $branch->need_customer_handle_by_employee = meta($branch->id, $branch->id, 'need_customer_handle_by_employee');
        });

        $transactionDate = getDbTrDate($auth->branch_id);
        $data = [
            'data' => $data,
            'transactionDate' => us_to_bd_date($transactionDate),
        ];
        return foundData($data);
    }

    public function changeBranchStatus(Request $request)
    {
        // return $request->all();
        $id = isset($request->id) ? $request->id : null;

        if (isset($id)) {
            $branch = $this->companyRoleScope->findScopedBranch($id, Auth::user());

            if (!$branch) {
                return notFound('Branch not found!');
            }
        } else {
            return notFound('Invalid ID!');
        }

        $request->validate([
            'status' => 'required|boolean',
        ]);

        $branch->status = $request->status;
        $branch->save();

        return response()->json([
            'success' => true,
            'message' => "Branch " . ($request->status ? 'enabled' : 'disabled') . " successfully updated",

            'data' => [
                'branch' => $branch,
            ],
            'error' => [
                'code' => 0
            ]
        ]);
    }
}
