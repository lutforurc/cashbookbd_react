<?php

namespace App\Support;

use Carbon\Carbon;
use RuntimeException;

class ProductLedgerDataService
{
    public function getReport(array $payload): array
    {
        $branchId = (int) $payload['branch_id'];
        $ledgerId = (int) $payload['ledger_id'];
        $startDate = $this->parseDate((string) $payload['startdate'], 'startdate');
        $endDate = $this->parseDate((string) $payload['enddate'], 'enddate');

        if ($startDate->gt($endDate)) {
            throw new RuntimeException('Start date must be earlier than or equal to end date.');
        }

        $rows = collect($this->readItems())
            ->filter(function (array $row) use ($branchId, $ledgerId, $startDate, $endDate): bool {
                $rowBranchId = (int) ($row['branch_id'] ?? 0);
                $rowLedgerId = (int) ($row['ledger_id'] ?? 0);
                $rowDateString = (string) ($row['vr_date'] ?? $row['date'] ?? $row['trx_date'] ?? '');

                if ($rowBranchId !== $branchId || $rowLedgerId !== $ledgerId || $rowDateString === '') {
                    return false;
                }

                $rowDate = $this->parseDate($rowDateString, 'row date');

                return $rowDate->betweenIncluded($startDate, $endDate);
            })
            ->map(function (array $row): array {
                return [
                    'id' => $row['id'] ?? null,
                    'branch_id' => (int) ($row['branch_id'] ?? 0),
                    'ledger_id' => (int) ($row['ledger_id'] ?? 0),
                    'sl' => $row['sl'] ?? $row['sl_no'] ?? $row['sl_number'] ?? null,
                    'invoice_no' => $row['invoice_no'] ?? $row['invoice'] ?? $row['vr_no'] ?? null,
                    'vr_date' => $this->normalizeDisplayDate((string) ($row['vr_date'] ?? $row['date'] ?? $row['trx_date'] ?? '')),
                    'opening' => $this->normalizeNumber($row['opening'] ?? $row['opening_qty'] ?? null),
                    'purchase' => $this->normalizeNumber($row['purchase'] ?? $row['purchase_qty'] ?? null),
                    'sales_return' => $this->normalizeNumber($row['sales_return'] ?? $row['salesReturn'] ?? $row['sale_return'] ?? null),
                    'sales' => $this->normalizeNumber($row['sales'] ?? $row['sale'] ?? $row['sales_qty'] ?? null),
                    'purchase_return' => $this->normalizeNumber($row['purchase_return'] ?? $row['purchaseReturn'] ?? null),
                    'stock' => $this->normalizeNumber($row['stock'] ?? $row['balance'] ?? $row['closing_stock'] ?? null),
                ];
            })
            ->sortBy(function (array $row): string {
                return Carbon::createFromFormat('d/m/Y', (string) $row['vr_date'])->format('Y-m-d');
            })
            ->values();

        $openingRow = $rows->first(function (array $row): bool {
            return $row['opening'] !== null && (
                $row['purchase'] === null ||
                (float) $row['purchase'] === 0.0
            ) && (
                $row['sales'] === null ||
                (float) $row['sales'] === 0.0
            );
        });

        $detailRows = $rows
            ->reject(fn (array $row): bool => $openingRow !== null && $row === $openingRow)
            ->values()
            ->map(function (array $row, int $index): array {
                $row['sl'] = $index + 1;

                return $row;
            });

        return [
            'opening' => $openingRow ? [
                'invoice_no' => 'Opening',
                'vr_date' => $startDate->format('d/m/Y'),
                'opening' => $openingRow['opening'],
                'purchase' => null,
                'sales_return' => null,
                'sales' => null,
                'purchase_return' => null,
                'stock' => $openingRow['stock'] ?? $openingRow['opening'],
            ] : null,
            'rows' => $detailRows->all(),
            'total' => [
                'invoice_no' => 'Total',
                'vr_date' => '',
                'opening' => $this->sumColumn($rows->all(), 'opening'),
                'purchase' => $this->sumColumn($rows->all(), 'purchase'),
                'sales_return' => $this->sumColumn($rows->all(), 'sales_return'),
                'sales' => $this->sumColumn($rows->all(), 'sales'),
                'purchase_return' => $this->sumColumn($rows->all(), 'purchase_return'),
                'stock' => $rows->isNotEmpty() ? $rows->last()['stock'] : null,
            ],
        ];
    }

    private function normalizeNumber(mixed $value): float|int|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        $number = (float) $value;

        return floor($number) === $number ? (int) $number : round($number, 2);
    }

    private function sumColumn(array $rows, string $key): float|int|null
    {
        $sum = 0.0;
        $found = false;

        foreach ($rows as $row) {
            if (($row[$key] ?? null) === null || $row[$key] === '') {
                continue;
            }

            $sum += (float) $row[$key];
            $found = true;
        }

        if (!$found) {
            return null;
        }

        return floor($sum) === $sum ? (int) $sum : round($sum, 2);
    }

    private function parseDate(string $value, string $field): Carbon
    {
        $value = trim($value);

        foreach (['d/m/Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->startOfDay();
            } catch (\Throwable) {
            }
        }

        throw new RuntimeException(sprintf('Invalid %s format. Expected DD/MM/YYYY.', $field));
    }

    private function normalizeDisplayDate(string $value): string
    {
        return $this->parseDate($value, 'vr_date')->format('d/m/Y');
    }

    private function storageFile(): string
    {
        return storage_path('app/product_ledger_data.json');
    }

    private function readItems(): array
    {
        $file = $this->storageFile();

        if (!is_file($file)) {
            return [];
        }

        $raw = file_get_contents($file);
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }
}
