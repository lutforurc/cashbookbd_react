<?php

namespace App\Http\Controllers\Party;

use App\Http\Controllers\CommonFunction\Common;
use Illuminate\Support\Facades\File;
use App\Http\Controllers\Controller;
use App\Models\Party\PartyLedger;
use App\Models\Acc\CoaLevel4;
use App\Models\Acc\CoaLevel3;
use App\Models\Party\Area;
use App\Models\Party\PartyInfo;
use App\Models\Party\Partytype;
use Illuminate\Http\Request;
use App\Models\Admin\Dayclose;
use App\Models\Party\Relation;
use \Illuminate\Support\Facades\Auth;
use Yajra\DataTables\Facades\DataTables;
use Illuminate\Support\Facades\DB;
use App\Http\Utils\Member;
use App\Models\Com\Branch;
use App\Models\Master\MainTransactionMaster;
use Brian2694\Toastr\Facades\Toastr;
use App\Models\Party\Guarantor;
use App\Models\Party\Nominee;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use App\Models\Com\Company;
use App\Services\OpeningBalance\PartyOpeningBalanceService;
use App\Services\SubscriptionLimitService;
use App\Support\RecordDiff;
use Barryvdh\DomPDF\Facade\Pdf;

class PartyController extends Controller
{
    /** Largest customer/nominee photo accepted, after base64 decoding. */
    private const PHOTO_MAX_BYTES = 153600; // 150 KB

    protected $branch;

    private PartyOpeningBalanceService $openingBalance;

    public function __construct(PartyOpeningBalanceService $openingBalance)
    {
        $this->branch = Branch::find(Auth::user());
        $this->openingBalance = $openingBalance;
    }
    
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $party  = PartyInfo::where('status', '1')->get();
        $areas      = Area::where('status', '1')->get();
        $partytypes = Partytype::where('status', '1')->get();
        $coal4      = CoaLevel4::where('status', '1')->get();

        $relations  = Relation::where('status', 1)->get();


        return view(
            'party.party.index',
            compact('party', 'areas', 'partytypes', 'relations')
        );
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */

    /**
     * Party Details Information
     */
    public function partyLedgerInformation($id)
    {
        $id = get_hash($id);
        $party = PartyInfo::where('company_id', auth()->user()->company_id)->findOrFail($id);
        $branchId = Auth::user()->branch_id;
        $party->ledger = partyLedger($branchId, $id);
        return $party;
    }

    public function partyLedgerUpdated(Request $request)
    {
        $data         = $request->all();

        $userBranchId = Auth::user()->branch_id;
        $customerId   = get_hash($data['party_id']);
        try {

            $existLedger = PartyLedger::where('branch_id', $userBranchId)->where('party_id', $customerId)->first();

            if ($existLedger) {
                PartyLedger::where('id', $existLedger->id)->delete();
            }
            $newLedger = [
                'branch_id'   => $userBranchId,
                'party_id'    => $customerId,
                'ledger_page' => $data['ledger'],
            ];

            $result = DB::table('cust_party_ledger')->insertGetId($newLedger);
            return $result;
        } catch (\Exception $e) {
            return $e->getMessage();
        }
    }
    public function create()
    {

        if (!auth()->user()->can('cash.received.create')) {
            abort(403, 'Unauthorized to access');
        }

        $areas      = Area::where('status', '1')
            ->orderBy('name', 'asc')
            ->get();
        $partytypes = Partytype::where('status', '1')->get();
        $coal3      = CoaLevel3::where('status', '1')->get();
        $relations  = Relation::where('status', 1)->get();
        $party  = PartyInfo::where('status', '1')->get();

        $branch = Branch::find(Auth::user()->branch_id);
        $groupName =  DB::select(
            "SELECT max(CONVERT(idfr_code,UNSIGNED INTEGER)) max_customer_number FROM cust_party_infos cpi WHERE cpi.branch_id = ?",
            [(int) $branch->id]
        );
        if ($branch->have_customer_sl == 1) {
            $maxIDFRCode  = ($groupName[0]->max_customer_number + 1);
        } else {
            $maxIDFRCode  = '';
        }
        return view('party.party.add-party', compact('areas', 'partytypes', 'coal3', 'relations', 'maxIDFRCode', 'branch'));
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $input = request()->validate(
            [
                'type_id' => 'required|numeric|not_in:0',
                'name'    => 'required'
            ],
            [
                'type_id.required' => 'Party is required',
                'name.required'    => 'Name is required'
            ]
        );

        $arras = $request->all();
        $coa3_id = Partytype::find($arras['type_id'])->coa3_id;

        DB::beginTransaction();

        try {

            $coal4 = (new Member($arras, $coa3_id))->chartofAcc();
            $fontent_name = CoaLevel4::find($coal4)->name;
            DB::commit();
            Toastr::success($fontent_name . ' (' . Partytype::find($arras['type_id'])->name . ')' . ' added complete.', '', ["positionClass" => "toast-bottom-right"]);
            return redirect('accounts/party');
        } catch (\Exception $e) {
            DB::rollback();
            Toastr::error('Something went wrong.', '', ["positionClass" => "toast-bottom-right"]);
            return redirect()->back();
        }
    }

