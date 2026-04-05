<?php

namespace App\Support;

use Carbon\Carbon;
use RuntimeException;

class CashPaymentService
{
    public function store(array $payload): array
    {
        $normalized = $this->normalizePayload($payload);

        if ($normalized['rows'] === []) {
            throw new RuntimeException('At least one payment row is required.');
        }

        $items = $this->readItems();
        $nextId = $this->nextId($items);
        $now = Carbon::now()->toDateTimeString();
        $voucherNo = $this->generateVoucherNo($nextId);
        $mtmId = $normalized['mtmId'] !== ''
            ? $normalized['mtmId']
            : 'CP-MTM-' . strtoupper(substr(md5($voucherNo . '|' . $now), 0, 12));

        $record = [
            'id' => $nextId,
            'voucher_no' => $voucherNo,
            'mtmId' => $mtmId,
            'branchId' => $normalized['branchId'],
            'branchName' => $normalized['branchName'],
            'projectId' => $normalized['projectId'],
            'projectName' => $normalized['projectName'],
            'meta' => $normalized['meta'],
            'metas' => $normalized['metas'],
            'rows' => $this->normalizeRows($normalized['rows'], $mtmId, $normalized),
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $items[] = $record;
        $this->writeItems($items);

        return $record;
    }

    public function edit(array $payload): ?array
    {
        $needle = trim((string) ($payload['invoiceNo'] ?? $payload['transactionNo'] ?? $payload['id'] ?? ''));
        if ($needle === '') {
            return null;
        }

        $items = $this->readItems();

        foreach (array_reverse($items) as $item) {
            if (
                (string) ($item['voucher_no'] ?? '') === $needle ||
                (string) ($item['mtmId'] ?? '') === $needle ||
                (string) ($item['id'] ?? '') === $needle
            ) {
                return $item;
            }
        }

        return null;
    }

    public function update(array $payload): ?array
    {
        $normalized = $this->normalizePayload($payload);
        $items = $this->readItems();
        $targetIndex = $this->findIndexForUpdate($items, $payload, $normalized);

        if ($targetIndex === null) {
            return null;
        }

        $existing = $items[$targetIndex];
        $mtmId = $normalized['mtmId'] !== '' ? $normalized['mtmId'] : (string) ($existing['mtmId'] ?? '');
        $branchId = $normalized['branchId'] !== '' ? $normalized['branchId'] : (string) ($existing['branchId'] ?? '');
        $branchName = $normalized['branchName'] !== '' ? $normalized['branchName'] : (string) ($existing['branchName'] ?? '');
        $projectId = $normalized['projectId'] !== '' ? $normalized['projectId'] : (string) ($existing['projectId'] ?? $branchId);
        $projectName = $normalized['projectName'] !== '' ? $normalized['projectName'] : (string) ($existing['projectName'] ?? $branchName);

        $updated = [
            'id' => $existing['id'],
            'voucher_no' => $existing['voucher_no'],
            'mtmId' => $mtmId,
            'branchId' => $branchId,
            'branchName' => $branchName,
            'projectId' => $projectId,
            'projectName' => $projectName,
            'meta' => $normalized['meta'] !== [] ? $normalized['meta'] : ($existing['meta'] ?? []),
            'metas' => $normalized['metas'] !== [] ? $normalized['metas'] : ($existing['metas'] ?? []),
            'rows' => $this->normalizeRows(
                $normalized['rows'] !== [] ? $normalized['rows'] : ($existing['rows'] ?? []),
                $mtmId,
                [
                    'branchId' => $branchId,
                    'branchName' => $branchName,
                    'projectId' => $projectId,
                    'projectName' => $projectName,
                ],
            ),
            'created_at' => $existing['created_at'] ?? Carbon::now()->toDateTimeString(),
            'updated_at' => Carbon::now()->toDateTimeString(),
        ];

        $items[$targetIndex] = $updated;
        $this->writeItems($items);

        return $updated;
    }

    private function normalizePayload(array $payload): array
    {
        $rows = [];

        if (array_is_list($payload)) {
            $rows = $payload;
            $payload = [];
        } else {
            foreach (['rows', 'details', 'transactions', 'data'] as $key) {
                if (isset($payload[$key]) && is_array($payload[$key])) {
                    $rows = $payload[$key];
                    break;
                }
            }
        }

        $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];
        $metas = is_array($payload['metas'] ?? null) ? array_values($payload['metas']) : [];

        $branchId = (string) ($payload['branchId'] ?? $payload['branch_id'] ?? $payload['projectId'] ?? $payload['project_id'] ?? '');
        $branchName = (string) ($payload['branchName'] ?? $payload['branch_name'] ?? $payload['projectName'] ?? $payload['project_name'] ?? '');

        if ($branchId === '' && isset($meta['branch_id'])) {
            $branchId = (string) $meta['branch_id'];
        }
        if ($branchName === '' && isset($meta['branch_name'])) {
            $branchName = (string) $meta['branch_name'];
        }
        if ($branchId === '' && isset($meta['project_id'])) {
            $branchId = (string) $meta['project_id'];
        }
        if ($branchName === '' && isset($meta['project_name'])) {
            $branchName = (string) $meta['project_name'];
        }

        return [
            'mtmId' => trim((string) ($payload['mtmId'] ?? $payload['mtm_id'] ?? '')),
            'branchId' => $branchId,
            'branchName' => $branchName,
            'projectId' => (string) ($payload['projectId'] ?? $payload['project_id'] ?? $branchId),
            'projectName' => (string) ($payload['projectName'] ?? $payload['project_name'] ?? $branchName),
            'meta' => $meta,
            'metas' => $metas,
            'rows' => is_array($rows) ? array_values($rows) : [],
        ];
    }

