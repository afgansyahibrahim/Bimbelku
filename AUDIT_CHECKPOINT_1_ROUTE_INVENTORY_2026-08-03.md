# Inventaris Route — Audit Checkpoint 1

Tanggal: 3 Agustus 2026

Status pada tabel adalah **pemeriksaan statis**: route terpetakan ke controller/method dan pembatas akses yang sesuai. Status runtime tetap harus dikonfirmasi dengan Laravel test dan uji Laragon.

## API Laravel (184 action controller)

| No | Method | URI | Akses | Controller | Status statis |
|---:|---|---|---|---|---|
| 1 | `POST` | `/api/register` | Publik | `AuthController::register` | Lulus |
| 2 | `POST` | `/api/login` | Publik | `AuthController::login` | Lulus |
| 3 | `POST` | `/api/forgot-password` | Publik | `PasswordResetController::sendResetLink` | Lulus |
| 4 | `POST` | `/api/reset-password` | Publik | `PasswordResetController::reset` | Lulus |
| 5 | `GET` | `/api/learning-catalog` | Publik | `LearningCatalogController::index` | Lulus |
| 6 | `GET` | `/api/settings/footer` | Publik | `PublicController::getFooterSettings` | Lulus |
| 7 | `GET` | `/api/socials` | Publik | `AdminController::getSocials` | Lulus |
| 8 | `GET` | `/api/settings/teacher-cover` | Publik | `AdminSettingController::getTeacherCover` | Lulus |
| 9 | `GET` | `/api/package-plans` | Publik | `StudentPackageController::plans` | Lulus |
| 10 | `GET` | `/api/learning-time-slots` | Publik | `StudentPackageController::timeSlots` | Lulus |
| 11 | `GET` | `/api/content/banners` | Publik | `StageFiveContentController::banners` | Lulus |
| 12 | `GET` | `/api/content/tutorials` | Publik | `StageFiveContentController::tutorials` | Lulus |
| 13 | `GET` | `/api/content/promotions` | Publik | `StageFiveContentController::promotions` | Lulus |
| 14 | `GET` | `/api/content/promotions/{promotion}` | Publik | `StageFiveContentController::promotion` | Lulus |
| 15 | `GET` | `/api/user` | Pengguna aktif terautentikasi | `UserController::show` | Lulus |
| 16 | `PUT` | `/api/user` | Pengguna aktif terautentikasi | `UserController::update` | Lulus |
| 17 | `POST` | `/api/user` | Pengguna aktif terautentikasi | `UserController::update` | Lulus |
| 18 | `PUT` | `/api/user/password` | Pengguna aktif terautentikasi | `UserController::updatePassword` | Lulus |
| 19 | `POST` | `/api/logout` | Pengguna aktif terautentikasi | `AuthController::logout` | Lulus |
| 20 | `GET` | `/api/tickets/my` | Pengguna aktif terautentikasi | `TicketController::myTickets` | Lulus |
| 21 | `POST` | `/api/tickets` | Pengguna aktif terautentikasi | `TicketController::store` | Lulus |
| 22 | `GET` | `/api/tickets/{id}` | Pengguna aktif terautentikasi | `TicketController::show` | Lulus |
| 23 | `POST` | `/api/tickets/{id}/reply` | Pengguna aktif terautentikasi | `TicketController::reply` | Lulus |
| 24 | `POST` | `/api/tickets/{id}/close` | Pengguna aktif terautentikasi | `TicketController::close` | Lulus |
| 25 | `GET` | `/api/notifications` | Pengguna aktif terautentikasi | `NotificationController::index` | Lulus |
| 26 | `POST` | `/api/notifications/{id}/read` | Pengguna aktif terautentikasi | `NotificationController::markAsRead` | Lulus |
| 27 | `POST` | `/api/notifications/read-all` | Pengguna aktif terautentikasi | `NotificationController::markAllRead` | Lulus |
| 28 | `GET` | `/api/teachers/{teacher}/documents/{document}` | Pengguna aktif terautentikasi | `TeacherDocumentController::show` | Lulus |
| 29 | `GET` | `/api/learning-attachments/{bookingRequest}` | Pengguna aktif terautentikasi | `LearningAttachmentController::show` | Lulus |
| 30 | `GET` | `/api/orders/{order}/payment-proof` | Pengguna aktif terautentikasi | `ProtectedFileController::paymentProof` | Lulus |
| 31 | `GET` | `/api/bookings/{booking}/completion-evidence` | Pengguna aktif terautentikasi | `ProtectedFileController::completionEvidence` | Lulus |
| 32 | `GET` | `/api/session-reports/{sessionReport}/evidence` | Pengguna aktif terautentikasi | `ProtectedFileController::reportEvidence` | Lulus |
| 33 | `GET` | `/api/disputes/{bookingDispute}/evidence` | Pengguna aktif terautentikasi | `ProtectedFileController::disputeEvidence` | Lulus |
| 34 | `GET` | `/api/payouts/{payout}/proof` | Pengguna aktif terautentikasi | `ProtectedFileController::payoutProof` | Lulus |
| 35 | `GET` | `/api/refunds/{refund}/proof` | Pengguna aktif terautentikasi | `ProtectedFileController::refundProof` | Lulus |
| 36 | `GET` | `/api/ticket-replies/{ticketReply}/attachment` | Pengguna aktif terautentikasi | `ProtectedFileController::ticketAttachment` | Lulus |
| 37 | `GET` | `/api/bookings/{booking}/learning-session` | Pengguna aktif terautentikasi | `LearningSessionController::show` | Lulus |
| 38 | `GET` | `/api/conversations` | Pengguna aktif terautentikasi | `LearningSessionController::conversations` | Lulus |
| 39 | `POST` | `/api/bookings/{booking}/messages` | Pengguna aktif terautentikasi | `LearningSessionController::storeMessage` | Lulus |
| 40 | `GET` | `/api/classroom-messages/{classroomMessage}/attachment` | Pengguna aktif terautentikasi | `ProtectedFileController::classroomMessageAttachment` | Lulus |
| 41 | `GET` | `/api/teacher-appeals/{teacherAppeal}/evidence` | Pengguna aktif terautentikasi | `ProtectedFileController::teacherAppealEvidence` | Lulus |
| 42 | `POST` | `/api/bookings/{booking}/schedule-changes` | Pengguna aktif terautentikasi | `ScheduleChangeController::store` | Lulus |
| 43 | `POST` | `/api/bookings/{booking}/schedule-changes/{scheduleChangeRequest}/respond` | Pengguna aktif terautentikasi | `ScheduleChangeController::respond` | Lulus |
| 44 | `POST` | `/api/student/tutor-availability` | Murid aktif | `TutorAvailabilityController::check` | Lulus |
| 45 | `GET` | `/api/student/booking-requests` | Murid aktif | `BookingRequestController::index` | Lulus |
| 46 | `POST` | `/api/student/booking-requests` | Murid aktif | `BookingRequestController::store` | Lulus |
| 47 | `GET` | `/api/student/booking-requests/{bookingRequest}` | Murid aktif | `BookingRequestController::show` | Lulus |
| 48 | `POST` | `/api/student/booking-requests/{bookingRequest}/expand-radius` | Murid aktif | `BookingRequestController::expandRadius` | Lulus |
| 49 | `POST` | `/api/student/booking-requests/{bookingRequest}/extend` | Murid aktif | `BookingRequestController::extendSearch` | Lulus |
| 50 | `POST` | `/api/student/booking-requests/{bookingRequest}/teacher-decision` | Murid aktif | `BookingRequestController::teacherDecision` | Lulus |
| 51 | `POST` | `/api/student/booking-requests/{bookingRequest}/group-decision` | Murid aktif | `BookingRequestController::groupDecision` | Lulus |
| 52 | `POST` | `/api/student/booking-requests/{bookingRequest}/cancel` | Murid aktif | `BookingRequestController::cancel` | Lulus |
| 53 | `POST` | `/api/student/bookings/{booking}/approve` | Murid aktif | `SessionWorkflowController::studentApprove` | Lulus |
| 54 | `POST` | `/api/student/bookings/{booking}/dispute` | Murid aktif | `SessionWorkflowController::studentDispute` | Lulus |
| 55 | `POST` | `/api/student/bookings/{booking}/teacher-absence` | Murid aktif | `SessionWorkflowController::reportTeacherAbsence` | Lulus |
| 56 | `POST` | `/api/student/bookings/{booking}/session-pin` | Murid aktif | `LearningSessionController::generatePin` | Lulus |
| 57 | `POST` | `/api/student/bookings/{booking}/learning-plan/acknowledge` | Murid aktif | `LearningSessionController::acknowledgePlan` | Lulus |
| 58 | `GET` | `/api/student/orders/{id}/status` | Murid aktif | `StudentController::checkOrderStatus` | Lulus |
| 59 | `GET` | `/api/student/wallet` | Murid aktif | `CustomerWalletController::show` | Lulus |
| 60 | `GET` | `/api/student/classes` | Murid aktif | `StudentController::getMyClasses` | Lulus |
| 61 | `POST` | `/api/orders/{id}/pay` | Murid aktif | `OrderController::pay` | Lulus |
| 62 | `GET` | `/api/active-order` | Murid aktif | `OrderController::getActiveOrder` | Lulus |
| 63 | `POST` | `/api/orders/{id}/cancel` | Murid aktif | `OrderController::cancelOrder` | Lulus |
| 64 | `GET` | `/api/orders` | Murid aktif | `OrderController::index` | Lulus |
| 65 | `GET` | `/api/payment-settings` | Murid aktif | `AdminController::getPaymentSettings` | Lulus |
| 66 | `POST` | `/api/ratings` | Murid aktif | `RatingController::store` | Lulus |
| 67 | `GET` | `/api/student/dashboard-v2` | Murid aktif | `StudentPackageController::dashboard` | Lulus |
| 68 | `GET` | `/api/student/packages` | Murid aktif | `StudentPackageController::index` | Lulus |
| 69 | `GET` | `/api/student/packages/tutorial-status` | Murid aktif | `StudentPackageController::tutorialStatus` | Lulus |
| 70 | `POST` | `/api/student/packages` | Murid aktif | `StudentPackageController::store` | Lulus |
| 71 | `POST` | `/api/student/packages/{learningPackage}/retry` | Murid aktif | `StudentPackageController::retryMatching` | Lulus |
| 72 | `POST` | `/api/student/packages/{learningPackage}/cancel` | Murid aktif | `StudentPackageController::cancel` | Lulus |
| 73 | `GET` | `/api/student/packages/{learningPackage}` | Murid aktif | `StudentPackageController::show` | Lulus |
| 74 | `GET` | `/api/student/vouchers` | Murid aktif | `StudentPackageController::vouchers` | Lulus |
| 75 | `POST` | `/api/student/promotions/preview` | Murid aktif | `StudentPackageController::previewPromotion` | Lulus |
| 76 | `POST` | `/api/student/promotions/{promotion}/claim` | Murid aktif | `StudentPackageController::claim` | Lulus |
| 77 | `POST` | `/api/student/packages/quote` | Murid aktif | `StudentPackageController::previewPromotion` | Lulus |
| 78 | `GET` | `/api/teacher/offers` | Tutor aktif | `TeacherOfferController::index` | Lulus |
| 79 | `POST` | `/api/teacher/offers/{teacherOffer}/accept` | Tutor aktif | `TeacherOfferController::accept` | Lulus |
| 80 | `POST` | `/api/teacher/offers/{teacherOffer}/reject` | Tutor aktif | `TeacherOfferController::reject` | Lulus |
| 81 | `GET` | `/api/teacher/dashboard-v2` | Tutor aktif | `TeacherOperationsController::dashboard` | Lulus |
| 82 | `GET` | `/api/teacher/profile` | Tutor aktif | `TeacherController::getProfile` | Lulus |
| 83 | `POST` | `/api/teacher/profile` | Tutor aktif | `TeacherController::updateProfile` | Lulus |
| 84 | `POST` | `/api/teacher/subjects` | Tutor aktif | `TeacherController::syncSubjects` | Lulus |
| 85 | `POST` | `/api/teacher/bank` | Tutor aktif | `TeacherController::updateBank` | Lulus |
| 86 | `GET` | `/api/teacher/salary` | Tutor aktif | `TeacherController::getSalaryData` | Lulus |
| 87 | `GET` | `/api/teacher/payout-requests` | Tutor aktif | `TeacherOperationsController::payoutRequests` | Lulus |
| 88 | `POST` | `/api/teacher/payout-requests` | Tutor aktif | `TeacherOperationsController::requestPayout` | Lulus |
| 89 | `GET` | `/api/teacher/performance` | Tutor aktif | `TeacherOperationsController::performance` | Lulus |
| 90 | `POST` | `/api/teacher/point-ledgers/{teacherPointLedger}/appeals` | Tutor aktif | `TeacherOperationsController::storeAppeal` | Lulus |
| 91 | `GET` | `/api/teacher/classes` | Tutor aktif | `ClassroomController::index` | Lulus |
| 92 | `PUT` | `/api/teacher/classes/{id}` | Tutor aktif | `ClassroomController::update` | Lulus |
| 93 | `POST` | `/api/teacher/bookings/{booking}/complete` | Tutor aktif | `SessionWorkflowController::teacherComplete` | Lulus |
| 94 | `POST` | `/api/teacher/bookings/{booking}/absence` | Tutor aktif | `SessionWorkflowController::reportStudentAbsence` | Lulus |
| 95 | `POST` | `/api/teacher/bookings/{booking}/emergency` | Tutor aktif | `SessionWorkflowController::reportEmergency` | Lulus |
| 96 | `POST` | `/api/teacher/bookings/{booking}/check-in` | Tutor aktif | `LearningSessionController::teacherCheckIn` | Lulus |
| 97 | `POST` | `/api/teacher/bookings/{booking}/check-out` | Tutor aktif | `LearningSessionController::teacherCheckOut` | Lulus |
| 98 | `PUT` | `/api/teacher/bookings/{booking}/participant-attendance` | Tutor aktif | `LearningSessionController::storeParticipantAttendance` | Lulus |
| 99 | `PUT` | `/api/teacher/bookings/{booking}/learning-plan` | Tutor aktif | `LearningSessionController::storePlan` | Lulus |
| 100 | `POST` | `/api/teacher/bookings/{booking}/progress-reports` | Tutor aktif | `LearningSessionController::storeProgressReport` | Lulus |
| 101 | `GET` | `/api/teacher/schedule` | Tutor aktif | `TeacherScheduleController::index` | Lulus |
| 102 | `POST` | `/api/teacher/schedule` | Tutor aktif | `TeacherScheduleController::update` | Lulus |
| 103 | `GET` | `/api/admin/audit-log` | Admin utama | `AdminAccessController::audit` | Lulus |
| 104 | `POST` | `/api/admin/notifications/send` | Admin utama | `NotificationController::send` | Lulus |
| 105 | `GET` | `/api/admin/hourly-rates` | Admin utama | `HourlyRateController::index` | Lulus |
| 106 | `POST` | `/api/admin/hourly-rates` | Admin utama | `HourlyRateController::store` | Lulus |
| 107 | `POST` | `/api/admin/hourly-rates/defaults` | Admin utama | `HourlyRateController::updateDefaults` | Lulus |
| 108 | `POST` | `/api/admin/hourly-rates/group-settings` | Admin utama | `HourlyRateController::updateGroupSettings` | Lulus |
| 109 | `DELETE` | `/api/admin/hourly-rates/{hourlyRate}` | Admin utama | `HourlyRateController::destroy` | Lulus |
| 110 | `GET` | `/api/admin/learning-topics` | Admin utama | `LearningTopicController::index` | Lulus |
| 111 | `POST` | `/api/admin/learning-topics` | Admin utama | `LearningTopicController::store` | Lulus |
| 112 | `PUT` | `/api/admin/learning-topics/{learningTopic}` | Admin utama | `LearningTopicController::update` | Lulus |
| 113 | `DELETE` | `/api/admin/learning-topics/{learningTopic}` | Admin utama | `LearningTopicController::destroy` | Lulus |
| 114 | `GET` | `/api/admin/pending-teachers` | Admin utama | `AdminController::getPendingTeachers` | Lulus |
| 115 | `GET` | `/api/admin/history-teachers` | Admin utama | `AdminController::getHistoryTeachers` | Lulus |
| 116 | `POST` | `/api/admin/verify-teacher` | Admin utama | `AdminController::verifyTeacher` | Lulus |
| 117 | `GET` | `/api/admin/users` | Admin utama | `AdminController::getUsers` | Lulus |
| 118 | `POST` | `/api/admin/users/status` | Admin utama | `AdminController::updateUserStatus` | Lulus |
| 119 | `GET` | `/api/admin/orders` | Admin utama | `AdminController::getOrders` | Lulus |
| 120 | `GET` | `/api/admin/pending-payments` | Admin utama | `AdminController::getPendingPayments` | Lulus |
| 121 | `GET` | `/api/admin/finance/payments` | Admin utama | `AdminFinanceOperationsController::payments` | Lulus |
| 122 | `GET` | `/api/admin/finance/refunds` | Admin utama | `AdminFinanceOperationsController::refunds` | Lulus |
| 123 | `POST` | `/api/admin/verify-payment` | Admin utama | `AdminController::verifyPayment` | Lulus |
| 124 | `GET` | `/api/admin/payment-settings` | Admin utama | `AdminController::getPaymentSettings` | Lulus |
| 125 | `POST` | `/api/admin/payment-settings` | Admin utama | `AdminController::updatePaymentSettings` | Lulus |
| 126 | `GET` | `/api/admin/finance` | Admin utama | `AdminController::getFinanceData` | Lulus |
| 127 | `POST` | `/api/admin/payout` | Admin utama | `AdminController::processPayout` | Lulus |
| 128 | `GET` | `/api/admin/commission-setting` | Admin utama | `AdminController::getCommissionSetting` | Lulus |
| 129 | `POST` | `/api/admin/commission-setting` | Admin utama | `AdminController::updateCommissionSetting` | Lulus |
| 130 | `GET` | `/api/admin/dashboard-stats` | Admin utama | `AdminController::getDashboardStats` | Lulus |
| 131 | `GET` | `/api/admin/tutor-searches` | Admin utama | `AdminMatchingController::index` | Lulus |
| 132 | `GET` | `/api/admin/tutor-searches/{bookingRequest}/candidates` | Admin utama | `AdminMatchingController::candidates` | Lulus |
| 133 | `GET` | `/api/admin/tutor-searches/{bookingRequest}` | Admin utama | `AdminMatchingController::show` | Lulus |
| 134 | `POST` | `/api/admin/tutor-searches/{bookingRequest}/synchronize` | Admin utama | `AdminMatchingController::synchronize` | Lulus |
| 135 | `POST` | `/api/admin/tutor-searches/{bookingRequest}/expand-radius` | Admin utama | `AdminMatchingController::expandRadius` | Lulus |
| 136 | `POST` | `/api/admin/tutor-searches/{bookingRequest}/assign-teacher` | Admin utama | `AdminMatchingController::assignTeacher` | Lulus |
| 137 | `GET` | `/api/admin/cases` | Admin utama | `SessionWorkflowController::adminCases` | Lulus |
| 138 | `POST` | `/api/admin/teacher-appeals/{teacherAppeal}/resolve` | Admin utama | `TeacherOperationsController::resolveAppeal` | Lulus |
| 139 | `POST` | `/api/admin/disputes/{bookingDispute}/resolve` | Admin utama | `SessionWorkflowController::resolveDispute` | Lulus |
| 140 | `POST` | `/api/admin/session-reports/{sessionReport}/resolve` | Admin utama | `SessionWorkflowController::resolveReport` | Lulus |
| 141 | `POST` | `/api/admin/bookings/{booking}/completion-review` | Admin utama | `SessionWorkflowController::resolveCompletionReview` | Lulus |
| 142 | `POST` | `/api/admin/refunds/{refund}/complete` | Admin utama | `SessionWorkflowController::completeRefund` | Lulus |
| 143 | `GET` | `/api/admin/tickets` | Admin utama | `TicketController::index` | Lulus |
| 144 | `POST` | `/api/admin/settings/footer` | Admin utama | `AdminController::updateFooterSettings` | Lulus |
| 145 | `POST` | `/api/admin/socials` | Admin utama | `AdminController::storeSocial` | Lulus |
| 146 | `DELETE` | `/api/admin/socials/{id}` | Admin utama | `AdminController::deleteSocial` | Lulus |
| 147 | `GET` | `/api/admin/classes` | Admin utama | `AdminClassController::index` | Lulus |
| 148 | `GET` | `/api/admin/classes/{id}` | Admin utama | `AdminClassController::show` | Lulus |
| 149 | `POST` | `/api/admin/settings/teacher-cover` | Admin utama | `AdminSettingController::updateTeacherCover` | Lulus |
| 150 | `GET` | `/api/admin/ratings` | Admin utama | `AdminRatingController::index` | Lulus |
| 151 | `DELETE` | `/api/admin/ratings/{id}` | Admin utama | `AdminRatingController::destroy` | Lulus |
| 152 | `GET` | `/api/admin/notes` | Admin utama | `NoteController::index` | Lulus |
| 153 | `POST` | `/api/admin/notes` | Admin utama | `NoteController::store` | Lulus |
| 154 | `PUT` | `/api/admin/notes/{id}` | Admin utama | `NoteController::update` | Lulus |
| 155 | `DELETE` | `/api/admin/notes/{id}` | Admin utama | `NoteController::destroy` | Lulus |
| 156 | `GET` | `/api/admin/subjects` | Admin utama | `CurriculumSubjectController::index` | Lulus |
| 157 | `POST` | `/api/admin/subjects` | Admin utama | `CurriculumSubjectController::store` | Lulus |
| 158 | `PUT` | `/api/admin/subjects/{curriculumSubject}` | Admin utama | `CurriculumSubjectController::update` | Lulus |
| 159 | `DELETE` | `/api/admin/subjects/{curriculumSubject}` | Admin utama | `CurriculumSubjectController::destroy` | Lulus |
| 160 | `GET` | `/api/admin/chapters` | Admin utama | `CurriculumChapterController::index` | Lulus |
| 161 | `POST` | `/api/admin/chapters` | Admin utama | `CurriculumChapterController::store` | Lulus |
| 162 | `PUT` | `/api/admin/chapters/{curriculumChapter}` | Admin utama | `CurriculumChapterController::update` | Lulus |
| 163 | `DELETE` | `/api/admin/chapters/{curriculumChapter}` | Admin utama | `CurriculumChapterController::destroy` | Lulus |
| 164 | `GET` | `/api/admin/stage-five/plans` | Admin utama | `AdminStageFiveController::plans` | Lulus |
| 165 | `POST` | `/api/admin/stage-five/plans` | Admin utama | `AdminStageFiveController::storePlan` | Lulus |
| 166 | `PUT` | `/api/admin/stage-five/plans/{packagePlan}` | Admin utama | `AdminStageFiveController::updatePlan` | Lulus |
| 167 | `DELETE` | `/api/admin/stage-five/plans/{packagePlan}` | Admin utama | `AdminStageFiveController::deletePlan` | Lulus |
| 168 | `GET` | `/api/admin/stage-five/time-slots` | Admin utama | `AdminStageFiveController::timeSlots` | Lulus |
| 169 | `POST` | `/api/admin/stage-five/time-slots` | Admin utama | `AdminStageFiveController::storeTimeSlot` | Lulus |
| 170 | `PUT` | `/api/admin/stage-five/time-slots/{learningTimeSlot}` | Admin utama | `AdminStageFiveController::updateTimeSlot` | Lulus |
| 171 | `DELETE` | `/api/admin/stage-five/time-slots/{learningTimeSlot}` | Admin utama | `AdminStageFiveController::deleteTimeSlot` | Lulus |
| 172 | `GET` | `/api/admin/stage-five/promotions` | Admin utama | `AdminStageFiveController::promotions` | Lulus |
| 173 | `POST` | `/api/admin/stage-five/promotions` | Admin utama | `AdminStageFiveController::storePromotion` | Lulus |
| 174 | `PUT` | `/api/admin/stage-five/promotions/{promotion}` | Admin utama | `AdminStageFiveController::updatePromotion` | Lulus |
| 175 | `DELETE` | `/api/admin/stage-five/promotions/{promotion}` | Admin utama | `AdminStageFiveController::deletePromotion` | Lulus |
| 176 | `GET` | `/api/admin/stage-five/banners` | Admin utama | `AdminStageFiveController::banners` | Lulus |
| 177 | `POST` | `/api/admin/stage-five/banners` | Admin utama | `AdminStageFiveController::storeBanner` | Lulus |
| 178 | `POST` | `/api/admin/stage-five/banners/{dynamicBanner}` | Admin utama | `AdminStageFiveController::updateBanner` | Lulus |
| 179 | `DELETE` | `/api/admin/stage-five/banners/{dynamicBanner}` | Admin utama | `AdminStageFiveController::deleteBanner` | Lulus |
| 180 | `GET` | `/api/admin/stage-five/tutorials` | Admin utama | `AdminStageFiveController::tutorials` | Lulus |
| 181 | `POST` | `/api/admin/stage-five/tutorials` | Admin utama | `AdminStageFiveController::storeTutorial` | Lulus |
| 182 | `PUT` | `/api/admin/stage-five/tutorials/{tutorial}` | Admin utama | `AdminStageFiveController::updateTutorial` | Lulus |
| 183 | `DELETE` | `/api/admin/stage-five/tutorials/{tutorial}` | Admin utama | `AdminStageFiveController::deleteTutorial` | Lulus |
| 184 | `POST` | `/api/admin/stage-five/tutorial-steps/{tutorialStep}/image` | Admin utama | `AdminStageFiveController::uploadTutorialStepImage` | Lulus |

