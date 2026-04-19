<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

class PasswordResetOtpService
{
    private const OTP_TABLE = 'password_reset_otps';

    public function requestOtp(string $mobile): array
    {
        $this->ensureOtpTableExists();

        $normalizedMobile = $this->normalizeMobile($mobile);
        $user = $this->resolveUserByMobile($normalizedMobile);

        if ($user === null) {
            throw new RuntimeException('No user found for this mobile number.');
        }

        $otp = (string) random_int(100000, 999999);
        $otpSessionId = (string) Str::uuid();
        $now = Carbon::now();
        $expiresAt = $now->copy()->addMinutes((int) env('PASSWORD_RESET_OTP_EXPIRE_MINUTES', 10));

        DB::table(self::OTP_TABLE)
            ->where('mobile', $normalizedMobile)
            ->whereNull('consumed_at')
            ->update([
                'consumed_at' => $now,
                'updated_at' => $now,
            ]);

        DB::table(self::OTP_TABLE)->insert([
            'mobile' => $normalizedMobile,
            'otp_code' => $otp,
            'otp_session_id' => $otpSessionId,
            'reset_token' => null,
            'user_table' => $user['table'],
            'user_id' => $user['id'],
            'attempts' => 0,
            'expires_at' => $expiresAt,
            'verified_at' => null,
            'consumed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->sendOtpSms(
            $normalizedMobile,
            sprintf(
                'Your CashbookBD password reset OTP is %s. It will expire in %d minutes.',
                $otp,
                (int) env('PASSWORD_RESET_OTP_EXPIRE_MINUTES', 10)
            )
        );

        $payload = [
            'otp_session_id' => $otpSessionId,
            'expires_at' => $expiresAt->toIso8601String(),
        ];

        if (app()->environment('local')) {
            $payload['debug_otp'] = $otp;
        }

        return $payload;
    }

    public function verifyOtp(string $mobile, string $otp, string $otpSessionId): array
    {
        $this->ensureOtpTableExists();

        $normalizedMobile = $this->normalizeMobile($mobile);
        $record = DB::table(self::OTP_TABLE)
            ->where('mobile', $normalizedMobile)
            ->where('otp_session_id', trim($otpSessionId))
            ->whereNull('consumed_at')
            ->first();

        if (!$record) {
            throw new RuntimeException('OTP session not found. Please request OTP again.');
        }

        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table(self::OTP_TABLE)
                ->where('id', $record->id)
                ->update([
                    'consumed_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

            throw new RuntimeException('OTP has expired. Please request a new OTP.');
        }

        if ((string) $record->otp_code !== trim($otp)) {
            $attempts = ((int) $record->attempts) + 1;

            DB::table(self::OTP_TABLE)
                ->where('id', $record->id)
                ->update([
                    'attempts' => $attempts,
                    'consumed_at' => $attempts >= 5 ? Carbon::now() : null,
                    'updated_at' => Carbon::now(),
                ]);

            throw new RuntimeException('Invalid OTP. Please try again.');
        }

        $resetToken = hash('sha256', Str::random(80));
        $now = Carbon::now();

        DB::table(self::OTP_TABLE)
            ->where('id', $record->id)
            ->update([
                'verified_at' => $now,
                'reset_token' => $resetToken,
                'updated_at' => $now,
            ]);

        return [
            'reset_token' => $resetToken,
            'verified_at' => $now->toIso8601String(),
        ];
    }

    public function resetPassword(string $mobile, string $resetToken, string $password): void
    {
        $this->ensureOtpTableExists();

        $normalizedMobile = $this->normalizeMobile($mobile);
        $record = DB::table(self::OTP_TABLE)
            ->where('mobile', $normalizedMobile)
            ->where('reset_token', trim($resetToken))
            ->whereNotNull('verified_at')
            ->whereNull('consumed_at')
            ->first();

        if (!$record) {
            throw new RuntimeException('Reset session not found. Please verify OTP again.');
        }

        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table(self::OTP_TABLE)
                ->where('id', $record->id)
                ->update([
                    'consumed_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);

            throw new RuntimeException('Reset session has expired. Please request a new OTP.');
        }

        $user = $this->resolveUserForRecord($record);

        if ($user === null) {
            throw new RuntimeException('User account could not be resolved.');
        }

        $updateData = [
            $user['password_column'] => Hash::make($password),
        ];

        if ($user['updated_at_column'] !== null) {
            $updateData[$user['updated_at_column']] = Carbon::now();
        }

        DB::table($user['table'])
            ->where($user['primary_key'], $user['id'])
            ->update($updateData);

        DB::table(self::OTP_TABLE)
            ->where('id', $record->id)
            ->update([
                'consumed_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
    }

    private function resolveUserForRecord(object $record): ?array
    {
        if ($record->user_table && Schema::hasTable($record->user_table)) {
            $user = $this->resolveUserByTableAndId((string) $record->user_table, (int) $record->user_id);
            if ($user !== null) {
                return $user;
            }
        }

        return $this->resolveUserByMobile((string) $record->mobile);
    }

    private function resolveUserByMobile(string $mobile): ?array
    {
        foreach ($this->candidateUserTables() as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            $mobileColumn = $this->firstExistingColumn($table, $this->candidateMobileColumns());
            $passwordColumn = $this->firstExistingColumn($table, ['password']);
            $primaryKey = $this->firstExistingColumn($table, ['id', 'user_id']) ?? 'id';
            $updatedAtColumn = $this->firstExistingColumn($table, ['updated_at']);

            if ($mobileColumn === null || $passwordColumn === null || !Schema::hasColumn($table, $primaryKey)) {
                continue;
            }

            $row = DB::table($table)
                ->where($mobileColumn, $mobile)
                ->first();

            if ($row) {
                return [
                    'table' => $table,
                    'id' => (int) $row->{$primaryKey},
                    'primary_key' => $primaryKey,
                    'password_column' => $passwordColumn,
                    'updated_at_column' => $updatedAtColumn,
                ];
            }
        }

        return null;
    }

    private function resolveUserByTableAndId(string $table, int $id): ?array
    {
        $passwordColumn = $this->firstExistingColumn($table, ['password']);
        $primaryKey = $this->firstExistingColumn($table, ['id', 'user_id']) ?? 'id';
        $updatedAtColumn = $this->firstExistingColumn($table, ['updated_at']);

        if ($passwordColumn === null || !Schema::hasColumn($table, $primaryKey)) {
            return null;
        }

        $row = DB::table($table)
            ->where($primaryKey, $id)
            ->first();

        if (!$row) {
            return null;
        }

        return [
            'table' => $table,
            'id' => $id,
            'primary_key' => $primaryKey,
            'password_column' => $passwordColumn,
            'updated_at_column' => $updatedAtColumn,
        ];
    }

    private function candidateUserTables(): array
    {
        $configured = env('PASSWORD_RESET_USER_TABLES');
        if (is_string($configured) && trim($configured) !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $configured))));
        }

        return ['users', 'tbl_users', 'user', 'com_users'];
    }

    private function candidateMobileColumns(): array
    {
        $configured = env('PASSWORD_RESET_MOBILE_COLUMNS');
        if (is_string($configured) && trim($configured) !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $configured))));
        }

        return ['mobile', 'phone', 'mobile_no', 'contact_no'];
    }

    private function firstExistingColumn(string $table, array $columns): ?string
    {
        foreach ($columns as $column) {
            if (Schema::hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }

    private function ensureOtpTableExists(): void
    {
        if (Schema::hasTable(self::OTP_TABLE)) {
            return;
        }

        Schema::create(self::OTP_TABLE, function (Blueprint $table): void {
            $table->id();
            $table->string('mobile', 30)->index();
            $table->string('otp_code', 10);
            $table->string('otp_session_id', 100)->unique();
            $table->string('reset_token', 255)->nullable()->unique();
            $table->string('user_table', 100)->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    private function normalizeMobile(string $mobile): string
    {
        return trim($mobile);
    }

    private function sendOtpSms(string $mobile, string $message): void
    {
        $smsUrl = env('FORGOT_PASSWORD_SMS_URL');

        if (!is_string($smsUrl) || trim($smsUrl) === '') {
            if (app()->environment('production')) {
                throw new RuntimeException('SMS gateway is not configured.');
            }

            Log::info('Password reset OTP SMS skipped because no gateway is configured.', [
                'mobile' => $mobile,
                'message' => $message,
            ]);

            return;
        }

        $toField = env('FORGOT_PASSWORD_SMS_TO_FIELD', 'mobile');
        $messageField = env('FORGOT_PASSWORD_SMS_MESSAGE_FIELD', 'message');
        $method = strtoupper((string) env('FORGOT_PASSWORD_SMS_METHOD', 'POST'));
        $payload = [
            $toField => $mobile,
            $messageField => $message,
        ];

        $staticFields = json_decode((string) env('FORGOT_PASSWORD_SMS_STATIC_FIELDS', '{}'), true);
        if (is_array($staticFields)) {
            $payload = array_merge($staticFields, $payload);
        }

        $request = Http::timeout(15)->acceptJson();
        $token = env('FORGOT_PASSWORD_SMS_TOKEN');

        if (is_string($token) && trim($token) !== '') {
            $request = $request->withToken($token);
        }

        $response = $method === 'GET'
            ? $request->get($smsUrl, $payload)
            : $request->post($smsUrl, $payload);

        if ($response->failed()) {
            Log::error('Password reset OTP SMS request failed.', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('Failed to send OTP SMS. Please try again.');
        }
    }
}