    private function normalizeRows(array $rows, string $mtmId, array $context): array
    {
        return array_values(array_map(function ($row, $index) use ($mtmId, $context): array {
            $row = is_array($row) ? $row : [];

            return [
                'id' => $row['id'] ?? ('row-' . ($index + 1)),
                'mtmId' => (string) ($row['mtmId'] ?? $row['mtm_id'] ?? $mtmId),
                'account' => (string) ($row['account'] ?? ''),
                'accountName' => (string) ($row['accountName'] ?? $row['account_name'] ?? ''),
                'branchId' => (string) ($row['branchId'] ?? $row['branch_id'] ?? $context['branchId'] ?? ''),
                'branchName' => (string) ($row['branchName'] ?? $row['branch_name'] ?? $context['branchName'] ?? ''),
                'projectId' => (string) ($row['projectId'] ?? $row['project_id'] ?? $context['projectId'] ?? ''),
                'projectName' => (string) ($row['projectName'] ?? $row['project_name'] ?? $context['projectName'] ?? ''),
                'remarks' => (string) ($row['remarks'] ?? ''),
                'amount' => (float) ($row['amount'] ?? 0),
            ];
        }, $rows, array_keys($rows)));
    }

    private function findIndexForUpdate(array $items, array $payload, array $normalized): ?int
    {
        $candidates = array_filter([
            (string) ($payload['id'] ?? ''),
            (string) ($payload['invoiceNo'] ?? ''),
            (string) ($payload['transactionNo'] ?? ''),
            (string) ($normalized['mtmId'] ?? ''),
        ], fn ($value) => $value !== '');

        foreach ($items as $index => $item) {
            foreach ($candidates as $candidate) {
                if (
                    (string) ($item['id'] ?? '') === $candidate ||
                    (string) ($item['voucher_no'] ?? '') === $candidate ||
                    (string) ($item['mtmId'] ?? '') === $candidate
                ) {
                    return $index;
                }
            }
        }

        return null;
    }

    private function nextId(array $items): int
    {
        $max = 0;
        foreach ($items as $item) {
            $max = max($max, (int) ($item['id'] ?? 0));
        }

        return $max + 1;
    }

    private function generateVoucherNo(int $id): string
    {
        return 'CP-' . str_pad((string) $id, 6, '0', STR_PAD_LEFT);
    }

    private function storageFile(): string
    {
        return storage_path('app/cash_payments.json');
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

    private function writeItems(array $items): void
    {
        $file = $this->storageFile();
        $directory = dirname($file);

        if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create cash payment storage directory.');
        }

        $encoded = json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($encoded === false || file_put_contents($file, $encoded) === false) {
            throw new RuntimeException('Unable to write cash payment storage file.');
        }
    }
}
