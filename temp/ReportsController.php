<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\CommonFunction\Common;
use \Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Models\Acc\CoaLevel3;
use App\Models\Acc\CoaLevel4;
use App\Models\Acc\VoucherType;
use App\Models\Admin\Dayclose;
use App\Models\Com\Branch;
use App\Models\Com\Company;
use App\Models\Products\Category;
use App\Models\Inventory\Godown;
use App\Models\Inventory\InventoryLabourDetails;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Meta;
use App\Models\Party\PartyInfo;
use App\Models\Party\PartyLedger;
use App\Models\Products\Item;
use App\Models\Transaction\AccTransactionDetails;
use App\Models\Transaction\AccTransactionMaster;
use App\Models\Master\MainTransactionMaster;
use App\Models\Inventory\InventoryPurchaseDetails;
use App\Models\Inventory\InventoryPurchaseMaster;
use App\Models\Labour\LabourItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Yajra\DataTables\DataTables;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Party\Area;
use App\Models\Products\ProductClosingStock;
use Illuminate\Support\Collection;

class ReportsController extends Controller
{


    public function ledgerPage(Request $request): string
    {

        $user = auth()->user();

        $party = PartyInfo::where('coa4_id',  $request->ledger_id)->where('company_id', $user->company_id)->first();
        $ledger = PartyLedger::where('branch_id', $request->branch_id)->where('party_id', $party->id)->first();
        if (!empty($ledger)) {
            return $ledger->ledger_page;
        }
        return '';
    }


    public function inOutByDate(Request $request)
    {


        $branch_id = Auth::user()->branch_id;
        $trdate    = Common::getShowTrDate($branch_id);

        $branchId  = get_hash(\Request::segment(3));
        $productId = get_hash(request()->segment(4));
        $pDate     = get_hash(request()->segment(5));
        // return $pDate;

        $data = $this->productInOutByDate($branchId,  $productId, $pDate);

        return view('reports.newreports.compare-purchase-sales-date-wise', compact('data'));
    }

    public function productInOutByDate($branchId,  $productId, $pDate)
    {
        $purchaseQuery = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
            ->join('product_items', function ($join) {
                $join->on('product_items.id', '=', 'inventory_purchase_details.product_id');
            })
            ->where('vr_date', $pDate)
            ->where('inventory_purchase_details.product_id', $productId)
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branchId)
            ->where('main_trx_master.status', 1)
            ->select([
                'main_trx_master.vr_no as vr_no',
                'main_trx_master.id as mid',
                'main_trx_master.vr_date as vr_date',
                'inventory_purchase_masters.vehicle_no as vehicle_no',
                'product_items.name as product_name',
                'inventory_purchase_details.quantity as in_qty',
                'inventory_purchase_details.purchase_price as rate',
                'inventory_purchase_details.variance_type as variance_type',
                'inventory_purchase_details.weight_variance as over'
            ]);

        $purchaseQuery = $purchaseQuery->orderBy('vehicle_no', 'ASC')->get();