## Frontend React (61 route)

| No | Path | Akses | Status statis |
|---:|---|---|---|
| 1 | `/` | Publik | Lulus |
| 2 | `/register` | Publik | Lulus |
| 3 | `/login` | Publik | Lulus |
| 4 | `/forgot-password` | Publik | Lulus |
| 5 | `/reset-password` | Publik | Lulus |
| 6 | `/privacy` | Publik | Lulus |
| 7 | `/terms` | Publik | Lulus |
| 8 | `/why-us` | Publik | Lulus |
| 9 | `/access-denied` | Publik | Lulus |
| 10 | `/admin` | Admin | Lulus |
| 11 | `/admin/tutor-searches` | Admin | Lulus |
| 12 | `/admin/guru` | Admin | Lulus |
| 13 | `/admin/pembayaran` | Admin | Lulus |
| 14 | `/admin/users` | Admin | Lulus |
| 15 | `/admin/settings-payment` | Admin | Lulus |
| 16 | `/admin/settings-footer` | Admin | Lulus |
| 17 | `/admin/finance` | Admin | Lulus |
| 18 | `/admin/refunds` | Admin | Lulus |
| 19 | `/admin/finance-security` | Admin | Lulus |
| 20 | `/admin/pesan` | Admin | Lulus |
| 21 | `/admin/notifikasi` | Admin | Lulus |
| 22 | `/admin/classes` | Admin | Lulus |
| 23 | `/admin/classes/:id` | Admin | Lulus |
| 24 | `/admin/notes` | Admin | Lulus |
| 25 | `/admin/settings-display` | Admin | Lulus |
| 26 | `/admin/ratings` | Admin | Lulus |
| 27 | `/admin/hourly-rates` | Admin | Lulus |
| 28 | `/admin/learning-topics` | Admin | Lulus |
| 29 | `/admin/subjects` | Admin | Lulus |
| 30 | `/admin/cases` | Admin | Lulus |
| 31 | `/admin/stage-five` | Admin | Lulus |
| 32 | `/admin/access-control` | Admin | Lulus |
| 33 | `/admin/audit-log` | Admin | Lulus |
| 34 | `/guru` | Tutor | Lulus |
| 35 | `/guru/kelas` | Tutor | Lulus |
| 36 | `/guru/profil` | Tutor | Lulus |
| 37 | `/guru/jadwal` | Tutor | Lulus |
| 38 | `/guru/permintaan` | Tutor | Lulus |
| 39 | `/guru/rekening` | Tutor | Lulus |
| 40 | `/guru/gaji` | Tutor | Lulus |
| 41 | `/guru/pesan` | Tutor | Lulus |
| 42 | `/guru/saya` | Tutor | Lulus |
| 43 | `/guru/performa` | Tutor | Lulus |
| 44 | `/guru/notifikasi` | Tutor | Lulus |
| 45 | `/guru/bantuan` | Tutor | Lulus |
| 46 | `/student/dashboard` | Murid | Lulus |
| 47 | `/search` | Murid | Lulus |
| 48 | `/student/find` | Murid | Lulus |
| 49 | `/student/my-classes` | Murid | Lulus |
| 50 | `/student/messages` | Murid | Lulus |
| 51 | `/student/progress` | Murid | Lulus |
| 52 | `/student/history` | Murid | Lulus |
| 53 | `/student/profile` | Murid | Lulus |
| 54 | `/student/account` | Murid | Lulus |
| 55 | `/student/packages` | Murid | Lulus |
| 56 | `/student/packages/new` | Murid | Lulus |
| 57 | `/student/vouchers` | Murid | Lulus |
| 58 | `/student/offers/:id` | Murid | Lulus |
| 59 | `/student/help` | Murid | Lulus |
| 60 | `/payment` | Murid | Lulus |
| 61 | `*` | Publik | Lulus |

## Route yang sengaja tidak tersedia

- `/api/admin/access-control`: pengelolaan admin tambahan ditutup.
- `/api/admin/finance-security`: halaman autentikator dihentikan.
- `/api/admin/payout-approvals`: persetujuan admin kedua dihentikan.
- Frontend `/admin/access-control` dan `/admin/finance-security` hanya menjadi redirect kompatibilitas, bukan halaman fitur.