    /**
     * Display the specified resource.
     *
     * @param int $id
     *
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $party = PartyInfo::select('*')->where('id', $id)->get();

        return DataTables::of($party)
            ->editColumn(
                'name',
                function ($party) {
                    $nameEnglish = str_replace("A/R", "", $party->name);
                    $html        = '<span>' . $nameEnglish
                        . '</span><br><span class="suttony font-20">'
                        . $party->bangla . '</span>';

                    return $html;
                }
            )
            ->editColumn(
                'father',
                function ($party) {
                    $html = '<span>' . $party->father
                        . '</span><br><span class="suttony font-20">'
                        . $party->father_bangla . '</span>';

                    return $html;
                }
            )
            ->editColumn(
                'party_type_id',
                function ($party) {
                    $ptype = Partytype::find($party->party_type_id);

                    return $ptype->name;
                }
            )
            ->editColumn(
                'ledger_page',
                function ($party) {
                    $lpage = PartyLedger::where(
                        'branch_id',
                        \Auth::user()->branch_id
                    )
                        ->where('party_id', $party->id)
                        ->first();

                    return $lpage['ledger_page'];
                }
            )
            ->editColumn(
                'area_id',
                function ($party) {
                    $area           = Area::find($party->area_id)->name;
                    $areaBanla      = Area::find($party->area_id)->bangla;
                    $areaWithBangla = '<span>' . $area
                        . '</span><br><span class="suttony font-20"> ' . $areaBanla
                        . ' </span>';

                    return $areaWithBangla;
                }
            )
            ->editColumn(
                'area_id',
                function ($party) {
                    $area = Area::find($party->area_id)->name;
                    $bangla = Area::find($party->area_id)->bangla;

                    return $area
                        . '<br><span class="suttony" style="font-size: 20px">'
                        . $bangla . '<span/>';
                }
            )
            ->rawColumns(['name', 'father', 'area_id'])
            ->make(true);
    }

    public function party($id)
    {
        // Customer or Supplier Information
        $party = PartyInfo::where('company_id', auth()->user()->company_id)->findOrFail($id);

        // Ledger Information
        $lpage = PartyLedger::where('branch_id', \Auth::user()->branch_id)
            ->where('party_id', $id)->first();
        $a     = $lpage == '' ? '' : $lpage->ledger_page;

        $data = [
            'ledger_page' => $a,
            'party'       => $party,
        ];

        return $data;
    }

    public function getArea()
    {
        return Area::select('id', 'name')
            ->where('status', '1')->get();
    }

    public function getCType()
    {
        return Partytype::select('id', 'name')
            ->where('status', '1')->get();
    }

    public function edit($id)
    {

        $branchId = Auth::user()->branch_id;
        $partyId =  get_hash($id);


        $areas      = Area::where('status', '1')->orderBy('name', 'asc')->get();

        $partytypes = Partytype::where('status', '1')->get();
        $branch     = Branch::find(Auth::user()->branch_id);
        $party    = PartyInfo::where('company_id', auth()->user()->company_id)->findOrFail($partyId);

        return view('party.party.edit-party', compact('areas', 'partytypes', 'branch', 'party'));
    }

    public function update(Request $request, $id)
    {
        $input = request()->validate(
            [
                'type_id' => 'required|numeric|not_in:0',
                'name'    => 'required'
            ],
            [
                'type_id.required' => 'Party is required',
                'name.required'    => 'Name is required'
            ]
        );

        $userBranchId = \Auth::user()->branch_id;
        $customerId = (int) get_hash($id);

        $fontent_name = $name = str_replace('A/R ', '', $request->name);

        $rel_id = null;
        if ($request->father != null && $request->father != '') {
            $rel_id = isset($request->relation_id) ? $request->relation_id : null;
        }

        DB::beginTransaction();
        try {

            // Scoped, because the line below writes the caller's own company on
            // to whatever it found. Unscoped that was not an edit but a
            // seizure: any signed-in account could walk the ids and pull
            // another company's customers across into its own books.
            $party = PartyInfo::where('company_id', \Auth::user()->company_id)->find($customerId);

            if (! $party) {
                DB::rollback();
                return notFound('Party not found');
            }





            $party->company_id          = \Auth::user()->company_id;
            $party->idfr_code           = isset($request->idfr_code) ? $request->idfr_code : null;
            $party->area_id             = isset($request->area_id) ? $request->area_id : null;
            $party->party_type_id       = $request->type_id;
            $party->name                = $fontent_name;
            $party->bangla              = isset($request->bangla) ? $request->bangla : null;
            $party->relation_id         = isset($rel_id) ? $rel_id : null;
            $party->father              = isset($request->father) ? $request->father : null;
            $party->father_bangla       = isset($request->father_bangla) ? $request->father_bangla : null;
            $party->manual_address      = isset($request->manual_address) ? $request->manual_address : null;
            $party->mobile              = $request->mobile;
            $party->email               = isset($request->email) ? $request->email : null;
            $party->installment         = isset($request->installment) ? $request->installment : 0;
            $party->numberofinstallment = isset($request->numberofinstallment) ? $request->numberofinstallment : 0;
            $party->ledger_page         = null;
            isset($request->ledger_page) ? $request->ledger_page : null;                                                                      // $request->ledger_page;
            $party->status              = '1';
            $party->updated_by          = \Auth::user()->id;
            $party->previous_data       = isset($previous_json_serialized_data) ? $previous_json_serialized_data : null;
            $party->save();


            // Bound, not interpolated. get_hash() hands back whatever was
            // encrypted, and the key it decrypts with is the caller's own CSRF
            // token, so the caller can encrypt any string they like and have it
            // arrive here. Unquoted in a WHERE that drives an UPDATE, "1 OR 1=1"
            // rewrote every party's address in the table. The cast to int above
            // settles it; the placeholders keep it settled.
            DB::select("UPDATE cust_party_infos cpi
                    INNER JOIN
                    (
                    SELECT CONCAT( caa.name, ', ', cat.name, ', ', cad.name) manual_address, cpi.id cid
                    FROM cust_addr_areas caa
                    JOIN cust_addr_thanas cat ON cat.id = caa.thana_id
                    JOIN cust_addr_districts cad ON cad.id = cat.district_id
                    JOIN cust_party_infos cpi ON cpi.area_id = caa.id
                    where cpi.id = ?
                    )address ON address.cid = cpi.id
                    SET cpi.manual_address = address.manual_address
                    WHERE cpi.id = ? ", [$customerId, $customerId]);

            $party_ledger = PartyLedger::where(
                function ($query) use ($userBranchId) {
                    $query->where(
                        'branch_id',
                        '=',
                        $userBranchId
                    );
                }
            )->where(
                function ($query) use ($customerId) {
                    $query->where('party_id', '=', $customerId);
                }
            )->get();

            if ($request['ledger_page'] == null) {
                PartyLedger::where('branch_id', $userBranchId)->where('party_id', $customerId)->delete();
            } else {
                if ($party_ledger->isEmpty()) {
                    $pl              = new PartyLedger();
                    $pl->branch_id   = $userBranchId;
                    $pl->party_id    = $customerId;
                    $pl->ledger_page = $request->ledger_page;
                    $pl->save();
                } else {
                    DB::table('cust_party_ledger')
                        ->where('party_id', $customerId)
                        ->where('branch_id', $userBranchId)
                        ->update(['ledger_page' => $request->ledger_page]);
                }
            }

            $coal4         = CoaLevel4::find($party->coa4_id);
            $coal4->name   = $name;
            $coal4->bangla = isset($request->name_bangla) ?  $request->name_bangla : null;
            $coal4->save();

            DB::commit();
            Toastr::success($fontent_name . ' update completed.', '', ["positionClass" => "toast-bottom-right"]);

            return redirect('accounts/party');
        } catch (\Exception $ex) {
            DB::rollback();
            Toastr::error('Something went wrong.', '', ["positionClass" => "toast-bottom-right"]);
            return redirect()->back();
        }

        return redirect()->back();
    }

    public function updateImage(Request $request)
    {
        return view('party.party.add-party-photo');
    }

    public function storeImage(Request $request)
    {

        $coa4_id = $request['client_id'];

        $clientId = PartyInfo::select('id')->where('coa4_id', $coa4_id)->first();

        try {
            if (isset($request['image'])) {
                //                $clientsObj  = PartyInfo::find($clientId);
                $data        = $request['image'];
                $image_arr_1 = explode(";", $data);
                $image_arr_2 = explode(",", $image_arr_1[1]);
                $fdata       = base64_decode($image_arr_2[1]);
                $imageName   = $coa4_id . ".png";
                $dir         = $_SERVER['DOCUMENT_ROOT'] . '/';

                $existing_File = $dir . "public/images/cust_image/" . $imageName;

                if (File::exists($existing_File)) {
                    File::delete($existing_File);
                }

                file_put_contents($existing_File, $fdata);

                $clientsObj = PartyInfo::where('coa4_id', $coa4_id)
                    ->first(); // this point is the most important to change

                $clientsObj->image_coa4_id = $imageName;
                $clientsObj->save();

                return "/images/cust_image/" . $imageName;
            }
        } catch (\Exception $e) {
            return $e->getMessage();
        }
    }

    public function destroy($id)
    {
        //
    }

    public function partyLedger($lid)
    {
        $dayclose = Dayclose::orderBy('id', 'DESC')
            ->where('branch_id', \Auth::user()->branch_id)->first();

        $startDate = date(
            'Y-m-01',
            strtotime($dayclose->trx_date)
        ); // First Day of the Month
        $endDate   = date(
            "Y-m-t",
            strtotime($dayclose->trx_date)
        ); // Last Day of the Month

        $trxDate = $dayclose->trx_date; // Transaction Date;

        $branch_id  = \Auth::user()->branch_id;
        $ledgerId   = $lid;
        $ladgerName = PartyInfo::where('coa4_id', $ledgerId)->get();


        $ledgera = \DB::select(
            "
                    select null vr_sl, null coa4_id, '' vr_date, '' vr_no, null id, 'Opening' description, null trx_mstr_id,
                    (CASE WHEN sum(debit)-sum(credit)>0
                    THEN sum(debit)-sum(credit) ELSE 0 END) debit,
                    (CASE WHEN
                    sum(credit)-sum(debit) > 0
                    THEN sum(credit)-sum(debit) ELSE 0 END) credit
                    from
                    (select vr_sl, acd.coa4_id, mtm.vr_date, mtm.vr_no, acd.id, acl4.name, acd.trx_mstr_id,  acd.credit debit, acd.debit credit
                    from acc_transaction_details acd
                    join acc_coa_level4s acl4 on acl4.id = acd.coa4_id
                    join acc_transaction_master atm on atm.id = acd.trx_mstr_id
                    join main_trx_master mtm on mtm.id = atm.main_trx_id
                    where mtm.id in (select distinct(mtm.id)
                    from acc_transaction_details atd
                    join acc_transaction_master atm on atm.id = atd.trx_mstr_id
                    join main_trx_master mtm on mtm.id = atm.main_trx_id
                    where coa4_id = '" . $ledgerId . "') and mtm.branch_id = '"
                . $branch_id . "'  and mtm.vr_date <'" . $startDate . "') transaction_details
                    where coa4_id <> '" . $ledgerId . "'
                    UNION
                    select * from
                    (select vr_sl, acd.coa4_id, DATE_FORMAT(mtm.vr_date, '%d/%m/%Y') vr_date, mtm.vr_no, acd.id, acl4.name, acd.trx_mstr_id,  acd.credit debit, acd.debit credit
                    from acc_transaction_details acd
                    join acc_coa_level4s acl4 on acl4.id = acd.coa4_id
                    join acc_transaction_master atm on atm.id = acd.trx_mstr_id
                    join main_trx_master mtm on mtm.id = atm.main_trx_id
                    where mtm.id in (select distinct(mtm.id)
                    from acc_transaction_details atd
                    join acc_transaction_master atm on atm.id = atd.trx_mstr_id
                    join main_trx_master mtm on mtm.id = atm.main_trx_id
                    where coa4_id = '" . $ledgerId . "') and mtm.branch_id = '"
                . $branch_id . "' and mtm.vr_date  between '" . $startDate . "' and '"
                . $endDate . "') transaction_details
                    where coa4_id <> '" . $ledgerId . "'
                    order by id"
        );

        $page = PartyLedger::where('branch_id', $branch_id)
            ->where('party_id', $ladgerName[0]->id)
            ->first();

        $a = $page == '' ? '' : $page->ledger_page;

        $somity = '<span> ' . Area::find($ladgerName[0]->area_id)->name
            . ' </span><br/><span class="suttony font-20">' . Area::find(
                $ladgerName[0]->area_id
            )->bangla . '</span>';

        $customerName = '<span>' . str_replace("A/R", "", $ladgerName[0]->name)
            . ' (' . $ladgerName[0]->idfr_code . ')'
            . '</span><br><span class="suttony font-20"> '
            . $ladgerName[0]->bangla . ' (' . $ladgerName[0]->idfr_code . ')'
            . '</span>';

        $ledger = [
            'name'        => $customerName,
            'mobile'      => $ladgerName[0]->mobile,
            'ledger'      => $a,
            'branch_name' => $somity,
            'data'        => $ledgera,
        ];

        return json_encode($ledger);
    }

    public function ajax()
    {
        $shareCustomer = Branch::find(\Auth::user()->branch_id)->share_customer_with_other_branch;

        $branch_id = Auth::user()->branch_id;
        $party = PartyInfo::select('*')->where('id', '<>', 19);
        if ($shareCustomer == 0) {
            $party->where('branch_id', $branch_id);
        }
        $party->orderBy('name', 'ASC')->get();

        $lpage = PartyLedger::select('ledger_page')
            ->where('branch_id', $branch_id)
            ->where('party_id', 1)
            ->first();

        return DataTables::of($party)
            ->editColumn(
                'name',
                function ($party) {
                    $idfr = isset($party->idfr_code) &&  $party->idfr_code != 0 && $party->idfr_code != null ? ' (' . $party->idfr_code . ')' : '';
                    $name = '<a><span href="#" class="party-list-model" area-id="' . $party->area_id . '" data-toggle="modal" data-id="' . $party->id . '" data-target="#listcustomerModal">' . str_replace("A/R", "", $party->name) . $idfr . '<br><span class="suttony" style="font-size: 20px;">' . $party->bangla . $idfr . '</span></a>';
                    return $name;
                }
            )
            ->editColumn('address', function ($party) {
                if ($party->area_id == 0) {
                    $address = '<span>' . $party->manual_address . '</span>';
                } else {
                    $area = Area::find($party->area_id);
                    $address = $area->name . ', ' . $area->thana->name . ', ' . $area->thana->districts->name;
                }
                return $address; //$address;
            })
            ->editColumn(
                'father',
                function ($party) {

                    if ($party->father != null or $party->father != "") {

                        $father = '<span>' . $party->father . ' </span><br><span class="suttony font-20">' . $party->father_bangla . '</span>';
                    } else {
                        $father = '';
                    }
                    return $father;
                }
            )
            ->addColumn(
                'action',
                function ($party) {
                    if (in_array($party->coa4_id, array(17))) {
                        return '';
                    } else {
                        $view = $edit = $delete = $ledger = '';

                        if (auth()->user()->can('cs.view')) {
                            $url = url('accounts/party/' . the_hash($party->id));
                            $view = '<a href="#" class="party-list-model mr-1" area-id="' . $party->area_id . '" data-toggle="modal" data-id="' . $party->id . '" data-target="#listcustomerModal"><i class="fa fa-eye"></i></a>';
                        }
                        if (auth()->user()->can('cs.edit')) {
                            $url = url('accounts/party/' . the_hash($party->id) . '/edit');
                            $edit = '<a href="' . $url . '" class="edit mr-1"><i class="fa fa-edit"></i></a>';
                        }

                        if (auth()->user()->can('cs.ledger')) {
                            $url = url('accounts/party/ledger/' . the_hash($party->id));
                            $ledger = '<a href="#" class="ledger mr-1" data-ledger="' . the_hash($party->id) . '" data-toggle="modal" data-target="#ledgerUpdate" ><i class="fa fa-book"></i></a>';
                        }
                        if (auth()->user()->can('cs.delete')) {
                            $url = url('accounts/party/' . the_hash($party->id) . '/edit');
                            $delete =  '<a class="deleteManufacturer" data-id="' . $party->id . '" href="#"><i class="fa fa-trash"></i></a>';
                        }
                        $markup = $view . $edit . $ledger . $delete;
                        return $markup;
                    }
                }
            )
            ->addColumn(
                'acdetails',
                function ($party) {
                    return '
                    <form method="post">
                        <a href="#" class="acdetails" title="Accounts Details" data-toggle="modal" coa-l4="'
                        . $party->coa4_id . '" data-id="' . $party->id . '" data-target="#accountsDetailsModal"><i class="fa fa-list"></i></a>
                    </form>';
                }
            )
            ->editColumn(
                'image_coa4_id',
                function ($party) {

                    $image = isset($party->image_coa4_id) ? $party->image_coa4_id : 'avatar.png';
                    return '<img class="text-center" src="/images/cust_image/' . $image . '" alt="" height="60" width="60">';
                }
            )
            ->editColumn(
                'email',
                function ($party) {
                    if ($party->email == null) {
                        return 'N/A';
                    } else {
                        return $party->email;
                    }
                }
            )

            ->rawColumns(['name', 'action', 'acdetails', 'area_id', 'father', 'image_coa4_id', 'address'])
            ->toJson();
    }

    public function bioData()
    {
        return view('party.party.party-bio-data');
    }

    public function dataInfo(Request $request)
    {
        $coal4_id = $request['coal4'];
        $branchId = $this->branch->id;


        $data = \DB::select("SELECT cpi.name as customer_name,  cpi.bangla, cpi.father, cpi.father_bangla, cpi.idfr_code,
                            cpi.mobile, cpi.image_coa4_id, caa.name area_english, caa.bangla area_bangla,
                            cat.name thana_name
                            FROM cust_party_infos cpi
                            JOIN cust_addr_areas caa ON caa.id = cpi.area_id
                            JOIN cust_addr_thanas cat ON cat.id = caa.thana_id
                            WHERE cpi.branch_id = $branchId AND cpi.coa4_id = $coal4_id");


        // $data = \DB::select('call customer_info(?, ?)', array($branchId, $coal4_id));
        return $data;
    }

    public function apiContactDetails(Request $request)
    {
        $perPage  = $request->per_page ?? 10;
        $page     = max($request->page ?? 1, 1);
        $offset   = ($page - 1) * $perPage;
        $user = Auth::user();
        $branch      = $this->branch ?? Branch::find($user->branch_id);

        $data = PartyInfo::query()
            // Joined on status = 1 so a voucher deleted from the Voucher Delete
            // screen leaves opening_vr_no empty. The row then offers to raise a
            // fresh one instead of pointing at something the ledger dropped.
            ->leftJoin('main_trx_master as opening_vr', function ($join) {
                $join->on('opening_vr.id', '=', 'cust_party_infos.main_trx_id')
                    ->where('opening_vr.status', '=', 1);
            })
            ->select(
                'cust_party_infos.id',
                'cust_party_infos.name',
                'cust_party_infos.national_id',
                'cust_party_infos.father',
                'cust_party_infos.mobile',
                'cust_party_infos.email',
                'cust_party_infos.openingbalance',
                'cust_party_infos.manual_address',
                'cust_party_infos.coa4_id',
                'cust_party_infos.main_trx_id',
                'opening_vr.vr_no as opening_vr_no',
                'opening_vr.vr_date as opening_vr_date'
            )
            ->when(
                (int) $branch->share_customer_with_other_branch	 === 0,
                fn($q) => $q->where('cust_party_infos.branch_id', $branch->id)
            )
            ->with([
                'guarantors',        // ✅ guarantors eager load
                'nominees',
                'ledger:id,party_id,ledger_page'
            ])
            ->where('cust_party_infos.status', 1)
            ->where('cust_party_infos.company_id', $user->company_id)
            ->where('cust_party_infos.id', '<>', 19)
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('cust_party_infos.name', 'like', "%{$search}%")
                        ->orWhere('cust_party_infos.mobile', 'like', "%{$search}%")
                        ->orWhere('cust_party_infos.email', 'like', "%{$search}%")
                        ->orWhere('cust_party_infos.manual_address', 'like', "%{$search}%");
                });
            })
            /**
             * The classification filter -- a `cust_party_infos.party_type_id` as
             * Add Customers saved it (1 Customer, 2 Supplier, 3 Supplier &
             * Customer, 4 Advance), the same column and the same values the Due
             * List narrows by. "Supplier & Customer" is its own saved type, so
             * it is matched like any other rather than expanded into 1 OR 2.
             *
             * ⚠️ APPLIED BEFORE paginate(), which is the whole point of doing it
             * here. A filter put over the page -- on the screen, or after the
             * paginator has already counted -- shows ten rows of one class under
             * the total and page count of every class, and the last pages come
             * back empty while the count still promises rows.
             *
             * Empty or absent is "every party", which is not a value any row
             * carries -- so the filter is conditional rather than defaulted.
             */
            ->when(
                $request->filled('party_type_id'),
                fn ($q) => $q->where('cust_party_infos.party_type_id', $request->party_type_id)
            )
            ->orderBy('cust_party_infos.name', 'ASC')
            ->paginate($perPage);

