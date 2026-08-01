<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdminClassController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminRatingController;
use App\Http\Controllers\Api\AdminSettingController;
use App\Http\Controllers\Api\AdminStageFiveController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingRequestController;
use App\Http\Controllers\Api\ClassroomController;
use App\Http\Controllers\Api\CurriculumChapterController;
use App\Http\Controllers\Api\CurriculumSubjectController;
use App\Http\Controllers\Api\HourlyRateController;
use App\Http\Controllers\Api\FinanceApprovalController;
use App\Http\Controllers\Api\FinanceSecurityController;
use App\Http\Controllers\Api\LearningCatalogController;
use App\Http\Controllers\Api\LearningAttachmentController;
use App\Http\Controllers\Api\LearningSessionController;
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
use App\Http\Controllers\Api\StudentPackageController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\TeacherDocumentController;
use App\Http\Controllers\Api\TeacherOfferController;
use App\Http\Controllers\Api\TeacherScheduleController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TutorAvailabilityController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\StageFiveContentController;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

Route::get('/learning-catalog', [LearningCatalogController::class, 'index']);
Route::get('/settings/footer', [PublicController::class, 'getFooterSettings']);
Route::get('/socials', [AdminController::class, 'getSocials']);
Route::get('/settings/teacher-cover', [AdminSettingController::class, 'getTeacherCover']);
Route::get('/package-plans', [StudentPackageController::class, 'plans']);
Route::get('/learning-time-slots', [StudentPackageController::class, 'timeSlots']);
Route::get('/content/banners', [StageFiveContentController::class, 'banners']);
Route::get('/content/tutorials', [StageFiveContentController::class, 'tutorials']);
Route::get('/content/promotions', [StageFiveContentController::class, 'promotions']);
Route::get('/content/promotions/{promotion}', [StageFiveContentController::class, 'promotion']);

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
    Route::get('/bookings/{booking}/learning-session', [LearningSessionController::class, 'show']);
    Route::post('/bookings/{booking}/messages', [LearningSessionController::class, 'storeMessage'])
        ->middleware('throttle:30,1');

    Route::middleware('role:student')->group(function () {
        Route::post('/student/tutor-availability', [TutorAvailabilityController::class, 'check'])
            ->middleware('throttle:20,1');
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
        Route::post('/student/bookings/{booking}/session-pin', [LearningSessionController::class, 'generatePin'])
            ->middleware('throttle:5,1');
        Route::post('/student/bookings/{booking}/learning-plan/acknowledge', [LearningSessionController::class, 'acknowledgePlan']);

        Route::get('/student/orders/{id}/status', [StudentController::class, 'checkOrderStatus']);
        Route::get('/student/classes', [StudentController::class, 'getMyClasses']);
        Route::post('/orders/{id}/pay', [OrderController::class, 'pay'])
            ->middleware(['throttle:5,1', 'idempotency', 'finance.audit:student_payment_submit']);
        Route::get('/active-order', [OrderController::class, 'getActiveOrder']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancelOrder']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/payment-settings', [AdminController::class, 'getPaymentSettings']);
        Route::post('/ratings', [RatingController::class, 'store']);
        Route::get('/student/dashboard-v2', [StudentPackageController::class, 'dashboard']);
        Route::get('/student/packages', [StudentPackageController::class, 'index']);
        Route::get('/student/packages/tutorial-status', [StudentPackageController::class, 'tutorialStatus']);
        Route::post('/student/packages', [StudentPackageController::class, 'store'])
            ->middleware(['throttle:5,1', 'idempotency']);
        Route::post('/student/packages/{learningPackage}/retry', [StudentPackageController::class, 'retryMatching'])
            ->middleware('throttle:5,1');
        Route::post('/student/packages/{learningPackage}/cancel', [StudentPackageController::class, 'cancel']);
        Route::get('/student/packages/{learningPackage}', [StudentPackageController::class, 'show']);
        Route::get('/student/vouchers', [StudentPackageController::class, 'vouchers']);
        Route::post('/student/promotions/preview', [StudentPackageController::class, 'previewPromotion'])
            ->middleware('throttle:20,1');
        Route::post('/student/promotions/{promotion}/claim', [StudentPackageController::class, 'claim'])
            ->middleware('throttle:10,1');
        Route::post('/student/packages/quote', [StudentPackageController::class, 'previewPromotion'])
            ->middleware('throttle:20,1');
    });

    Route::prefix('teacher')->middleware('role:teacher')->group(function () {
        Route::get('/offers', [TeacherOfferController::class, 'index']);
        Route::post('/offers/{teacherOffer}/accept', [TeacherOfferController::class, 'accept']);
        Route::post('/offers/{teacherOffer}/reject', [TeacherOfferController::class, 'reject']);

        Route::get('/profile', [TeacherController::class, 'getProfile']);
        Route::post('/profile', [TeacherController::class, 'updateProfile']);
        Route::post('/subjects', [TeacherController::class, 'syncSubjects']);
        Route::post('/bank', [TeacherController::class, 'updateBank'])
            ->middleware(['throttle:5,1', 'idempotency', 'finance.audit:teacher_bank_change']);
        Route::get('/salary', [TeacherController::class, 'getSalaryData']);
        Route::get('/classes', [ClassroomController::class, 'index']);
        Route::put('/classes/{id}', [ClassroomController::class, 'update']);
        Route::post('/bookings/{booking}/complete', [SessionWorkflowController::class, 'teacherComplete']);
        Route::post('/bookings/{booking}/absence', [SessionWorkflowController::class, 'reportStudentAbsence']);
        Route::post('/bookings/{booking}/emergency', [SessionWorkflowController::class, 'reportEmergency']);
        Route::post('/bookings/{booking}/check-in', [LearningSessionController::class, 'teacherCheckIn'])
            ->middleware('throttle:10,1');
        Route::post('/bookings/{booking}/check-out', [LearningSessionController::class, 'teacherCheckOut'])
            ->middleware('throttle:10,1');
        Route::put('/bookings/{booking}/learning-plan', [LearningSessionController::class, 'storePlan']);
        Route::post('/bookings/{booking}/progress-reports', [LearningSessionController::class, 'storeProgressReport']);
        Route::get('/schedule', [TeacherScheduleController::class, 'index']);
        Route::post('/schedule', [TeacherScheduleController::class, 'update']);
    });

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/finance-security', [FinanceSecurityController::class, 'status']);
        Route::post('/finance-security/setup', [FinanceSecurityController::class, 'setup'])
            ->middleware(['throttle:3,1', 'finance.audit:finance_2fa_setup']);
        Route::post('/finance-security/confirm', [FinanceSecurityController::class, 'confirm'])
            ->middleware(['throttle:5,1', 'finance.audit:finance_2fa_confirm']);
        Route::post('/finance-security/authorize', [FinanceSecurityController::class, 'authorize'])
            ->middleware(['throttle:5,1', 'finance.audit:finance_2fa_authorize']);
        Route::get('/finance-audit', [FinanceSecurityController::class, 'auditIndex'])
            ->middleware('finance.2fa');
        Route::get('/payout-approvals', [FinanceApprovalController::class, 'index'])
            ->middleware('finance.2fa');
        Route::post('/payout-approvals', [FinanceApprovalController::class, 'store'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:payout_approval_request']);
        Route::post('/payout-approvals/{payoutApproval}/approve', [FinanceApprovalController::class, 'approve'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:payout_approval_grant']);

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
        Route::get('/pending-payments', [AdminController::class, 'getPendingPayments'])
            ->middleware('finance.2fa');
        Route::post('/verify-payment', [AdminController::class, 'verifyPayment'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:payment_verification']);
        Route::get('/payment-settings', [AdminController::class, 'getPaymentSettings']);
        Route::post('/payment-settings', [AdminController::class, 'updatePaymentSettings'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:payment_destination_change']);
        Route::get('/finance', [AdminController::class, 'getFinanceData'])
            ->middleware('finance.2fa');
        Route::post('/payout', [AdminController::class, 'processPayout'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:payout_complete']);
        Route::get('/commission-setting', [AdminController::class, 'getCommissionSetting']);
        Route::post('/commission-setting', [AdminController::class, 'updateCommissionSetting'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:commission_change']);
        Route::get('/dashboard-stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/cases', [SessionWorkflowController::class, 'adminCases']);
        Route::post('/disputes/{bookingDispute}/resolve', [SessionWorkflowController::class, 'resolveDispute']);
        Route::post('/session-reports/{sessionReport}/resolve', [SessionWorkflowController::class, 'resolveReport']);
        Route::post('/bookings/{booking}/completion-review', [SessionWorkflowController::class, 'resolveCompletionReview']);
        Route::post('/refunds/{refund}/complete', [SessionWorkflowController::class, 'completeRefund'])
            ->middleware(['finance.2fa', 'idempotency', 'finance.audit:refund_complete']);

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
        Route::get('/subjects', [CurriculumSubjectController::class, 'index']);
        Route::post('/subjects', [CurriculumSubjectController::class, 'store']);
        Route::put('/subjects/{curriculumSubject}', [CurriculumSubjectController::class, 'update']);
        Route::delete('/subjects/{curriculumSubject}', [CurriculumSubjectController::class, 'destroy']);
        Route::get('/chapters', [CurriculumChapterController::class, 'index']);
        Route::post('/chapters', [CurriculumChapterController::class, 'store']);
        Route::put('/chapters/{curriculumChapter}', [CurriculumChapterController::class, 'update']);
        Route::delete('/chapters/{curriculumChapter}', [CurriculumChapterController::class, 'destroy']);

        Route::get('/stage-five/plans', [AdminStageFiveController::class, 'plans']);
        Route::post('/stage-five/plans', [AdminStageFiveController::class, 'storePlan']);
        Route::put('/stage-five/plans/{packagePlan}', [AdminStageFiveController::class, 'updatePlan']);
        Route::delete('/stage-five/plans/{packagePlan}', [AdminStageFiveController::class, 'deletePlan']);
        Route::get('/stage-five/time-slots', [AdminStageFiveController::class, 'timeSlots']);
        Route::post('/stage-five/time-slots', [AdminStageFiveController::class, 'storeTimeSlot']);
        Route::put('/stage-five/time-slots/{learningTimeSlot}', [AdminStageFiveController::class, 'updateTimeSlot']);
        Route::delete('/stage-five/time-slots/{learningTimeSlot}', [AdminStageFiveController::class, 'deleteTimeSlot']);
        Route::get('/stage-five/promotions', [AdminStageFiveController::class, 'promotions']);
        Route::post('/stage-five/promotions', [AdminStageFiveController::class, 'storePromotion']);
        Route::put('/stage-five/promotions/{promotion}', [AdminStageFiveController::class, 'updatePromotion']);
        Route::delete('/stage-five/promotions/{promotion}', [AdminStageFiveController::class, 'deletePromotion']);
        Route::get('/stage-five/banners', [AdminStageFiveController::class, 'banners']);
        Route::post('/stage-five/banners', [AdminStageFiveController::class, 'storeBanner']);
        Route::post('/stage-five/banners/{dynamicBanner}', [AdminStageFiveController::class, 'updateBanner']);
        Route::delete('/stage-five/banners/{dynamicBanner}', [AdminStageFiveController::class, 'deleteBanner']);
        Route::get('/stage-five/tutorials', [AdminStageFiveController::class, 'tutorials']);
        Route::post('/stage-five/tutorials', [AdminStageFiveController::class, 'storeTutorial']);
        Route::put('/stage-five/tutorials/{tutorial}', [AdminStageFiveController::class, 'updateTutorial']);
        Route::delete('/stage-five/tutorials/{tutorial}', [AdminStageFiveController::class, 'deleteTutorial']);
        Route::post('/stage-five/tutorial-steps/{tutorialStep}/image', [AdminStageFiveController::class, 'uploadTutorialStepImage']);
    });
});
