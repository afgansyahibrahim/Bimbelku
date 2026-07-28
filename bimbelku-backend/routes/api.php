<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdminClassController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminRatingController;
use App\Http\Controllers\Api\AdminSettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingRequestController;
use App\Http\Controllers\Api\ClassroomController;
use App\Http\Controllers\Api\HourlyRateController;
use App\Http\Controllers\Api\LearningCatalogController;
use App\Http\Controllers\Api\LearningAttachmentController;
use App\Http\Controllers\Api\LearningTopicController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProtectedFileController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\SessionWorkflowController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\TeacherDocumentController;
use App\Http\Controllers\Api\TeacherOfferController;
use App\Http\Controllers\Api\TeacherScheduleController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

Route::get('/learning-catalog', [LearningCatalogController::class, 'index']);
Route::get('/settings/footer', [PublicController::class, 'getFooterSettings']);
Route::get('/socials', [AdminController::class, 'getSocials']);
Route::get('/settings/teacher-cover', [AdminSettingController::class, 'getTeacherCover']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [UserController::class, 'show']);
    Route::put('/user', [UserController::class, 'update']);
    // Multipart FormData memakai POST + _method=PUT pada frontend agar unggahan
    // berkas tetap terbaca konsisten oleh PHP.
    Route::post('/user', [UserController::class, 'update']);
    Route::put('/user/password', [UserController::class, 'updatePassword'])
        ->middleware('throttle:5,1');
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/tickets/my', [TicketController::class, 'myTickets']);
    Route::post('/tickets', [TicketController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/tickets/{id}', [TicketController::class, 'show']);
    Route::post('/tickets/{id}/reply', [TicketController::class, 'reply'])->middleware('throttle:20,1');
    Route::post('/tickets/{id}/close', [TicketController::class, 'close']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('/teachers/{teacher}/documents/{document}', [TeacherDocumentController::class, 'show'])
        ->where('document', 'cv_file|identity_document|live_selfie|qualification_document|certification_document');
    Route::get('/learning-attachments/{bookingRequest}', [LearningAttachmentController::class, 'show']);
    Route::get('/orders/{order}/payment-proof', [ProtectedFileController::class, 'paymentProof']);
    Route::get('/bookings/{booking}/completion-evidence', [ProtectedFileController::class, 'completionEvidence']);
    Route::get('/session-reports/{sessionReport}/evidence', [ProtectedFileController::class, 'reportEvidence']);
    Route::get('/disputes/{bookingDispute}/evidence', [ProtectedFileController::class, 'disputeEvidence']);
    Route::get('/payouts/{payout}/proof', [ProtectedFileController::class, 'payoutProof']);
    Route::get('/refunds/{refund}/proof', [ProtectedFileController::class, 'refundProof']);
    Route::get('/ticket-replies/{ticketReply}/attachment', [ProtectedFileController::class, 'ticketAttachment']);

    Route::middleware('role:student')->group(function () {
        Route::get('/student/booking-requests', [BookingRequestController::class, 'index']);
        Route::post('/student/booking-requests', [BookingRequestController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('/student/booking-requests/{bookingRequest}', [BookingRequestController::class, 'show']);
        Route::post('/student/booking-requests/{bookingRequest}/expand-radius', [BookingRequestController::class, 'expandRadius']);
        Route::post('/student/booking-requests/{bookingRequest}/extend', [BookingRequestController::class, 'extendSearch']);
        Route::post('/student/booking-requests/{bookingRequest}/teacher-decision', [BookingRequestController::class, 'teacherDecision']);
        Route::post('/student/booking-requests/{bookingRequest}/group-decision', [BookingRequestController::class, 'groupDecision']);
        Route::post('/student/booking-requests/{bookingRequest}/cancel', [BookingRequestController::class, 'cancel']);
        Route::post('/student/bookings/{booking}/approve', [SessionWorkflowController::class, 'studentApprove']);
        Route::post('/student/bookings/{booking}/dispute', [SessionWorkflowController::class, 'studentDispute']);
        Route::post('/student/bookings/{booking}/teacher-absence', [SessionWorkflowController::class, 'reportTeacherAbsence']);

        Route::get('/student/orders/{id}/status', [StudentController::class, 'checkOrderStatus']);
        Route::get('/student/classes', [StudentController::class, 'getMyClasses']);
        Route::post('/orders/{id}/pay', [OrderController::class, 'pay'])->middleware('throttle:5,1');
        Route::get('/active-order', [OrderController::class, 'getActiveOrder']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancelOrder']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/payment-settings', [AdminController::class, 'getPaymentSettings']);
        Route::post('/ratings', [RatingController::class, 'store']);
    });

    Route::prefix('teacher')->middleware('role:teacher')->group(function () {
        Route::get('/offers', [TeacherOfferController::class, 'index']);
        Route::post('/offers/{teacherOffer}/accept', [TeacherOfferController::class, 'accept']);
        Route::post('/offers/{teacherOffer}/reject', [TeacherOfferController::class, 'reject']);

        Route::get('/profile', [TeacherController::class, 'getProfile']);
        Route::post('/profile', [TeacherController::class, 'updateProfile']);
        Route::post('/subjects', [TeacherController::class, 'syncSubjects']);
        Route::post('/bank', [TeacherController::class, 'updateBank']);
        Route::get('/salary', [TeacherController::class, 'getSalaryData']);
        Route::get('/classes', [ClassroomController::class, 'index']);
        Route::put('/classes/{id}', [ClassroomController::class, 'update']);
        Route::post('/bookings/{booking}/complete', [SessionWorkflowController::class, 'teacherComplete']);
        Route::post('/bookings/{booking}/absence', [SessionWorkflowController::class, 'reportStudentAbsence']);
        Route::post('/bookings/{booking}/emergency', [SessionWorkflowController::class, 'reportEmergency']);
        Route::get('/schedule', [TeacherScheduleController::class, 'index']);
        Route::post('/schedule', [TeacherScheduleController::class, 'update']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::post('/notifications/send', [NotificationController::class, 'send']);

        Route::get('/hourly-rates', [HourlyRateController::class, 'index']);
        Route::post('/hourly-rates', [HourlyRateController::class, 'store']);
        Route::post('/hourly-rates/defaults', [HourlyRateController::class, 'updateDefaults']);
        Route::post('/hourly-rates/group-settings', [HourlyRateController::class, 'updateGroupSettings']);
        Route::delete('/hourly-rates/{hourlyRate}', [HourlyRateController::class, 'destroy']);
        Route::get('/learning-topics', [LearningTopicController::class, 'index']);
        Route::post('/learning-topics', [LearningTopicController::class, 'store']);
        Route::put('/learning-topics/{learningTopic}', [LearningTopicController::class, 'update']);
        Route::delete('/learning-topics/{learningTopic}', [LearningTopicController::class, 'destroy']);

        Route::get('/pending-teachers', [AdminController::class, 'getPendingTeachers']);
        Route::get('/history-teachers', [AdminController::class, 'getHistoryTeachers']);
        Route::post('/verify-teacher', [AdminController::class, 'verifyTeacher']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/users/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/orders', [AdminController::class, 'getOrders']);
        Route::get('/pending-payments', [AdminController::class, 'getPendingPayments']);
        Route::post('/verify-payment', [AdminController::class, 'verifyPayment']);
        Route::get('/payment-settings', [AdminController::class, 'getPaymentSettings']);
        Route::post('/payment-settings', [AdminController::class, 'updatePaymentSettings']);
        Route::get('/finance', [AdminController::class, 'getFinanceData']);
        Route::post('/payout', [AdminController::class, 'processPayout']);
        Route::get('/commission-setting', [AdminController::class, 'getCommissionSetting']);
        Route::post('/commission-setting', [AdminController::class, 'updateCommissionSetting']);
        Route::get('/dashboard-stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/cases', [SessionWorkflowController::class, 'adminCases']);
        Route::post('/disputes/{bookingDispute}/resolve', [SessionWorkflowController::class, 'resolveDispute']);
        Route::post('/session-reports/{sessionReport}/resolve', [SessionWorkflowController::class, 'resolveReport']);
        Route::post('/bookings/{booking}/completion-review', [SessionWorkflowController::class, 'resolveCompletionReview']);
        Route::post('/refunds/{refund}/complete', [SessionWorkflowController::class, 'completeRefund']);

        Route::get('/tickets', [TicketController::class, 'index']);
        Route::post('/settings/footer', [AdminController::class, 'updateFooterSettings']);
        Route::post('/socials', [AdminController::class, 'storeSocial']);
        Route::delete('/socials/{id}', [AdminController::class, 'deleteSocial']);
        Route::get('/classes', [AdminClassController::class, 'index']);
        Route::get('/classes/{id}', [AdminClassController::class, 'show']);
        Route::post('/settings/teacher-cover', [AdminSettingController::class, 'updateTeacherCover']);
        Route::get('/ratings', [AdminRatingController::class, 'index']);
        Route::delete('/ratings/{id}', [AdminRatingController::class, 'destroy']);

        Route::get('/notes', [NoteController::class, 'index']);
        Route::post('/notes', [NoteController::class, 'store']);
        Route::put('/notes/{id}', [NoteController::class, 'update']);
        Route::delete('/notes/{id}', [NoteController::class, 'destroy']);
    });
});