        $SalesQuery = MainTransactionMaster::join('inventory_sales_masters', 'inventory_sales_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_sales_details', 'inventory_sales_details.sal_mstr_id', '=', 'inventory_sales_masters.id')
            ->join('product_items', function ($join) {
                $join->on('product_items.id', '=', 'inventory_sales_details.product_id');
            })
            ->where('vr_date', $pDate)
            ->where('inventory_sales_details.product_id', $productId)
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branchId)
            ->where('main_trx_master.status', 1)
            ->select([
                'main_trx_master.vr_no as vr_no',
                'main_trx_master.id as mid',
                'main_trx_master.vr_date as vr_date',
                'inventory_sales_masters.vehicle_no as vehicle_no',
                'product_items.name as product_name',
                'inventory_sales_details.quantity as out_qty',
                'inventory_sales_details.sales_price as rate',
                'inventory_sales_details.variance_type as variance_type',
                'inventory_sales_details.weight_variance as damage'
            ]);
        $SalesQuery = $SalesQuery->orderBy('vehicle_no', 'ASC')->get();
        return ['purchase' => $purchaseQuery, 'sales' => $SalesQuery];
    }
    public function purchaseSalesDateWise()
    {

        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        $firstDayForTheMonth = date('Y-m-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.purchase-sales-date-wise', compact('projects', 'trdate', 'firstDateOfMonth'));
    }

    public function purchaseSalesDateWiseData(Request $request)
    {
        $user = auth()->user();
        $branch_id = $request->branch_id;
        $ledger_id = $request->ledger_id;

        $startDate = bd_to_us_date($request->startdate);
        $endDate   = bd_to_us_date($request->enddate);

        // Assuming $startDate, $endDate, $branch_id, and $ledger_id are defined
        $inQuery = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.status', 1)
            ->where('main_trx_master.company_id', $user->company_id)
            ->select([
                'com_branches.name as branch',
                'vr_date as vr_date',
                'variance_type as variance_type',
                'inventory_purchase_details.quantity as in_qty',
                'inventory_purchase_details.weight_variance as weight_variance'
            ]);

        $outQuery = MainTransactionMaster::join('inventory_sales_masters', 'inventory_sales_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_sales_details', 'inventory_sales_details.sal_mstr_id', '=', 'inventory_sales_masters.id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.status', 1)
            ->where('main_trx_master.company_id', $user->company_id)
            ->select([
                'com_branches.name as branch',
                'vr_date as vr_date',
                'variance_type as variance_type',
                'inventory_sales_details.quantity as out_qty',
                'inventory_sales_details.weight_variance as weight_variance'
            ]);

        if ($branch_id != null) {
            $inQuery->where('main_trx_master.branch_id', $branch_id);
            $outQuery->where('main_trx_master.branch_id', $branch_id);
        }

        if ($ledger_id != null) {
            $inQuery->where('inventory_purchase_details.product_id', $ledger_id);
            $outQuery->where('inventory_sales_details.product_id', $ledger_id);
        }

        // Fetch data from both queries
        $inData = $inQuery->get()->toArray();
        $outData = $outQuery->get()->toArray();

        // Initialize result array
        $results = [];
        $stock = 0; // Running stock
        $slNo = 1;

        // Process purchase data
        foreach ($inData as $row) {
            $key = $row['vr_date'];
            if (!isset($results[$key])) {
                $results[$key] = [
                    'date' => $row['vr_date'],
                    'branch' => $row['branch'],
                    'in_qty' => 0,
                    'out_qty' => 0,
                    'demage' => 0,
                    'over' => 0
                ];
            }
            $results[$key]['in_qty'] += $row['in_qty'];
            if ($row['variance_type'] == '-') {
                $results[$key]['demage'] += $row['weight_variance'];
            } elseif ($row['variance_type'] == '+') {
                $results[$key]['over'] += $row['weight_variance'];
            }
        }

        // Process sales data
        foreach ($outData as $row) {
            $key = $row['vr_date'];
            if (!isset($results[$key])) {
                $results[$key] = [
                    'date' => $row['vr_date'],
                    'branch' => $row['branch'],
                    'in_qty' => 0,
                    'out_qty' => 0,
                    'demage' => 0,
                    'over' => 0
                ];
            }
            $results[$key]['out_qty'] += $row['out_qty'];
            if ($row['variance_type'] == '-') {
                $results[$key]['demage'] += $row['weight_variance'];
            } elseif ($row['variance_type'] == '+') {
                $results[$key]['over'] += $row['weight_variance'];
            }
        }

        // Sort results by date and branch
        ksort($results);

        // Generate final output with stock calculation
        $output = [];
        foreach ($results as $result) {
            $stock = ($result['in_qty'] + $result['over']) - ($result['out_qty'] + $result['demage']);
            $output[] = [
                'sl_no' => $slNo++,
                'vr_date' => $result['date'],
                'in_qty' => $result['in_qty'],
                'out_qty' => $result['out_qty'],
                'damage' => $result['demage'],
                'over' => $result['over'],
                'stock' => $stock < 0 ? "<span class='text-red-700 text-lg font-bold'>" . (number_format(abs($stock), 0)) . "</span>" : "<span class='text-green-700 font-bold'>" . (number_format(abs($stock), 0)) . "</span>",
            ];
        }

        // return $output;
        // $mergedData = [];

        // foreach ($table as $item) {
        //     $key = $item['vr_date'];

        //     // Ensure variance_type is not null and trim any unnecessary spaces
        //     $variance_type = trim($item['variance_type']);

        //     if (isset($mergedData[$key])) {
        //         $mergedData[$key]['in_qty'] += (float)$item['in_qty'];
        //         $mergedData[$key]['out_qty'] += (float)$item['out_qty'];
        //         $mergedData[$key]['overs'] +=  $variance_type === "+" ? (float)$item['weight_variance'] : 0;
        //         $mergedData[$key]['damage'] += $variance_type === "-" ? (float)$item['weight_variance'] : 0;
        //     } else {
        //         // If the key doesn't exist, initialize the array
        //         $mergedData[$key] = $item;
        //     }
        // }

        // $mergedData = array_values($mergedData);
        $details = $output;

        $link = '';
        if (isset($ledger_id)) {
            $date_between = us_to_bd_date($startDate) . '-' . us_to_bd_date($endDate);
            $link = url('reports/products/' . the_hash($branch_id) . '/' . the_hash($ledger_id));
        }
        return view('reports.newreports.templates.stocks.date-wise-in-out', compact('branch_id', 'ledger_id', 'details', 'link'));
    }
    public function cashBook()
    {
        if (!auth()->user()->can('cashbook.view')) {
            return view('errors.403');
        }
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        return view('reports.newreports.newcashbook', compact('projects', 'trdate'));
    }

    public function newCashBookNewData(Request $request)
    {
        $user = auth()->user();
        // $branch = Branch::find($request->branch_id)->where('company_id', $user->company_id)->first();
        $branch = Branch::where('id', $request->branch_id)->where('company_id', $user->company_id)->first();
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));
        $paymentlist = $this->cashBookQuery($branch->id, $startDate, $endDate);

        if (app()->environment('local')) {
            $projectDirectory = '/project_voucher/' . str_pad($request->branch_id, 4, "0", STR_PAD_LEFT);
        } else {
            $projectDirectory = '/public/project_voucher/' . str_pad($request->branch_id, 4, "0", STR_PAD_LEFT);
        }
        return view('reports.newreports.templates.reports-templates.cashbook-template', compact('paymentlist', 'projectDirectory', 'projectDirectory', 'branch'));
    }

    public function groupReport(Request $request)
    {
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        $firstDayForTheMonth = date('Y-01-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.group-report', compact('projects', 'trdate', 'firstDateOfMonth'));
    }

    public function  printGroupReport(Request $request)
    {


        $reportType    = $request->report_group;
        $startDate = Carbon::parse(Carbon::createFromFormat('d/m/Y', $request->startdate)->format('Y-m-d'));  //Carbon::parse('2023-01-01');
        $endDate   = Carbon::parse(Carbon::createFromFormat('d/m/Y', $request->enddate)->format('Y-m-d'));
        $date_range = 'Date Range: ' . $request->startdate . ' to ' . $request->enddate;
        $operatingCost = [];
        $report_data   = [];
        if ($reportType == 1) {
            $operatingCost = $this->operatingCost($request->branch_id, $request->startdate, $request->enddate);
            $report_data =  $operatingCost[0];
        }
        $monthNames = [];
        while ($startDate->lt($endDate)) {
            $monthNames[] = $startDate->format('M-Y');
            $startDate->addMonth(); // Move to the next month
        }

        $purchases_data = [];
        $productsName = [];
        if ($reportType == 2) {
            $purchases = $this->productCost($request->branch_id, $request->startdate, $request->enddate);
            $purchases_data = $purchases[0];
            $productsName = $purchases[1];
        }
        $branch = Branch::find($request->branch_id);
        $company = Company::find($branch->company_id);
        return  view('reports.newreports.templates.reports-templates.group-report-print-template', compact('company', 'branch', 'date_range', 'reportType', 'monthNames',  'report_data', 'productsName', 'purchases_data'));
    }
    public function groupReportData(Request $request)
    {
        $startDate = Carbon::parse(Carbon::createFromFormat('d/m/Y', $request->startdate)->format('Y-m-d'));  //Carbon::parse('2023-01-01');
        $endDate   = Carbon::parse(Carbon::createFromFormat('d/m/Y', $request->enddate)->format('Y-m-d'));

        $monthNames = [];
        while ($startDate->lt($endDate)) {
            $monthNames[] = $startDate->format('M-Y');
            $startDate->addMonth(); // Move to the next month
        }
        // report_group
        $reportType    = $request->report_group;
        $operatingCost = [];
        $report_data   = [];
        if ($reportType == 1) {
            $operatingCost = $this->operatingCost($request->branch_id, $request->startdate, $request->enddate);
            $report_data =  $operatingCost[0];
        }

        $purchases_data = [];
        $productsName = [];
        if ($reportType == 2) {
            $purchases = $this->productCost($request->branch_id, $request->startdate, $request->enddate);
            $purchases_data = $purchases[0];
            $productsName = $purchases[1];
        }

        return  view('reports.newreports.templates.reports-templates.group-report-template', compact('reportType', 'monthNames',  'report_data', 'productsName', 'purchases_data'));
    }

    private function productCost($branch_id,  $startdate, $enddate)
    {
        $startDate = Carbon::parse(Carbon::createFromFormat('d/m/Y', $startdate)->format('Y-m-d'));  //Carbon::parse('2023-01-01');
        $endDate   = Carbon::parse(Carbon::createFromFormat('d/m/Y', $enddate)->format('Y-m-d'));

        $meta = Meta::where('meta_key', 'purchase_items')->first();
        $operativeCost = json_decode($meta->meta_value);
        $costIds = [];
        foreach ($operativeCost as $key => $cost) {
            $costIds[] = $cost->id;
        }

        $purchasesCostSelected =
            MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
            ->join('product_items', function ($join) use ($costIds) {
                $join->on('product_items.id', '=', 'inventory_purchase_details.product_id')
                    ->whereIn('product_items.id', $costIds);
            })
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branch_id)
            ->where('main_trx_master.status', 1)
            ->select([
                'com_branches.name as branch',
                'product_items.name as product_name',
                DB::raw('DATE_FORMAT(vr_date, "%b-%Y") as year'),
                DB::raw("MONTHNAME(vr_date) as month"),
                DB::raw('SUM( inventory_purchase_details.quantity ) as qty'),
                DB::raw('SUM( inventory_purchase_details.quantity * inventory_purchase_details.purchase_price ) as total'),
            ])
            ->groupBy('com_branches.name', 'year', 'month', 'product_items.name', 'inventory_purchase_details.product_id');

        $purchasesCostOthers = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
            ->join('product_items', 'product_items.id', '=', 'inventory_purchase_details.product_id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branch_id)
            ->where('main_trx_master.status', 1)
            ->whereNotIn('product_items.id', $costIds)
            ->select([
                'com_branches.name as branch',
                DB::raw("'Others' as product_name"),
                DB::raw('DATE_FORMAT(vr_date, "%b-%Y") as year'),
                DB::raw("MONTHNAME(vr_date) as month"),
                DB::raw('SUM( inventory_purchase_details.quantity ) as qty'),
                DB::raw('SUM( inventory_purchase_details.quantity * inventory_purchase_details.purchase_price ) as total'),
            ])
            ->groupBy('com_branches.name', 'year', 'month', 'product_name');

        $purchases = $purchasesCostSelected->union($purchasesCostOthers);
        $purchases = $purchases->orderBy('year')->orderBy('product_name')->get();

        $monthNames = [];
        while ($startDate->lt($endDate)) {
            $monthNames[] = $startDate->format('M-Y');
            $startDate->addMonth(); // Move to the next month
        }

        $productsName = [];
        foreach ($purchases as $p) {
            $productsName[] = $p->product_name;
        }
        $productsName = array_unique($productsName);

        $purchases_data = [];
        foreach ($productsName as $pname) {
            foreach ($purchases as $purchase) {
                if ($purchase->product_name == $pname) {
                    $purchases_data[$purchase->product_name][] = $purchase;
                }
            }
        }

        return [$purchases_data, $productsName];
    }

    private function operatingCost($branch_id,  $startdate, $enddate)
    {
        $startDate = Carbon::parse(Carbon::createFromFormat('d/m/Y', $startdate)->format('Y-m-d'));  //Carbon::parse('2023-01-01');
        $endDate   = Carbon::parse(Carbon::createFromFormat('d/m/Y', $enddate)->format('Y-m-d'));

        $meta = Meta::where('meta_key', 'operative_cost')->first();
        $operativeCost = json_decode($meta->meta_value);
        $costIds = [];
        foreach ($operativeCost as $key => $cost) {
            $costIds[] = $cost->id;
        }

        $operatingCostSelected = MainTransactionMaster::join('acc_transaction_master', 'acc_transaction_master.main_trx_id', '=', 'main_trx_master.id')
            ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
            ->join('acc_coa_level4s', function ($join) use ($costIds) {
                $join->on('acc_coa_level4s.id', '=', 'acc_transaction_details.coa4_id')
                    ->whereIn('acc_coa_level4s.id', $costIds);
            })
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branch_id)
            ->where('main_trx_master.status', 1)
            ->select([
                DB::raw('SUM( acc_transaction_details.credit ) as credit'),
                DB::raw('SUM( acc_transaction_details.debit ) as debit'),
                'main_trx_master.branch_id as branch_id',
                DB::raw("MONTHNAME(vr_date) as month"),
                DB::raw('DATE_FORMAT(vr_date, "%b-%Y") as year'),
                'com_branches.name as branch',
                'acc_transaction_details.coa4_id',
                'acc_coa_level4s.name as name'
            ])->groupBy('month', 'year', 'branch_id', 'acc_transaction_details.coa4_id', 'com_branches.name', 'acc_coa_level4s.name');

        $operatingCostOthers = MainTransactionMaster::join('acc_transaction_master', 'acc_transaction_master.main_trx_id', '=', 'main_trx_master.id')
            ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
            ->join('acc_coa_level4s', 'acc_coa_level4s.id', '=', 'acc_transaction_details.coa4_id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->where('main_trx_master.branch_id', $branch_id)
            ->where('main_trx_master.status', 1)
            ->whereNotIn('acc_coa_level4s.id', [17, 23, 46, 58])
            ->whereNotIn('acc_coa_level4s.id', $costIds)
            ->select([
                DB::raw('SUM( acc_transaction_details.credit ) as credit'),
                DB::raw('SUM( acc_transaction_details.debit ) as debit'),
                'main_trx_master.branch_id as branch_id',
                DB::raw("MONTHNAME(vr_date) as month"),
                DB::raw('DATE_FORMAT(vr_date, "%b-%Y") as year'),
                'com_branches.name as branch',
                DB::raw("'' as coa4_id"),
                DB::raw("'Others' as name")
            ])
            ->groupBy('month', 'year', 'branch_id',  'branch', 'name');

        $expenditure = $operatingCostOthers->union($operatingCostSelected);

        $expenditure = $expenditure->orderBy('year')->orderBy('name')->get();

        $monthNames = [];
        while ($startDate->lt($endDate)) {
            $monthNames[] = $startDate->format('M-Y');
            $startDate->addMonth(); // Move to the next month
        }

        $operatingCost = [];
        foreach ($expenditure as $name) {
            $operatingCost[] = $name->name;
        }
        $operatingCost =  array_unique($operatingCost);

        $report_data = [];
        foreach ($operatingCost as $n) {
            foreach ($expenditure as $d) {
                if ($d->name == $n) {
                    $report_data[$d->name][] = $d;
                }
            }
        }
        return [$report_data, $operatingCost];
    }

    public function apiCashBookData(Request $request)
    {
        // Define the parameters
        $branchId = $request->branch_id;
        $branch = Branch::find($branchId);

        if (request()->is('api/*')) {
            $startDate = $request->start_date;
            $endDate =  $request->end_date;
        } else {
            $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
            $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));
            $range     = '(' . us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ')';
        }

        // Opening Balance Account
        $query1 = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->selectRaw("null as mtm_id, null as vr_no, 'Opening Balance' as nam, '' voucher_image,  null as vr_date, '' as approved_by,
                 null as is_approved, null as voucher_type_id, null as note, null as id, null as trx_mstr_id,
                 null as coa4_id, null as pay_branch, null as branch_id, null as remarks,
                 (CASE WHEN SUM(debit) - SUM(credit) > 0 THEN SUM(debit) - SUM(credit) ELSE 0 END) as debit,
                 (CASE WHEN SUM(credit) - SUM(debit) > 0 THEN SUM(credit) - SUM(debit) ELSE 0 END) as credit,
                 null as status")
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('mtm.vr_date', '<', $startDate)
            ->where('atd.coa4_id', '<>', 17);

        $query2 = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                'acl4.name as nam',
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.debit',
                'atd.credit',
                'atd.status'
            ])
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->where('acl4.id', '<>', 23)
            ->where('acl4.id', '<>', 40)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('atd.coa4_id', '<>', 17)
            ->where(function ($query) {
                $query->whereRaw("SUBSTR(vr_no, 1, 1) = 1")
                    ->orWhereRaw("SUBSTR(vr_no, 1, 1) = 2");
            });


        $query3 = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                DB::raw("'Sales' as nam"),
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.credit as debit',
                'atd.debit as credit',
                'atd.status'
            ])
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->where('acl4.id', '<>', 23)
            ->where('acl4.id', '<>', 40)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('atd.coa4_id', 17)
            ->whereRaw("SUBSTR(mtm.vr_no, 1, 1) = '3'");

        $query4 = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                DB::raw("'Purchase' as nam"),
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.credit as debit',
                'atd.debit as credit',
                'atd.status'
            ])
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->where('acl4.id', '<>', 23)
            ->where('acl4.id', '<>', 40)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('atd.coa4_id', 17)
            ->whereRaw("SUBSTR(mtm.vr_no, 1, 1) = '4'");

        $query5 = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                DB::raw("'Labour Invoice' as nam"),
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.credit as debit',
                'atd.debit as credit',
                'atd.status'
            ])
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->where('acl4.id', '<>', 23)
            ->where('acl4.id', '<>', 40)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('atd.coa4_id', 17)
            ->whereRaw("SUBSTR(mtm.vr_no, 1, 1) = '6'");



        // Define the first subquery as a separate query builder instance
        $subqueryA = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->join('acc_coa_level3s as acl3', 'acl3.id', '=', 'acl4.acc_coa_level3_id')
            ->select(
                'mtm.id as mtm_id',
                'mtm.vr_no',
                'acl4.name as nam',
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.debit',
                'atd.credit',
                'atd.status'
            )
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('acl3.acc_source_id', '<>', 8)
            ->where('atd.coa4_id', 17)
            ->whereIn('atd.trx_mstr_id', function ($query) {
                $query->select('trx_mstr_id')
                    ->from('acc_transaction_details')
                    ->where('coa4_id', 17);
            });

        // Define the second subquery
        $subqueryB = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->join('acc_coa_level3s as acl3', 'acl3.id', '=', 'acl4.acc_coa_level3_id')
            ->select(
                'mtm.id as mtm_id',
                'mtm.vr_no',
                'acl4.name as nam',
                'mtm.voucher_image',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.debit',
                'atd.credit',
                'atd.status'
            )
            ->where('atm.voucher_type_id', 2)
            ->where('atd.coa4_id', '<>', 17)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where('acl3.acc_source_id', 8)
            ->whereIn('atd.trx_mstr_id', function ($query) {
                $query->select('trx_mstr_id')
                    ->from('acc_transaction_details')
                    ->where('coa4_id', 17);
            });

        // Combine the two subqueries with a join
        $query6 = DB::table(DB::raw("({$subqueryA->toSql()}) as a"))
            ->mergeBindings($subqueryA)
            ->join(DB::raw("({$subqueryB->toSql()}) as b"), 'a.mtm_id', '=', 'b.mtm_id')
            ->mergeBindings($subqueryB)
            ->select(
                'a.mtm_id',
                'a.vr_no',
                'b.nam',
                'b.voucher_image',
                'a.vr_date',
                'a.approved_by',
                'a.is_approved',
                'a.voucher_type_id',
                'a.note',
                'a.id',
                'a.trx_mstr_id',
                'b.coa4_id',
                'a.pay_branch',
                'a.branch_id',
                'a.remarks',
                DB::raw('a.credit as debit'),
                DB::raw('a.debit as credit'),
                'a.status'
            );

        // Combine all the queries with union
        $data = $query1 // Opening Balance
            ->unionAll($query2) // Payment and Received Voucher
            ->unionAll($query3) // Sales Invoice
            ->unionAll($query4) // Purchase Invoice
            ->unionAll($query5) // Labour Invoice
            ->unionAll($query6)  // Make Final Query
            ->orderBy('vr_date')
            ->orderBy('mtm_id')
            ->get();


        if ($data) {
            $companyId = auth()->user()->company_id;
            $branchNames = Branch::where('company_id', $companyId)->pluck('name', 'id');
            $selfBranchName = $branchNames[$branchId] ?? ($branch->name ?? '');
            $cumulativeDebit  = 0;
            $cumulativeCredit = 0;
            $rangeDebitTotal = 0;
            $rangeCreditTotal = 0;
            $slNumber         = 0;
            $branchPad = str_pad($branchId, 4, '0', STR_PAD_LEFT);
            // Use map to add fields to each record while preserving stdClass objects
            $data->map(function ($record) use (&$rangeDebitTotal, &$rangeCreditTotal, &$cumulativeDebit, &$cumulativeCredit, &$slNumber, $branch, &$branchPad, $branchNames, $selfBranchName, $branchId) {
                // Convert debit and credit to integers for calculation
                $debit = (int) $record->debit;
                $credit = (int) $record->credit;

                // Update cumulative totals
                $cumulativeDebit  += (int) $debit;
                $cumulativeCredit += (int)$credit;

                $record->remarks = $record->remarks ??  $record->note;
                if ($branch->have_customer_sl == 1) {
                    $somity = apiCoaToIdfrCode($record->coa4_id);
                    if ($somity != '') {
                        $record->somity = $somity;
                    }
                }
                if (empty($record->mtm_id)) {
                    $record->pay_branch_name = null;
                } else {
                    $payBranchId = empty($record->pay_branch) ? $branchId : (int) $record->pay_branch;
                    if( $payBranchId != $branchId){
                    $record->pay_branch_name = $branchNames[$payBranchId] ?? $selfBranchName;
                    }else{
                        $record->pay_branch_name = null;
                    }

                }

                $type = explode('-', $record->vr_no);
                if ($type[0] == 6) {
                    $contractorName = getContractorNameFromLabourInvoice($record->mtm_id);
                    $record->nam = '<span>' . $contractorName . '</span></br>' . $record->nam;
                } else if ($type[0] == 4) {
                    $supplierName = getSupplierNameFromPurchaseInvoice($record->mtm_id);
                    $record->nam = '<span>' . $supplierName . '</span></br>' . $record->nam;
                } else if ($type[0] == 3) {
                    $customerName = getCustomerNameFromSalesInvoice($record->mtm_id);
                    $record->nam = '<span>' . $customerName . '</span></br>' . $record->nam;
                }



                // Update range totals only if this is not the first row
                if ($slNumber > 0) {  // Checks if it's the first row by slNumber count
                    $rangeDebitTotal  += (int)$debit;
                    $rangeCreditTotal += (int)$credit;
                }

                $vrType = explode('-', $record->vr_no);
                if ($vrType[0] == 3) {
                    $item = trim(strip_tags(salesItems($record->mtm_id)));
                    if ($item == '') {
                        $item = buildingItems($record->mtm_id);
                    }
                    $record->nam = $record->nam . ($item !== '' ? ' (' . $item . ')' : '');
                }

                if ($vrType[0] == 4) {
                    $item = strip_tags(purchaseItems($record->mtm_id));
                    // $record->nam = $record->nam . ' (' . $item . ')';
                    $record->nam = $record->nam . ($item !== '' ? ' (' . $item . ')' : '');
                }

                if ($vrType[0] == 6) {
                    $item = strip_tags(labourItems($record->mtm_id));
                    // $record->nam = $record->nam . ' (' . $item . ')';
                    $record->nam = $record->nam . ($item !== '' ? ' (' . $item . ')' : '');
                }



                // Add new properties directly to the stdClass object
                $record->sl_number  = $slNumber;
                $slNumber          += 1;
                $record->branchPad  = $branchPad;
                // $record->vr_date         =  us_to_bd_date( $record->vr_date );
                $record->vr_date           = $record->vr_date ? us_to_bd_date($record->vr_date) : '';
                $record->cumulative_debit  = $cumulativeDebit;
                $record->cumulative_credit = $cumulativeCredit;
                $record->balance           = $cumulativeCredit - $cumulativeDebit;
                // return foundData($record);
            });

            if (count($data) > 0) {
                $data->push([
                    'mtm_id'          => null,
                    'vr_no'           => null,
                    'nam'             => us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ' Total',
                    'vr_date'         => null,
                    'approved_by'     => '',
                    'is_approved'     => null,
                    'voucher_type_id' => null,
                    'note'            => null,
                    'id'              => null,
                    'trx_mstr_id'     => null,
                    'coa4_id'         => null,
                    'pay_branch'      => null,
                    'branch_id'       => null,
                    'remarks'         => null,
                    'debit'           => $rangeDebitTotal,
                    'credit'          => $rangeCreditTotal,
                    'status'          => null
                ]);

                $data->push([
                    'mtm_id'          => null,
                    'vr_no'           => null,
                    'nam'             => 'Total',
                    'vr_date'         => null,
                    'approved_by'     => '',
                    'is_approved'     => null,
                    'voucher_type_id' => null,
                    'note'            => null,
                    'id'              => null,
                    'trx_mstr_id'     => null,
                    'coa4_id'         => null,
                    'pay_branch'      => null,
                    'branch_id'       => null,
                    'remarks'         => null,
                    'debit'           => $cumulativeDebit,
                    'credit'          => $cumulativeCredit,
                    'status'          => null
                ]);

                $data->push([
                    'mtm_id'          => null,
                    'vr_no'           => null,
                    'nam'             => 'Balance',
                    'vr_date'         => null,
                    'approved_by'     => null,
                    'is_approved'     => null,
                    'voucher_type_id' => null,
                    'note'            => null,
                    'id'              => null,
                    'trx_mstr_id'     => null,
                    'coa4_id'         => null,
                    'pay_branch'      => null,
                    'branch_id'       => null,
                    'remarks'         => null,
                    'debit'           => max($cumulativeDebit - $cumulativeCredit, 0),
                    'credit'          => max($cumulativeCredit - $cumulativeDebit, 0),
                    'status'          => null
                ]);
            }
            return foundData($data);
        }
        return notFound();
    }


    public function cashBookData(Request $request)
    {
        $branch_id = $request->branch_id;
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));

        $paymentlist = $this->cashBookQuery($branch_id, $startDate, $endDate);

        $voucherType = Vouchertype::all();


        return DataTables::of($paymentlist)
            ->editColumn('nam', function ($paymentlist) use ($voucherType) {
                $id = explode('-', $paymentlist->vr_no);

                if (4 == $id) {
                    if ('Purchase' == $paymentlist->nam) {
                        $nam = '<span style="color:rgb(239, 4, 71); font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" class="purchase" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $voucherType::find($id)->name . '</span>';
                    } else {
                        $nam = '<span style="color:rgb(239, 4, 71); font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" class="purchase" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $voucherType::find($id)->name . ' (Purchase)</span>';
                    }
                } else if (3 == $id) {
                    if ('Sales' == $paymentlist->nam) {
                        $nam = '<span style="color:#a90329; font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $voucherType::find($id)->name . '</span>';
                    } else {
                        $nam = '<span style="color:#a90329; font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $voucherType::find($id)->name . ' (Sales)</span>';
                    }
                } else if (12 == $id) {
                    //return $paymentlist->nam;
                    if ('Purchase Return' == $paymentlist->nam) {
                        $nam = '<span style="color:#a90329; font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $paymentlist->nam . '</span>';
                    } else {
                        $nam = '<span style="color:#a90329; font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $paymentlist->nam . ' (Purchase Return)</span>';
                    }
                } else if (6 == $id) {
                    $nam = '<span  style="color:rgb(66, 134, 244); font-weight: bold;" data-id="' . $paymentlist->mtm_id . '" class="labour" data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $paymentlist->nam . ' (Labour Bill)</span>';
                } else {
                    $nam = '<span data-toggle="tooltip" title="' . $paymentlist->remarks . '">' . $paymentlist->nam . '</span>';
                }
                return $nam;
            })
            ->addColumn('action', function ($paymentlist) {
                if ($paymentlist->is_approved == "0") {
                    $edit = '<a href="#" class="item-edit-model icon-pad" data-toggle="modal" data-id="' . $paymentlist->mtm_id . '" data-target="#itemEditModal"><i class="fa fa-pencil text-edit"></i></a><span></span>';
                } else if ($paymentlist->is_approved == null) {
                    $edit = '<h1>Hello one</h1>';
                } else {
                    $edit = '<h1>Hello two</h1>';
                }

                if ($paymentlist->is_approved == null) {
                    $markup = '';
                } else {
                    $markup =
                        '<a href="#" class="item-model-list icon-pad"  data-toggle="modal" data-id="' . $paymentlist->mtm_id . '" data-target="#voucher-details"><i class="fa fa-eye"></i></a>'
                        . $edit;
                }
                return $markup;
            })
            ->editColumn('is_approved', function ($paymentlist) {
                if (0 == $paymentlist->is_approved && $paymentlist->is_approved != null) {
                    $markup = '<div class="div-update">
                            <a href="#" style="color: red;" class="item-approved" title="Do you want to approved?" data-id="' . $paymentlist->mtm_id . '" data-target="#itemEditModal"><i class="fa fa-times"></i></a>
                            </div>
                            <div class="div-approved" style="font-weight: bold; color: green; display: none;"><i class="fa fa-check"></i></div>';
                    return $markup;
                } else if ($paymentlist->is_approved == null) {
                    return '';
                } else {
                    return '<div style="font-weight: bold; color: green;"><i class="fa fa-check-square-o"></i></div>';
                }
            })
            ->editColumn('vr_date', function ($paymentlist) {
                if ($paymentlist->vr_date == '') {
                    return '';
                } else {
                    return date('d/m/Y', strtotime($paymentlist->vr_date));
                }
            })
            ->rawColumns(['nam', 'action', 'is_approved'])
            ->toJson();
    }

    public function ledger()
    {

        if (!auth()->user()->can('ledger.customer')) {
            return view('errors.403');
        }

        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        $firstDayForTheMonth = date('Y-m-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.ledger-updated', compact('projects', 'trdate', 'firstDateOfMonth'));
    }

    public function printLedger(Request $request)
    {

        $user = auth()->user();

        $data      = $this->ledgerData($request);
        $id        = $request->ledger_id;
        $coal4s    = CoaLevel4::where('id', $id)->first();
        $projects  = Branch::where('id', $request->branch_id)->where('company_id', $user->company_id)->first();
        $company   = Company::find($user->company_id);
        $daterange = $request['startdate'] . ' - ' . $request['enddate'];
        return view('reports.newreports.ledger-print', compact('data', 'projects', 'company', 'coal4s', 'daterange'));
    }

    public function ledgerData(Request $request)
    {

        // return $request->all();

        $user = auth()->user();
        $branch_id = isset($request['branch_id']) ? $request['branch_id'] : null;
        $ledgerId  = (int) $request['ledger_id'];

        if (request()->is('api/*')) {
            $startDate = $request->start_date;
            $endDate =  $request->end_date;
        } else {
            $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->startdate)));
            $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->enddate)));
            $range     = '(' . us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ')';
        }


        // Ledger Opening  Summary
        $opening = MainTransactionMaster::join('acc_transaction_master', 'acc_transaction_master.main_trx_id', '=', 'main_trx_master.id')
            ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
            ->join('acc_coa_level4s', 'acc_coa_level4s.id', '=', 'acc_transaction_details.coa4_id')
            ->where('main_trx_master.vr_date', '<', $startDate)
            ->where('main_trx_master.company_id',  $user->company_id)
            ->where('main_trx_master.status',  1)
            // ->where('acc_transaction_master.voucher_type_id', '<>',  3)
            ->where('acc_transaction_details.coa4_id', '<>', $ledgerId)
            ->select([
                DB::raw(" '' as mid, '' as vr_sl, '' branch_id, '' as branch_name, '' as coa4_id,'' as vr_date,'' as vr_no, '' as voucher_image, '' as id,'Opening' as name,'' as remarks,'' as trx_mstr_id, '' voucher_type_id"),
                DB::raw(
                    '(CASE WHEN SUM(acc_transaction_details.credit) - SUM(acc_transaction_details.debit) > 0 THEN SUM(acc_transaction_details.credit) - SUM(acc_transaction_details.debit) ELSE 0 END) AS debit'
                ),
                DB::raw(
                    '(CASE WHEN SUM(acc_transaction_details.debit) - SUM(acc_transaction_details.credit) > 0 THEN SUM(acc_transaction_details.debit) - SUM(acc_transaction_details.credit) ELSE 0 END) AS credit'
                ),
            ]);

        if ($branch_id != null) {
            // All Branch Summery
            $opening->whereIn('main_trx_master.id', function ($query) use ($ledgerId,  $branch_id, $startDate) {
                $query->select('main_trx_master.id')->from('main_trx_master')
                    ->join('acc_transaction_master', 'main_trx_master.id', '=', 'acc_transaction_master.main_trx_id')
                    ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
                    ->where('main_trx_master.branch_id',  $branch_id)
                    ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
                    ->where('main_trx_master.vr_date', '<', $startDate);
            });
        } else {
            // Selected Branch Summery
            $opening->whereIn('main_trx_master.id', function ($query) use ($ledgerId, $branch_id,  $startDate) {
                $query->select('main_trx_master.id')->from('main_trx_master')
                    ->join('acc_transaction_master', 'main_trx_master.id', '=', 'acc_transaction_master.main_trx_id')
                    ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
                    ->where('main_trx_master.branch_id',  $branch_id)
                    ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
                    ->where('main_trx_master.vr_date', '<', $startDate);
            });
        };


        // Ledger Details Transaction Not Received Voucher
        $details = MainTransactionMaster::join('acc_transaction_master', 'acc_transaction_master.main_trx_id', '=', 'main_trx_master.id')
            ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
            ->join('acc_coa_level4s', 'acc_coa_level4s.id', '=', 'acc_transaction_details.coa4_id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->where('main_trx_master.company_id',  $user->company_id)
            ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
            ->where('main_trx_master.status',  1)
            ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
            ->whereIn('main_trx_master.id', function ($query) use ($ledgerId, $startDate, $endDate) {
                $query->select('main_trx_master.id')->from('main_trx_master')
                    ->join('acc_transaction_master', 'main_trx_master.id', '=', 'acc_transaction_master.main_trx_id')
                    ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
                    ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
                    ->where('main_trx_master.status',  1)
                    ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);
            })
            ->select([
                'main_trx_master.id as mid',
                'main_trx_master.vr_sl as vr_sl',
                'com_branches.id as branch_id',
                'com_branches.name as branch_name',
                'acc_transaction_details.coa4_id as coa4_id',
                'main_trx_master.vr_date as vr_date',
                'main_trx_master.vr_no as vr_no',
                'main_trx_master.voucher_image as voucher_image',
                'acc_transaction_details.id as id',
                'acc_coa_level4s.name as name',
                'acc_transaction_details.remarks as remarks',
                'acc_transaction_details.trx_mstr_id as trx_mstr_id',
                'acc_transaction_master.voucher_type_id as voucher_type_id',
                'acc_transaction_details.debit as debit',
                'acc_transaction_details.credit as credit',
            ]);

        if ($branch_id != null) {
            // All Branch Details
            $details->whereIn('main_trx_master.id', function ($query) use ($ledgerId,  $branch_id, $startDate, $endDate) {
                $query->select('main_trx_master.id')->from('main_trx_master')
                    ->join('acc_transaction_master', 'main_trx_master.id', '=', 'acc_transaction_master.main_trx_id')
                    ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
                    ->where('main_trx_master.branch_id',  $branch_id)
                    ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
                    ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);
            });
        } else {
            // Selected Branch Details
            $details->whereIn('main_trx_master.id', function ($query) use ($ledgerId, $branch_id, $startDate, $endDate) {
                $query->select('main_trx_master.id')->from('main_trx_master')
                    ->join('acc_transaction_master', 'main_trx_master.id', '=', 'acc_transaction_master.main_trx_id')
                    ->join('acc_transaction_details', 'acc_transaction_master.id', '=', 'acc_transaction_details.trx_mstr_id')
                    ->where('main_trx_master.branch_id',  $branch_id)
                    ->where('acc_transaction_details.coa4_id', '=', $ledgerId)
                    ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);
            });
        }


        $data = $opening->union($details);
        $data = $data->orderBy('vr_date', 'asc')->get();
        $dates = [$request['startdate'], $request['enddate']];

        if (request()->is('api/*')) {
            if (!$data) {
                return notFound();
            }

            $cumulativeDebit  = 0;
            $cumulativeCredit = 0;
            $slNumber         = 0;

            $rangeDebitTotal = 0;
            $rangeCreditTotal = 0;
            $voucherType = VoucherType::all();


            $branchPad = str_pad($branch_id, 4, '0', STR_PAD_LEFT);

            // Use map to add fields to each record while preserving stdClass objects
            $processedData = $data->map(function ($record) use (&$cumulativeDebit, &$cumulativeCredit, &$slNumber, &$rangeDebitTotal, &$rangeCreditTotal, $voucherType, $branchPad) {
                // Convert debit and credit to integers for calculation
                $debit = (int)$record->debit;
                $credit = (int)$record->credit;

                // Update cumulative totals
                $cumulativeDebit  += $debit;
                $cumulativeCredit += $credit;

                if ($slNumber > 0) {
                    $rangeDebitTotal  += $debit;
                    $rangeCreditTotal += $credit;
                }

                if (isset($record->mid)) {
                    // Extract voucher type ID from vr_no
                    $type = explode("-", $record->vr_no);
                    $voucherTypeId = $type[0]; // Assuming the first part of `vr_no` is the type ID

                    // Find the voucher type with the extracted ID
                    $result = $voucherType->firstWhere('id', (int)$voucherTypeId);

                    if ($result) {
                        // Replace $record->name with $result->name
                        $record->name = $result->name;
                    }

                    if ($voucherTypeId == 6) {
                        $record->remarks = getLabourInvoiceRemarks($record->mid);
                    }
                }

                $record->sl_number         = $slNumber;
                $record->branchPad         = $branchPad;
                $slNumber += 1;

                // Add new properties directly to the stdClass object
                $record->vr_date           = $record->vr_date != "" ? us_to_bd_date($record->vr_date) : $record->vr_date;
                $record->cumulative_debit  = $cumulativeDebit;
                $record->cumulative_credit = $cumulativeCredit;
                $record->balance           = $cumulativeDebit - $cumulativeCredit;

                return $record; // Make sure to return the record
            });

            $data->push([
                'sl_number'         => '',
                'vr_date'           => us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ' Total',
                'debit'             => $rangeDebitTotal,
                'credit'            => $rangeCreditTotal,
                'cumulative_debit'  => 0,
                'cumulative_credit' => 0,
                'balance'           => 0,
            ]);
            $data->push([
                'sl_number'         => '',
                'vr_date'           => 'Grand Total',
                'debit'             => $cumulativeDebit,
                'credit'            => $cumulativeCredit,
                'cumulative_debit'  => 0,
                'cumulative_credit' => 0,
                'balance'           => 0,
            ]);
            $data->push([
                'sl_number'         => '',
                'vr_date'           => 'Balance',
                'debit'             => max($cumulativeDebit - $cumulativeCredit, 0),
                'credit'            => max($cumulativeCredit - $cumulativeDebit, 0),
                'cumulative_debit'  => 0,
                'cumulative_credit' => 0,
                'balance'           => 0,
            ]);


            return foundData($data);
        }

        return view('reports.newreports.templates.ledger-template', compact('data', 'branch_id', 'dates'));
    }

    public function ledgerApi(Request $request)
    {
        return $this->checkEloquentQuery($request);
    }



    public function checkEloquentQuery(Request $request)
    {
        // $branchId = isset($request['branch_id']) ? $request['branch_id'] : null;
        $branchId = $request['branch_id'] ?? null;
        if ($branchId === '' || $branchId === 'null' || $branchId === 0 || $branchId === '0') {
            $branchId = null;
        }
        $ledgerId  = $request['ledger_id'];
        // return [$branchId, $ledgerId];

        if (request()->is('api/*')) {
            $startDate = $request->start_date;
            $endDate =  $request->end_date;
        } else {
            $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->startdate)));
            $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->enddate)));
            $range     = '(' . us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ')';
        }


        $openingQuery =  AccTransactionDetails::join('acc_transaction_master as atm', 'acc_transaction_details.trx_mstr_id', '=', 'atm.id')
            ->join('main_trx_master as mtm', 'atm.main_trx_id', '=', 'mtm.id')
            ->where('acc_transaction_details.coa4_id', $ledgerId)
            ->where('mtm.status', 1)
            ->where('mtm.vr_date', '<', $startDate)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->when($branchId, fn($q) => $q->where('mtm.branch_id', $branchId))
            ->selectRaw('SUM(acc_transaction_details.debit) as total_debit, SUM(acc_transaction_details.credit) as total_credit')
            ->first();


        /**
         * Common columns used in inner subqueries (A/B)
         */
        $cols = [
            'mtm.id as mid',
            'mtm.id as mtm_id',
            'mtm.vr_sl',
            'atm.voucher_type_id',
            'atd.coa4_id',
            'mtm.vr_date',
            'mtm.vr_no',
            'mtm.voucher_image',
            'mtm.branch_id',
            'cb.name as branch_name',
            'atd.id',
            'coal4.name',
            'atd.remarks',
            'atd.trx_mstr_id',
            'atd.debit',
            'atd.credit',
            "(SELECT GROUP_CONCAT(DISTINCT coal4b.name ORDER BY coal4b.name SEPARATOR ', ')
                FROM acc_transaction_details as atdb
                JOIN acc_coa_level4s as coal4b ON coal4b.id = atdb.coa4_id
                WHERE atdb.trx_mstr_id = atd.trx_mstr_id
                AND atdb.coa4_id != {$ledgerId}) as journal_opposite_name",
        ];

        /**
         * Side A = আপনার লেজার লাইন (atd.coa4_id = $ledgerId)
         */
        $baseA = function () use ($branchId, $startDate, $endDate, $ledgerId, $cols) {
            return DB::table('acc_transaction_details as atd')
                ->selectRaw(implode(', ', $cols))
                ->join('acc_coa_level4s as coal4', 'coal4.id', '=', 'atd.coa4_id')
                ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
                ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
                ->leftJoin('com_branches as cb', 'mtm.branch_id', '=', 'cb.id')
                ->where('mtm.status', 1)
                ->where('mtm.company_id', auth()->user()->company_id)
                ->when($branchId, fn($q) => $q->where('mtm.branch_id', $branchId))
                ->whereBetween('mtm.vr_date', [$startDate, $endDate])
                ->where('atd.coa4_id', $ledgerId);
        };

        /**
         * Side B = অপজিট লাইন (atd.coa4_id != $ledgerId)
         */
        $baseB = function () use ($branchId, $startDate, $endDate, $cols, $ledgerId) {
            return DB::table('acc_transaction_details as atd')
                ->selectRaw(implode(', ', $cols))
                ->join('acc_coa_level4s as coal4', 'coal4.id', '=', 'atd.coa4_id')
                ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
                ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
                ->leftJoin('com_branches as cb', 'mtm.branch_id', '=', 'cb.id')
                ->where('mtm.status', 1)
                ->where('mtm.company_id', auth()->user()->company_id)
                ->when($branchId, fn($q) => $q->where('mtm.branch_id', $branchId))
                ->whereBetween('mtm.vr_date', [$startDate, $endDate])
                ->where('atd.coa4_id', '!=', $ledgerId)   // ← opposite
                ->where('atd.coa4_id', '!=', 23)
                ->where('atd.coa4_id', '!=', 41)
                ->where('atd.coa4_id', '!=', 42)
                ->where('atd.coa4_id', '!=', 197)
                ->where('atd.coa4_id', '!=', 198);
            // চাইলে নির্দিষ্ট কোনো অ্যাকাউন্ট বাদ: ->where('atd.coa4_id', '!=', 40)
        };

        /**
         * ব্লক বিল্ডার:
         *  - $side: 'debit' => A: debit>0, B: credit>0
         *           'credit'=> A: credit>0, B: debit>0
         *  - $vtype: '<>3' বা '=3' (voucher_type_id ফিল্টার)
         */
        $block = function (string $side, string $vtype) use ($baseA, $baseB) {
            $A = $baseA()->clone();
            $B = $baseB()->clone();

            if ($vtype === '<>3') {
                $A->where('atm.voucher_type_id', '<>', 3);
                $B->where('atm.voucher_type_id', '<>', 3);
            } else {
                $A->where('atm.voucher_type_id', '=', 3);
                $B->where('atm.voucher_type_id', '=', 3);
            }

            if ($side === 'debit') {
                $A->where('atd.debit', '>', 0);
                $B->where('atd.credit', '>', 0);
            } else { // 'credit'
                $A->where('atd.credit', '>', 0);
                $B->where('atd.debit', '>', 0);
            }

            // A JOIN B on same voucher, এবং opposite info select
            return DB::query()
                ->fromSub($A, 'a')
                ->leftJoinSub($B, 'b', function ($j) {
                    $j->on('a.mid', '=', 'b.mid')
                        ->on('a.trx_mstr_id', '=', 'b.trx_mstr_id');
                })
                ->selectRaw("
            a.mid,
            a.mtm_id,
            a.vr_sl,
            a.voucher_type_id,
            a.coa4_id,
            a.vr_date,
            a.vr_no,
            a.voucher_image,
            a.branch_id,
            a.branch_name,
            a.id,
            CASE
                WHEN a.voucher_type_id = 3 THEN COALESCE(a.journal_opposite_name, b.name, a.name)
                ELSE COALESCE(b.name, a.name)
            END as name,
            COALESCE(a.remarks, b.remarks) as remarks,
            a.trx_mstr_id,
            a.debit           as debit,  
            a.credit           as credit, 
            b.coa4_id          as opposite_coa4_id
        ");
        };

        /**
         * চূড়ান্ত DETAILS (Opening Balance নেই)
         * 4টি ব্লক: (<>3,debit) ∪ (<>3,credit) ∪ (=3,credit) ∪ (=3,debit)
         */
        $detailsQuery = $block('debit',  '<>3')
            ->unionAll($block('credit', '<>3'))
            ->unionAll($block('credit', '=3'))
            ->unionAll($block('debit',  '=3'))
            ->orderBy('vr_date')
            ->orderBy('trx_mstr_id')
            ->get();

        $data = ['opening_balance' => $openingQuery, 'details' => $detailsQuery];
        return foundData($data);
    }

    public function stockLedger()
    {

        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        return view('reports.newreports.stock-ledger', compact('projects', 'trdate'));
    }

    public function stockLedgerData(Request $request)
    {
        if ("" == $request->start_date || null == $request->start_date) {
            $startDate = Dayclose::first()->trx_date;
        } else {
            $startDate = Common::dateBdToDb($request->start_date);
        };
        if ("" == $request->end_date || null == $request->end_date) {
            $endDate = Dayclose::where('branch_id', Auth::user()->branch_id)
                ->orderBy('id', 'DESC')->first()->trx_date;
        } else {
            $endDate = Common::dateBdToDb($request->end_date);
        };

        if ($request['branch_id'] != null || $request['branch_id'] != "") {
            $branch = $request->branch_id;
        } else {
            $branch = Auth::user()->branch_id;
        }

        $data = DB::select('SELECT  a.* FROM
                            (SELECT ivd.product_id, pc.NAME category, pis.NAME product, concat(sum(stock_in), \' \', siu.NAME) stock_in,
                            sum(stock_out) stock_out,
                            FORMAT(sum(ivd.stock_in*ivd.purchase_price),0) purchase_price,
                            CONCAT ((SUM(FORMAT(stock_in,0)) - SUM(FORMAT(stock_out,0))), \' \', siu.NAME) stock
                            FROM inventory_details ivd
                            join inventory_masters im on im.id = ivd.inv_mstr_id
                            JOIN main_trx_master mtm on mtm.id= im.main_trx_id
                            JOIN product_items pis ON pis.id = ivd.product_id
                            JOIN product_categories pc ON pc.id = pis.category_id
                            JOIN sys_inv_units siu ON siu.id = pis.unit_id
                            WHERE ivd.branch_id = ? AND mtm.vr_date BETWEEN ? AND ?
                            GROUP BY ivd.product_id, pc.NAME, pis.NAME, siu.name
                            ORDER BY category, pis.NAME) a ', [$branch, $startDate, $endDate]);
        return DataTables::of($data)
            ->addIndexColumn()
            ->editColumn('product', function ($data) {
                return '<a style="color:blue;" class="product-details" data-target="#product-details" data-id="' . $data->product_id . '" data-toggle="modal" href="#" product-id="' . $data->product_id . '">' . $data->product . '</a>';
            })
            ->RawColumns(['product'])
            ->toJson();
    }

    public function productDetails(Request $request)
    {
        $branch_id  = $request->branch_id;
        $product_id = $request->product_id;
        $startDate  = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate    = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));

        // $data = DB::select("CALL product_details(?,?,?,?)", array($branch_id, $product_id, $startDate, $endDate));

        $data = DB::table('inventory_details as id')
            ->join('inventory_masters as im', 'im.id', '=', 'id.inv_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'im.main_trx_id')
            ->join('product_items as pi', 'pi.id', '=', 'id.product_id')
            ->join('sys_inv_units as siu', 'siu.id', '=', 'pi.unit_id')
            ->select(
                'mtm.id',
                'mtm.vr_no',
                DB::raw('DATE_FORMAT(mtm.vr_date, "%d/%m/%y") as vr_date'),
                'id.product_id',
                'pi.name as product',
                'siu.name as unit',
                'id.stock_in',
                'id.stock_out',
                'id.purchase_price',
                DB::raw('FORMAT((id.stock_in * id.purchase_price), 2) as total_purchase'),
                'id.sales_price',
                DB::raw('FORMAT((id.stock_out * id.sales_price), 2) as total_sales')
            )
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branch_id)
            ->where('id.product_id', $product_id)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->orderBy('mtm.id')
            ->get();

        $item_name = Item::find($product_id)->name;

        return [
            $data,
            $item_name
        ];
    }

    public function due()
    {
        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        return view('reports.newreports.duelist', compact('projects', 'trdate'));
    }

    public function printDueList(Request $request)
    {

        $data = $this->dueListData($request);

        $company = Company::find(auth()->user()->company_id);
        $branch  = Branch::find(Auth::user()->branch_id)->name;

        $daterange = $request['enddate'];

        return view('reports.newreports.due-list-print', compact('data', 'company', 'daterange', 'branch'));
    }

    public function dueList(Request $request)
    {
        $duelist = $this->dueListData($request);
        return DataTables::of($duelist)
            ->editColumn('ledger_page', function ($duelist) {
                if ($duelist->ledger_page == null) {
                    return '';
                } else {
                    return $duelist->ledger_page;
                }
            })
            ->addIndexColumn()
            ->editColumn('debit', function ($duelist) {
                return $duelist->debit;
            })
            ->editColumn('credit', function ($duelist) {
                return $duelist->credit;
            })
            ->toJson();
    }

    public function apiDueList(Request $request)
    {
        $duelist = $this->dueListData($request);
        if (!$duelist->isEmpty()) {
            return foundData($duelist);
        }
        return notFound();
    }
    private function dueListData(Request $request)
    {
        $branch_id = $request->branch_id;
        if (request()->is('api/*')) {
            $endDate =  $request->enddate;
        } else {
            $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->enddate)));
        }

        $subQuery = DB::table('acc_transaction_details as atd')
            ->select([
                'atd.coa4_id',
                'cpi.id as customer_id',
                'cpi.mobile',
                'cpi.manual_address',
                'cpi.area_id',
                DB::raw('CASE WHEN cpi.idfr_code <> "" THEN CONCAT(cpi.name, " (", cpi.idfr_code, ")") ELSE cpi.name END as coa4_name'),
                DB::raw('CASE WHEN SUM(atd.debit) - SUM(atd.credit) > 0 THEN SUM(atd.debit) - SUM(atd.credit) ELSE 0 END as debit'),
                DB::raw('CASE WHEN SUM(atd.credit) - SUM(atd.debit) > 0 THEN SUM(atd.credit) - SUM(atd.debit) ELSE 0 END as credit')
            ])
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('cust_party_infos as cpi', 'cpi.coa4_id', '=', 'atd.coa4_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branch_id)
            ->where('mtm.vr_date', '<=', $endDate)
            ->groupBy('atd.coa4_id', 'cpi.id', 'cpi.name', 'cpi.manual_address', 'cpi.idfr_code', 'cpi.mobile', 'cpi.area_id');

        $results = DB::table(DB::raw('(' . $subQuery->toSql() . ') as a'))
            ->mergeBindings($subQuery)
            ->select([
                'a.coa4_id',
                'ledger.ledger_page',
                DB::raw('REPLACE(a.coa4_name, "A/R", "") as coa4_name'),
                'a.manual_address',
                'a.area_id',
                DB::raw('CASE WHEN a.mobile <> "" OR a.mobile IS NOT NULL THEN a.mobile ELSE "" END as mobile'),
                'a.debit',
                'a.credit'
            ])
            ->leftJoin(DB::raw('(SELECT party_id, ledger_page FROM cust_party_ledger WHERE branch_id = ' . $branch_id . ') as ledger'), 'ledger.party_id', '=', 'a.customer_id')
            ->where('a.coa4_id', '<>', 17)
            ->where(function ($query) {
                $query->where('a.debit', '>', 0)
                    ->orWhere('a.credit', '>', 0);
            })
            ->orderBy('a.area_id')
            ->orderBy('a.coa4_name')
            ->get();

        if (request()->is('api/*')) {
            if ($results) {
                $cumulativeDebit  = 0;
                $cumulativeCredit = 0;
                $slNumber         = 0;

                // Use map to add fields to each record while preserving stdClass objects
                $results->map(function ($record) use (&$cumulativeDebit, &$cumulativeCredit, &$slNumber) {
                    // Convert debit and credit to integers for calculation
                    $debit = (int) $record->debit;
                    $credit = (int) $record->credit;

                    // Update cumulative totals
                    $slNumber         += 1;
                    $cumulativeDebit  += $debit;
                    $cumulativeCredit += $credit;

                    // Add new properties directly to the stdClass object
                    $record->sl_number         = $slNumber;
                    $record->cumulative_debit  = $cumulativeDebit;
                    $record->cumulative_credit = $cumulativeCredit;
                });
                $results->push([
                    'sl_number'         => '',
                    'coa4_id'           => null,
                    'ledger_page'       => '',
                    'coa4_name'         => 'Total',
                    'area_id'           => '',
                    'mobile'            => '',
                    'debit'             => $cumulativeDebit,
                    'credit'            => $cumulativeCredit,
                    'cumulative_debit'  => $cumulativeDebit,
                    'cumulative_credit' => $cumulativeCredit,
                ]);
            }
            return foundData($results);
        }
        return  $results;
    }

    public function apiCustomerSupplierStatement(Request $request)
    {
        $branchId = (int) ($request->branch_id ?? 0);
        $partyCoa4Id = (int) ($request->party_id ?? $request->ledger_id ?? 0);
        $startDate = $request->start_date ?? $request->startdate;
        $endDate = $request->end_date ?? $request->enddate;

        if (!$branchId || !$partyCoa4Id || !$startDate || !$endDate) {
            return notFound('Branch, party and date range are required.');
        }

        $user = auth()->user();

        $party = PartyInfo::query()
            ->with([
                'ledger' => fn($query) => $query->where('branch_id', $branchId),
            ])
            ->where('company_id', $user->company_id)
            ->where('coa4_id', $partyCoa4Id)
            ->first();

        if (!$party) {
            return notFound('Customer / supplier not found.');
        }

        $openingBalance = $this->ledgerWithProductOpeningBalance(
            $branchId,
            $partyCoa4Id,
            $startDate
        );

        $transactions = MainTransactionMaster::with([
            'salesMaster.details.product.unit',
            'salesMaster.details.product.category',
            'purchaseMaster.details.product.unit',
            'purchaseMaster.details.product.category',
            'accTransactionMaster.accTransactionDetails.coaL4',
        ])
            ->where('company_id', $user->company_id)
            ->where('branch_id', $branchId)
            ->where('status', 1)
            ->whereBetween('vr_date', [$startDate, $endDate])
            ->whereHas('accTransactionMaster.accTransactionDetails', function ($query) use ($partyCoa4Id) {
                $query->where('coa4_id', $partyCoa4Id);
            })
            ->orderBy('vr_date')
            ->orderBy('id')
            ->get();

        $runningBalance = (float) $openingBalance;
        $slNumber = 1;

        $rows = collect();

        $rows->push([
            'sl_number' => '',
            'vr_date' => us_to_bd_date($startDate),
            'vr_no' => 'Opening',
            'trx_type' => 'Opening',
            'product_name' => '',
            'truck_no' => '',
            'quantity' => 0,
            'rate' => 0,
            'total' => 0,
            'received' => 0,
            'payment' => 0,
            'debit' => 0,
            'credit' => 0,
            'balance' => $runningBalance,
            'remarks' => 'Opening Balance',
            'party_name' => $party->name,
        ]);

        foreach ($transactions as $transaction) {
            $transactionDetails = collect($transaction->accTransactionMaster ?? [])
                ->flatMap(function ($master) {
                    return collect($master->accTransactionDetails ?? $master->AccTransactionDetails ?? []);
                })
                ->values();

            $partyEntries = $transactionDetails
                ->filter(function ($detail) use ($partyCoa4Id) {
                    return (int) ($detail->coa4_id ?? 0) === $partyCoa4Id;
                })
                ->values();

            if ($partyEntries->isEmpty()) {
                continue;
            }

            $cashEntries = $transactionDetails
                ->filter(function ($detail) {
                    return (int) ($detail->coa4_id ?? 0) === 17;
                })
                ->values();

            $oppositeEntries = $transactionDetails
                ->filter(function ($detail) {
                    return (int) ($detail->coa4_id ?? 0) !== 17;
                })
                ->values();

            $debit = round((float) $partyEntries->sum(fn($detail) => (float) ($detail->debit ?? 0)), 2);
            $credit = round((float) $partyEntries->sum(fn($detail) => (float) ($detail->credit ?? 0)), 2);
            $received = round((float) $cashEntries->sum(fn($detail) => (float) ($detail->debit ?? 0)), 2);
            $payment = round((float) $cashEntries->sum(fn($detail) => (float) ($detail->credit ?? 0)), 2);
            $runningBalance += $debit - $credit;

            $meta = $this->customerSupplierStatementMeta($transaction);
            $remarks = trim(
                (string) (
                    $oppositeEntries
                        ->pluck('remarks')
                        ->map(fn($remark) => trim((string) $remark))
                        ->filter()
                        ->unique()
                        ->implode(' | ')
                    ?: ($meta['remarks'] ?? '')
                )
            );
            $oppositePartyName = $oppositeEntries
                ->map(fn($detail) => trim((string) data_get($detail, 'coaL4.name', '')))
                ->filter()
                ->unique()
                ->implode(', ');
            $vrDate = $transaction->vr_date ? us_to_bd_date($transaction->vr_date) : '';

            $rows->push([
                'sl_number' => $slNumber++,
                'mtmid' => $transaction->id,
                'vr_date' => $vrDate,
                'vr_no' => $transaction->vr_no,
                'trx_type' => $meta['trx_type'],
                'product_name' => $meta['product_name'],
                'truck_no' => $meta['truck_no'],
                'quantity' => $meta['quantity'],
                'rate' => $meta['rate'],
                'total' => $meta['total'],
                'received' => $received,
                'payment' => $payment,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $runningBalance,
                'remarks' => $remarks,
                'party_name' => $oppositePartyName ?: $party->name,
            ]);
        }

        return foundData([
            'party' => [
                'id' => $party->id,
                'coa4_id' => $party->coa4_id,
                'name' => $party->name,
                'idfr_code' => $party->idfr_code,
                'mobile' => $party->mobile,
                'manual_address' => $party->manual_address,
                'ledger_page' => optional($party->ledger)->ledger_page,
                'party_type_id' => $party->party_type_id,
            ],
            'summary' => [
                'opening_balance' => $openingBalance,
                'total_received' => (float) $rows->sum('received'),
                'total_payment' => (float) $rows->sum('payment'),
                'closing_balance' => $runningBalance,
                'total_rows' => max($rows->count() - 1, 0),
            ],
            'rows' => $rows->values(),
        ]);
    }

    private function ledgerWithProductOpeningBalance(int $branchId, int $partyCoa4Id, string $startDate): float
    {
        $opening = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->where('mtm.vr_date', '<', $startDate)
            ->where('atd.coa4_id', $partyCoa4Id)
            ->selectRaw('COALESCE(SUM(atd.debit), 0) - COALESCE(SUM(atd.credit), 0) as opening_balance')
            ->value('opening_balance');

        return round((float) $opening, 2);
    }

    private function customerSupplierStatementMeta(MainTransactionMaster $transaction): array
    {
        $salesMaster = $transaction->salesMaster;
        if ($salesMaster) {
            $details = collect($salesMaster->details ?? []);
            $quantity = (float) $details->sum(fn($detail) => (float) ($detail->quantity ?? 0));
            $rate = (float) ($details->count() === 1 ? ($details->first()->sales_price ?? 0) : 0);
            $products = $details
                ->map(fn($detail) => trim((string) data_get($detail, 'product.name', '')))
                ->filter()
                ->unique()
                ->implode(', ');

            return [
                'trx_type' => 'Sales',
                'product_name' => $products,
                'truck_no' => $salesMaster->vehicle_no ?? '',
                'quantity' => $quantity,
                'rate' => $rate,
                'total' => (float) ($salesMaster->total ?? ($quantity * $rate)),
                'remarks' => $salesMaster->notes ?? '',
            ];
        }

        $purchaseMaster = $transaction->purchaseMaster;
        if ($purchaseMaster) {
            $details = collect($purchaseMaster->details ?? []);
            $quantity = (float) $details->sum(fn($detail) => (float) ($detail->quantity ?? 0));
            $rate = (float) ($details->count() === 1 ? ($details->first()->purchase_price ?? 0) : 0);
            $products = $details
                ->map(fn($detail) => trim((string) data_get($detail, 'product.name', '')))
                ->filter()
                ->unique()
                ->implode(', ');

            return [
                'trx_type' => 'Purchase',
                'product_name' => $products,
                'truck_no' => $purchaseMaster->vehicle_no ?? '',
                'quantity' => $quantity,
                'rate' => $rate,
                'total' => (float) $details->sum(function ($detail) {
                    return (float) ($detail->quantity ?? 0) * (float) ($detail->purchase_price ?? 0);
                }),
                'remarks' => $purchaseMaster->notes ?? '',
            ];
        }

        return [
            'trx_type' => 'Transaction',
            'product_name' => '',
            'truck_no' => '',
            'quantity' => 0,
            'rate' => 0,
            'total' => 0,
            'remarks' => '',
        ];
    }

    public function connectedMember()
    {
        $projects            = Branch::all();
        $trdate              = Common::getShowTrDate(Auth::user()->branch_id);
        $firstDayForTheMonth = date('Y-m-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth    = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.connected-member', compact('projects', 'trdate', 'firstDateOfMonth'));
    }

    public function connectedMemberPrint(Request $request)
    {

        $branch_id = $request->branch_id;
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->startdate)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->enddate)));
        $datas     = $this->connectedMemberSQL($branch_id, $startDate, $endDate);

        $data = [];
        foreach ($datas as $d) {
            $data[$d->emp_name_eng][] = $d;
        }

        $company = Company::find(auth()->user()->company_id);
        $branch  = Branch::find(Auth::user()->branch_id)->name;

        $daterange = [
            'satartdate'    => date('d/m/Y', strtotime($startDate)),
            'enddate'    => date('d/m/Y', strtotime($endDate)),

        ];

        return view('reports.newreports.connected-member-print', compact('data', 'company', 'daterange', 'branch'));
    }

    public function connectedMemberData(Request $request)
    {
        $branch_id = $request->branch_id;
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->startdate)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->enddate)));

        $data = $this->connectedMemberSQL($branch_id, $startDate, $endDate);

        $table = [];
        foreach ($data as $d) {
            $table[$d->emp_name_eng][] = $d;
        }
        return $table;
    }

    public function connectedMemberSQL($branch_id, $startDate, $endDate)
    {

        // First subquery for connected_member and collection
        $connectedMemberQuery = DB::table('acc_transaction_details as atd')
            ->selectRaw('atd.coa4_id, SUM(atd.debit) AS debit, SUM(atd.credit) AS credit')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branch_id)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->whereRaw('SUBSTRING(mtm.vr_no, 1, 1) <> 3')
            ->where('atd.coa4_id', '<>', 17)
            ->where('mtm.status', 1)
            ->whereNotIn('mtm.transaction_type', [2, 3, 5])
            ->groupBy('atd.coa4_id');

        // Main subquery 'y' with grouping and aliases
        $subqueryY = DB::table('cust_addr_areas as caa')
            ->selectRaw('caa.id AS area_code, caa.name AS area_name_eng, caa.bangla AS area_name_bng,
             he.id AS emp_id, he.name AS emp_name_eng, he.bangla AS emp_name_bng,
             COUNT(a.coa4_id) AS connected_member, SUM(a.credit) AS collection')
            ->join('cust_party_infos as cpi', 'cpi.area_id', '=', 'caa.id')
            ->joinSub($connectedMemberQuery, 'a', function ($join) {
                $join->on('a.coa4_id', '=', 'cpi.coa4_id');
            })
            ->join('hrm_employees as he', 'he.id', '=', 'caa.asign_officer')
            ->groupBy('caa.id', 'caa.name', 'caa.bangla', 'he.id', 'he.name', 'he.bangla')
            ->orderBy('he.name')
            ->orderBy('caa.name');

        // Second subquery for outstanding and downpayment calculations
        $outStandingQuery = DB::table('acc_transaction_details as atd')
            ->selectRaw('atd.coa4_id,
             CASE WHEN SUM(atd.debit) - SUM(atd.credit) > 0 THEN SUM(atd.debit) - SUM(atd.credit) ELSE 0 END AS debit,
             CASE WHEN SUM(atd.credit) - SUM(atd.debit) > 0 THEN SUM(atd.credit) - SUM(atd.debit) ELSE 0 END AS credit')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branch_id)
            ->where('mtm.vr_date', '<=', $endDate)
            ->groupBy('atd.coa4_id');

        // Downpayment subquery
        $downpaymentQuery = DB::table('acc_transaction_details as atd')
            ->selectRaw('atd.coa4_id, SUM(atd.credit) AS downpayment')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branch_id)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->whereRaw('SUBSTRING(mtm.vr_no, 1, 1) = 3')
            ->where('atd.coa4_id', '<>', 17)
            ->where('mtm.status', 1)
            ->where('mtm.transaction_type', '<>', 5)
            ->groupBy('atd.coa4_id');

        // Subquery 'z' with group and order clauses
        $subqueryZ = DB::table('cust_addr_areas as caa')
            ->selectRaw('caa.id AS area_code, caa.name AS area_name_eng, caa.bangla AS area_name_bng,
             he.id AS emp_id, he.name AS emp_name_eng, he.bangla AS emp_name_bng,
             COUNT(a.coa4_id) AS gt_member, SUM(a.debit) AS out_standing,
             SUM(sales.downpayment) AS downpayment')
            ->join('cust_party_infos as cpi', 'cpi.area_id', '=', 'caa.id')
            ->rightJoinSub($outStandingQuery, 'a', function ($join) {
                $join->on('a.coa4_id', '=', 'cpi.coa4_id');
            })
            ->leftJoinSub($downpaymentQuery, 'sales', function ($join) {
                $join->on('a.coa4_id', '=', 'sales.coa4_id');
            })
            ->join('hrm_employees as he', 'he.id', '=', 'caa.asign_officer')
            ->whereRaw('(a.debit > 0 OR a.credit > 0)')
            ->where('a.coa4_id', '<>', 17)
            ->where('a.debit', '>', 0)
            ->groupBy('caa.id', 'caa.name', 'caa.bangla', 'he.id', 'he.name', 'he.bangla')
            ->orderBy('caa.id');

        // Final join of subquery 'y' and 'z'
        $data = DB::table(DB::raw("({$subqueryY->toSql()}) as y"))
            ->rightJoin(DB::raw("({$subqueryZ->toSql()}) as z"), 'y.area_code', '=', 'z.area_code')
            ->selectRaw('z.area_code, z.area_name_eng, z.area_name_bng,
             COALESCE(y.connected_member, 0) AS connected_member,
             COALESCE(y.collection, 0) AS collection,
             z.downpayment, z.gt_member, z.out_standing,
             z.emp_id, z.emp_name_eng, z.emp_name_bng')
            ->orderBy('z.emp_id')
            ->orderBy('z.area_name_eng')
            ->mergeBindings($subqueryY)
            ->mergeBindings($subqueryZ)
            ->get();

        return $data;
    }

    public function printCashBook(Request $request)
    {
        $user     = auth()->user();
        $branchId  = $request->branch_id;
        $startDate = date("Y-m-d", strtotime(str_replace('/', '-', $request->startdate)));
        $endDate   = date("Y-m-d", strtotime(str_replace('/', '-', $request->enddate)));
        $printdate = ['startdate' => $request->startdate, 'enddate' => $request->enddate];
        $project   = Branch::where('id', $request->branch_id)->where('company_id', $user->company_id)->first();
        $company   = Company::find($user->company_id);

        $cashBookData = $this->cashBookQuery($branchId, $startDate, $endDate);
        return view('reports.newreports.cash-book-print', compact('cashBookData', 'company', 'project', 'printdate'));
    }

    private function cashBookQuery($branch_id, $startDate, $endDate)
    {
        $cashBookData = DB::select("CALL cash_Book(?,?,?)", array($branch_id, $startDate, $endDate));
        $newData = [];
        foreach ($cashBookData as $data) {
            $data->url_data = the_hash($data->mtm_id) . '/' . the_hash($data->vr_no);
            $newData[] = $data;
        }
        return $newData;
    }

    public function trialbalance()
    {

        $projects = reportsProjects();
        return view('reports.newreports.trialbalance', compact('projects'));
    }

    public function trialbalanceData(Request $request)
    {
        $data       = $request->all();
        $branchId   = $data['branch_id'];
        $startDate  = date('Y-m-d', strtotime(str_replace('/', '-', $data['start_date'])));
        $endDate    = date('Y-m-d', strtotime(str_replace('/', '-', $data['end_date'])));
        //$trialbance = DB::select("CALL TrialBalanceL_4(?,?,?)", array($branchId, $startDate, $endDate));
        $trialbance = $this->trialBalanceL_4_data($branchId, $startDate, $endDate);
        return $trialbance;
    }

    private function trialBalanceL_4_data($branchId, $startDate, $endDate)
    {

        $user = auth()->user();

        $baseQuery = DB::table('acc_transaction_details as atd')
            ->join('acc_coa_level4s as ac4', 'ac4.id', '=', 'atd.coa4_id')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', $user->company_id)
            ->where('mtm.branch_id', $branchId);

        $openingRows = (clone $baseQuery)
            ->where('mtm.vr_date', '<', $startDate)
            ->groupBy('atd.coa4_id', 'ac4.NAME', 'ac4.acc_coa_level3_id')
            ->select(
                'atd.coa4_id',
                'ac4.NAME',
                'ac4.acc_coa_level3_id',
                DB::raw('SUM(atd.debit) as debit'),
                DB::raw('SUM(atd.credit) as credit')
            )
            ->get()
            ->keyBy('coa4_id');

        $movementRows = (clone $baseQuery)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('atd.coa4_id', 'ac4.NAME', 'ac4.acc_coa_level3_id')
            ->select(
                'atd.coa4_id',
                'ac4.NAME',
                'ac4.acc_coa_level3_id',
                DB::raw('SUM(atd.debit) as debit'),
                DB::raw('SUM(atd.credit) as credit')
            )
            ->get()
            ->keyBy('coa4_id');

        $ids = $openingRows->keys()->merge($movementRows->keys())->unique()->values();
        $serial = 1;
        return $ids->map(function ($id) use ($openingRows, $movementRows, &$serial) {
            $serial++;
            $opening  = $openingRows->get($id);
            $movement = $movementRows->get($id);

            $name          = $opening->NAME ?? $movement->NAME ?? '';
            $openingDebit  = (float) ($opening->debit ?? 0);
            $openingCredit = (float) ($opening->credit ?? 0);
            $movementDebit = (float) ($movement->debit ?? 0);
            $movementCredit = (float) ($movement->credit ?? 0);

            $openingDiff  = $openingDebit - $openingCredit;
            $movementDiff = $movementDebit - $movementCredit;
            $closingDiff  = ($openingDebit + $movementDebit) - ($openingCredit + $movementCredit);

            return (object) [
                'serial'              => $serial,
                'coa4_id'             => (int) $id,
                'coa3_id'             => (int) ($opening->acc_coa_level3_id ?? $movement->acc_coa_level3_id ?? 0),
                'NAME'                => $name,
                'opening_debit_bal'   => $openingDiff > 0 ? $openingDiff : 0,
                'opening_credit_bal'  => $openingDiff < 0 ? abs($openingDiff) : 0,
                'movement_debit_bal'  => $movementDiff > 0 ? $movementDiff : 0,
                'movement_credit_bal' => $movementDiff < 0 ? abs($movementDiff) : 0,
                'debit_bal'           => $closingDiff > 0 ? $closingDiff : 0,
                'credit_bal'          => $closingDiff < 0 ? abs($closingDiff) : 0,
            ];
        })->sortBy('NAME')->values();
    }

    public function bankBook()
    {
        if (!auth()->user()->can('bankbook.view')) {
            return view('errors.403');
        }
        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        return view('reports.newreports.bank-book', compact('projects', 'trdate'));
    }

    public function bankBookData(Request $request)
    {
        $data         = $request->all();
        $branchId     = $data['branch_id'];
        $startDate    = date('Y-m-d', strtotime(str_replace('/', '-', $data['start_date'])));
        $endDate      = date('Y-m-d', strtotime(str_replace('/', '-', $data['end_date'])));
        $bankBookData = DB::select("CALL bank_Book(?,?,?)", array($branchId, $startDate, $endDate));

        return $bankBookData;
    }

    public function trialBalance_L3()
    {

        $projects = reportsProjects();

        return view('reports.newreports.trialbalance-l3', compact('projects'));
    }

    public function trialBalance_L3Data(Request $request)
    {
        $data         = $request->all();
        $branchId     = $data['branch_id'];
        $startDate    = date('Y-m-d', strtotime(str_replace('/', '-', $data['start_date'])));
        $endDate      = date('Y-m-d', strtotime(str_replace('/', '-', $data['end_date'])));
        $level4Rows = collect($this->trialBalanceL_4_data($branchId, $startDate, $endDate));
        $coa3Names = CoaLevel3::pluck('name', 'id');

        $result = $level4Rows
            ->groupBy(function ($row) {
                return (int) ($row->coa3_id ?? 0);
            })
            ->map(function ($group, $coa3Id) use ($coa3Names) {
                $id = (int) $coa3Id;
                $openingDiff = (float) $group->sum('opening_debit_bal') - (float) $group->sum('opening_credit_bal');
                $movementDiff = (float) $group->sum('movement_debit_bal') - (float) $group->sum('movement_credit_bal');
                $closingDiff = (float) $group->sum('debit_bal') - (float) $group->sum('credit_bal');

                return (object) [
                    'id'                  => $id,
                    'coal3_name'          => $coa3Names[$id] ?? 'Unmapped Level 4',
                    'opening_debit_bal'   => $openingDiff > 0 ? $openingDiff : 0,
                    'opening_credit_bal'  => $openingDiff < 0 ? abs($openingDiff) : 0,
                    'movement_debit_bal'  => $movementDiff > 0 ? $movementDiff : 0,
                    'movement_credit_bal' => $movementDiff < 0 ? abs($movementDiff) : 0,
                    'debit_bal'           => $closingDiff > 0 ? $closingDiff : 0,
                    'credit_bal'          => $closingDiff < 0 ? abs($closingDiff) : 0,
                ];
            })
            ->sortBy('coal3_name')
            ->values();

        $serial = 1;

        return $result->map(function ($row) use (&$serial) {
            $row->serial = $serial++;
            return $row;
        })->values();
    }

    public function trialBalance_L3DataItems(Request $request)
    {

        $data               = $request->all();
        $branchId           = $data['branch_id'];
        $ledgerId           = $data['ledger_id'];
        $startDate          = date('Y-m-d', strtotime(str_replace('/', '-', $data['start_date'])));
        $endDate            = date('Y-m-d', strtotime(str_replace('/', '-', $data['end_date'])));
        //$trialbalance4Items = DB::select("CALL TrialBalanceL3_Items(?,?,?,?)", array($branchId, $ledgerId, $startDate, $endDate));
        $trialbalance4Items = $this->trialBalance_L4DataItems($branchId, $ledgerId, $startDate, $endDate);

        $coal3name = CoaLevel3::find($ledgerId)->name;
        $data      = [$trialbalance4Items, $coal3name];

        return $data;
    }

    public function trialBalance_L4DataItems($branchId, $ledgerId, $startDate, $endDate)
    {
        $baseQuery = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as acl4', 'atd.coa4_id', '=', 'acl4.id')
            ->where('acl4.acc_coa_level3_id', $ledgerId)
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId);

        $openingRows = (clone $baseQuery)
            ->where('mtm.vr_date', '<', $startDate)
            ->groupBy('atd.coa4_id', 'acl4.NAME')
            ->select('atd.coa4_id', 'acl4.NAME as NAME', DB::raw('SUM(atd.debit) as debit'), DB::raw('SUM(atd.credit) as credit'))
            ->get()
            ->keyBy('coa4_id');

        $movementRows = (clone $baseQuery)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('atd.coa4_id', 'acl4.NAME')
            ->select('atd.coa4_id', 'acl4.NAME as NAME', DB::raw('SUM(atd.debit) as debit'), DB::raw('SUM(atd.credit) as credit'))
            ->get()
            ->keyBy('coa4_id');

        $ids = $openingRows->keys()->merge($movementRows->keys())->unique()->values();

        return $ids->map(function ($id) use ($openingRows, $movementRows) {
            $opening  = $openingRows->get($id);
            $movement = $movementRows->get($id);

            $name          = $opening->NAME ?? $movement->NAME ?? '';
            $openingDebit  = (float) ($opening->debit ?? 0);
            $openingCredit = (float) ($opening->credit ?? 0);
            $movementDebit = (float) ($movement->debit ?? 0);
            $movementCredit = (float) ($movement->credit ?? 0);

            $openingDiff  = $openingDebit - $openingCredit;
            $movementDiff = $movementDebit - $movementCredit;
            $closingDiff  = ($openingDebit + $movementDebit) - ($openingCredit + $movementCredit);

            return (object) [
                'coa4_id'             => (int) $id,
                'NAME'                => $name,
                'opening_debit_bal'   => $openingDiff > 0 ? $openingDiff : 0,
                'opening_credit_bal'  => $openingDiff < 0 ? abs($openingDiff) : 0,
                'movement_debit_bal'  => $movementDiff > 0 ? $movementDiff : 0,
                'movement_credit_bal' => $movementDiff < 0 ? abs($movementDiff) : 0,
                'debit_bal'           => $closingDiff > 0 ? $closingDiff : 0,
                'credit_bal'          => $closingDiff < 0 ? abs($closingDiff) : 0,
            ];
        })->sortBy('NAME')->values();
    }


    public function dateWiseTotal()
    {
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        $firstDayForTheMonth = date('Y-m-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));
        return view('reports.newreports.datewisetotal', compact('projects', 'trdate', 'firstDateOfMonth'));
    }

    public function dateWiseTotalData(Request $request)
    {

        $branchId = $request->branch_id;
        if (request()->is('api/*')) {
            $startDate = $request->start_date;
            $endDate = $request->end_date;
        } else {
            $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
            $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));
            $range = '(' . us_to_bd_date($startDate) . ' to ' . us_to_bd_date($endDate) . ')';
        }

        $openingBalanceType1Query = MainTransactionMaster::openingBalanceType1($branchId, $startDate);
        $openingBalanceType2Query = MainTransactionMaster::openingBalanceType2($branchId, $startDate);
        $transactionType1Query = MainTransactionMaster::transactionDetailsType1($branchId, $startDate, $endDate);
        $transactionType2Query = MainTransactionMaster::transactionDetailsType2($branchId, $startDate, $endDate);

        $data = DB::table(DB::raw("({$openingBalanceType1Query->toSql()} UNION {$openingBalanceType2Query->toSql()} UNION {$transactionType1Query->toSql()} UNION {$transactionType2Query->toSql()}) as details"))
            ->mergeBindings($openingBalanceType1Query->getQuery())
            ->mergeBindings($openingBalanceType2Query->getQuery())
            ->mergeBindings($transactionType1Query->getQuery())
            ->mergeBindings($transactionType2Query->getQuery())
            ->select('vr_date', DB::raw('CAST(SUM(debit) AS SIGNED) as debit'), DB::raw('CAST(SUM(credit) AS SIGNED) as credit'))
            ->groupBy('vr_date')
            ->orderBy('vr_date')
            ->get();

        // return $data;
        if (request()->is('api/*')) {
            if (!$data) {
                return notFound();
            }

            $cumulativeDebit  = 0;
            $cumulativeCredit = 0;
            $slNumber         = 0;

            $rangeDebitTotal  = 0;
            $rangeCreditTotal = 0;

            // Use map to add fields to each record while preserving stdClass objects
            $processedData = $data->map(function ($record) use (&$cumulativeDebit, &$cumulativeCredit, &$slNumber, &$rangeDebitTotal, &$rangeCreditTotal) {
                // Convert debit and credit to integers for calculation
                $debit = (int) $record->debit;
                $credit = (int) $record->credit;

                // Update cumulative totals
                $cumulativeDebit  += $debit;
                $cumulativeCredit += $credit;

                if ($slNumber > 0) {  // Checks if it's the first row by slNumber count
                    $rangeDebitTotal  += $debit;
                    $rangeCreditTotal += $credit;
                }


                // Add new properties directly to the stdClass object
                $record->sl_number         = $slNumber > 0 ? $slNumber : '-';
                $slNumber++;
                $record->vr_date  = $record->vr_date != "" ? us_to_bd_date($record->vr_date) : "Opening"; //$record->vr_date;
                $record->cumulative_debit  = $cumulativeDebit;
                $record->cumulative_credit = $cumulativeCredit;
                $record->balance           = $cumulativeDebit - $cumulativeCredit;
            });
            $data->push([
                'sl_number'         => '',
                'vr_date'           => 'Range Total',
                'debit'             => $rangeDebitTotal,
                'credit'            => $rangeCreditTotal,
                'cumulative_debit'  => '0',
                'cumulative_credit' => '0',
                'balance'           => '',
            ]);

            return foundData($data);
        }
        return view('reports.newreports.templates.reports-templates.date-wise-total-template', compact('data', 'range'));
    }


    public function somityBalance()
    {
        return view('reports.somity.somity-balance');
    }

    public function somityBalanceData(Request $request)
    {

        $branchId = Auth::user()->branch_id;
        $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['datepicker'])));

        $somityBalance = Area::select(
            'cust_addr_areas.id',
            'cust_addr_areas.name as somity',
            'cust_addr_areas.bangla',
            'cust_addr_areas.somity_id',
            DB::raw('COUNT(cust_party_infos.id) as members'),
            DB::raw("CASE WHEN (SUM(datas.debit) - SUM(datas.credit) > 0) THEN (SUM(datas.debit) - SUM(datas.credit)) ELSE 0 END as debit_bal"),
            DB::raw("CASE WHEN (SUM(datas.credit) - SUM(datas.debit) > 0) THEN (SUM(datas.credit) - SUM(datas.debit)) ELSE 0 END as credit_bal")
        )
            ->join('cust_party_infos', 'cust_addr_areas.id', '=', 'cust_party_infos.area_id')
            ->joinSub(function ($query) use ($branchId, $endDate) {
                $query->from('acc_transaction_details as atd')
                    ->select('atd.coa4_id', DB::raw('SUM(atd.debit) as debit'), DB::raw('SUM(atd.credit) as credit'))
                    ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
                    ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
                    ->where('mtm.status', 1)
                    ->where('mtm.company_id', auth()->user()->company_id)
                    ->where('mtm.branch_id', $branchId)
                    ->where('mtm.vr_date', '<=', $endDate)
                    ->groupBy('atd.coa4_id');
            }, 'datas', 'datas.coa4_id', '=', 'cust_party_infos.coa4_id')
            ->groupBy('cust_addr_areas.id', 'cust_addr_areas.name', 'cust_addr_areas.bangla', 'cust_addr_areas.somity_id')
            ->orderBy('cust_addr_areas.id')
            ->get();

        return view('reports.templates.area-wise-balance', compact('somityBalance'));
    }

    public function cashBankReceivedPayment()
    {
        $projects =  reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        return view('reports.newreports.cash_bank_received_payment', compact('projects', 'trdate'));
    }

    public function cashBankRcvPmtPrnt()
    {
        $uri     = $_SERVER['REQUEST_URI'];
        $urlData = explode('/', $uri);

        $branch_id  = $urlData[3];
        $start_date = date('Y-m-d', (int) ($urlData[4] / 1000));
        $end_date   = date('Y-m-d', (int) ($urlData[5] / 1000));

        $cashBookData = DB::select("CALL cash_bank_received_payment(?, ?, ?)", array($branch_id, $start_date, $end_date));

        $project   = Branch::find($branch_id);
        $company   = Company::find(auth()->user()->company_id);
        $printdate = ['startdate' => date('d/m/Y', (int) ($urlData[4] / 1000)), 'enddate' => date('d/m/Y', (int) ($urlData[5] / 1000))];
        return view('reports.newreports.cash-bank-received-payment-print', compact('cashBookData', 'company', 'project', 'printdate'));
    }

    public function cashBankReceivedPaymentData(Request $request)
    {
        $data      = $request->all();
        $branchId  = $data['branch_id'];
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $data['start_date'])));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $data['end_date'])));

        $data = DB::select("CALL cash_bank_received_payment(?,?,?)", array($branchId, $startDate, $endDate));

        return $data;
    }

    public function purchaseLedger()
    {
        if (!auth()->user()->can('purchase.ledger.view')) {
            return view('errors.403');
        }
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        $branchs = Branch::active()->get();
        return view('reports.newreports.purchase_ledger', compact('trdate', 'branchs'));
    }

    public function printPurchaseLedger(Request $request)
    {

        if (!auth()->user()->can('purchase.ledger.print')) {
            return view('errors.403');
        }
        $print = 1;
        $data      = request()->is('api/*') ? $this->purchaseLedgerData($request, $print) : $this->purchaseLedgerDataWeb($request, $print);
        $id        = $request->ledger_id;
        $coal4s    = CoaLevel4::where('id', $id)->first();
        $company   = Company::find(auth()->user()->company_id);
        $daterange = $request['startdate'] . ' - ' . $request['enddate'];

        return view('reports.newreports.purchase-ledger-print', compact('data', 'company', 'coal4s', 'daterange'));
    }

    public function purchaseLedgerData(Request $request, $print = 0)
    {

        $branchId  = $request['branch_id'] ? $request['branch_id'] : '';
        $ledgerId  = $request['ledger_id'] ? $request['ledger_id'] : '';
        $item_id   = $request['item_id'] ? $request['item_id'] : '';

        if (request()->is('api/*')) {
            $startDate = $request->startdate;
            $endDate =  $request->enddate;
        } else {
            $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));
            $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));
        }

        $data = MainTransactionMaster::with([
            'purchaseMaster.details' => fn($q) =>
            $q->when(
                $item_id && $item_id !== 'null',
                fn($q2) => $q2->where('product_id', $item_id)
            )->with(['product.unit', 'product.category']),
            'accTransactionMaster.accTransactionDetails.coaL4'
        ])
            ->where('main_trx_master.status', '=', 1)
            ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', auth()->user()->company_id)
            ->when($branchId, fn($q) => $q->where('main_trx_master.branch_id', $branchId))
            ->when(
                $ledgerId && $ledgerId !== 'null',
                fn($q) =>
                $q->whereHas(
                    'purchaseMaster',
                    fn($q2) =>
                    $q2->where('supplier_id', $ledgerId)
                )
            )
            ->when(
                $item_id && $item_id !== 'null',
                fn($q) => $q->whereHas(
                    'purchaseMaster.details',
                    fn($q2) =>
                    $q2->where('product_id', $item_id)
                )
            )
            ->where('vr_no', 'like', '4-%')
            ->orderBy('id', 'asc')
            ->get();




        if ($data->isNotEmpty()) {
            $slNumber = 0;
            $totalQty = 0;
            $totalAmount = 0;

            $data->map(function ($record) use (&$slNumber, &$totalQty, &$totalAmount) {

                // Access the first purchasedetail correctly (it may return a collection)
                // $detail = $record->purchaseMaster?->details->first();

                // If details exist, process them
                // if ($detail) {
                // return $detail; // This line is not needed, it was just for debugging
                // $quantity = is_numeric($detail->quantity) ? (float)$detail->quantity : 0;
                // $rate     = is_numeric($detail->purchase_price) ? (float)$detail->purchase_price : 0;

                // Expose flat fields
                $record->smtm_id      = $record->id;
                $record->branch_name  = $record->branch?->name;
                unset($record->branch); // Remove full branch object
                $record->challan_no   = $record->vr_no;
                $record->challan_date = us_to_bd_date($record->vr_date);
                $record->voucher_image = $record->voucher_image;

                // $record->product_name = $detail->product?->name;
                // $record->unit         = $detail->product?->unit?->name;
                // $record->rate         = $rate;
                // $record->quantity     = number_format($quantity, 2);

                // Calculate totals
                // $record->total        = $quantity * $rate;

                // Increment counters
                $slNumber            += 1;
                $record->sl_number    = $slNumber;
                // $record->    = $slNumber;

                // $totalQty            += $quantity;
                // $totalAmount         += $quantity * $rate;
                // }
            });

            // Add totals row
            // $data->push((object) [
            //     'smtm_id'          => null,
            //     'branch_id'        => null,
            //     'voucher_image'    => null,
            //     'challan_no'       => null,
            //     'challan_date'     => null,
            //     'product_name'     => 'Total',
            //     'main_trx_id'      => null,
            //     'unit'             => null,
            //     'rate'             => 0,
            //     'quantity'         => $totalQty > 1 ? number_format($totalQty) . ' (Units)' : '-',
            //     'ref_invoice_no'   => null,
            //     'ref_challan_date' => null,
            //     'branch_name'      => null,
            //     'sl_number'        => null,
            //     'total'            => $totalAmount
            // ]);
            // } 
            return foundData($data);
        }
        return notFound();

        if (1 == $print) {
            return $data;
        }
        return view('reports.newreports.templates.reports-templates.purchase-ledger-template', compact('data', 'branchId'));
    }

    public function purchaseLedgerDataWeb(Request $request, $print = 0)
    {
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));
        $branchId  = $request['branch_id'] ? $request['branch_id'] : '';
        $ledgerId  = $request['ledger_id'] ? $request['ledger_id'] : '';
        $item_id   = $request['item_id'] ? $request['item_id'] : '';

        $data =  MainTransactionMaster::join('inventory_purchase_masters', 'main_trx_master.id', '=', 'inventory_purchase_masters.main_trx_id')
            ->join('inventory_purchase_details', 'inventory_purchase_masters.id', '=', 'inventory_purchase_details.pur_mstr_id')
            ->join('product_items', 'product_items.id', '=', 'inventory_purchase_details.product_id')
            ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->where('main_trx_master.status', '=', 1)
            ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);

        if ($branchId != '') {
            $data->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', '=', $branchId);
        }
        if ($ledgerId != '') {
            $data->where('inventory_purchase_masters.supplier_id', '=', $ledgerId);
        }
        if ($item_id != '') {
            $data->where('product_items.id', '=', $item_id);
        }

        $data = $data->select([
            'main_trx_master.id as smtm_id',
            'main_trx_master.branch_id',
            'main_trx_master.voucher_image as voucher_image',
            'main_trx_master.vr_no as challan_no',
            'main_trx_master.vr_date as challan_date',
            'product_items.name as product_name',
            'inventory_purchase_masters.main_trx_id',
            'sys_inv_units.name as unit',
            'inventory_purchase_details.purchase_price as rate',
            'inventory_purchase_details.quantity as quantity',
            'inventory_purchase_masters.vehicle_no as vehicle_no',
            'inventory_purchase_masters.invoice_number as ref_invoice_no',
            'inventory_purchase_masters.invoice_date as ref_challan_date',
            'inventory_purchase_masters.notes as notes',
            'com_branches.name as branch_name',
        ])->get();

        $formattedData = [];

        foreach ($data as $d) {
            $formattedData[$d->smtm_id][] = [
                'smtm_id'           => $d->smtm_id,
                'branch_id'         => $d->branch_id,
                'voucher_image'     => $d->voucher_image,
                'challan_no'        => $d->challan_no,
                'challan_date'      => $d->challan_date,
                'product_name'      => $d->product_name,
                'main_trx_id'       => $d->main_trx_id,
                'unit'              => $d->unit,
                'rate'              => $d->rate,
                'quantity'          => $d->quantity,
                'vehicle_no'       => $d->vehicle_no,
                'ref_invoice_no'    => $d->ref_invoice_no,
                'ref_challan_date'  => $d->ref_challan_date,
                'branch_name'       => $d->branch_name,
            ];
        }
        // return $formattedData ;

        if (1 == $print) {
            return $data;
        }
        return view('reports.newreports.templates.reports-templates.purchase-ledger-template', compact('data', 'branchId'));
    }

    public function apiSalesLedgerData(Request $request, $print = 0)
    {

        $branchId  = $request['branch_id'] ? $request['branch_id'] : '';
        $ledgerId  = $request['ledger_id'] ? $request['ledger_id'] : '';
        $item_id   = $request['item_id'] ? $request['item_id'] : '';
        $startDate = $request->startdate;
        $endDate =  $request->enddate;


        $data = MainTransactionMaster::with([
            'salesMaster.details.product.unit',
            'salesMaster.details.product.category',
            'accTransactionMaster.accTransactionDetails.coaL4'
        ])
            ->where('status', 1)
            ->whereBetween('vr_date', [$startDate, $endDate])

            // Branch
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))

            // Ledger / Customer
            ->when(
                $ledgerId && $ledgerId !== 'null',
                fn($q) =>
                $q->whereHas(
                    'salesMaster',
                    fn($q2) => $q2->where('customer_id', $ledgerId)
                )
            )

            // ✅ Item filter (FIXED)
            ->when(
                $item_id && $item_id !== 'null',
                fn($q) =>
                $q->whereHas(
                    'salesMaster.details',
                    fn($q2) => $q2->where('product_id', $item_id)
                )
            )

            // Sales voucher only
            ->where('vr_no', 'like', '3-%')

            ->orderBy('id', 'asc')
            ->get();



        if ($data->isNotEmpty()) {
            $slNumber = 0;
            $totalQty = 0;
            $totalAmount = 0;

            $data->map(function ($record) use (&$slNumber, &$totalQty, &$totalAmount) {

                // pick first sales detail (or loop if multiple)
                $detail = $record->salesMaster?->details?->first();

                $quantity = is_numeric($detail?->quantity) ? (float)$detail->quantity : 0;
                $rate     = is_numeric($detail?->sales_price) ? (float)$detail->sales_price : 0;

                // expose flat fields
                $record->mtmid      = $record->id;
                $record->smtm_id      = $record->id;
                $record->branch_name  = $record->branch?->name;
                unset($record->branch); // remove full branch object
                $record->challan_no   = $record->vr_no;
                $record->challan_date = us_to_bd_date($record->vr_date);
                $record->voucher_image = $record->voucher_image;
                $record->notes        = $record->salesMaster?->notes;

                $record->product_name = $detail?->product?->name;
                $record->unit         = $detail?->product?->unit?->name;
                $record->rate         = $rate;
                $record->quantity     = number_format($quantity, 2);

                // calculate totals
                $record->total        = $quantity * $rate;

                // increment counters
                $slNumber            += 1;
                $record->sl_number    = $slNumber;
                $totalQty            += $quantity;
                $totalAmount         += $quantity * $rate;
            });


            return foundData($data);
        }
        return notFound();
    }


    // Old purchaseLedgerData
    //  public function purchaseLedgerData(Request $request, $print = 0)
    // {

    //     $branchId  = $request['branch_id'] ? $request['branch_id'] : '';
    //     $ledgerId  = $request['ledger_id'] ? $request['ledger_id'] : '';
    //     $item_id   = $request['item_id'] ? $request['item_id'] : '';

    //     if (request()->is('api/*')) {
    //         $startDate = $request->startdate;
    //         $endDate =  $request->enddate;
    //     } else {
    //         $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));
    //         $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));
    //     }

    // $data =  MainTransactionMaster::join('inventory_purchase_masters', 'main_trx_master.id', '=', 'inventory_purchase_masters.main_trx_id')
    //     ->join('inventory_purchase_details', 'inventory_purchase_masters.id', '=', 'inventory_purchase_details.pur_mstr_id')
    //     ->join('product_items', 'product_items.id', '=', 'inventory_purchase_details.product_id')
    //     ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
    //     ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
    //     ->where('main_trx_master.status', '=', 1)
    //     ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);

    // if ($branchId != '') {
    //     $data->where('main_trx_master.branch_id', '=', $branchId);
    // }
    // if ($ledgerId != '' & $ledgerId != null & $ledgerId != 'null') {
    //     $data->where('inventory_purchase_masters.supplier_id', '=', $ledgerId);
    // }
    // if ($item_id != '' & $item_id != null & $item_id != 'null') {
    //     $data->where('product_items.id', '=', $item_id);
    // }

    //     $data = $data->select([
    //         'main_trx_master.id as smtm_id',
    //         'main_trx_master.branch_id',
    //         'main_trx_master.voucher_image as voucher_image',
    //         'main_trx_master.vr_no as challan_no',
    //         'main_trx_master.vr_date as challan_date',
    //         'product_items.name as product_name',
    //         'inventory_purchase_masters.main_trx_id',
    //         'sys_inv_units.name as unit',
    //         'inventory_purchase_details.purchase_price as rate',
    //         'inventory_purchase_details.quantity as quantity',
    //         'inventory_purchase_masters.invoice_number as ref_invoice_no',
    //         'inventory_purchase_masters.invoice_date as ref_challan_date',
    //         'inventory_purchase_masters.vehicle_no as vehicle_no',
    //         'inventory_purchase_masters.notes as notes',
    //         'com_branches.name as branch_name',
    //     ])->get();

    //     if (request()->is('api/*')) {
    //         if ($data) {
    //             $slNumber = 0;
    //             $totalQty = 0;
    //             $totalAmount = 0;

    //             // Map through data
    //             $data->map(function ($record) use (&$slNumber, &$totalQty, &$totalAmount) {
    //                 // Ensure quantity and rate are numeric and cast properly
    //                 $quantity = is_numeric($record->quantity) ? (float)$record->quantity : 0;
    //                 $rate     = is_numeric($record->rate) ? (float) $record->rate : 0;

    //                 // Calculate line total
    //                 $record->total = $quantity * $rate;

    //                 // Increment counters
    //                 $slNumber          += 1;
    //                 $record->sl_number  = $slNumber;
    //                 $record->quantity   = number_format($quantity, 2);
    //                 $record->challan_date  = us_to_bd_date($record->challan_date);
    //                 $totalQty          += $quantity;
    //                 $totalAmount       += $quantity * $rate;
    //             });

    //             if (count($data) > 0) {
    //                 $data->push([
    //                     'smtm_id'          => null,
    //                     'branch_id'        => null,
    //                     'voucher_image'    => null,
    //                     'challan_no'       => null,
    //                     'challan_date'     => null,
    //                     'vehicle_no'     => null,
    //                     'product_name'     => 'Total',
    //                     'main_trx_id'      => null,
    //                     'unit'             => null,
    //                     'rate'             => 0,
    //                     'quantity'         => $totalQty > 1 ? number_format($totalQty, 2) . ' (Units)' : number_format($totalQty, 2) . ' (Unit)',
    //                     'ref_invoice_no'   => null,
    //                     'ref_challan_date' => null,
    //                     'branch_name'      => null,
    //                     'sl_number'        => null,
    //                     'total'            => $totalAmount
    //                 ]);
    //             }
    //             return foundData($data);
    //         }
    //         return notFound();
    //     }

    //     if (1 == $print) {
    //         return $data;
    //     }
    //     return view('reports.newreports.templates.reports-templates.purchase-ledger-template', compact('data', 'branchId'));
    // }


    public function salesLedgerSummery()
    {

        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        return view('reports.newreports.sales_ledger_summery', compact('projects', 'trdate'));
    }



    public function salesLedgerSummeryData(Request $request)
    {

        $branch_id = $request->branch_id;
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));

        $salesInvoice = DB::select("
                                    SELECT mtm.id mtmid, mtm.vr_no, mtm.vr_date, ism.customer_id, cpi.name,
                                    ism.total, ism.discount, ism.netpayment
                                    FROM main_trx_master mtm
                                    JOIN inventory_sales_masters ism ON ism.main_trx_id = mtm.id
                                    JOIN cust_party_infos cpi ON cpi.coa4_id = ism.customer_id
                                    WHERE mtm.branch_id = '" . $branch_id . "' AND mtm.vr_date BETWEEN '" . $startDate . "' AND '" . $endDate . "' AND mtm.status = 1
                                    ORDER BY mtm.id");
        // return $salesInvoice;
        return view('reports.newreports.templates.reports-templates.sales-summery-template', compact('salesInvoice'));
    }



    public function salesLedger()
    {
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        $branchs = Branch::active()->get();
        return view('reports.newreports.sales_ledger', compact('trdate', 'branchs'));
    }

    public function printSalesLedger(Request $request)
    {

        $print = 1;
        $data      = $this->salesLedgerData($request, $print);
        $id        = $request->ledger_id;
        $coal4s    = CoaLevel4::where('id', $id)->first();
        $company   = Company::find(auth()->user()->company_id);
        $daterange = $request['startdate'] . ' - ' . $request['enddate'];

        return view('reports.newreports.sales-ledger-print', compact('data', 'company', 'coal4s', 'daterange'));
    }

    public function salesLedgerData(Request $request, $print = 0)
    {

        $branchId  = $request['branch_id'] ? $request['branch_id'] : '';
        $ledgerId  = $request['ledger_id'] ? $request['ledger_id'] : '';
        $item_id   = $request['item_id'] ? $request['item_id'] : '';
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));

        $datas =  MainTransactionMaster::join('inventory_sales_masters', 'main_trx_master.id', '=', 'inventory_sales_masters.main_trx_id')
            ->join('inventory_sales_details', 'inventory_sales_masters.id', '=', 'inventory_sales_details.sal_mstr_id')
            ->join('product_items', 'product_items.id', '=', 'inventory_sales_details.product_id')
            ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
            ->join('com_branches', 'com_branches.id', '=', 'main_trx_master.branch_id')
            ->where('main_trx_master.status', 1)
            ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate]);

        if ($branchId != '') {
            $datas->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', '=', $branchId);
        }
        if ($ledgerId != '') {
            $datas->where('inventory_sales_masters.customer_id', '=', $ledgerId);
        }
        if ($item_id != '') {
            $datas->where('product_items.id', '=', $item_id);
        }

        $datas = $datas->select([
            'main_trx_master.id as smtm_id',
            'main_trx_master.branch_id',
            'main_trx_master.voucher_image as voucher_image',
            'main_trx_master.vr_no as challan_no',
            'main_trx_master.vr_date as challan_date',
            'product_items.name as product_name',
            'inventory_sales_masters.main_trx_id',
            'inventory_sales_masters.vehicle_no',
            'sys_inv_units.name as unit',
            'inventory_sales_details.sales_price as rate',
            'inventory_sales_details.quantity as quantity',
            'com_branches.name as branch_name',
        ])
            ->orderBy('challan_date', 'ASC')
            ->get();

        //return $datas;
        $data = [];
        foreach ($datas as $d) {
            $data[] = [
                'smtm_id'       => $d->smtm_id,
                'branch_id'     => $d->branch_id,
                'voucher_image' => $d->voucher_image,
                'challan_no'    => $d->challan_no,
                'challan_date'  => $d->challan_date,
                'vehicle_no'    => $d->vehicle_no,
                'product_name'  => $d->product_name,
                'main_trx_id'   => $d->main_trx_id,
                'unit'          => $d->unit,
                'rate'          => $d->rate,
                'quantity'      => $d->quantity,
                'debit'         => receivedBySalesInvoice($d->smtm_id),
                'branch_name'   => $d->branch_name,
            ];
        }

        if (1 == $print) {
            return $data;
        }

        return view('reports.newreports.templates.reports-templates.sales-ledger-template', compact('data', 'branchId'));
    }

    public function bankInformation()
    {

        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        return view('reports.newreports.bank-information', compact('projects', 'trdate'));
    }
    public function bankInformationData(Request $request)
    {

        if (1 == $request->report_type_id) {

            $branchId = $request->branch_id ? $request->branch_id : '';
            $endDate  = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));
            // $data     = DB::select("CALL bank_balance(?, ?)", array($branchId, $endDate));
            $data     = $this->bankBalance($branchId, $endDate);

            return $data;
        } elseif (2 == $request->report_type_id) {

            $branchId = $request->branch_id ? $request->branch_id : '';
            $endDate  = date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate'])));

            // This procedure is all ok
            // $data     = DB::select("CALL bank_loan(?, ?)", array($branchId, $endDate));
            $data     = $this->bankLoad($branchId, $endDate);

            // Make new query to get bank loan data


            return $data;
        }
    }

    public function bankBalance(string $branchId, string $endDate)
    {
        $user = auth()->user();
        return DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as coal4', 'coal4.id', '=', 'atd.coa4_id')
            ->join('acc_coa_level3s as coal3', 'coal3.id', '=', 'coal4.acc_coa_level3_id')
            ->where('mtm.status', 1)
            ->where('coal3.id', 2)
            ->whereDate('mtm.vr_date', '<=', $endDate)
            ->where('mtm.company_id', $user->company_id)
            ->where('mtm.branch_id', 'like', "%$branchId%")
            ->groupBy('atd.coa4_id', 'coal4.name')
            ->orderBy('coal4.name')
            ->selectRaw("
            atd.coa4_id,
            coal4.name as bank_name,
            SUM(atd.debit) as debit,
            SUM(atd.credit) as credit,
            CASE WHEN SUM(atd.debit) - SUM(atd.credit) > 0 
                THEN SUM(atd.debit) - SUM(atd.credit) 
                ELSE 0 
            END as dr_bal,
            CASE WHEN SUM(atd.credit) - SUM(atd.debit) > 0 
                THEN SUM(atd.credit) - SUM(atd.debit) 
                ELSE 0 
            END as cr_bal
        ")
            ->get();
    }


    private function bankLoad($branchId, $endDate)
    {
        $user = auth()->user();
        $data = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as coal4', 'coal4.id', '=', 'atd.coa4_id')
            ->join('acc_coa_level3s as coal3', 'coal3.id', '=', 'coal4.acc_coa_level3_id')
            ->where('mtm.status', 1)
            ->where('coal3.id', 30)
            ->whereDate('mtm.vr_date', '<=', $endDate)
            ->where('mtm.company_id', $user->company_id)
            ->where('mtm.branch_id', 'like', "%$branchId%")
            ->groupBy('atd.coa4_id', 'coal4.name')
            ->orderBy('coal4.name')
            ->selectRaw("
                            atd.coa4_id,
                            coal4.name as bank_name,
                            SUM(atd.debit) as debit,
                            SUM(atd.credit) as credit,
                            CASE WHEN SUM(atd.debit) - SUM(atd.credit) > 0 
                                THEN SUM(atd.debit) - SUM(atd.credit) 
                                ELSE 0 
                            END as dr_bal,
                            CASE WHEN SUM(atd.credit) - SUM(atd.debit) > 0 
                                THEN SUM(atd.credit) - SUM(atd.debit) 
                                ELSE 0 
                            END as cr_bal
                        ")->get();
    }


    public function ledgerCylinder()
    {

        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        return view('reports.newreports.ledger-cylinder', compact('projects', 'trdate'));
    }

    public function ledgerCylinderData(Request  $request)
    {

        $endDate =  !empty($request['enddate']) ? date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate']))) : date("Y-m-d");
        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));
        $where = "WHERE mtm.status = 1 ";

        if ($request->branch_id) {
            $where = $where . " AND mtm.branch_id = $request->branch_id ";
        }

        if ($request->ledger_id) {
            $where = $where . " AND coal4.id = $request->ledger_id ";
        }

        $where = $where . " AND mtm.vr_date BETWEEN '" . $startDate . "' AND '" . $endDate . "'";
        $data = DB::select("
                                SELECT a.*, siu.name unit
                                from
                                (SELECT max(pis.unit_id) pid, pps.name cylinder_size, coal4.name customer,
                                sum(cdt.stock_in) received_cylinder,
                                sum(cdt.stock_out) issue_cylinder,
                                CASE WHEN sum(cdt.stock_in) - sum(cdt.stock_out) > 0
                                THEN sum(cdt.stock_in) - sum(cdt.stock_out) ELSE 0 END payable,
                                CASE WHEN sum(cdt.stock_out) - sum(cdt.stock_in) > 0
                                THEN sum(cdt.stock_out) - sum(cdt.stock_in) ELSE 0 END receivable
                                FROM cylinder_due_transaction cdt
                                JOIN main_trx_master mtm ON mtm.id = cdt.mtm_id
                                JOIN acc_coa_level4s coal4 ON coal4.id = cdt.head_id
                                join product_items pis ON pis.id = cdt.product_id
                                JOIN product_categories pc ON pc.id = pis.category_id
                                JOIN product_pack_size pps ON pps.id = pis.pack_size_id
                                $where
                                GROUP BY cylinder_size, coal4.name
                                ORDER BY cylinder_size)
                                a
                                JOIN sys_inv_units siu ON siu.id = a.pid ");
        $table = [];
        foreach ($data as $d) {
            $table[$d->customer][] = $d;
        }
        return $table;
    }

    public function assetsLedger(Request $request)
    {
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        return view('reports.newreports.assets-ledger', compact('projects', 'trdate'));
    }
    public function assetsLedgerData(Request $request)
    {
        $branch    = $request->branch_id;
        if (!isset($branch)) {
            $data = $this->allBranches($request);
            return view('reports.newreports.templates.assets.assets-all-branch', compact('data'));
        } else if (isset($branch)) {
            $data = $this->specificBranch($request);

            $table = [];
            foreach ($data as $d) {
                $table[$d->branch_name][] = $d;
            }
            $data  = $table;
            //return $data;

            return view('reports.newreports.templates.assets.assets-specific-branch', compact('data'));
        }
    }

    private function allBranches($request)
    {
        $item_id   = $request->item_id;
        $enddate   = bd_to_us_date($request->enddate);

        $data =  MainTransactionMaster::select('product_items.id', 'product_items.name as product_name', 'sys_inv_units.name as unit_name')
            ->join('inventory_transfer_masters', 'main_trx_master.id', '=', 'inventory_transfer_masters.main_trx_id')
            ->join('inventory_transfer_details', 'inventory_transfer_masters.id', '=', 'inventory_transfer_details.inv_mstr_id')
            ->join('product_items', 'product_items.id', '=', 'inventory_transfer_details.product_id')
            ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')

            ->when($item_id, function ($query, $item_id) {
                return $query->where('product_items.id', '=', $item_id);
            })

            ->when($enddate, function ($query, $enddate) {
                return $query->where('main_trx_master.vr_date', '<=', $enddate);
            })
            ->groupBy('product_items.id', 'product_items.name', 'sys_inv_units.name')
            ->selectRaw('sum(inventory_transfer_details.stock_in) as stock_in, sum(inventory_transfer_details.stock_out) as stock_out')
            ->orderBy('product_items.name', 'asc')
            ->get();
        return $data;
    }
    private function specificBranch($request)
    {
        $branch    = $request->branch_id;
        $item_id   = $request->item_id;
        $enddate   = bd_to_us_date($request->enddate);

        $data =  MainTransactionMaster::select('product_items.id', 'product_items.name as product_name', 'inventory_transfer_details.branch_id', 'sys_inv_units.name as unit_name', 'com_branches.name as branch_name')
            ->join('inventory_transfer_masters', 'main_trx_master.id', '=', 'inventory_transfer_masters.main_trx_id')
            ->join('inventory_transfer_details', 'inventory_transfer_masters.id', '=', 'inventory_transfer_details.inv_mstr_id')
            ->join('product_items', 'product_items.id', '=', 'inventory_transfer_details.product_id')
            ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
            ->join('com_branches', 'com_branches.id', '=', 'inventory_transfer_details.branch_id')
            ->when($branch, function ($query, $branch) {
                return $query->where('inventory_transfer_details.branch_id', '=', $branch);
            })

            ->when($item_id, function ($query, $item_id) {
                return $query->where('product_items.id', '=', $item_id);
            })

            ->when($enddate, function ($query, $enddate) {
                return $query->where('main_trx_master.vr_date', '<=', $enddate);
            })
            ->groupBy('product_items.id', 'product_items.name', 'inventory_transfer_details.branch_id', 'sys_inv_units.name', 'com_branches.name')
            ->selectRaw('sum(inventory_transfer_details.stock_in) as stock_in, sum(inventory_transfer_details.stock_out) as stock_out')
            ->orderBy('product_items.name', 'asc')
            ->get();
        return $data;
    }
    public function godownLedger(Request  $request)
    {

        $transaction_date = Common::getShowTrDate(Auth::user()->branch_id);
        if (Auth::user()->role_id <= 7) {
            $godown = Godown::select('id', 'name')->get();
        } else {
            $godown = Godown::select('id', 'name')->get();
        }
        $projects = reportsProjects();

        return view('reports.newreports.ledger-godown', compact('projects', 'godown', 'transaction_date'));
    }

    public function godownLedgerData(Request  $request)
    {

        $endDate =  !empty($request['enddate']) ? date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate']))) : date("Y-m-d");
        if ($request->branch_id) {
            $where = "WHERE mtm.status = 1 and  mtm.branch_id = $request->branch_id AND";
        } else {
            $where = "WHERE mtm.status = 1 and ";
        }
        if ($request->godown_id) {
            $where = $where . " id.godown_id = $request->godown_id AND";
        }
        $where = $where . " mtm.vr_date <= '"   . $endDate . "'";

        $data = DB::select("SELECT cb.name branch_name, ig.name godown, ipi.name product_name, siu.name unit, id.product_id,
                                    SUM(id.stock_in) stock_in, sum(id.stock_out) stock_out
                                    FROM inventory_details id
                                    JOIN com_branches cb ON cb.id = id.branch_id
                                    JOIN inventory_godown ig ON ig.id = id.godown_id

                                    JOIN product_items ipi ON ipi.id = id.product_id
                                    JOIN sys_inv_units siu ON siu.id = ipi.unit_id

                                    JOIN inventory_masters im ON im.id = id.inv_mstr_id
                                    JOIN main_trx_master mtm ON mtm.id = im.main_trx_id
                                    $where
                                    GROUP BY  cb.name, ig.name, ipi.name, siu.name, id.product_id
                                    HAVING SUM(id.stock_in) - sum(id.stock_out) <> 0
                                    ");


        $table = [];
        foreach ($data as $d) {
            $table[$d->branch_name][$d->godown][] = $d;
        }
        return view("reports.newreports.templates.reports-templates.godown-template", compact("table"));
        return $table;
    }

    public function godownLedgerPrint()
    {
        # code...
    }



    public function productLedger()
    {
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        $firstDayForTheMonth = date('Y-m-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.item-ledger', compact('projects', 'trdate', 'firstDateOfMonth'));
    }



    public function productLedgerData(Request $request)
    {

        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request['startdate'])));
        $endDate =  !empty($request['enddate']) ? date('Y-m-d', strtotime(str_replace('/', '-', $request['enddate']))) : date("Y-m-d");
        $where = "WHERE mtm.status = 1 ";

        if ($request->branch_id) {
            $where .= " AND mtm.branch_id = $request->branch_id ";
        }

        $product_id = $request->ledger_id;

        $opening = DB::table('main_trx_master as mtm')
            ->join('inventory_masters as im', 'im.main_trx_id', '=', 'mtm.id')
            ->join('inventory_details as id', 'id.inv_mstr_id', '=', 'im.id')
            ->select('id.product_id', DB::raw('SUM(id.stock_in) - SUM(id.stock_out) as opening'))
            ->where('mtm.status', 1)
            ->where('id.product_id', $product_id)
            ->where('mtm.vr_date', '<', $startDate)
            ->groupBy('id.product_id')
            ->get();

        // First Subquery for purchase
        $purchaseQuery = DB::table('main_trx_master as mtm')
            ->join('inventory_purchase_masters as ipm', 'mtm.id', '=', 'ipm.main_trx_id')
            ->join('inventory_purchase_details as ipd', 'ipd.pur_mstr_id', '=', 'ipm.id')
            ->select(
                'mtm.id as mtmid',
                'mtm.vr_no',
                'mtm.vr_date',
                'ipd.product_id',
                DB::raw('SUM(ipd.quantity) as purchase'),
                DB::raw('0 as sales_return'),
                DB::raw('0 as sales'),
                DB::raw('0 as purchase_return')
            )
            ->where('ipd.product_id', $product_id)
            ->where('mtm.status', 1)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('mtm.id', 'mtm.vr_no', 'mtm.vr_date', 'ipd.product_id');

        // Second Subquery for sales_return
        $salesReturnQuery = DB::table('main_trx_master as mtm')
            ->join('inventory_sales_return_masters as isrm', 'mtm.id', '=', 'isrm.main_trx_id')
            ->join('inventory_sales_return_details as isrd', 'isrd.sal_mstr_id', '=', 'isrm.id')
            ->select(
                'mtm.id as mtmid',
                'mtm.vr_no',
                'mtm.vr_date',
                'isrd.product_id',
                DB::raw('0 as purchase'),
                DB::raw('SUM(isrd.quantity) as sales_return'),
                DB::raw('0 as sales'),
                DB::raw('0 as purchase_return')
            )
            ->where('isrd.product_id', $product_id)
            ->where('mtm.status', 1)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('mtm.id', 'mtm.vr_no', 'mtm.vr_date', 'isrd.product_id');

        // Third Subquery for sales
        $salesQuery = DB::table('main_trx_master as mtm')
            ->join('inventory_sales_masters as ism', 'mtm.id', '=', 'ism.main_trx_id')
            ->join('inventory_sales_details as isd', 'isd.sal_mstr_id', '=', 'ism.id')
            ->select(
                'mtm.id as mtmid',
                'mtm.vr_no',
                'mtm.vr_date',
                'isd.product_id',
                DB::raw('0 as purchase'),
                DB::raw('0 as sales_return'),
                DB::raw('SUM(isd.quantity) as sales'),
                DB::raw('0 as purchase_return')
            )
            ->where('isd.product_id', $product_id)
            ->where('mtm.status', 1)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('mtm.id', 'mtm.vr_no', 'mtm.vr_date', 'isd.product_id');

        // Fourth Subquery for purchase_return
        $purchaseReturnQuery = DB::table('main_trx_master as mtm')
            ->join('inventory_purchase_return_masters as iprm', 'mtm.id', '=', 'iprm.main_trx_id')
            ->join('inventory_purchase_return_details as iprd', 'iprd.pur_return_mstr_id', '=', 'iprm.id')
            ->select(
                'mtm.id as mtmid',
                'mtm.vr_no',
                'mtm.vr_date',
                'iprd.product_id',
                DB::raw('0 as purchase'),
                DB::raw('0 as sales_return'),
                DB::raw('0 as sales'),
                DB::raw('SUM(iprd.quantity) as purchase_return')
            )
            ->where('mtm.status', 1)
            ->where('iprd.product_id', $product_id)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->groupBy('mtm.id', 'mtm.vr_no', 'mtm.vr_date', 'iprd.product_id');

        // Combining all subqueries using union and ordering by vr_date
        $details = $purchaseQuery
            ->union($salesReturnQuery)
            ->union($salesQuery)
            ->union($purchaseReturnQuery)
            ->orderBy('vr_date')
            ->get();

        return  ['opening' => $opening, 'details' => $details];
    }

    public function profitLoss()
    {

        if (!auth()->user()->can('profit.loss')) {
            return view('errors.403');
        }

        $projects = reportsProjects();

        $trdate = Common::getShowTrDate(Auth::user()->branch_id);

        $firstDayForTheMonth = date('Y-01-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.profit_loss', compact('projects', 'firstDateOfMonth', 'trdate'));
    }

    public function profitLossPrint(Request $request)
    {
        $user = Auth::user();
        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;

        $company  = Company::where('id', $user->company_id)->first();
        $branches = Branch::where('id', $request->branch_id)->where('company_id', $user->company_id)->first();
        $reportDate = ['start_date' => $request->startdate, 'end_date' => $request->enddate];


        $cache_data = $startdate . '-' . $enddate . '-' . $branchId . '-' . $user->id;

        return view('reports.newreports.profit_loss_print', compact('cache_data', 'company',  'branches', 'reportDate'));
    }

    public function balanceSheet()
    {
        if (!auth()->user()->can('profit.loss')) {
            return view('errors.403');
        }

        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        $firstDayForTheMonth = date('Y-01-01', strtotime(str_replace('/', '-', $trdate)));
        $firstDateOfMonth = date('d/m/Y', strtotime($firstDayForTheMonth));

        return view('reports.newreports.balance_sheet', compact('projects', 'firstDateOfMonth', 'trdate'));
    }

    public function balanceSheetPrint(Request $request)
    {
        if (!auth()->user()->can('profit.loss')) {
            return view('errors.403');
        }

        $user = Auth::user();
        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;

        $company  = Company::where('id', $user->company_id)->first();
        $branches = Branch::where('id', $request->branch_id)->where('company_id', $user->company_id)->first();
        $reportDate = [
            'start_date' => $request->startdate,
            'end_date' => $request->enddate,
            'as_on_date' => $request->enddate,
        ];

        $cache_data = $this->balanceSheetCacheKey($startdate, $enddate, $branchId, $user->id);
        if (!Cache::has($cache_data)) {
            $this->balanceSheetData($request);
        }

        return view('reports.newreports.balance_sheet_print', compact('cache_data', 'company', 'branches', 'reportDate'));
    }

    public function balanceSheetData(Request $request)
    {
        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;
        $user = Auth::user();

        $this->openingStock($branchId, $startdate, $user->id);
        $this->closingStock($branchId, $enddate, $user->id);

        $balances = $this->balanceSheetLedgerBalances($branchId, $startdate, $enddate);

        $assets = $this->formatBalanceSheetGroups($balances->where('level1_id', 1));
        $liabilities = $this->formatBalanceSheetGroups($balances->where('level1_id', 2));
        $equity = $this->formatBalanceSheetGroups($balances->where('level1_id', 5));

        $earnings = $this->balanceSheetEarningsAdjustment($balances);

        if (
            round($earnings['opening'], 2) !== 0.0
            || round($earnings['movement'], 2) !== 0.0
            || round($earnings['closing'], 2) !== 0.0
        ) {
            $equity[] = [
                'group_name' => $earnings['closing'] >= 0 ? 'Accumulated Profit' : 'Accumulated Loss',
                'opening' => round($earnings['opening'], 2),
                'movement' => round($earnings['movement'], 2),
                'closing' => round($earnings['closing'], 2),
                'total' => round($earnings['closing'], 2),
                'items' => [[
                    'coa4_id' => null,
                    'name' => $earnings['closing'] >= 0 ? 'Accumulated Profit' : 'Accumulated Loss',
                    'opening' => round($earnings['opening'], 2),
                    'movement' => round($earnings['movement'], 2),
                    'closing' => round($earnings['closing'], 2),
                    'balance' => round($earnings['closing'], 2),
                ]],
            ];
        }

        $assetTotals = $this->sumBalanceSheetColumns($assets);
        $liabilityTotals = $this->sumBalanceSheetColumns($liabilities);
        $equityTotals = $this->sumBalanceSheetColumns($equity);
        $liabilitiesAndEquityTotals = [
            'opening' => round($liabilityTotals['opening'] + $equityTotals['opening'], 2),
            'movement' => round($liabilityTotals['movement'] + $equityTotals['movement'], 2),
            'closing' => round($liabilityTotals['closing'] + $equityTotals['closing'], 2),
        ];
        $differenceTotals = [
            'opening' => round($assetTotals['opening'] - $liabilitiesAndEquityTotals['opening'], 2),
            'movement' => round($assetTotals['movement'] - $liabilitiesAndEquityTotals['movement'], 2),
            'closing' => round($assetTotals['closing'] - $liabilitiesAndEquityTotals['closing'], 2),
        ];

        $payload = [
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'totals' => [
                'assets' => $assetTotals['closing'],
                'liabilities' => $liabilityTotals['closing'],
                'equity' => $equityTotals['closing'],
                'assets_columns' => $assetTotals,
                'liabilities_columns' => $liabilityTotals,
                'equity_columns' => $equityTotals,
            ],
            'report_date' => [
                'start_date' => $request->startdate,
                'end_date' => $request->enddate,
                'as_on_date' => $request->enddate,
            ],
            'branch_id' => $branchId,
        ];

        $payload['totals']['liabilities_and_equity'] = $liabilitiesAndEquityTotals['closing'];
        $payload['totals']['liabilities_and_equity_columns'] = $liabilitiesAndEquityTotals;
        $payload['totals']['difference'] = $differenceTotals['closing'];
        $payload['totals']['difference_columns'] = $differenceTotals;

        Cache::put($this->balanceSheetCacheKey($startdate, $enddate, $branchId, $user->id), $payload);

        return $payload;
    }

    private function balanceSheetCacheKey($startdate, $enddate, $branchId, $userId): string
    {
        return $startdate . '-' . $enddate . '-' . $branchId . '-' . $userId . '-balance-sheet';
    }

    private function balanceSheetLedgerBalances($branchId, $startDate, $endDate): Collection
    {
        return DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as coal4', 'coal4.id', '=', 'atd.coa4_id')
            ->join('acc_coa_level3s as coal3', 'coal3.id', '=', 'coal4.acc_coa_level3_id')
            ->join('acc_coa_level2s as coal2', 'coal2.id', '=', 'coal3.acc_coa_level2_id')
            ->join('acc_coa_level1s as coal1', 'coal1.id', '=', 'coal2.acc_coa_level1_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('coal1.id', [1, 2, 3, 4, 5])
            ->groupBy('coal1.id', 'coal1.name', 'coal3.id', 'coal3.name', 'coal4.id', 'coal4.name')
            ->orderBy('coal1.id')
            ->orderBy('coal3.name')
            ->orderBy('coal4.name')
            ->selectRaw('
                coal1.id as level1_id,
                coal1.name as level1_name,
                coal3.id as coal3_id,
                coal3.name as coal3_name,
                coal4.id as coa4_id,
                coal4.name as coal4_name,
                SUM(CASE WHEN mtm.vr_date < "' . $startDate . '" THEN atd.debit ELSE 0 END) as opening_debit,
                SUM(CASE WHEN mtm.vr_date < "' . $startDate . '" THEN atd.credit ELSE 0 END) as opening_credit,
                SUM(CASE WHEN mtm.vr_date BETWEEN "' . $startDate . '" AND "' . $endDate . '" THEN atd.debit ELSE 0 END) as movement_debit,
                SUM(CASE WHEN mtm.vr_date BETWEEN "' . $startDate . '" AND "' . $endDate . '" THEN atd.credit ELSE 0 END) as movement_credit
            ')
            ->get()
            ->map(function ($row) {
                $row->opening = round($this->balanceSheetSignedAmount(
                    (int) $row->level1_id,
                    (float) $row->opening_debit,
                    (float) $row->opening_credit
                ), 2);
                $row->movement = round($this->balanceSheetSignedAmount(
                    (int) $row->level1_id,
                    (float) $row->movement_debit,
                    (float) $row->movement_credit
                ), 2);
                $row->closing = round($row->opening + $row->movement, 2);

                return $row;
            })
            ->filter(function ($row) {
                return round($row->opening, 2) !== 0.0
                    || round($row->movement, 2) !== 0.0
                    || round($row->closing, 2) !== 0.0;
            })
            ->values();
    }

    private function formatBalanceSheetGroups(Collection $rows): array
    {
        return $rows
            ->groupBy('coal3_name')
            ->map(function (Collection $items, $groupName) {
                return [
                    'group_name' => $groupName,
                    'opening' => round($items->sum('opening'), 2),
                    'movement' => round($items->sum('movement'), 2),
                    'closing' => round($items->sum('closing'), 2),
                    'total' => round($items->sum('closing'), 2),
                    'items' => $items->map(function ($item) {
                        return [
                            'coa4_id' => $item->coa4_id,
                            'name' => $item->coal4_name,
                            'opening' => round((float) $item->opening, 2),
                            'movement' => round((float) $item->movement, 2),
                            'closing' => round((float) $item->closing, 2),
                            'balance' => round((float) $item->closing, 2),
                        ];
                    })->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    private function sumBalanceSheetGroups(array $groups): float
    {
        return collect($groups)->sum(function ($group) {
            return (float) ($group['total'] ?? 0);
        });
    }

    private function sumBalanceSheetColumns(array $groups): array
    {
        $collection = collect($groups);

        return [
            'opening' => round((float) $collection->sum('opening'), 2),
            'movement' => round((float) $collection->sum('movement'), 2),
            'closing' => round((float) $collection->sum('closing'), 2),
        ];
    }

    private function balanceSheetEarningsAdjustment(Collection $rows): array
    {
        $incomeOpening = (float) $rows->where('level1_id', 3)->sum('opening');
        $expenseOpening = (float) $rows->where('level1_id', 4)->sum('opening');
        $incomeMovement = (float) $rows->where('level1_id', 3)->sum('movement');
        $expenseMovement = (float) $rows->where('level1_id', 4)->sum('movement');

        $opening = round($incomeOpening - $expenseOpening, 2);
        $movement = round($incomeMovement - $expenseMovement, 2);

        return [
            'opening' => $opening,
            'movement' => $movement,
            'closing' => round($opening + $movement, 2),
        ];
    }

    private function balanceSheetSignedAmount(int $level1Id, float $debit, float $credit): float
    {
        return in_array($level1Id, [2, 3, 5], true)
            ? ($credit - $debit)
            : ($debit - $credit);
    }

    private function extractNetProfitLossAmount(array $profitLossData): float
    {
        $trading = collect($profitLossData['trading'] ?? []);
        $netprofit = collect($profitLossData['netprofit'] ?? []);

        $openingStock = (float) $trading->where('coal4_id', 18)->sum('debit');
        $closingStock = (float) $trading->where('coal4_id', 21)->sum('credit');
        $purchaseDebit = (float) $trading->where('coal3_id', 9)->sum('debit');
        $purchaseCredit = (float) $trading->where('coal3_id', 9)->sum('credit');
        $salesCredit = (float) $trading->where('coal3_id', 7)->sum('credit');
        $salesDebit = (float) $trading->where('coal3_id', 7)->sum('debit');

        $grossResult = ($closingStock + ($salesCredit - $salesDebit)) - ($openingStock + $purchaseDebit - $purchaseCredit);
        $netExpense = (float) $netprofit->where('debit', '>', 0)->sum('debit');
        $netIncome = (float) $netprofit->where('credit', '>', 0)->sum('credit');

        return round($grossResult + $netIncome - $netExpense, 2);
    }

    public function openingStockOnly(Request $request)
    {


        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;
        //
        $userId = Auth::user()->id;


        //  Opening Stock Insert data into table
        $response = $this->openingStock($branchId, $startdate,  $userId);
        return $response;
    }
    public function closingStockOnly(Request $request)
    {

        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;
        $userId = Auth::user()->id;
        // if (!Cache::get($startdate . '-' . $enddate . '-' . $branchId . '-' . $userId)) {
        $this->closingStock($branchId, $enddate,  $userId);
        return true;
        // }

        //  Closing Stock Insert data into table
        return true;
    }

    public function profitLossData(Request $request)
    {
        $startdate = bd_to_us_date($request->startdate);
        $enddate = bd_to_us_date($request->enddate);
        $branchId = $request->branch_id;

        $userId = Auth::user()->id;

        $purchaseAndSales = DB::select("
                                        SELECT
                                            coal1.id,
                                            coal3.id AS coal3_id,
                                            coal3.name,
                                            coal4.id AS coal4_id,
                                            coal4.name AS coal4_name,
                                            SUM(transact.debit) AS debit,
                                            SUM(transact.credit) AS credit
                                        FROM (
                                            SELECT
                                                0 AS id,
                                                18 AS coa4_id,
                                                SUM(ROUND(psk.product_in * psk.rate) - ((ROUND(psk.product_in * psk.rate) * psk.purchase_pct) / 100)) AS debit,
                                                0 AS credit
                                            FROM product_opening_stock psk
                                            WHERE psk.branch_id = $branchId AND psk.user_id = $userId
                                            GROUP BY coa4_id

                                            UNION ALL

                                            SELECT
                                                0 AS id,
                                                21 AS coa4_id,
                                                0 AS debit,
                                                SUM(ROUND(csk.product_in * csk.rate) - ((ROUND(csk.product_in * csk.rate) * csk.purchase_pct) / 100)) AS credit
                                            FROM product_closing_stock csk
                                            WHERE csk.branch_id = $branchId AND csk.user_id = $userId
                                            GROUP BY coa4_id

                                            UNION ALL

                                            SELECT
                                                0 AS id,
                                                15 AS coa4_id,
                                                0 AS debit,
                                                SUM(usm.total_amount) AS credit
                                            FROM unit_sales_master usm
                                            JOIN main_trx_master mtm ON mtm.id = usm.main_trx_id
                                            WHERE mtm.branch_id = $branchId
                                            AND mtm.`status` = 1
                                            AND usm.sale_date BETWEEN '$startdate' AND '$enddate'
                                            AND NOT EXISTS (
                                                SELECT 1
                                                FROM acc_transaction_master atm_check
                                                JOIN acc_transaction_details atd_check ON atd_check.trx_mstr_id = atm_check.id
                                                WHERE atm_check.main_trx_id = mtm.id
                                                AND atd_check.coa4_id = 15
                                            )
                                            GROUP BY coa4_id

                                            UNION ALL

                                            SELECT
                                                atd.id,
                                                atd.coa4_id,
                                                SUM(atd.debit) AS debit,
                                                SUM(atd.credit) AS credit
                                            FROM acc_transaction_details atd
                                            JOIN acc_transaction_master atm ON atm.id = atd.trx_mstr_id
                                            JOIN main_trx_master mtm ON mtm.id = atm.main_trx_id
                                            WHERE mtm.branch_id = $branchId
                                            AND mtm.`status` = 1
                                            AND (
                                                mtm.vr_date BETWEEN '$startdate' AND '$enddate'
                                                OR (
                                                    atd.coa4_id = 15
                                                    AND EXISTS (
                                                        SELECT 1
                                                        FROM unit_sales_master usm
                                                        WHERE usm.main_trx_id = mtm.id
                                                        AND usm.sale_date BETWEEN '$startdate' AND '$enddate'
                                                    )
                                                )
                                            )
                                            GROUP BY atd.id, atd.coa4_id
                                        ) transact
                                        JOIN acc_coa_level4s coal4 ON coal4.id = transact.coa4_id
                                        JOIN acc_coa_level3s coal3 ON coal3.id = coal4.acc_coa_level3_id
                                        JOIN acc_coa_level2s coal2 ON coal2.id = coal3.acc_coa_level2_id
                                        JOIN acc_coa_level1s coal1 ON coal1.id = coal2.acc_coa_level1_id
                                        WHERE coal4.id IN (15, 16, 18, 19, 21, 23, 35, 40)
                                        GROUP BY coal1.id, coal3.id, coal3.name, coal4.id, coal4.name
                                        ORDER BY coal3.name, coal4.name
                                        ");


        $netprofit = DB::select("SELECT coal1.id, coal3.id coal3_id, coal3.name, sum(transact.debit) debit, sum(credit) credit
                                                                FROM
                                                                (
                                                                SELECT atd.id, atd.coa4_id, SUM(debit) debit, SUM(credit) credit
                                                                FROM acc_transaction_details atd
                                                                JOIN acc_transaction_master atm on atm.id = atd.trx_mstr_id
                                                                JOIN main_trx_master mtm ON mtm.id = atm.main_trx_id
                                                                WHERE atd.coa4_id <> 40 and mtm.vr_date BETWEEN '" . $startdate . "' AND  '" . $enddate . "' AND mtm.branch_id = $branchId  AND mtm.`status` = 1

                                                                GROUP BY atd.id, atd.coa4_id

                                                                ) transact
                                                                JOIN acc_coa_level4s coal4 ON coal4.id = transact.coa4_id
                                                                JOIN acc_coa_level3s coal3 ON coal3.id = coal4.acc_coa_level3_id
                                                                JOIN acc_coa_level2s coal2 ON coal2.id = coal3.acc_coa_level2_id
                                                                JOIN acc_coa_level1s coal1 ON coal1.id  = coal2.acc_coa_level1_id
                                                                WHERE (coal1.id = 3 OR coal1.id = 4) AND (coal3.id <> 7 AND coal3.id <> 9)
                                                                GROUP BY coal1.id, coal3.id, coal3.name
                                                                ORDER BY coal3.name");


        if (!Cache::get($startdate . '-' . $enddate . '-' . $branchId . '-' . $userId)) {
            Cache::put($startdate . '-' . $enddate . '-' . $branchId . '-' . $userId, ['trading' => $purchaseAndSales, 'netprofit' => $netprofit, 'branch' => $branchId]);
        }



        return (['trading' => $purchaseAndSales, 'netprofit' => $netprofit, 'branch' => $branchId]);
    }

    public function closingStockItems($branchId)
    {

        $userId = Auth::user()->id;
        $products = $this->closingStockItemsDetails($branchId, $userId);

        return view('reports.somity.closing-stock-details', compact('products'));
    }

    private function closingStockItemsDetails($branchId, $userId)
    {
        $tables = DB::select("SELECT mtm.id, mtm.vr_no, pcis.name category, pis.name product_name,
                                pcs.prodct_detls_id, siu.name unit, pcs.product_in stock, pcs.rate, pcs.purchase_pct,
                                (pcs.product_in * pcs.rate) - ((pcs.product_in * pcs.rate)/100)*pcs.purchase_pct  total_stock
                                FROM product_closing_stock pcs
                                JOIN product_items pis ON pis.id = pcs.pno
                                JOIN product_categories pcis ON pcis.id = pis.category_id
                                JOIN sys_inv_units siu ON siu.id = pis.unit_id
                                JOIN inventory_details ids ON ids.id = pcs.prodct_detls_id
                                JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
                                JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
                                WHERE pcs.branch_id = $branchId AND pcs.user_id = $userId
                                ORDER BY pcis.name, pis.name");


        $products = [];
        foreach ($tables as $d) {
            $products[$d->category][] = $d;
        }

        return $products;
    }

    public function openingStockItems($branchId)
    {
        $userId = Auth::user()->id;
        $products = $this->openingStockItemsDetails($branchId, $userId);
        return view('reports.somity.opening-stock-details', compact('products'));
    }


    private function openingStockItemsDetails($branchId, $userId)
    {
        $tables = DB::select("SELECT mtm.id, mtm.vr_no, pcs.name category, pis.name product_name, pos.prodct_detls_id, siu.name unit, pos.product_in stock,
                                pos.rate, pos.purchase_pct, (pos.product_in * pos.rate) - ((pos.product_in * pos.rate)/100)*pos.purchase_pct total_stock
                                FROM product_opening_stock pos
                                JOIN product_items pis ON pis.id = pos.pno
                                JOIN product_categories pcs ON pcs.id = pis.category_id
                                JOIN sys_inv_units siu ON siu.id = pis.unit_id
                                JOIN inventory_details ids ON ids.id = pos.prodct_detls_id
                                JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
                                JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
                                WHERE pos.branch_id = $branchId AND pos.user_id = $userId
                                ORDER BY pcs.name, pis.name");
        $products = [];
        foreach ($tables as $d) {
            $products[$d->category][] = $d;
        }

        return $products;
    }

    private function openingStock($branchId, $uptoDate,  $userId)
    {

        $user = Auth::user();

        $haveDate = DB::select(
            "SELECT 1 FROM product_opening_stock ps WHERE ps.company_id = ? AND ps.branch_id = ? AND ps.user_id = ? LIMIT 1",
            [(int) $user->company_id, (int) $branchId, (int) $userId]
        );
        if (count($haveDate) > 0) {
            DB::delete(
                "DELETE FROM product_opening_stock WHERE company_id = ? AND branch_id = ? AND user_id = ?",
                [(int) $user->company_id, (int) $branchId, (int) $userId]
            );
        }

        $products = DB::select("SELECT ids.product_id, SUM(ids.stock_in) stock_in, SUM(ids.stock_out) stock_out, SUM(ids.stock_in) - SUM(ids.stock_out) balance
                                FROM inventory_details ids
                                JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
                                JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
                                join product_items pi ON pi.id = ids.product_id
                                WHERE pi.product_type <> 2 AND mtm.company_id = ? AND mtm.branch_id = ? AND mtm.vr_date < ? AND mtm.status = 1
                                GROUP BY ids.product_id
                                HAVING SUM(ids.stock_in) - SUM(ids.stock_out) > 0", [(int) $user->company_id, (int) $branchId, $uptoDate]);

        $products_arr = [];

        foreach ($products as $product) {
            $balanceProduct = $product->balance;
            if ($balanceProduct > 0) {
                $data = $this->fifoProductDetails($branchId, $product->product_id, intval($balanceProduct), $uptoDate);
                $cnt = count($data);
                for ($i = 0; $i < $cnt; $i++) {
                    if ($balanceProduct >= $data[$i]['stock_in']) {

                        $products_arr[$product->product_id][] = $data[$i];
                        $balanceProduct -= $data[$i]['stock_in'];
                    } elseif ($balanceProduct < $data[$i]['stock_in'] && $balanceProduct > 0) {
                        $data[$i]['stock_in'] = $balanceProduct;
                        $products_arr[$product->product_id][] = $data[$i];
                        $balanceProduct  = 0;
                        break;
                    } else {
                        $balanceProduct = 0;
                        break;
                    }
                }
            }
        }

        foreach ($products_arr as $key => $value) {
            foreach ($value as $v) {
                $stockP = [
                    'company_id'      => $user->company_id,
                    'branch_id'       => $branchId,
                    'user_id'         => $userId,
                    'prodct_detls_id' => $v['id'],
                    'pno'             => $v['product_id'],
                    'product_in'      => $v['stock_in'],
                    'purchase_pct'    => $v['purchase_pct'],
                    'rate'            => $v['purchase_price']
                ];
                DB::table('product_opening_stock')->insertGetId($stockP);
            }
        }
        return true;
    }


    private function closingStock($branchId, $uptoDate,  $userId)
    {

        $user = Auth::user();

        $haveDate = DB::select(
            "SELECT 1 FROM product_closing_stock ps WHERE ps.company_id = ? AND ps.branch_id = ? AND ps.user_id = ? LIMIT 1",
            [(int) $user->company_id, (int) $branchId, (int) $userId]
        );
        if (count($haveDate) > 0) {
            DB::delete(
                "DELETE FROM product_closing_stock WHERE company_id = ? AND branch_id = ? AND user_id = ?",
                [(int) $user->company_id, (int) $branchId, (int) $userId]
            );
        }

        $products = DB::select("SELECT ids.product_id, SUM(ids.stock_in) stock_in, SUM(ids.stock_out) stock_out, SUM(ids.stock_in) - SUM(ids.stock_out) balance
                                FROM inventory_details ids
                                JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
                                JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
                                join product_items pi ON pi.id = ids.product_id
                                WHERE pi.product_type <> 2 AND mtm.company_id = ? AND mtm.branch_id = ? AND mtm.vr_date <= ? AND mtm.status = 1
                                GROUP BY ids.product_id
                                HAVING SUM(ids.stock_in) - SUM(ids.stock_out) > 0", [(int) $user->company_id, (int) $branchId, $uptoDate]);


        $products_arr = [];

        foreach ($products as $product) {
            $balanceProduct = $product->balance;
            if ($balanceProduct > 0) {
                $data = $this->fifoProductClosingDetails($branchId, $product->product_id, intval($balanceProduct), $uptoDate);
                $cnt = count($data);
                for ($i = 0; $i < $cnt; $i++) {
                    if ($balanceProduct >= $data[$i]['stock_in']) {

                        $products_arr[$product->product_id][] = $data[$i];
                        $balanceProduct -= $data[$i]['stock_in'];
                    } elseif ($balanceProduct < $data[$i]['stock_in'] && $balanceProduct > 0) {
                        $data[$i]['stock_in'] = $balanceProduct;
                        $products_arr[$product->product_id][] = $data[$i];
                        $balanceProduct  = 0;
                        break;
                    } else {
                        $balanceProduct = 0;
                        break;
                    }
                }
            }
        }

        foreach ($products_arr as $key => $value) {
            foreach ($value as $v) {
                $stockP = [
                    'company_id'      => $user->company_id,
                    'branch_id'       => $branchId,
                    'user_id'         => $userId,
                    'prodct_detls_id' => $v['id'],
                    'pno'             => $v['product_id'],
                    'product_in'      => $v['stock_in'],
                    'purchase_pct'    => $v['purchase_pct'],
                    'rate'            => $v['purchase_price']
                ];
                DB::table('product_closing_stock')->insertGetId($stockP);
            }
        }
    }

    public function categoryWiseProductSales()
    {

        $branchs = reportsProjects();
        $categories = Category::where('status', 1)->orderBy('name', 'asc')->get();

        return view('reports.newreports.category-wise-product-sales', compact('branchs', 'categories'));
    }

    public function categoryWiseProductSalesData(Request $request)
    {


        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));
        $salesProducts = [];
        $reportType = '';
        if ($request->report_type == 1) {
            $reportType = ' Purchase';
            $salesProducts =
                MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
                ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
                ->join('product_items', 'product_items.id', '=', 'inventory_purchase_details.product_id')
                ->join('product_categories', 'product_categories.id', '=', 'product_items.category_id')
                ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
                ->whereBetween('vr_date', [$startDate, $endDate])
                ->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', $request->branch)
                ->where('main_trx_master.status', 1)
                ->where('product_categories.id', $request->category)
                ->select([
                    'product_categories.id',
                    'product_categories.name as cat_name',
                    'product_items.name as product_name',
                    'sys_inv_units.name as unit',
                    DB::raw('SUM( inventory_purchase_details.quantity ) as quantity')
                ])
                ->groupBy('product_categories.id', 'product_categories.name', 'product_items.name', 'sys_inv_units.name')
                ->orderBy('product_categories.name', 'ASC')
                ->orderBy('product_items.name', 'ASC')
                ->get();
        }
        if ($request->report_type == 2) {
            $reportType = ' Sales';
            $salesProducts = DB::select("SELECT cat.id, cat.name cat_name, pis.name product_name, siu.name unit, sum(isd.quantity)  quantity
                                    FROM product_categories cat
                                    JOIN product_items pis ON cat.id = pis.category_id
                                    JOIN inventory_sales_details isd ON isd.product_id = pis.id
                                    JOIN inventory_sales_masters ism ON ism.id = isd.sal_mstr_id
                                    JOIN main_trx_master mtm ON mtm.id = ism.main_trx_id
                                    JOIN sys_inv_units siu ON siu.id = pis.unit_id
                                    WHERE cat.id = $request->category AND mtm.`status` = 1 AND mtm.branch_id = $request->branch AND mtm.vr_date BETWEEN '" . $startDate . "' AND '" . $endDate . "'
                                    GROUP BY cat.id, cat.name, pis.name, siu.name
                                    ORDER BY cat.name, pis.name
                                    ");
        }

        $total = 0;
        if (count($salesProducts) > 0) {
            $inv = '<table class="table table-bordered">
                                                    <caption class="text-center"><span style="font-size: 20px; font-weight: bold;">' . $salesProducts[0]->cat_name . ' ' . $reportType . ' Summary</span></caption>
                                                <thead>
                                                    <tr>
                                                        <th>Items Details</th>
                                                        <th>' . $reportType  . ' Qty.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>';
            foreach ($salesProducts as $salesProduct) {
                $total += $salesProduct->quantity;
                $inv .= '<tr>
                                                        <td>' . $salesProduct->product_name . '</td>
                                                        <td>' . $salesProduct->quantity . ' ' . $salesProduct->unit . '</td>
                                                    </tr>';
            }
            $inv .= "<tr style='font-size: 20px; color: green; font-weight: bold;'>
                                                        <td>Total Sales</td>
                                                        <td>" . $total . "</td>
                                                    </tr>";
            $inv .= "</tbody></table>";
            return $inv;
        }

        return '<h1 class="text-center">No Data Found</h1>';
    }

    private function fifoProductDetails($branchId, $productId, $balanceProduct, $uptoDate)
    {

        $product = DB::table('inventory_details as ids')
            ->join('inventory_masters as ims', 'ims.id', '=', 'ids.inv_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'ims.main_trx_id')
            ->select('ids.id', 'ids.product_id', 'ids.stock_in', 'ids.stock_out', 'ids.purchase_price', 'ids.purchase_pct')
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', (int) $branchId)
            ->whereDate('mtm.vr_date', '<', $uptoDate)
            ->where('mtm.status', 1)
            ->where('ids.product_id', (int) $productId)
            ->where('ids.stock_in', '>', 0)
            ->orderByDesc('ids.id')
            ->limit((int) $balanceProduct)
            ->get();
        return json_decode(json_encode($product), true);;
    }
    private function fifoProductClosingDetails($branchId, $productId, $balanceProduct, $uptoDate)
    {

        $product = DB::table('inventory_details as ids')
            ->join('inventory_masters as ims', 'ims.id', '=', 'ids.inv_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'ims.main_trx_id')
            ->select('ids.id', 'ids.product_id', 'ids.stock_in', 'ids.stock_out', 'ids.purchase_price', 'ids.purchase_pct')
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', (int) $branchId)
            ->whereDate('mtm.vr_date', '<=', $uptoDate)
            ->where('mtm.status', 1)
            ->where('ids.product_id', (int) $productId)
            ->where('ids.stock_in', '>', 0)
            ->orderByDesc('ids.id')
            ->limit((int) $balanceProduct)
            ->get();
        return json_decode(json_encode($product), true);
    }

    public function apiCategoryWiseProductInOut(Request $request)
    {


        $branchId = $request->branch_id;
        $reportType = $request->reportType;
        $categoryId = $request->category_id;
        $startDate = $request->startdate;
        $endDate = $request->enddate;

        if ($request->reportType == 1) {
            $reportType = ' Purchase';

            $query = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
                ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
                ->join('product_items', 'product_items.id', '=', 'inventory_purchase_details.product_id')
                ->join('product_categories', 'product_categories.id', '=', 'product_items.category_id')
                ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')

                // ✅ manufacturer may be null, so LEFT JOIN
                ->leftJoin('product_manufacturers', 'product_manufacturers.id', '=', 'product_items.manufacture_id')

                ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
                ->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', $branchId)
                ->where('main_trx_master.status', 1)
                ->when($categoryId, function ($query, $categoryId) {
                    return $query->where('product_categories.id', '=', $categoryId);
                });

            $data = $query->select([
                'product_categories.id',
                'product_categories.name as cat_name',
                'product_items.name as product_name',
                'sys_inv_units.name as unit',

                // ✅ manufacturer name (null হলে 'N/A')
                // DB::raw("COALESCE(product_manufacturers.name, 'N/A') as manufacturer_name"),
                DB::raw('COALESCE(product_manufacturers.name, "") as brand_name'),

                DB::raw('SUM(inventory_purchase_details.quantity) as quantity'),
            ])
                ->groupBy(
                    'product_categories.name',
                    'product_items.name',
                    'inventory_details.product_id',
                    'sys_inv_units.name',
                    'product_items.manufacture_id',
                    'product_manufacturers.name' // ✅ groupBy তে রাখতে হবে
                )
                ->orderBy('product_categories.name', 'ASC')
                ->orderBy('product_items.name', 'ASC')
                ->get();
        }

        if ($request->reportType == 2) {
            $reportType = ' Sales';

            $query = MainTransactionMaster::join('inventory_sales_masters', 'inventory_sales_masters.main_trx_id', '=', 'main_trx_master.id')
                ->join('inventory_sales_details', 'inventory_sales_details.sal_mstr_id', '=', 'inventory_sales_masters.id')
                ->join('product_items', 'product_items.id', '=', 'inventory_sales_details.product_id')
                ->join('product_categories', 'product_categories.id', '=', 'product_items.category_id')
                ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')

                // ✅ manufacturer may be null, so LEFT JOIN
                ->leftJoin('product_manufacturers', 'product_manufacturers.id', '=', 'product_items.manufacture_id')

                ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
                ->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', $branchId)
                ->where('main_trx_master.status', 1)
                ->when($categoryId, function ($query, $categoryId) {
                    return $query->where('product_categories.id', '=', $categoryId);
                });

            $data = $query->select([
                'product_categories.id',
                'product_categories.name as cat_name',
                'product_items.name as product_name',
                'sys_inv_units.name as unit',

                // ✅ manufacturer name (null হলে 'N/A')
                DB::raw("COALESCE(product_manufacturers.name, 'N/A') as manufacturer_name"),

                DB::raw('SUM(inventory_sales_details.quantity) as quantity'),
            ])
                ->groupBy(
                    'product_categories.id',
                    'product_categories.name',
                    'product_items.name',
                    'sys_inv_units.name',
                    'product_manufacturers.name'
                )
                ->orderBy('product_categories.name', 'ASC')
                ->orderBy('product_items.name', 'ASC')
                ->get();
        }


        if (isset($data)) {
            $slNumber         = 0;
            $totalQty   = 0;

            // Use map to add fields to each record while preserving stdClass objects
            $data->map(function ($record) use (&$slNumber, &$totalQty) {
                $slNumber          += 1;
                $totalQty   += $record->quantity;
                $record->sl_number  = $slNumber;
            });
            return foundData($data);
        }
        return notFound();
    }



    public function getCashBookUpdate($id)
    {
        return $id;
    }

    public function cashBookUpdate(Request $request, $id)
    {
        $id = get_hash($id);
        $credit =  $request->credit[$id];
        $debit =  $request->debit[$id];
        if ($credit > 0 && $debit > 0) {
            return response()->json(['success', 'something went wrong']);
        }
        $transaction = AccTransactionDetails::find($id);

        if (($transaction->debit > 0 && $debit > 0) && ($transaction->credit == 0 &&  $credit == 0)) {

            try {
                $transactionDebit        = AccTransactionDetails::find($id);
                $transactionDebit->debit = $debit;
                $transactionDebit->save();

                $transactionMaster = AccTransactionMaster::find($transactionDebit->trx_mstr_id);
                $transactionCreditAmt = AccTransactionDetails::where('trx_mstr_id', $transactionMaster->id)->get();

                $credit = 0;
                foreach ($transactionCreditAmt as $trCredit) {
                    $credit += $trCredit->debit;
                };

                $creditId = AccTransactionDetails::where('trx_mstr_id', $transactionMaster->id)->where('credit', '>', 0)->first();
                $transactionCredit = AccTransactionDetails::find($creditId->id);

                $transactionCredit->credit = $credit;
                $transactionCredit->save();
                return response()->json(['success' => 'success', 'debit_span' => $debit, 'message' => 'Update successful ' .  $transaction->debit . ' to '  . $debit]);
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        };

        if (($transaction->debit == 0 && $debit == 0) && ($transaction->credit > 0 &&  $credit > 0)) {

            try {
                $transactionCredit         = AccTransactionDetails::find($id);
                $transactionCredit->credit = $credit;
                $transactionCredit->save();

                $transactionMaster = AccTransactionMaster::find($transactionCredit->trx_mstr_id);
                $transactionDebitAmt = AccTransactionDetails::where('trx_mstr_id', $transactionMaster->id)->get();

                $debit = 0;
                foreach ($transactionDebitAmt as $trDebit) {
                    $debit += $trDebit->credit;
                };

                $debitId = AccTransactionDetails::where('trx_mstr_id', $transactionMaster->id)->where('debit', '>', 0)->first();
                $transactionDebit = AccTransactionDetails::find($debitId->id);

                $transactionDebit->debit = $debit;
                $transactionDebit->save();
                return response()->json(['success' => 'success', 'credit_span' => $credit, 'message' => 'Update successful ' . $transaction->credit . ' to ' . $credit]);
            } catch (\Exception $e) {
                return $e->getMessage();
            }
        }
        return $transaction;
    }

    public function overUnder()
    {
        $projects = reportsProjects();
        $trdate = Common::getShowTrDate(Auth::user()->branch_id);
        return view('reports.newreports.over-under', compact('projects', 'trdate'));
    }

    public function overUnderData(Request $request)
    {

        $startDate   = date('Y-m-d', strtotime(str_replace('/', '-', $request->start_date)));
        $endDate     = date('Y-m-d', strtotime(str_replace('/', '-', $request->end_date)));
        $branchId    = $request->branch_id;
        $report_type = $request->report_type;

        if (1 ==  $report_type) {
            $query = MainTransactionMaster::join('inventory_sales_masters', 'inventory_sales_masters.main_trx_id', '=', 'main_trx_master.id')
                ->join('inventory_sales_details', 'inventory_sales_details.sal_mstr_id', '=', 'inventory_sales_masters.id')
                ->join('product_items', function ($join) {
                    $join->on('product_items.id', '=', 'inventory_sales_details.product_id');
                })
                ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
                ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
                ->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', $branchId)
                ->where('inventory_sales_details.weight_variance', '>', 0) // Filter for affected > 0
                ->where('main_trx_master.status', 1);

            if ($request->item_id) {
                $query->where('product_items.id', $request->item_id);
            }

            $query->select([
                'main_trx_master.id as smtm_id',
                'main_trx_master.vr_no as vr_no',
                'main_trx_master.vr_date as vr_date',
                'product_items.name as product_name',
                'sys_inv_units.name as unit_name',
                'inventory_sales_details.quantity as qty',
                'inventory_sales_details.sales_price as rate',
                'inventory_sales_details.weight_variance as affected',
            ]);
            $query = $query->orderBy('main_trx_master.vr_date')->get();
            return view('reports.newreports.templates.reports-templates.over-damage-loop', ['data' => $query, 'report_type' => 'Damage']);
        } else if (2 ==  $report_type) {
            $query = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
                ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
                ->join('product_items', function ($join) {
                    $join->on('product_items.id', '=', 'inventory_purchase_details.product_id');
                })
                ->join('sys_inv_units', 'sys_inv_units.id', '=', 'product_items.unit_id')
                ->whereBetween('vr_date', [$startDate, $endDate])
                ->where('main_trx_master.company_id', auth()->user()->company_id)
                ->where('main_trx_master.branch_id', $branchId)
                ->where('inventory_purchase_details.weight_variance', '>', 0) // Filter for affected > 0
                ->where('main_trx_master.status', 1);
            if ($request->item_id) {
                $query->where('product_items.id', $request->item_id);
            }
            $query->select([
                'main_trx_master.id as smtm_id',
                'main_trx_master.vr_no as vr_no',
                'main_trx_master.vr_date as vr_date',
                'product_items.name as product_name',
                'sys_inv_units.name as unit_name',
                'inventory_purchase_details.quantity as qty',
                'inventory_purchase_details.purchase_price as rate',
                'inventory_purchase_details.weight_variance as affected'
            ]);
            // return $query;
            $query = $query->orderBy('main_trx_master.vr_date')->get();
            return view('reports.newreports.templates.reports-templates.over-damage-loop', ['data' => $query, 'report_type' => 'Over']);
        }
    }

    public function productStockData(Request $request)
    {
        $branchId    = $request->filled('branch_id') ? (int) $request->branch_id : null;
        $categoryId  = $request->filled('category_id') ? (int) $request->category_id : null;
        $brandId     = $request->filled('brand_id') ? (int) $request->brand_id : null;
        $productName = $request->filled('product_name') ? trim((string) $request->product_name) : null;
        $user = Auth::user();

        $startDate = $request->startdate;
        $endDate   = $request->enddate;

        // =========================
        // Opening Stock Information
        // =========================
        $openingStock = MainTransactionMaster::join('inventory_masters', 'inventory_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_details', 'inventory_details.inv_mstr_id', '=', 'inventory_masters.id')
            ->join('product_items', 'product_items.id', '=', 'inventory_details.product_id')
            ->join('product_types', 'product_types.id', '=', 'product_items.product_type')
            ->join('product_categories', 'product_categories.id', '=', 'product_items.category_id')
            ->join('sys_inv_units', 'product_items.unit_id', '=', 'sys_inv_units.id')
            ->leftJoin('product_manufacturers', 'product_manufacturers.id', '=', 'product_items.manufacture_id')
            ->where('product_types.id', '<>', 2)
            ->where('main_trx_master.vr_date', '<', $startDate)
            ->where('main_trx_master.company_id', $user->company_id)
            // ->where('main_trx_master.branch_id', $branchId)
            ->where('main_trx_master.status', 1)
            ->select([
                'inventory_details.product_id as product_id',
                'product_items.name as product_name',
                'product_items.category_id as category_id',
                DB::raw('TRIM(product_categories.name) as cat_name'),
                // ✅ ONLY_FULL_GROUP_BY safe
                DB::raw('MAX(COALESCE(product_manufacturers.name, "")) as brand_name'),
                'sys_inv_units.name as unit',

                DB::raw('SUM(inventory_details.stock_in) - SUM(inventory_details.stock_out) as opening'),
                DB::raw('0 as stock_in'),
                DB::raw('0 as stock_out'),
            ])
            ->groupBy(
                'inventory_details.product_id',
                'product_items.name',
                'product_items.category_id',
                DB::raw('TRIM(product_categories.name)'),
                'sys_inv_units.name'
            )
            ->havingRaw('opening <> 0');

        if (!is_null($branchId)) {
            // $openingStock->where('main_trx_master.company_id', auth()->user()->company_id)
            $openingStock->where('main_trx_master.branch_id', $branchId);
        }
        if (!is_null($brandId)) {
            $openingStock->where('product_items.manufacture_id', $brandId);
        }
        if (!is_null($categoryId)) {
            $openingStock->where('product_items.category_id', $categoryId);
        }
        if (!is_null($productName)) {
            $openingStock->where('product_items.name', 'LIKE', "%{$productName}%");
        }

        // =========================
        // Range Stock Information
        // =========================
        $stockRangeDetails = MainTransactionMaster::join('inventory_masters', 'inventory_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_details', 'inventory_details.inv_mstr_id', '=', 'inventory_masters.id')
            ->join('product_items', 'product_items.id', '=', 'inventory_details.product_id')
            ->join('product_types', 'product_types.id', '=', 'product_items.product_type')
            ->join('product_categories', 'product_categories.id', '=', 'product_items.category_id')
            ->join('sys_inv_units', 'product_items.unit_id', '=', 'sys_inv_units.id')
            ->leftJoin('product_manufacturers', 'product_manufacturers.id', '=', 'product_items.manufacture_id')
            ->where('product_types.id', '<>', 2)
            ->whereBetween('main_trx_master.vr_date', [$startDate, $endDate])
            ->where('main_trx_master.company_id', $user->company_id)
            // ->where('main_trx_master.branch_id', $branchId)
            ->where('main_trx_master.status', 1)
            ->select([
                'inventory_details.product_id as product_id',
                'product_items.name as product_name',
                'product_items.category_id as category_id',
                DB::raw('TRIM(product_categories.name) as cat_name'),
                // ✅ ONLY_FULL_GROUP_BY safe
                DB::raw('MAX(COALESCE(product_manufacturers.name, "")) as brand_name'),
                'sys_inv_units.name as unit',

                DB::raw('0 as opening'),
                DB::raw('SUM(inventory_details.stock_in) as stock_in'),
                DB::raw('SUM(inventory_details.stock_out) as stock_out'),
            ])
            ->groupBy(
                'inventory_details.product_id',
                'product_items.name',
                'product_items.category_id',
                DB::raw('TRIM(product_categories.name)'),
                'sys_inv_units.name'
            )
            ->havingRaw('(SUM(inventory_details.stock_in) - SUM(inventory_details.stock_out)) <> 0');

        // $stockRangeDetails->where('main_trx_master.company_id', auth()->user()->company_id);
        if (!is_null($branchId)) {
            $stockRangeDetails->where('main_trx_master.branch_id', $branchId);
        }
        if (!is_null($brandId)) {
            $stockRangeDetails->where('product_items.manufacture_id', $brandId);
        }
        if (!is_null($categoryId)) {
            $stockRangeDetails->where('product_items.category_id', $categoryId);
        }
        if (!is_null($productName)) {
            $stockRangeDetails->where('product_items.name', 'LIKE', "%{$productName}%");
        }

        // =========================
        // Union + Combine by product
        // =========================
        $data = $openingStock->union($stockRangeDetails)->get();

        $combinedData = $data->groupBy('product_id')->map(function ($items) {
            $firstItem = $items->first();

            $opening  = $items->sum(fn($i) => (float) $i->opening);
            $stockIn  = $items->sum(fn($i) => (float) $i->stock_in);
            $stockOut = $items->sum(fn($i) => (float) $i->stock_out);

            return [
                'product_id'   => $firstItem->product_id,
                'category_id'  => $firstItem->category_id,
                'cat_name'     => $firstItem->cat_name,
                'brand_name'   => $firstItem->brand_name,
                'product_name' => $firstItem->product_name,
                'unit'         => $firstItem->unit,
                'opening'      => $opening,
                'stock_in'     => $stockIn,
                'stock_out'    => $stockOut,
                'balance'      => $opening + $stockIn - $stockOut,
            ];
        })
            ->values()
            ->sortBy([
                ['category_id', 'asc'],
                ['product_name', 'asc'],
            ])
            ->values();

        $combinedDataWithSerial = $combinedData->map(function ($item, $index) {
            $item['sl_number'] = $index + 1;
            return $item;
        });

        if ($combinedDataWithSerial->count() > 0) {
            return foundData($combinedDataWithSerial);
        }

        return notFound();
    }

    public function stockImei(Request $request)
    {
        $branchId = Auth::user()->branch_id;
        $imei = $request->imei;
        // return $request;
        $branchs = Branch::active()->get();
        return view('reports.newreports.imei_ledger', compact('branchs'));
    }

    public function stockImeiData(Request $request)
    {

        $branchId = $request['branch_id'];
        $item_id = $request['item_id'];

        $purchase = MainTransactionMaster::join('inventory_purchase_masters', 'inventory_purchase_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_purchase_details', 'inventory_purchase_details.pur_mstr_id', '=', 'inventory_purchase_masters.id')
            ->when(isset($branchId), function ($query) use ($branchId) {
                return $query->where('main_trx_master.company_id', auth()->user()->company_id)
                    ->where('main_trx_master.branch_id', $branchId);
            })
            ->where('inventory_purchase_details.product_id', $item_id)
            ->where('main_trx_master.status', 1)
            ->select([
                'inventory_purchase_details.serial_no as serial_no',
            ])->get();


        $sales = MainTransactionMaster::join('inventory_sales_masters', 'inventory_sales_masters.main_trx_id', '=', 'main_trx_master.id')
            ->join('inventory_sales_details', 'inventory_sales_details.sal_mstr_id', '=', 'inventory_sales_masters.id')
            ->when(isset($branchId), function ($query) use ($branchId) {
                return $query->where('main_trx_master.company_id', auth()->user()->company_id)
                    ->where('main_trx_master.branch_id', $branchId);
            })
            ->where('inventory_sales_details.product_id', $item_id)
            ->where('main_trx_master.status', 1)
            ->select([
                'inventory_sales_details.serial_no as serial_no',
            ])->get();

        $purchaseImeis = [];
        foreach ($purchase as $item) {
            // Split the serial numbers by comma or " "
            $innerIemi = preg_split('/[,\s]+/', $item['serial_no']);

            foreach ($innerIemi as $imei) {
                // Add each serial number to the $purchaseImeis array
                $purchaseImeis[] = trim($imei); // Use trim() to remove any extra spaces
            }
        }

        $salesImeis = [];
        foreach ($sales as $salesItem) {
            // Split the serial numbers by comma or " "
            $innerIemi = preg_split('/[,\s]+/', $salesItem['serial_no']);
            foreach ($innerIemi as $imei) {
                // Add each serial number to the $salesImeis array
                $salesImeis[] = trim($imei); // Use trim() to remove any extra spaces
            }
        }
        $reservedImeis = $valuesNotInArray2 = array_diff($purchaseImeis, $salesImeis);
        $reindexedValues = array_values($reservedImeis);

        $result = array_combine(range(1, count($reindexedValues)), $reindexedValues);

        return foundData($result);
    }


    public function mitchMatchReport(Request $request)
    {

        $branchId = $request->branch_id;
        $data = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->select(
                DB::raw('ROW_NUMBER() OVER(ORDER BY mtm.vr_no) as serial_number'),
                'mtm.vr_no',
                'mtm.vr_date',
                DB::raw('SUM(atd.debit) as total_debit'),
                DB::raw('SUM(atd.credit) as total_credit'),
                DB::raw('SUM(atd.debit) - SUM(atd.credit) as difference')
            )
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->where('mtm.status', 1)
            ->groupBy('mtm.vr_no', 'mtm.vr_date')
            ->havingRaw('SUM(atd.debit) - SUM(atd.credit) <> 0')
            ->get();

        if (isset($data)) {
            return foundData($data);
        }
        return notFound();
    }

    // public function testPdf()
    // {
    //     $party = PartyInfo::find(1);
    //     $pdf = Pdf::loadView('api-reports.test', ['party' => $party]);
    //     return $pdf->stream('party-ledger.pdf');
    // }

    public function labourLedgerData(Request $request)
    {
        $user = auth()->user();
        $branchId = $request->branchId;
        $ledgerId = $request->ledgerId;
        $labourId = $request->labourId;
        $startDate = $request->startDate ? date('Y-m-d', strtotime(str_replace('/', '-', $request->startDate))) : null;
        $endDate = $request->endDate ? date('Y-m-d', strtotime(str_replace('/', '-', $request->endDate))) : null;

        $query = MainTransactionMaster::with([
            'inventoryLabourMaster.inventoryLabourDetails' => function ($q) use ($labourId) {
                if ($labourId) {
                    $q->where('labour_id', $labourId);
                }
            },
            'inventoryLabourMaster.inventoryLabourDetails.labourItem',
            'AccTransactionMaster.AccTransactionDetails.CoaL4'
        ])
            ->where('status', 1)
            ->whereHas('inventoryLabourMaster.inventoryLabourDetails', function ($q) use ($labourId) {
                if ($labourId) {
                    $q->where('labour_id', $labourId);
                }
            })

            ->when($branchId, function ($query) use ($branchId) {
                return $query->where('branch_id', $branchId);
            })
            ->when($ledgerId, function ($query) use ($ledgerId) {
                $query->whereHas('inventoryLabourMaster', function ($q) use ($ledgerId) {
                    $q->where('supplier_id', $ledgerId);
                });
            })
            ->when($startDate && $endDate, function ($query) use ($startDate, $endDate) {
                $query->whereBetween('vr_date', [$startDate, $endDate]);
            })
            ->orderBy('vr_date', 'asc')
            ->orderBy('vr_no', 'asc')
            ->get();


        $branch = Branch::where('company_id', $user->company_id)->pluck('name', 'id');

        $groupedDetails = collect();

        foreach ($query as $master) {
            $paymentAmount = 0;

            // AccTransactionMaster and detail from paymentAmount sum
            foreach ($master->AccTransactionMaster ?? [] as $accMaster) {
                foreach ($accMaster->AccTransactionDetails ?? [] as $trxDetail) {
                    if (
                        intval($trxDetail->coa4_id) === 17 &&
                        floatval($trxDetail->credit) > 0
                    ) {
                        $paymentAmount += floatval($trxDetail->credit);
                    }
                }
            }

            // Central Law College

            $branchName = $branch[$master->branch_id] ?? 'Unknown';

            foreach ($master->inventoryLabourMaster ?? [] as $labourMaster) {
                foreach ($labourMaster->inventoryLabourDetails ?? [] as $detail) {
                    $labourName = $detail->labourItem->name ?? 'Unknown';
                    $groupedDetails->push([
                        'vr_no'                => $master->vr_no,
                        'vr_date'              => $master->vr_date,
                        'group_key'            => $labourName,
                        'branch_id'            => $master->branch_id,
                        'branch_name'          => $branchName,
                        'note'                 => $labourMaster->notes ?? '',
                        // 'coa4_name'            => $master->AccTransactionMaster->flatMap->AccTransactionDetails->filter(fn($d) => $d->CoaL4)->last()->CoaL4->name ?? 'Unknown',
                        'coa4_name' => collect($master->AccTransactionMaster ?? [])
                            ->flatMap(fn($accMaster) => $accMaster->AccTransactionDetails ?? [])
                            ->filter(fn($d) => floatval($d->credit) > 0 && intval($d->coa4_id) !== 17 && $d->CoaL4)
                            ->last()->CoaL4->name ?? $master->AccTransactionMaster->flatMap->AccTransactionDetails->filter(fn($d) => $d->CoaL4)->first()->CoaL4->name,
                        'labour_id'            => $detail->labour_id,
                        'labour_name'          => $labourName,
                        'qty'                  => floatval($detail->quantity),
                        'rate'                 => floatval($detail->purchase_price),
                        'total'                => floatval($detail->quantity) * floatval($detail->purchase_price),
                        'payment_this_invoice' => $paymentAmount,
                        'labour_item'          => $detail->labour_item,
                    ]);
                }
            }
        }


        $grouped = $groupedDetails->groupBy('branch_name')->map(function ($branchGroup) {
            return $branchGroup->groupBy('group_key')->map(function ($labourGroup) {
                return $labourGroup->values();
            });
        });
        return foundData(
            // $query
            $grouped
        );
    }


    public function cashBookQuerySelfQuery($branchId, $startDate, $endDate)
    {
        $openingBalance = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('mtm.vr_date', '<', $startDate)
            ->where('atd.coa4_id', '!=', 17)
            ->selectRaw("
        NULL as mtm_id, '' as vr_no, 'Opening Balance' as nam, '' as vr_date, '' as approved_by,
        NULL as is_approved, NULL as voucher_type_id, NULL as note, NULL as id, NULL as trx_mstr_id, NULL as coa4_id,
        NULL as pay_branch, NULL as branch_id, NULL as remarks,
        CASE WHEN SUM(atd.debit) - SUM(atd.credit) > 0 THEN SUM(atd.debit) - SUM(atd.credit) ELSE 0 END as debit,
        CASE WHEN SUM(atd.credit) - SUM(atd.debit) > 0 THEN SUM(atd.credit) - SUM(atd.debit) ELSE 0 END as credit,
        NULL as status");


        $normalTransactions = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->whereNotIn('acl4.id', [23, 40])
            ->where('atd.coa4_id', '!=', 17)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereRaw("SUBSTRING(mtm.vr_no, 1, 1) = '1'")
                    ->orWhereRaw("SUBSTRING(mtm.vr_no, 1, 1) = '2'");
            })
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                'acl4.name as nam',
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.debit',
                'atd.credit',
                'atd.status',
            ]);

        $sales = DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', auth()->user()->company_id)
            ->where('mtm.branch_id', $branchId)
            ->whereIn('mtm.transaction_type', [1, 2])
            ->where('atm.voucher_type_id', 1)
            ->whereNotIn('acl4.id', [23, 40])
            ->where('atd.coa4_id', 17)
            ->whereBetween('mtm.vr_date', [$startDate, $endDate])
            ->whereRaw("SUBSTRING(mtm.vr_no, 1, 1) = '3'")
            ->select([
                'mtm.id as mtm_id',
                'mtm.vr_no',
                DB::raw("'Sales' as nam"),
                'mtm.vr_date',
                'mtm.approved_by',
                'mtm.is_approved',
                'atm.voucher_type_id',
                'atm.note',
                'atd.id',
                'atd.trx_mstr_id',
                'atd.coa4_id',
                'atd.pay_branch',
                'mtm.branch_id',
                'atd.remarks',
                'atd.credit as debit',
                'atd.debit as credit',
                'atd.status',
            ]);

        $transfers = DB::select("
    SELECT a.mtm_id, a.vr_no, b.nam, a.vr_date, a.approved_by, a.is_approved, a.voucher_type_id,
    a.note, a.id, a.trx_mstr_id, b.coa4_id, a.pay_branch, a.branch_id, a.remarks,
    a.credit debit, a.debit credit, a.STATUS
    FROM
        (
        SELECT mtm.id as mtm_id, mtm.vr_no, acl4.name nam, mtm.vr_date, mtm.approved_by, mtm.is_approved,
        atm.voucher_type_id, atm.note, atd.id, atd.trx_mstr_id, atd.coa4_id, atd.pay_branch,
        mtm.branch_id, atd.remarks, atd.debit, atd.credit, atd.status
        FROM acc_transaction_details atd
        JOIN acc_transaction_master atm ON atm.id = atd.trx_mstr_id
        JOIN main_trx_master mtm ON mtm.id = atm.main_trx_id
        JOIN acc_coa_level4s acl4 ON acl4.id = atd.coa4_id
        JOIN acc_coa_level3s acl3 ON acl3.id = acl4.acc_coa_level3_id
        WHERE mtm.branch_id = ? AND vr_date BETWEEN ? AND ? AND acl3.acc_source_id <> 8
        AND trx_mstr_id IN (SELECT trx_mstr_id FROM acc_transaction_details WHERE coa4_id = 17)
        AND atd.coa4_id = 17
        ) a,
        (
        SELECT mtm.id as mtm_id, mtm.vr_no, acl4.name nam, mtm.vr_date, mtm.approved_by, mtm.is_approved,
        atm.voucher_type_id, atm.note, atd.id, atd.trx_mstr_id, atd.coa4_id, atd.pay_branch,
        mtm.branch_id, atd.remarks, atd.debit, atd.credit, atd.status
        FROM acc_transaction_details atd
        JOIN acc_transaction_master atm ON atm.id = atd.trx_mstr_id
        JOIN main_trx_master mtm ON mtm.id = atm.main_trx_id
        JOIN acc_coa_level4s acl4 ON acl4.id = atd.coa4_id
        JOIN acc_coa_level3s acl3 ON acl3.id = acl4.acc_coa_level3_id
        WHERE atm.voucher_type_id = 2 AND atd.coa4_id <> 17 AND mtm.branch_id = ?
        AND vr_date BETWEEN ? AND ? AND acl3.acc_source_id = 8
        AND trx_mstr_id IN (SELECT trx_mstr_id FROM acc_transaction_details WHERE coa4_id = 17)
        ) b WHERE a.mtm_id = b.mtm_id", [$branchId, $startDate, $endDate, $branchId, $startDate, $endDate]);

        $finalQuery = $openingBalance
            ->unionAll($normalTransactions)
            ->unionAll($sales)
            // ->unionAll($purchase)
            // ->unionAll($labourInvoice)
            // Can't union raw results from DB::select, so you'll need to merge manually
            ->orderBy('vr_date')
            ->orderBy('mtm_id')
            ->get();
    }


    public function apiProductProfitLoss(Request $request)
    {
        $user = Auth::user();
        $branchId = (int) ($request->branchId ?? $request->branch_id ?? $user->branch_id);
        $startDateInput = $request->startDate ?? $request->startdate;
        $endDateInput = $request->endDate ?? $request->enddate;

        if (!$branchId || !$startDateInput || !$endDateInput) {
            return notFound('Branch, start date and end date are required.', 422);
        }

        $startDate = bd_to_us_date($startDateInput);
        $endDate = bd_to_us_date($endDateInput);

        $this->openingStock($branchId, $startDate, $user->id);
        $this->closingStock($branchId, $endDate, $user->id);

        $salesRows = collect(DB::select(
            "SELECT
                mtm.id AS mid,
                mtm.vr_no,
                mtm.vr_date,
                isd.product_id,
                pi.name AS product_name,
                SUM(isd.quantity) AS sold_qty,
                SUM(isd.quantity * isd.sales_price) AS sale_total
            FROM inventory_sales_details isd
            JOIN inventory_sales_masters ism ON ism.id = isd.sal_mstr_id
            JOIN main_trx_master mtm ON mtm.id = ism.main_trx_id
            JOIN product_items pi ON pi.id = isd.product_id
            WHERE mtm.company_id = ?
              AND mtm.branch_id = ?
              AND mtm.status = 1
              AND mtm.vr_date BETWEEN ? AND ?
            GROUP BY mtm.id, mtm.vr_no, mtm.vr_date, isd.product_id, pi.name
            ORDER BY mtm.vr_date ASC, mtm.vr_no ASC, pi.name ASC",
            [(int) $user->company_id, $branchId, $startDate, $endDate]
        ));

        $openingMap = $this->productProfitLossStockMap('product_opening_stock', (int) $user->company_id, $branchId, (int) $user->id);
        $closingMap = $this->productProfitLossStockMap('product_closing_stock', (int) $user->company_id, $branchId, (int) $user->id);
        $periodInMap = $this->productProfitLossPeriodInMap((int) $user->company_id, $branchId, $startDate, $endDate);
        $openingLayersByProduct = $this->productProfitLossStockLayers('product_opening_stock', (int) $user->company_id, $branchId, (int) $user->id);
        $periodInLayersByProduct = $this->productProfitLossPeriodInLayers((int) $user->company_id, $branchId, $startDate, $endDate);

        $layerState = [];
        $periodInLayerIndex = [];

        $items = $salesRows->map(function ($row, $index) use (
            $openingMap,
            $closingMap,
            $periodInMap,
            $openingLayersByProduct,
            $periodInLayersByProduct,
            &$layerState,
            &$periodInLayerIndex
        ) {
            $productId = (int) $row->product_id;
            $soldQty = (float) $row->sold_qty;
            $saleTotal = round((float) $row->sale_total, 2);

            $openingQty = (float) ($openingMap[$productId]->qty ?? 0);
            $openingAmount = round((float) ($openingMap[$productId]->amount ?? 0), 2);

            $periodInQty = (float) ($periodInMap[$productId]->qty ?? 0);
            $periodInAmount = round((float) ($periodInMap[$productId]->amount ?? 0), 2);

            $closingQty = (float) ($closingMap[$productId]->qty ?? 0);
            $closingAmount = round((float) ($closingMap[$productId]->amount ?? 0), 2);

            if (!array_key_exists($productId, $layerState)) {
                $layerState[$productId] = $openingLayersByProduct[$productId] ?? [];
                $periodInLayerIndex[$productId] = 0;
            }

            $currentLayers = $layerState[$productId];
            $currentPurchaseIndex = $periodInLayerIndex[$productId];
            $periodInLayers = $periodInLayersByProduct[$productId] ?? [];

            while (isset($periodInLayers[$currentPurchaseIndex]) && $periodInLayers[$currentPurchaseIndex]['vr_date'] <= $row->vr_date) {
                $currentLayers[] = $periodInLayers[$currentPurchaseIndex];
                $currentPurchaseIndex++;
            }

            [$purchaseTotal, $costWarning] = $this->productProfitLossConsumeLayers($currentLayers, $soldQty);

            $layerState[$productId] = $currentLayers;
            $periodInLayerIndex[$productId] = $currentPurchaseIndex;

            $purchaseTotal = round($purchaseTotal, 2);
            $unitPurchaseRate = $soldQty > 0 ? round($purchaseTotal / $soldQty, 2) : null;
            $unitSaleRate = $soldQty > 0 ? round($saleTotal / $soldQty, 2) : 0;
            $profit = round($saleTotal - $purchaseTotal, 2);

            $warning = null;
            if ($purchaseTotal <= 0) {
                $warning = 'Purchase cost not found';
            } elseif ($costWarning) {
                $warning = $costWarning;
            } elseif (($openingQty + $periodInQty) < $soldQty) {
                $warning = 'Sold qty exceeds tracked stock';
            } elseif (($openingAmount + $periodInAmount) < $closingAmount) {
                $warning = 'Stock valuation mismatch';
            }

            return [
                'sl' => $index + 1,
                'mid' => (int) $row->mid,
                'vr_no' => $row->vr_no,
                'vr_date' => $row->vr_date ? us_to_bd_date($row->vr_date) : null,
                'product_id' => $productId,
                'product_name' => $row->product_name,
                'sold_qty' => round($soldQty, 2),
                'opening_qty' => round($openingQty, 2),
                'opening_amount' => $openingAmount,
                'period_in_qty' => round($periodInQty, 2),
                'period_in_amount' => $periodInAmount,
                'closing_qty' => round($closingQty, 2),
                'closing_amount' => $closingAmount,
                'purchase_total' => $purchaseTotal,
                'unit_purchase_rate' => $unitPurchaseRate,
                'sale_total' => $saleTotal,
                'unit_sale_rate' => $unitSaleRate,
                'profit' => $profit,
                'warning' => $warning,
            ];
        })->values();

        $items = $items
            ->groupBy('product_id')
            ->flatMap(function ($productRows, $productId) use ($openingMap, $closingMap, $periodInMap) {
                $openingAmount = round((float) ($openingMap[$productId]->amount ?? 0), 2);
                $periodInAmount = round((float) ($periodInMap[$productId]->amount ?? 0), 2);
                $closingAmount = round((float) ($closingMap[$productId]->amount ?? 0), 2);

                $expectedPurchaseTotal = round($openingAmount + $periodInAmount - $closingAmount, 2);
                $allocatedPurchaseTotal = round((float) $productRows->sum('purchase_total'), 2);
                $difference = round($expectedPurchaseTotal - $allocatedPurchaseTotal, 2);

                if (abs($difference) >= 0.01 && $productRows->isNotEmpty()) {
                    $targetIndex = $productRows->search(function ($row) {
                        return !empty($row['warning']);
                    });

                    if ($targetIndex === false) {
                        $targetIndex = $productRows->keys()->last();
                    }

                    $targetRow = $productRows->get($targetIndex);
                    $targetRow['purchase_total'] = round((float) $targetRow['purchase_total'] + $difference, 2);
                    $targetRow['unit_purchase_rate'] = (float) $targetRow['sold_qty'] > 0
                        ? round($targetRow['purchase_total'] / (float) $targetRow['sold_qty'], 2)
                        : null;
                    $targetRow['profit'] = round((float) $targetRow['sale_total'] - (float) $targetRow['purchase_total'], 2);
                    $targetRow['warning'] = !empty($targetRow['warning'])
                        ? 'Reconciled with gross profit summary'
                        : null;

                    $productRows->put($targetIndex, $targetRow);
                }

                return $productRows->values();
            })
            ->values()
            ->map(function ($row, $index) {
                $row['sl'] = $index + 1;
                return $row;
            })
            ->values();

        $summary = [
            'total_qty' => round((float) $items->sum('sold_qty'), 2),
            'total_purchase' => round((float) $items->sum('purchase_total'), 2),
            'total_sales' => round((float) $items->sum('sale_total'), 2),
            'total_profit' => round((float) $items->sum('profit'), 2),
            'warning_count' => $items->filter(fn($item) => !empty($item['warning']))->count(),
        ];

        return foundData([
            'summary' => $summary,
            'items' => $items,
            'meta' => [
                'branch_id' => $branchId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    private function productProfitLossStockMap(string $table, int $companyId, int $branchId, int $userId)
    {
        return collect(DB::select(
            "SELECT
                pno AS product_id,
                SUM(product_in) AS qty,
                SUM(ROUND(product_in * rate) - ((ROUND(product_in * rate) * purchase_pct) / 100)) AS amount
            FROM {$table}
            WHERE company_id = ?
              AND branch_id = ?
              AND user_id = ?
            GROUP BY pno",
            [$companyId, $branchId, $userId]
        ))->keyBy('product_id');
    }

    private function productProfitLossPeriodInMap(int $companyId, int $branchId, string $startDate, string $endDate)
    {
        return collect(DB::select(
            "SELECT
                ids.product_id,
                SUM(ids.stock_in) AS qty,
                SUM(ROUND(ids.stock_in * ids.purchase_price) - ((ROUND(ids.stock_in * ids.purchase_price) * ids.purchase_pct) / 100)) AS amount
            FROM inventory_details ids
            JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
            JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
            WHERE mtm.company_id = ?
              AND mtm.branch_id = ?
              AND mtm.status = 1
              AND mtm.vr_date BETWEEN ? AND ?
              AND ids.stock_in > 0
            GROUP BY ids.product_id",
            [$companyId, $branchId, $startDate, $endDate]
        ))->keyBy('product_id');
    }

    private function productProfitLossStockLayers(string $table, int $companyId, int $branchId, int $userId): array
    {
        $layers = collect(DB::select(
            "SELECT
                pno AS product_id,
                product_in AS qty,
                rate,
                purchase_pct,
                prodct_detls_id
            FROM {$table}
            WHERE company_id = ?
              AND branch_id = ?
              AND user_id = ?
            ORDER BY pno ASC, prodct_detls_id ASC",
            [$companyId, $branchId, $userId]
        ));

        return $layers
            ->groupBy('product_id')
            ->map(fn($group) => $group->map(function ($layer) {
                return [
                    'remaining_qty' => (float) $layer->qty,
                    'rate' => (float) $layer->rate,
                    'purchase_pct' => (float) $layer->purchase_pct,
                    'vr_date' => null,
                ];
            })->values()->all())
            ->all();
    }

    private function productProfitLossPeriodInLayers(int $companyId, int $branchId, string $startDate, string $endDate): array
    {
        $layers = collect(DB::select(
            "SELECT
                ids.product_id,
                ids.stock_in AS qty,
                ids.purchase_price AS rate,
                ids.purchase_pct,
                mtm.vr_date,
                mtm.id AS mtm_id,
                ids.id AS detail_id
            FROM inventory_details ids
            JOIN inventory_masters ims ON ims.id = ids.inv_mstr_id
            JOIN main_trx_master mtm ON mtm.id = ims.main_trx_id
            WHERE mtm.company_id = ?
              AND mtm.branch_id = ?
              AND mtm.status = 1
              AND mtm.vr_date BETWEEN ? AND ?
              AND ids.stock_in > 0
            ORDER BY ids.product_id ASC, mtm.vr_date ASC, mtm.id ASC, ids.id ASC",
            [$companyId, $branchId, $startDate, $endDate]
        ));

        return $layers
            ->groupBy('product_id')
            ->map(fn($group) => $group->map(function ($layer) {
                return [
                    'remaining_qty' => (float) $layer->qty,
                    'rate' => (float) $layer->rate,
                    'purchase_pct' => (float) $layer->purchase_pct,
                    'vr_date' => $layer->vr_date,
                ];
            })->values()->all())
            ->all();
    }

    private function productProfitLossConsumeLayers(array &$layers, float $requiredQty): array
    {
        $remainingQty = $requiredQty;
        $cost = 0.0;

        foreach ($layers as $index => $layer) {
            if ($remainingQty <= 0) {
                break;
            }

            $availableQty = (float) ($layer['remaining_qty'] ?? 0);
            if ($availableQty <= 0) {
                continue;
            }

            $consumeQty = min($availableQty, $remainingQty);
            $gross = $consumeQty * (float) ($layer['rate'] ?? 0);
            $net = $gross - (($gross * (float) ($layer['purchase_pct'] ?? 0)) / 100);

            $cost += $net;
            $layers[$index]['remaining_qty'] = round($availableQty - $consumeQty, 6);
            $remainingQty -= $consumeQty;
        }

        $warning = $remainingQty > 0.000001 ? 'Purchase cost partially matched from stock layers' : null;

        return [round($cost, 2), $warning];
    }

    public function apiProfitLoss(Request $request)
    {
        $user = Auth::user();
        $branchId = $user->branch_id;
        $startDate = bd_to_us_date($request->startDate);
        $endDate = bd_to_us_date($request->endDate);

        $this->openingStock($branchId, $startDate,  $user->id);

        $this->closingStock($branchId, $endDate,  $user->id);

        $request->merge([
            'startdate' => $startDate,
            'enddate'   => $endDate,
            'branch_id' => $branchId,
        ]);
        $data = $this->profitLossData($request);


        if (isset($data)) {
            return foundData($data);
        }
        return notFound();
    }

    public function apiBalanceSheet(Request $request)
    {
        $user = Auth::user();
        $branchId = $request->branchId ?? $user->branch_id;

        $request->merge([
            'startdate' => $request->startDate,
            'enddate'   => $request->endDate,
            'branch_id' => $branchId,
        ]);

        $data = $this->balanceSheetData($request);

        if (isset($data)) {
            return foundData($data);
        }

        return notFound();
    }

    public function apiClosingStockItems(Request $request)
    {
        $user = auth()->user();
        $companyId = $user->company_id;
        $branchId  = $user->branch_id;
        $userId    = $user->id;

        if (!$companyId || !$branchId || !$userId) {
            return response()->json([
                'message' => 'Authenticated company, branch, and user context are required'
            ], 422);
        }


        $rows = ProductClosingStock::query()
            ->with([
                // ✅ manufacture_id MUST be selected for brand relation
                'item:id,name,category_id,unit_id,manufacture_id',
                'item.category:id,name',
                'item.unit:id,name',
                'item.brand:id,name',

                'inventoryDetail:id,inv_mstr_id',
                'inventoryDetail.master:id,main_trx_id',
                'inventoryDetail.master.mainTrx:id,vr_no',
            ])
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('user_id', $userId)
            ->get();

        $tables = $rows->map(function ($pcs) {
            $gross = ((float)$pcs->product_in) * ((float)$pcs->rate);
            $totalStock = $gross - (($gross / 100) * (float)$pcs->purchase_pct);

            return (object) [
                'id'           => $pcs->inventoryDetail?->master?->mainTrx?->id,
                'vr_no'        => $pcs->inventoryDetail?->master?->mainTrx?->vr_no,

                // Product Name
                'product_name' => $pcs->item?->name ?? '',

                // Category Name
                'category'     => $pcs->item?->category?->name ?? '',

                // ✅ brand name
                'brand'        => $pcs->item?->brand?->name ?? '',


                'prodct_detls_id' => $pcs->prodct_detls_id,
                'unit'            => $pcs->item?->unit?->name ?? '',

                'stock'        => $pcs->product_in,
                'rate'         => $pcs->rate,
                'purchase_pct' => $pcs->purchase_pct,
                'total_stock'  => $totalStock,
            ];
        })
            ->sortBy([['brand', 'asc'], ['category', 'asc'], ['product_name', 'asc']])
            ->values();

        $products = $tables->groupBy('brand')
            ->map(fn($g) => $g->values())
            ->toArray();
        if (!empty($products)) {
            return foundData($products);
        }
        return notFound("No stock items found for the given criteria.");
    }


    public function getOpeningBalance(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer'],
            'ledger_id' => ['required', 'integer'],
            'start_date' => ['required', 'date'],
        ]);

        $companyId = auth()->user()->company_id;
        $branchId  = (int) $validated['branch_id'];
        $ledgerId  = (int) $validated['ledger_id'];
        $startDate = $validated['start_date'];

        $openingBalance = AccTransactionDetails::query()
            ->where('coa4_id', $ledgerId)
            ->whereHas('accTransactionMaster', function ($query) use ($companyId, $branchId, $startDate) {
                $query->whereHas('mainTransactionMaster', function ($mainQuery) use ($companyId, $branchId, $startDate) {
                    $mainQuery->where('status', 1)
                        ->where('company_id', $companyId)
                        ->where('branch_id', $branchId)
                        ->where('vr_date', '<', $startDate);
                });
            })
            ->selectRaw("
                '' as mid,
                '' as vr_sl,
                '' as coa4_id,
                '' as vr_date,
                '' as vr_no,
                '' as id,
                'Opening Balance' as name,
                '' as remarks,
                '' as trx_mstr_id,
                CASE
                    WHEN (COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0)) > 0
                        THEN COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0)
                    ELSE 0
                END as debit,
                CASE
                    WHEN (COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)) > 0
                        THEN COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
                    ELSE 0
                END as credit
            ")
            ->first();

        return $openingBalance;
    }
}

