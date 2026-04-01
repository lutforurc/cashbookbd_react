<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\PasswordResetOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly PasswordResetOtpService $passwordResetOtpService
    ) {
    }

    public function requestOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:30'],
        ]);

        $data = $this->passwordResetOtpService->requestOtp($validated['mobile']);

        return response()
            ->json([
                'success' => true,
                'message' => 'Password reset OTP sent successfully.',
                'data' => $data,
            ])
            ->header('X-OTP-Session', $data['otp_session_id']);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:30'],
            'otp' => ['required', 'string', 'max:10'],
            'otp_session_id' => ['required', 'string', 'max:100'],
        ]);

        $data = $this->passwordResetOtpService->verifyOtp(
            $validated['mobile'],
            $validated['otp'],
            $validated['otp_session_id']
        );

        return response()->json([
            'success' => true,
            'message' => 'OTP verified successfully.',
            'data' => $data,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:30'],
            'reset_token' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $this->passwordResetOtpService->resetPassword(
            $validated['mobile'],
            $validated['reset_token'],
            $validated['password']
        );

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }
}
