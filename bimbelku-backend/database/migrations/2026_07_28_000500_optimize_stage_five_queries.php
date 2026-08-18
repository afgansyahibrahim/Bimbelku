<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->index(['role', 'status'], 'users_role_status_idx');
            });
        }

        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(
                    ['user_id', 'is_read', 'created_at'],
                    'notifications_user_unread_created_idx'
                );
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->index(
                    ['user_id', 'status', 'created_at'],
                    'orders_user_status_created_idx'
                );
                if (Schema::hasColumn('orders', 'payment_submitted_at')) {
                    $table->index(
                        ['status', 'payment_submitted_at'],
                        'orders_status_submitted_idx'
                    );
                }
            });
        }

        if (Schema::hasTable('booking_requests')) {
            Schema::table('booking_requests', function (Blueprint $table) {
                $table->index(
                    ['student_id', 'created_at'],
                    'booking_requests_student_created_idx'
                );
            });
        }

        if (Schema::hasTable('booking_participants')) {
            Schema::table('booking_participants', function (Blueprint $table) {
                $table->index(
                    ['booking_id', 'status'],
                    'booking_participants_booking_status_idx'
                );
            });
        }

        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->index(
                    ['status', 'start_at'],
                    'bookings_status_start_idx'
                );
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropIndex('bookings_status_start_idx');
            });
        }
        if (Schema::hasTable('booking_participants')) {
            Schema::table('booking_participants', function (Blueprint $table) {
                $table->dropIndex('booking_participants_booking_status_idx');
            });
        }
        if (Schema::hasTable('booking_requests')) {
            Schema::table('booking_requests', function (Blueprint $table) {
                $table->dropIndex('booking_requests_student_created_idx');
            });
        }
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropIndex('orders_user_status_created_idx');
                if (Schema::hasColumn('orders', 'payment_submitted_at')) {
                    $table->dropIndex('orders_status_submitted_idx');
                }
            });
        }
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('notifications_user_unread_created_idx');
            });
        }
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('users_role_status_idx');
            });
        }
    }
};
