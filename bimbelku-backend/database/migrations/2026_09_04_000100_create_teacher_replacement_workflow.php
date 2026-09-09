<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_replacement_requests', function (Blueprint $table) {
            $table->id();
            $table->string('replacement_code', 40)->unique();
            $table->foreignId('learning_package_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('old_teacher_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('new_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason_code', 50);
            $table->text('reason_detail');
            $table->string('evidence_path')->nullable();
            $table->string('status', 40)->default('pending_review')->index();
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('search_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->index(['package_subject_id', 'status']);
        });

        Schema::create('teacher_replacement_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teacher_replacement_request_id');
            $table->foreign('teacher_replacement_request_id', 'trs_replacement_fk')
                ->references('id')->on('teacher_replacement_requests')->cascadeOnDelete();
            $table->unsignedBigInteger('package_session_id');
            $table->foreign('package_session_id', 'trs_package_session_fk')
                ->references('id')->on('package_sessions')->restrictOnDelete();
            $table->unsignedBigInteger('old_booking_id');
            $table->foreign('old_booking_id', 'trs_old_booking_fk')
                ->references('id')->on('bookings')->restrictOnDelete();
            $table->unsignedBigInteger('new_booking_id')->nullable();
            $table->foreign('new_booking_id', 'trs_new_booking_fk')
                ->references('id')->on('bookings')->nullOnDelete();
            $table->string('status', 40)->default('selected');
            $table->timestamps();
            $table->unique(['teacher_replacement_request_id', 'package_session_id'], 'replacement_session_unique');
        });

        Schema::table('booking_requests', function (Blueprint $table) {
            $table->unsignedBigInteger('teacher_replacement_request_id')->nullable()->after('package_subject_id');
            $table->foreign('teacher_replacement_request_id', 'booking_requests_replacement_fk')
                ->references('id')->on('teacher_replacement_requests')->nullOnDelete();
            $table->index('teacher_replacement_request_id', 'booking_requests_replacement_idx');
        });
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedBigInteger('replacement_of_booking_id')->nullable()->after('booking_request_id');
            $table->foreign('replacement_of_booking_id', 'bookings_replacement_fk')
                ->references('id')->on('bookings')->nullOnDelete();
            $table->index('replacement_of_booking_id', 'bookings_replacement_idx');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign('bookings_replacement_fk');
            $table->dropIndex('bookings_replacement_idx');
            $table->dropColumn('replacement_of_booking_id');
        });
        Schema::table('booking_requests', function (Blueprint $table) {
            $table->dropForeign('booking_requests_replacement_fk');
            $table->dropIndex('booking_requests_replacement_idx');
            $table->dropColumn('teacher_replacement_request_id');
        });
        Schema::dropIfExists('teacher_replacement_sessions');
        Schema::dropIfExists('teacher_replacement_requests');
    }
};