        // Serial number add
        $data->getCollection()->transform(function ($item, $key) use ($offset) {
            $item->serial = $offset + $key + 1;

            // ledger_page flatten (optional)
            $item->ledger_page = $item->ledger->ledger_page ?? null;

            unset($item->ledger);

            return $item;
        });

        return $data->count()
            ? foundData($data)
            : notFound('No data found!');
    }

    public function apiContactStore(Request $request)
    {
        // The portal password can be set as the customer is created, and until
        // now it was the one place that took one without asking how long it
        // was -- a single character was accepted here while every other way in
        // asked for eight.
        $request->validate([
            'password' => 'nullable|string|min:8',
        ]);

        // The plan's cap, before Member inserts the party and its ledger head.
        // Asked here rather than inside Member::partySave(), whose only ways out
        // are an id or an exception -- and the catch below would turn an
        // exception into "Something went wrong."
        //
        // 200, like the user quota's refusal: the Add form reads $success and
        // shows $message itself, so a 4xx would only send the sentence through
        // axios's error path and past the toast that was going to say it.
        if ($refusal = app(SubscriptionLimitService::class)
            ->customerQuotaRefusal(Auth::user()->company_id)) {
            return notFound($refusal, 200);
        }

        $arras = $request->all();
        $coa3_id = Partytype::find($arras['type_id'])->coa3_id;

        DB::beginTransaction();

        try {
            $coal4 = (new Member($arras, $coa3_id))->chartofAcc();
            $fontent_name = CoaLevel4::find($coal4)->name;
            $partyId = PartyInfo::where('coa4_id', $coal4)->value('id');

            if ($partyId) {
                $update = [
                    // "Access Customer Login" gate for the self-service portal.
                    'customer_login'    => filter_var($request->customerLogin, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,

                    // Profile fields the Member util does not know about.
                    'date_of_birth'     => $request->filled('date_of_birth') ? $request->date_of_birth : null,
                    'occupation'        => $request->occupation ?: null,
                    'permanent_address' => $request->permanent_address ?: null,
                    'photo'             => $this->saveProfilePhoto($request->photo),
                ];

                // Optional portal password set at creation time.
                if ($request->filled('password')) {
                    $update['password'] = Hash::make($request->password);
                }

                PartyInfo::where('id', $partyId)->update($update);
            }

            if ($partyId && is_array($request->nominees)) {
                $this->syncNominees($partyId, $request->nominees);
            }

            /* =========================
            OPENING BALANCE
            =========================
            Same two effects as entering one on the customer list: the figure is
            stored, and a journal voucher is raised for it. Doing only the first
            would leave a balance the ledger has never heard of. Both happen in
            the service, so the list and this form cannot drift apart. */
            if ($partyId && $request->filled('openingbalance')) {
                if (!is_numeric($request->openingbalance)) {
                    DB::rollback();
                    return notFound('Opening balance must be a numeric value.');
                }

                $party = PartyInfo::find($partyId);
                $this->openingBalance->sync($party, (float) $request->openingbalance);
            }

            DB::commit();
            return foundData($coal4, $fontent_name . ' added successfully.');
        } catch (\RuntimeException $e) {
            // Photo problems carry a message worth showing.
            DB::rollback();
            return notFound($e->getMessage());
        } catch (\Exception $e) {
            DB::rollback();
            return notFound('Something went wrong. Please try again later.');
        }
    }

    public function apiContactMobileCheck(Request $request)
    {
        $user = Auth::user();
        $mobile = trim((string) $request->input('mobile', ''));

        if ($mobile === '') {
            return response()->json([
                'success' => false,
                'message' => 'Mobile number is required',
                'data' => [
                    'exists' => false,
                    'count' => 0,
                    'items' => [],
                ],
            ], 422);
        }

        $branch = $this->branch ?? Branch::find($user->branch_id);
        $branchId = (int) ($branch->id ?? $user->branch_id);
        $digits = preg_replace('/\D+/', '', $mobile);

        $contacts = PartyInfo::query()
            ->select('id', 'coa4_id', 'name', 'mobile', 'manual_address', 'branch_id')
            ->where('status', 1)
            ->where('company_id', $user->company_id)
            ->when(
                (int) ($branch->share_customer_with_other_branch ?? 0) === 0,
                fn($q) => $q->where('branch_id', $branchId)
            )
            ->where(function ($query) use ($mobile, $digits) {
                $query->where('mobile', $mobile);

                if ($digits !== '') {
                    $query->orWhereRaw(
                        "REPLACE(REPLACE(REPLACE(REPLACE(mobile, ' ', ''), '-', ''), '+', ''), '.', '') = ?",
                        [$digits]
                    );
                }
            })
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'message' => $contacts->isNotEmpty()
                ? 'This mobile number already exists.'
                : 'This mobile number is available.',
            'data' => [
                'exists' => $contacts->isNotEmpty(),
                'count' => $contacts->count(),
                'items' => $contacts,
            ],
        ]);
    }

    public function apiUpdateContactDetailsById(Request $request, $id)
    {

        $user = Auth::user();

        DB::beginTransaction();
        try {
            // Locked for the length of the transaction. Two clerks saving an
            // opening balance at the same moment would otherwise both read
            // main_trx_id as empty and each raise a voucher for it.
            $customer = PartyInfo::where('id', $id)->lockForUpdate()->first();

            if (!$customer) {
                DB::rollBack();
                return notFound('Customer not found', 404);
            }

            $updatedFields = [];

            /* =========================
            1️⃣ MOBILE UPDATE (cust_party_infos)
            ========================== */
            if ($request->has('mobile') && trim((string) $customer->mobile) !== trim((string) $request->mobile)) {
                $customer->mobile = $request->mobile;
                $updatedFields[] = 'Mobile';

                // The same rule the full customer edit follows: the portal
                // password defaults to the mobile number, so it follows the
                // number, and the sessions opened on the old one are dropped.
                // Changing the number from this screen used to leave the old
                // password working, which is the one thing the reset is for.
                $customer->password = null;
                $customer->must_change_password = 1;
                $customer->tokens()->delete();
                $updatedFields[] = 'Portal Password (reset to the new mobile number)';
            }

            /* =========================
            2️⃣ LEDGER PAGE UPDATE (cust_party_ledger)
            ========================== */
            if ($request->has('ledger_page')) {

                $ledgerPage = trim((string) $request->ledger_page);

                if ($ledgerPage !== '' && !preg_match(self::LEDGER_PAGE_PATTERN, $ledgerPage)) {
                    DB::rollBack();
                    return notFound(self::LEDGER_PAGE_MESSAGE, 422);
                }

                $existingLedgers = PartyLedger::where('branch_id', $user->branch_id)
                    ->where('party_id', $customer->id)
                    ->get();

                $hasSingleSameLedger = $existingLedgers->count() === 1
                    && $existingLedgers->first()->ledger_page === $ledgerPage;

                // Same value -> skip
                if (!$hasSingleSameLedger) {
                    PartyLedger::where('branch_id', $user->branch_id)
                        ->where('party_id', $customer->id)
                        ->delete();

                    PartyLedger::create([
                        'branch_id'   => $user->branch_id,
                        'party_id'    => $customer->id,
                        'ledger_page' => $ledgerPage,
                    ]);

                    $updatedFields[] = 'Ledger Page';
                }
            }

            /* =========================
            4️⃣ OPENING BALANCE
            =========================
            Editable as often as the clerk needs. The voucher raised the first
            time is rewritten in place rather than replaced, so the number the
            row shows -- and anything printed carrying it -- stays put. */
            $opening = null;

            if ($request->has('openingbalance')) {

                if (!is_numeric($request->openingbalance)) {
                    DB::rollBack();
                    return notFound('Opening balance must be a numeric value.');
                }

                $openingBalance = (float) $request->openingbalance;
                $sameFigure = (float) $customer->openingbalance === $openingBalance;
                $unchanged = $sameFigure
                    && ($openingBalance === 0.0 || $this->openingBalance->hasLiveVoucher($customer));

                // Re-posting an identical figure would only churn the ledger --
                // and the list sends this field on every Save, including the
                // ones that only touched the ledger page. A figure that matches
                // but has lost its voucher still goes through, so the entry
                // comes back.
                if (!$unchanged) {
                    $opening = $this->openingBalance->sync($customer, $openingBalance);
                    $updatedFields[] = 'Opening Balance';
                }
            }

            /* =========================
            3️⃣ NOTHING CHANGED
            ========================== */
            if (empty($updatedFields)) {
                // notFound() takes (message, httpStatus). It was being handed
                // the model and the message, which threw as soon as this path
                // became reachable -- re-saving an unchanged opening balance.
                DB::rollBack();
                return notFound('No changes were made.');
            }

            $customer->save();
            DB::commit();

            // Only when this save touched the opening balance. Reporting null
            // otherwise would say "no voucher" about a customer who has one.
            if ($opening) {
                $customer->opening_vr_no = $opening['vr_no'];
            }

            return foundData(
                $customer,
                implode(', ', $updatedFields) . ' updated successfully',
                200
            );
        } catch (\RuntimeException $e) {
            // The opening balance rules explain themselves; the message is for
            // the clerk, not the log.
            DB::rollBack();
            return notFound($e->getMessage(), 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Contact quick update failed', [
                'party_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return notFound('Something went wrong. Please try again later.', 500);
        }
    }

    /**
     * Remove a customer's opening balance and the voucher that carried it.
     *
     * The voucher is not erased -- it goes to the trash the same way the
     * Voucher Delete screen sends one there, so the removal is still
     * accountable. What the customer loses is the figure and the link.
     */
    public function apiDeleteOpeningBalance($id)
    {
        if (!auth()->user()->can('voucher.delete')) {
            return notFound('You are not allowed to delete vouchers.', 403);
        }

        $user = Auth::user();

        DB::beginTransaction();
        try {
            // Locked for the length of the transaction: two clerks pressing
            // Delete together would otherwise both read a live voucher.
            $customer = PartyInfo::where('id', $id)
                ->where('company_id', $user->company_id)
                ->lockForUpdate()
                ->first();

            if (!$customer) {
                DB::rollBack();
                return notFound('Customer not found', 404);
            }

            if (!$customer->main_trx_id && (float) $customer->openingbalance === 0.0) {
                DB::rollBack();
                return notFound('This customer has no opening balance to delete.', 422);
            }

            $this->openingBalance->remove($customer);

            DB::commit();

            return foundData(
                ['id' => $customer->id, 'openingbalance' => 0, 'main_trx_id' => null, 'opening_vr_no' => null],
                'Opening balance and its voucher deleted successfully.'
            );
        } catch (\RuntimeException $e) {
            DB::rollBack();
            return notFound($e->getMessage(), 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Opening balance delete failed', [
                'party_id' => $id,
                'error'    => $e->getMessage(),
            ]);

            return notFound('Something went wrong. Please try again later.', 500);
        }
    }

    /** The type a sheet row is made under when its `type` column is blank. */
    private const IMPORT_DEFAULT_PARTY_TYPE = 'customer';

    /**
     * What a ledger page may be written with. A page in a paper book, so kept
     * to what a pen can put there. One rule for the two ways it is written:
     * the customer list's own ledger-page save and this import.
     */
    private const LEDGER_PAGE_PATTERN = '/^[A-Za-z0-9\s\-\/.#,]+$/';

    /** What a refused ledger page is told. */
    private const LEDGER_PAGE_MESSAGE = 'Ledger page may only contain English letters, numbers, spaces, hyphens, slashes, dots, hashes, and commas.';

    /**
     * Check a customer-opening sheet, row by row, without writing anything.
     *
     * The same two-step shape as the product opening import: Check says what
     * every row comes to, Ok saves the rows one call at a time.
     */
    public function apiPartyOpeningImportCheck(Request $request)
    {
        if ($refusal = $this->partyOpeningImportRefusal()) {
            return $refusal;
        }

        $rows = is_array($request->rows) ? array_values($request->rows) : [];

        if (!$rows) {
            return notFound('There are no rows to check.');
        }

        // Within the sheet itself: a number or a name twice is one customer
        // told two openings, and which of the two survived would depend on the
        // order the rows happened to be saved in.
        $rowsByNumber = [];
        $rowsByName   = [];
        foreach ($rows as $index => $row) {
            $number = strtolower($this->importText($row['customer_number'] ?? ''));
            $name   = strtolower($this->importText($row['name'] ?? ''));

            if ($number !== '') {
                $rowsByNumber[$number][] = $index + 1;
            }
            if ($name !== '') {
                $rowsByName[$name][] = $index + 1;
            }
        }

        $results = [];
        foreach ($rows as $index => $row) {
            $result = $this->resolvePartyOpeningImportRow((array) $row, false);
            $number = strtolower($this->importText($row['customer_number'] ?? ''));
            $name   = strtolower($this->importText($row['name'] ?? ''));
            $others = fn(array $list) => implode(', ', array_diff($list, [$index + 1]));

            if ($number !== '' && count($rowsByNumber[$number]) > 1) {
                $result['errors'][] = 'The same customer number is on row ' . $others($rowsByNumber[$number]) . '.';
            } elseif ($number === '' && $name !== '' && count($rowsByName[$name]) > 1) {
                $result['errors'][] = 'Row ' . $others($rowsByName[$name]) . ' has the same name; give each its customer number.';
            }

            $results[] = [
                'status'     => $result['errors'] ? 'error' : $result['status'],
                'errors'     => $result['errors'],
                'notes'      => $result['notes'],
                'creates'    => $result['creates'],
                'party_name' => $result['party'] ? $result['party']->name : null,
            ];
        }

        // The plan's cap, before a single row is saved. Counted from the rows
        // that would CREATE a customer -- a row matching one the books already
        // have adds nothing to the list and is not metered -- and refused whole,
        // because a sheet that only half fits is not half imported.
        $newRows = count(array_filter($results, fn($row) => $row['status'] === 'new'));

        if ($refusal = app(SubscriptionLimitService::class)
            ->customerQuotaRefusal(Auth::user()->company_id, $newRows, 'imported')) {
            return notFound($refusal, 200);
        }

        return foundData($results);
    }

    /** Save one row of the sheet: the customer, when the row is a new one, and its opening balance. */
    public function apiPartyOpeningImportRow(Request $request)
    {
        if ($refusal = $this->partyOpeningImportRefusal()) {
            return $refusal;
        }

        DB::beginTransaction();

        try {
            $result = $this->resolvePartyOpeningImportRow((array) $request->row, true);

            if ($result['errors']) {
                DB::rollBack();
                return notFound(implode(' ', $result['errors']));
            }

            $party     = $result['party'];
            $voucherNo = null;

            // The sheet's ledger page, when it carries one. Blank leaves the
            // page the list has, and a page already written is left alone
            // rather than deleted and put back for nothing.
            $page = $this->importText($request->row['ledger_page'] ?? '');

            if ($page !== '' && (string) $this->partyLedgerPage($party->id) !== $page) {
                $this->writePartyLedgerPage($party->id, $page);
            }

            if ($result['opening'] !== null) {
                // The very service the customer list and the Add/Edit form go
                // through, so the figure is stored and its journal voucher
                // raised exactly as if it had been typed on either of them --
                // and can be corrected or deleted from the list afterwards.
                $posted    = $this->openingBalance->sync($party, (float) $result['opening']);
                $voucherNo = $posted['vr_no'] ?? null;
            }

            DB::commit();

            return foundData([
                'status'        => $result['status'],
                'party_id'      => the_hash($party->id),
                'opening_vr_no' => $voucherNo,
            ], $party->name . ' saved.');
        } catch (\RuntimeException $e) {
            // A closed year, an approved voucher, a branch with no day-close:
            // each carries a sentence worth showing as it is.
            DB::rollBack();
            return notFound($e->getMessage(), 422);
        } catch (\Exception $e) {
            rethrowIfPeriodClosed($e);
            DB::rollBack();
            Log::error('Party opening import row failed', [
                'row'   => $request->row,
                'error' => $e->getMessage(),
            ]);

            return notFound('This row could not be saved. Please try again.');
        }
    }

    /** Why the opening import cannot run here at all, or null when it can. */
    private function partyOpeningImportRefusal()
    {
        // party.opening.edit is the permission for this, but patch:add-unit-type
        // creates it without handing it to anyone -- only
        // branch_opening_permissions.sql does, seeding it from cs.edit. On a
        // database that never ran that file nobody holds it, so cs.edit, the
        // permission it is seeded from, is accepted in its place.
        $held = app(\App\Services\Role\CompanyRoleScope::class)
            ->effectivePermissions(Auth::user())
            ->pluck('name')
            ->all();

        if (!array_intersect(['party.opening.edit', 'cs.edit'], $held)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not permitted to perform this action.',
                'error'   => ['code' => 403, 'message' => 'You are not permitted to perform this action.'],
            ], 403);
        }

        // The same branch switch the customer list and Add Customer read before
        // they offer an opening. A meta row, not a column on the branch.
        $branchId = Auth::user()->branch_id;

        if ((string) meta($branchId, $branchId, 'is_opening') !== '1') {
            return notFound('Opening balances are switched off for this branch.');
        }

        return null;
    }

    /**
     * What one row of the sheet comes to.
     *
     * Every lookup and every refusal runs first; only when $write is set AND
     * nothing was refused is a missing customer made. Check and Ok both come
     * here, which is what keeps Ok from doing anything Check did not show.
     *
     * A row is matched by its customer number, else by its mobile, else by its
     * exact name -- and where several customers answer to it there is no
     * telling which one is meant, so the row is refused rather than guessed at.
     * Only two things are written on a customer that already exists: its
     * opening, and the ledger page when the sheet carries one. The rest of its
     * record is left as the list has it.
     */
    private function resolvePartyOpeningImportRow(array $row, bool $write): array
    {
        $name     = $this->importText($row['name'] ?? '');
        $number   = $this->importText($row['customer_number'] ?? '');
        $mobile   = $this->importText($row['mobile'] ?? '');
        $address  = $this->importText($row['address'] ?? '');
        $page     = $this->importText($row['ledger_page'] ?? '');
        $typeName = $this->importText($row['type'] ?? '');
        $opening  = $this->importNumber($row['opening'] ?? '');

        $errors  = [];
        $notes   = [];
        $creates = [];
        $party   = null;

        if ($opening === null) {
            $errors[] = 'Opening must be a number.';
        } elseif ((float) $opening === 0.0) {
            $notes[] = 'An opening of 0 clears any opening this customer already has.';
        }

        if ($name === '' && $number === '' && $mobile === '') {
            $errors[] = 'Give the row a name, a customer number or a mobile.';
        }

        // Blank means "leave the page the list has", so only a filled cell is
        // weighed -- and a refused one is refused here, before anything is
        // written, which is what keeps Ok from doing what Check did not show.
        $pageOk = $page === '' || (bool) preg_match(self::LEDGER_PAGE_PATTERN, $page);

        if (!$pageOk) {
            $errors[] = self::LEDGER_PAGE_MESSAGE;
        }

        $matches = $this->matchParties($number, $mobile, $name);

        if ($matches->count() > 1) {
            $errors[] = 'More than one customer answers to "'
                . ($number !== '' ? $number : ($mobile !== '' ? $mobile : $name))
                . '"; give the row a customer number.';
        } elseif ($matches->count() === 1) {
            $party = $matches->first();

            if ((float) $party->openingbalance !== 0.0) {
                $notes[] = 'Its opening is replaced: ' . $party->openingbalance . ' becomes ' . $opening . '.';
            }

            // A page refused above is not also promised: the row is refused,
            // and the sentence beside it is the one that matters.
            if ($page !== '' && $pageOk) {
                $current = $this->partyLedgerPage($party->id);

                if ((string) $current !== $page) {
                    $notes[] = 'Its ledger page is replaced: ' . ($current ?: '(blank)') . ' becomes ' . $page . '.';
                }
            }
        }

        if ($party || $errors) {
            return [
                'status'  => $errors ? 'error' : 'existing',
                'errors'  => $errors,
                'notes'   => $notes,
                'creates' => $creates,
                'party'   => $party,
                'opening' => $errors ? null : $opening,
            ];
        }

        /* ---------------- A customer the books do not have yet ---------------- */

        if ($name === '') {
            $errors[] = 'A new customer needs a name.';
        }
        if ($mobile === '') {
            $errors[] = 'A new customer needs a mobile number.';
        }

        $typeId = $this->partyTypeId($typeName);

        if ($typeId === null) {
            $errors[] = 'Unknown type "' . $typeName . '". Use one of: ' . $this->partyTypeNames() . '.';
        }

        if (!$errors) {
            $creates[] = 'Customer ' . $name . ($typeName === '' ? ' (Customer)' : ' (' . $typeName . ')');

            // Asked again here, inside the caller's transaction: Check ran
            // without one and Ok saves one row per request, so a sheet that
            // fitted when it was checked can be a row over by the time this one
            // is saved. Only a row about to CREATE a customer is metered -- the
            // branches above are the ones that touch an existing party.
            if ($write
                && ($refusal = app(SubscriptionLimitService::class)
                    ->customerQuotaRefusal(Auth::user()->company_id, 1, 'imported'))) {
                $errors[] = $refusal;
            }

            if ($write && !$errors) {
                // The same two calls Add Customer makes, so the new customer
                // gets a ledger head and an opening voucher like any other.
                $coal4 = (new Member([
                    'name'           => $name,
                    'mobile'         => $mobile,
                    'idfr_code'      => $number,
                    'manual_address' => $address,
                ], Partytype::find($typeId)->coa3_id))->chartofAcc();

                $party = PartyInfo::find(PartyInfo::where('coa4_id', $coal4)->value('id'));
            }
        }

        return [
            'status'  => $errors ? 'error' : 'new',
            'errors'  => $errors,
            'notes'   => $notes,
            'creates' => $creates,
            'party'   => $party,
            'opening' => $errors ? null : $opening,
        ];
    }

    /**
     * The page this branch's ledger has the customer written on, or null.
     *
     * The page is the branch's, not the customer's: one row per branch and
     * customer in `cust_party_ledger`, which is where the customer list reads
     * and writes it too (`cust_party_infos.ledger_page` is written by the Add
     * form and read by nothing).
     */
    private function partyLedgerPage(int $partyId): ?string
    {
        return PartyLedger::where('branch_id', Auth::user()->branch_id)
            ->where('party_id', $partyId)
            ->value('ledger_page');
    }

    /**
     * Write a sheet's ledger page onto the customer.
     *
     * The row is deleted and re-created rather than updated, the way the
     * customer list's own ledger-page save does it -- one row per branch and
     * customer, whatever was there before.
     */
    private function writePartyLedgerPage(int $partyId, string $page): void
    {
        PartyLedger::where('branch_id', Auth::user()->branch_id)
            ->where('party_id', $partyId)
            ->delete();

        PartyLedger::create([
            'branch_id'   => Auth::user()->branch_id,
            'party_id'    => $partyId,
            'ledger_page' => $page,
        ]);
    }

    /**
     * The customers one row could be about: by its customer number, else by its
     * mobile, else by its exact name -- the first of the three that finds
     * anybody. At most two come back, which is enough to tell "one" from
     * "several".
     */
    private function matchParties(string $number, string $mobile, string $name)
    {
        $user   = Auth::user();
        // Not $this->branch: the constructor passes Auth::user() to Branch::find(),
        // which Eloquent reads as a list of ids and answers with a collection.
        $branch = Branch::find($user->branch_id);

        $query = PartyInfo::query()
            ->where('status', '1')
            ->where('company_id', $user->company_id)
            // The customers the list itself shows: another branch's are out of
            // sight unless the branch shares them.
            ->when(
                (int) ($branch->share_customer_with_other_branch ?? 0) === 0,
                fn($q) => $q->where('branch_id', (int) ($branch->id ?? $user->branch_id))
            );

        if ($number !== '') {
            return (clone $query)->where('idfr_code', $number)->limit(2)->get();
        }

        if ($mobile !== '') {
            $digits = preg_replace('/\D+/', '', $mobile);
            $found  = (clone $query)->where(function ($q) use ($mobile, $digits) {
                $q->where('mobile', $mobile);

                if ($digits !== '') {
                    $q->orWhereRaw(
                        "REPLACE(REPLACE(REPLACE(REPLACE(mobile, ' ', ''), '-', ''), '+', ''), '.', '') = ?",
                        [$digits]
                    );
                }
            })->limit(2)->get();

            if ($found->isNotEmpty()) {
                return $found;
            }
        }

        if ($name !== '') {
            return (clone $query)->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->limit(2)->get();
        }

        return collect();
    }

    /** The party type a sheet row names; the default when it names none. */
    private function partyTypeId(string $name): ?int
    {
        $name = $name !== '' ? $name : self::IMPORT_DEFAULT_PARTY_TYPE;

        return Partytype::whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->value('id');
    }

    /** The types a sheet may name, for the message that lists them. */
    private function partyTypeNames(): string
    {
        return Partytype::where('status', '1')->orderBy('name')->pluck('name')->implode(', ');
    }

    /** A sheet cell as text, with runs of spaces closed up. */
    private function importText($value): string
    {
        return trim(preg_replace('/\s+/', ' ', (string) $value));
    }

    /** A sheet cell as a number, thousands commas allowed; null when it is not one. */
    private function importNumber($value): ?float
    {
        $text = str_replace(',', '', $this->importText($value));

        return $text !== '' && is_numeric($text) ? (float) $text : null;
    }

    public function apiContactEdit($id)
    {
        $user = auth::user();
        $contact = PartyInfo::with(['guarantors', 'nominees'])
            ->where('company_id', $user->company_id)
            ->where('id', $id)
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Contact not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $contact
        ]);
    }

    public function apiContactUpdate(Request $request, $id)
    {

        $user = auth::user();
        DB::beginTransaction();

        try {

            $party = PartyInfo::where('id', $id)
                ->where('company_id', $user->company_id)
                ->first();

            if (!$party) {
                DB::rollBack();
                return notFound('Customer not found');
            }

            /* ================= PARTY INFO UPDATE ================= */

            $update = [
                'party_type_id'     => $request->party_type_id,
                'area_id'           => $request->filled('area_id') ? $request->area_id : $party->area_id,
                'name'              => $request->name,
                'bangla'            => $request->bangla ?? null,
                'relation_id'       => $request->relation_id ?? null,
                'father'            => $request->father ?? null,
                'mother_name'       => $request->mother_name ?? null,
                'occupation'        => $request->occupation ?? null,
                'sex'               => $request->filled('sex') ? $request->sex : null,
                'date_of_birth'     => $request->filled('date_of_birth') ? $request->date_of_birth : null,
                'contact_person'    => $request->contact_person ?? null,
                'contact_number'    => $request->contact_number ?? null,
                'idfr_code'         => $request->idfr_code ?? null,
                'father_bangla'     => $request->father_bangla ?? null,
                // Like the photo below: only a form that carries the field may
                // change it, so an older client posting without it does not
                // silently erase the number the customer logs in with.
                'mobile'            => $request->has('mobile') ? $request->mobile : $party->mobile,
                'email'             => $request->email ?? null,
                'national_id'       => $request->national_id ?? null,
                'ledger_page'       => $request->ledger_page ?? null,
                'manual_address'    => $request->manual_address ?? null,
                'permanent_address' => $request->permanent_address ?? null,
                'customer_login'    => filter_var($request->customerLogin, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
                'updated_by'        => $user->id,
                'updated_at'        => now(),
            ];

            // Only a form that carries the photo field may change it, so an older
            // client posting without it does not silently wipe the saved photo.
            if ($request->has('photo')) {
                $update['photo'] = $this->saveProfilePhoto($request->photo, $party->photo);
            }

            /* ================= MOBILE CHANGED -> PORTAL PASSWORD RESET =================
            A changed number can mean the account has passed to someone else, so
            the portal password goes back to its default. The default is the
            mobile number itself (CustomerAuthController::login), which is now
            the new one -- clearing the column is a reset, not a lockout, and the
            customer is made to choose a password on their next login.

            Guarded on has('mobile'): comparing a missing field against the
            stored number reads as a change and would reset the password on
            every save, and so would a customer whose stored mobile is null
            against the empty string the edit form posts for it. */
            $mobileChanged = $request->has('mobile')
                && trim((string) $request->mobile) !== trim((string) $party->mobile);

            if ($mobileChanged) {
                $update['password'] = null;
                $update['must_change_password'] = 1;

                // Sessions already open on the old number go with it. Without
                // this the reset only reaches the next login -- the one person
                // it was not meant for keeps their token.
                $party->tokens()->delete();
            }

            $party->update($update);

            /* ================= COA LEVEL 4 NAME UPDATE ================= */
            // Name change হলে COA name sync হবে (IMPORTANT)

            DB::table('acc_coa_level4s')
                ->where('id', $party->coa4_id)
                ->update([
                    'name'       => $request->name,
                    'updated_by' => $user->id,
                    'updated_at' => now(),
                ]);

            /* ================= LEDGER PAGE UPDATE ================= */

            if ($request->filled('ledger_page')) {

                DB::table('cust_party_ledger')
                    ->updateOrInsert(
                        ['party_id' => $party->id],
                        [
                            'branch_id'   => $user->branch_id,
                            'ledger_page' => $request->ledger_page,
                        ]
                    );
            }

            /* ================= GUARANTORS UPDATE ================= */

            if (is_array($request->guarantors)) {

                Guarantor::where('party_id', $party->id)->delete();

                foreach ($request->guarantors as $g) {
                    Guarantor::create([
                        'party_id'    => $party->id,
                        'name'        => $g['name'],
                        'father_name' => $g['father_name'] ?? null,
                        'mobile'      => $g['mobile'] ?? null,
                        'national_id' => $g['national_id'] ?? null,
                        'address'     => $g['address'] ?? null,
                    ]);
                }
            }

            if (is_array($request->nominees)) {
                // The saved photo paths, so a replaced photo still has its old
                // file removed and an untouched one is not written again.
                $existingPhotos = Nominee::where('party_id', $party->id)
                    ->pluck('photo', 'id')
                    ->toArray();

                $this->syncNominees($party->id, $request->nominees, $existingPhotos);
            }

            DB::commit();

            // The password reset is a consequence of the save, not something the
            // clerk asked for -- say so, or the customer is turned away at the
            // portal with nobody knowing why.
            return foundData(
                $party->id,
                $mobileChanged
                    ? 'Customer updated successfully. The mobile number changed, so the portal password was reset to the new number.'
                    : 'Customer updated successfully'
            );
        } catch (\RuntimeException $e) {
            // Photo problems carry a message worth showing.
            DB::rollBack();
            return notFound($e->getMessage());
        } catch (\Exception $e) {

            DB::rollBack();

            // Without this the customer edit fails on a server with nothing to
            // show for it: the caller only ever sees "Something went wrong",
            // and a missing column or an unwritable photo directory looks
            // exactly like any other failure.
            Log::error('Customer update failed', [
                'party_id' => $id,
                'error'    => $e->getMessage(),
                'file'     => $e->getFile() . ':' . $e->getLine(),
            ]);

            return notFound('Something went wrong. Please try again later.');
        }
    }

    /**
     * Set or reset the customer's self-service portal password.
     * Admin-only (runs inside the admin auth group). Sending an empty
     * password disables portal access for that customer.
     */
    public function apiSetCustomerPassword(Request $request, $id)
    {
        $request->validate([
            'password' => 'nullable|string|min:8',
        ]);

        $user = Auth::user();

        $party = PartyInfo::where('id', $id)
            ->where('company_id', $user->company_id)
            ->first();

        if (!$party) {
            return notFound('Customer not found');
        }

        // Empty password revokes portal access; also drop any active tokens
        // so an existing session cannot outlive the revocation.
        if (!$request->filled('password')) {
            $party->password = null;
            $party->must_change_password = 0;
            $party->tokens()->delete();
            $party->save();

            return foundData($party->id, 'Portal access disabled for this customer');
        }

        $party->password = Hash::make($request->password);
        // Admin set this deliberately, so no forced change on next login.
        $party->must_change_password = 0;
        $party->save();

        return foundData($party->id, 'Portal password updated successfully');
    }

    public function apiContactDelete($id)
    {
        $user = auth::user();

        DB::beginTransaction();

        try {
            $party = PartyInfo::where('id', $id)
                ->where('company_id', $user->company_id)
                ->first();

            if (!$party) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found',
                ], 404);
            }

            $hasTransaction = DB::table('acc_transaction_details')
                ->where('coa4_id', $party->coa4_id)
                ->exists();

            if ($hasTransaction) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'This customer has transactions, so it cannot be deleted.',
                ], 200);
            }

            if (Schema::hasTable('cust_party_ledger')) {
                PartyLedger::where('party_id', $party->id)->delete();
            }

            if (Schema::hasTable('guarantors')) {
                Guarantor::where('party_id', $party->id)->delete();
            }

            if (Schema::hasTable('nominees')) {
                Nominee::where('party_id', $party->id)->delete();
            }

            CoaLevel4::where('id', $party->coa4_id)->delete();
            $party->delete();

            // $party->update([
            //     'status' => 0,
            //     'updated_by' => $user->id,
            //     'updated_at' => now(),
            // ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Customer deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Contact delete failed', [
                'party_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Something went wrong. Please try again later.',
            ], 500);
        }
    }

    /**
     * A printable profile sheet for one customer: the identity fields, the photo,
     * and every guarantor and nominee attached to them. Streamed as a PDF so the
     * browser can print or save it.
     */
    public function apiCustomerProfilePdf($id)
    {
        $user = Auth::user();

        $party = PartyInfo::with(['guarantors', 'nominees', 'area'])
            ->where('id', $id)
            ->where('company_id', $user->company_id)
            ->first();

        if (!$party) {
            return notFound('Customer not found');
        }

        $ledgerPage = PartyLedger::where('party_id', $party->id)
            ->where('branch_id', $user->branch_id)
            ->value('ledger_page');

        $pdf = Pdf::loadView('pdf.customer-profile', [
            'party'      => $party,
            'company'    => Company::find($user->company_id),
            'branch'     => Branch::find($user->branch_id),
            'partyType'  => optional(Partytype::find($party->party_type_id))->name,
            'ledgerPage' => $ledgerPage,
            'photoPath'  => $this->profilePhotoForPdf($party->photo),
            'printedAt'  => now()->format('d/m/Y h:i A'),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('customer-' . $party->id . '.pdf');
    }

    /**
     * dompdf reads images off the disk, so hand it an absolute path — and only
     * when the file is really there, otherwise it renders a broken box.
     */
    private function profilePhotoForPdf(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $absolute = public_path($path);

        return File::exists($absolute) ? $absolute : null;
    }

    /**
     * Writes the nominee list of one party, keeping the rows it already has.
     *
     * A row the form still carries is updated in place, a new one is inserted,
     * and one the form has dropped is deleted at the end. It used to delete the
     * lot and insert them again, which handed every nominee a fresh id on each
     * customer edit -- fine while nothing pointed at them, fatal now that a sale
     * names its nominees by id: last month's booking would have ended up
     * pointing at somebody else's son.
     *
     * @param array $existingPhotos Nominee id => stored photo path, so a replaced
     *                              photo still has its old file cleaned up.
     */
    private function syncNominees($partyId, array $nominees, array $existingPhotos = []): void
    {
        $keptIds = [];

        foreach ($nominees as $nominee) {
            if (empty($nominee['name'])) {
                continue;
            }

            // Only an id this party actually owns is honoured, so a posted id
            // cannot reach across and overwrite another customer's nominee.
            $id = isset($nominee['id']) && is_numeric($nominee['id'])
                ? (int) $nominee['id']
                : null;
            $existing = $id
                ? Nominee::where('id', $id)->where('party_id', $partyId)->first()
                : null;

            $existingPhoto = $existing
                ? ($existingPhotos[$existing->id] ?? $existing->photo)
                : null;

            $values = [
                'party_id'           => $partyId,
                'name'               => $nominee['name'],
                'relation'           => $nominee['relation'] ?? null,
                'mother_name'        => $nominee['mother_name'] ?? null,
                'occupation'         => $nominee['occupation'] ?? null,
                'photo'              => $this->saveProfilePhoto($nominee['photo'] ?? null, $existingPhoto),
                'date_of_birth'      => empty($nominee['date_of_birth']) ? null : $nominee['date_of_birth'],
                'mobile'             => $nominee['mobile'] ?? null,
                'present_address'    => $nominee['present_address'] ?? null,
                'permanent_address'  => $nominee['permanent_address'] ?? null,
                'national_id'        => $nominee['national_id'] ?? null,
                'share_percentage'   => ($nominee['share_percentage'] ?? '') === '' ? null : $nominee['share_percentage'],
                'priority_order'     => ($nominee['priority_order'] ?? '') === '' ? null : $nominee['priority_order'],
                'guardian_name'      => $nominee['guardian_name'] ?? null,
                'guardian_mobile'    => $nominee['guardian_mobile'] ?? null,
                'status'             => $nominee['status'] ?? 'active',
                'remarks'            => $nominee['remarks'] ?? null,
            ];

            if ($existing) {
                $existing->update($values);
                $keptIds[] = $existing->id;
                continue;
            }

            $keptIds[] = Nominee::create($values)->id;
        }

        // Whoever the form no longer lists. Their photo goes with them, and a
        // nominee already named on a sale is left alone: the booking form has to
        // keep printing the person the buyer actually nominated, and the sale
        // screen is where that nomination is withdrawn.
        $removable = Nominee::where('party_id', $partyId)
            ->when($keptIds, fn($q) => $q->whereNotIn('id', $keptIds))
            ->when(
                Schema::hasTable('unit_sale_nominees'),
                fn($q) => $q->whereNotExists(
                    fn($sub) => $sub->select(DB::raw(1))
                        ->from('unit_sale_nominees')
                        ->whereColumn('unit_sale_nominees.nominee_id', 'nominees.id')
                )
            )
            ->get();

        foreach ($removable as $gone) {
            $this->deleteProfilePhoto($gone->photo);
            $gone->delete();
        }
    }

    /**
     * Save a newly picked photo and return the path to store in the DB.
     *
     * The form posts a freshly picked file as a base64 data URI and an untouched
     * one as the path it was loaded with, so:
     *   data URI     -> decode, write the file, drop the one it replaces
     *   existing path-> returned unchanged, nothing is written
     *   empty value  -> photo cleared on the form, so the file is deleted too
     */
    private function saveProfilePhoto($value, ?string $existingPath = null): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        if ($value === '') {
            $this->deleteProfilePhoto($existingPath);

            return null;
        }

        if (!preg_match('/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i', $value, $matches)) {
            return $value;
        }

        $extension = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
        $binary    = base64_decode(substr($value, strpos($value, ',') + 1), true);

        if ($binary === false || $binary === '') {
            throw new \RuntimeException('The photo could not be read. Please choose the image again.');
        }

        if (strlen($binary) > self::PHOTO_MAX_BYTES) {
            throw new \RuntimeException('The photo must be smaller than 150 KB.');
        }

        $relativeDir = 'images/customer_photo/' . date('Y/m');
        $directory   = public_path($relativeDir);
        $fileName    = uniqid('cus_', false) . '.' . $extension;

        try {
            if (!File::isDirectory($directory)) {
                File::makeDirectory($directory, 0755, true);
            }

            File::put($directory . DIRECTORY_SEPARATOR . $fileName, $binary);
        } catch (\Throwable $e) {
            // The month folder is made on the first upload of the month, so a
            // deployment that left public/images owned by root fails here and
            // nowhere else. mkdir() raises a PHP warning, which arrives as an
            // ErrorException and reaches the customer as nothing more useful
            // than "Something went wrong" -- say what actually needs fixing.
            throw new \RuntimeException(
                'The photo could not be saved: public/' . $relativeDir
                    . ' is not writable by the web server.'
            );
        }

        $this->deleteProfilePhoto($existingPath);

        // Stored without a leading `public/`, like the voucher uploads: the client
        // adds that segment only where the web root is the Laravel project root.
        return $relativeDir . '/' . $fileName;
    }

    /**
     * What has been done to this customer, newest first.
     *
     * The customer half of the audit trail: PartyObserver writes a row every
     * time a party is created, changed or deleted, and this is where the desk
     * reads them. It answers the question that used to have no answer at all --
     * "this number is not what I typed, who changed it?"
     *
     * WARNING: read on cs.view, the permission that already decides who may see
     * the customer at all. A stricter one would put the trail out of reach of
     * the people who keep the list, which is where the question is actually
     * asked; the voucher trail keeps its own audit.trail.view for the browsing
     * screen that spans every branch.
     *
     * Fields are named the way the edit form names them, not the way the table
     * does -- nobody at a desk knows what manual_address is.
     */
    public function apiCustomerHistory($id)
    {
        if ($denied = denyUnlessPermitted('cs.view')) {
            return $denied;
        }

        $user = Auth::user();

        $party = PartyInfo::where('id', $id)
            ->where('company_id', $user->company_id)
            ->first(['id', 'name', 'mobile']);

        if (!$party) {
            return notFound('Customer not found');
        }

        $rows = DB::table('party_histories as h')
            ->leftJoin('users as u', 'u.id', '=', 'h.action_by')
            ->where('h.party_id', $party->id)
            ->orderByDesc('h.created_at')
            ->orderByDesc('h.id')
            ->limit(200)
            ->get(['h.id', 'h.action', 'h.old_data', 'h.new_data', 'h.created_at', 'u.name as user_name']);

        $events = $rows->map(function ($row) {
            $old = $this->decodeHistory($row->old_data);
            $new = $this->decodeHistory($row->new_data);

            return [
                'id'      => $row->id,
                'at'      => $row->created_at,
                'user'    => $row->user_name,
                'action'  => $row->action,
                // A creation and a deletion have nothing to compare against, so
                // a diff there would read as every field in the record arriving
                // or leaving at once. What is worth showing is who the customer
                // WAS -- a handful of fields, not forty.
                'changes' => $row->action === 'update'
                    ? $this->labelledChanges(RecordDiff::changes($old, $new))
                    : $this->recordSummary($row->action === 'delete' ? $old : $new),
            ];
        })->all();

        return foundData([
            'customer' => $party,
            'events'   => $events,
            'note'     => 'Changes made before this trail was switched on are not recorded.',
        ], 'What happened to this customer');
    }

    private function decodeHistory($value): array
    {
        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * The few fields that say who a customer was, for a create or a delete.
     */
    private function recordSummary(array $record): array
    {
        $fields = ['name', 'mobile', 'national_id', 'manual_address', 'ledger_page', 'openingbalance'];

        $summary = [];

        foreach ($fields as $field) {
            $value = $record[$field] ?? null;

            if ($value === null || $value === '') {
                continue;
            }

            $summary[] = [
                'field' => self::HISTORY_LABELS[$field] ?? $field,
                'old'   => null,
                'new'   => $value,
            ];
        }

        return $summary;
    }

    /**
     * A change with a name a person can read.
     *
     * WARNING: columns nobody edits are dropped rather than labelled. A save
     * stamps ids and flags the desk never sees, and a list of twenty
     * differences hides the one that matters -- which is the whole reason the
     * trail exists.
     */
    private function labelledChanges(array $changes): array
    {
        $out = [];

        foreach ($changes as $change) {
            $field = (string) $change['field'];
            $root  = explode('.', $field)[0];

            if (in_array($root, self::HISTORY_HIDDEN, true)) {
                continue;
            }

            $out[] = [
                'field' => $this->historyLabel($field),
                'old'   => $change['old'],
                'new'   => $change['new'],
            ];
        }

        return $out;
    }

    /** Stamps and keys, not edits. */
    private const HISTORY_HIDDEN = [
        'id',
        'coa3_id',
        'coa4_id',
        'company_id',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    private const HISTORY_LABELS = [
        'name'                 => 'Name',
        'bangla'               => 'Name (Bangla)',
        'ledger_name'          => 'Ledger Head Name',
        'party_type_id'        => 'Party Type',
        'area_id'              => 'Area',
        'branch_id'            => 'Branch',
        'mobile'               => 'Mobile',
        'email'                => 'Email',
        'national_id'          => 'National ID',
        'passport'             => 'Passport',
        'date_of_birth'        => 'Date of Birth',
        'sex'                  => 'Gender',
        'relation_id'          => 'Relation',
        'father'               => 'Father',
        'father_bangla'        => 'Father (Bangla)',
        'mother_name'          => 'Mother',
        'occupation'           => 'Occupation',
        'contact_person'       => 'Contact Person',
        'contact_number'       => 'Contact Number',
        'address'              => 'Address',
        'manual_address'       => 'Address',
        'permanent_address'    => 'Permanent Address',
        'photo'                => 'Photo',
        'idfr_code'            => 'Identifier Code',
        'ledger_page'          => 'Ledger Page',
        'ledger_pages'         => 'Ledger Page',
        'openingbalance'       => 'Opening Balance',
        'over_balance'         => 'Over Balance',
        'installment'          => 'Installment',
        'numberofinstallment'  => 'Number of Installments',
        'customer_login'       => 'Portal Login Allowed',
        'must_change_password' => 'Portal Password Reset',
        'status'               => 'Status',
        'guarantors'           => 'Guarantor',
        'nominees'             => 'Nominee',
        'share_percentage'     => 'Share %',
        'priority_order'       => 'Priority',
        'guardian_name'        => 'Guardian',
        'guardian_mobile'      => 'Guardian Mobile',
        'father_name'          => 'Father',
        'present_address'      => 'Present Address',
    ];

    /**
     * "guarantors.1.mobile" as "Guarantor #2 Mobile".
     *
     * The numbers are one-based because people read them, and they are the
     * position in the list rather than any id -- guarantors are rewritten
     * wholesale on every save, so their ids mean nothing across two snapshots.
     */
    private function historyLabel(string $field): string
    {
        $parts = [];

        foreach (explode('.', $field) as $segment) {
            if (is_numeric($segment)) {
                $parts[] = '#' . ((int) $segment + 1);
                continue;
            }

            $parts[] = self::HISTORY_LABELS[$segment]
                ?? ucwords(str_replace('_', ' ', $segment));
        }

        return implode(' ', $parts);
    }

    private function deleteProfilePhoto(?string $path): void
    {
        // Only ever touch files this controller wrote.
        if (!$path || !str_starts_with($path, 'images/customer_photo/')) {
            return;
        }

        $absolute = public_path($path);

        if (File::exists($absolute)) {
            File::delete($absolute);
        }
    }
}
